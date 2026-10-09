(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var opd = 'Dinas Perpustakaan dan Kearsipan Kabupaten Boalemo', logo = '';

  api('publicSettings').then(function (r) {
    if (r.ok) {
      opd = r.data.namaOPD;
      if (r.data.logoUrl && /^https:\/\//i.test(r.data.logoUrl)) logo = r.data.logoUrl;
    }
  }).catch(function () {}).then(render);

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 40); }

  function formUrl(lok) {
    var u = window.baseUrl() + '/index.html';
    return lok ? u + '?lokasi=' + encodeURIComponent(lok) : u;
  }

  function makeQr(text) {
    var qr = qrcode(0, 'M'); // versi otomatis, koreksi error sedang
    qr.addData(text); qr.make();
    return qr;
  }

  function render() {
    var list = $('lokasi').value.split(',').map(slug).filter(String);
    if (!list.length) list = [''];
    var size = $('ukuran').value, judul = $('judul').value || 'Scan untuk Mengisi Buku Tamu';
    var wrap = $('sheets'); wrap.innerHTML = '';

    list.forEach(function (lok) {
      var url = formUrl(lok);
      var qr = makeQr(url);
      var svg = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });

      var div = document.createElement('div');
      div.className = 'sheet ' + size;
      div.style.pageBreakAfter = 'always';

      if (logo) {
        var im = document.createElement('img'); im.className = 'logo'; im.src = logo; im.alt = 'Logo';
        div.appendChild(im);
      }
      var h = document.createElement('h2'); h.textContent = judul; div.appendChild(h);

      var box = document.createElement('div'); box.className = 'qr'; box.innerHTML = svg; div.appendChild(box);

      var o = document.createElement('div'); o.className = 'opd'; o.textContent = opd; div.appendChild(o);
      if (lok) { var l = document.createElement('div'); l.className = 'loc'; l.textContent = 'Lokasi: ' + lok; div.appendChild(l); }
      var u = document.createElement('div'); u.className = 'hint'; u.textContent = url; div.appendChild(u);

      var bar = document.createElement('div'); bar.className = 'row no-print'; bar.style.justifyContent = 'center';
      bar.style.marginTop = '12px';
      var bp = document.createElement('button'); bp.className = 'btn secondary small'; bp.textContent = 'Unduh PNG';
      var bs = document.createElement('button'); bs.className = 'btn secondary small'; bs.textContent = 'Unduh SVG';
      bp.onclick = function () { downloadPng(qr, 'qr-bukutamu-' + (lok || 'umum') + '.png'); };
      bs.onclick = function () { downloadSvg(svg, 'qr-bukutamu-' + (lok || 'umum') + '.svg'); };
      bar.appendChild(bp); bar.appendChild(bs); div.appendChild(bar);

      wrap.appendChild(div);
    });
  }

  function save(href, name) {
    var a = document.createElement('a'); a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function downloadSvg(svg, name) {
    var s = svg.indexOf('xmlns') === -1 ? svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"') : svg;
    var blob = new Blob([s], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob); save(url, name); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function downloadPng(qr, name) {
    // gambar ulang ke canvas 1200px dengan margin putih (quiet zone)
    var n = qr.getModuleCount(), cell = Math.floor(1000 / n), pad = 100;
    var c = document.createElement('canvas'); c.width = c.height = n * cell + pad * 2;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#000';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect(pad + k * cell, pad + r * cell, cell, cell);
    save(c.toDataURL('image/png'), name);
  }

  $('btnBuat').onclick = render;
  $('btnCetak').onclick = function () { render(); window.print(); };
  $('ukuran').onchange = render;
})();
