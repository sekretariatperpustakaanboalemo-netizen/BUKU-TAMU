(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var startTime = Date.now();
  var lokasi = (new URLSearchParams(location.search).get('lokasi') || 'umum').substring(0, 40);
  var settings = null;
  var stream = null, fotoData = '', ttdDirty = false;

  /* ---------- Muat pengaturan (nama OPD, logo, dropdown) ---------- */
  api('publicSettings').then(function (r) {
    if (!r.ok) throw new Error(r.error);
    settings = r.data;
    $('opd').textContent = settings.namaOPD;
    $('opd2').textContent = settings.namaOPD;
    $('opd3').textContent = settings.namaOPD;
    document.title = 'Buku Tamu - ' + settings.namaOPD;
    if (settings.logoUrl && /^https:\/\//i.test(settings.logoUrl)) {
      $('logo').src = settings.logoUrl; $('logo').classList.remove('hidden');
    }
    var sel = $('keperluan');
    sel.innerHTML = '<option value="">-- Pilih keperluan --</option>';
    settings.keperluan.forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
    });
    if (settings.aktifFoto) $('fotoWrap').classList.remove('hidden');
    if (settings.aktifTTD) { $('ttdWrap').classList.remove('hidden'); initSign(); }
  }).catch(function () {
    showMsg('Gagal memuat formulir. Periksa koneksi internet lalu muat ulang halaman.', 'error');
  });

  function showMsg(t, type) {
    var m = $('msg'); m.textContent = t; m.className = 'msg ' + type;
  }

  /* ---------- Selfie ---------- */
  $('btnKamera').onclick = function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return showMsg('Kamera tidak didukung di perangkat ini. Anda dapat melewati bagian foto.', 'error');
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(function (s) {
      stream = s; var v = $('video'); v.srcObject = s; v.classList.remove('hidden'); v.play();
      $('btnKamera').classList.add('hidden'); $('btnJepret').classList.remove('hidden');
      $('msg').className = 'msg';
    }).catch(function () {
      showMsg('Izin kamera ditolak. Anda dapat melewati bagian foto.', 'error');
    });
  };
  $('btnJepret').onclick = function () {
    var v = $('video'), c = $('fotoCanvas');
    var w = 480, h = Math.round(w * (v.videoHeight / (v.videoWidth || 1))) || 360;
    c.width = w; c.height = h; c.getContext('2d').drawImage(v, 0, 0, w, h);
    fotoData = c.toDataURL('image/jpeg', 0.7);
    $('fotoPreview').src = fotoData; $('fotoPreview').classList.remove('hidden');
    stopCam(); $('video').classList.add('hidden');
    $('btnJepret').classList.add('hidden'); $('btnUlangFoto').classList.remove('hidden');
  };
  $('btnUlangFoto').onclick = function () {
    fotoData = ''; $('fotoPreview').classList.add('hidden');
    $('btnUlangFoto').classList.add('hidden'); $('btnKamera').click();
  };
  function stopCam() {
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
  }

  /* ---------- Tanda tangan ---------- */
  var ctx, drawing = false;
  function initSign() {
    var c = $('ttd');
    var ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    ctx = c.getContext('2d'); ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    function pos(e) { var r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    c.addEventListener('pointerdown', function (e) {
      drawing = true; c.setPointerCapture(e.pointerId); var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    });
    c.addEventListener('pointermove', function (e) {
      if (!drawing) return; var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); ttdDirty = true;
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { c.addEventListener(ev, function () { drawing = false; }); });
  }
  $('btnHapusTtd').onclick = function () {
    var c = $('ttd'); ctx.clearRect(0, 0, c.width, c.height); ttdDirty = false;
  };

  /* ---------- Kirim ---------- */
  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {
      nama: $('nama').value.trim(), instansi: $('instansi').value.trim(), hp: $('hp').value.trim(),
      keperluan: $('keperluan').value, dituju: $('dituju').value.trim(),
      keterangan: $('keterangan').value.trim(), lokasi: lokasi, setuju: $('setuju').checked
    };
    if (d.nama.length < 2) return showMsg('Nama wajib diisi.', 'error');
    if (!d.instansi) return showMsg('Instansi/asal wajib diisi.', 'error');
    if (!/^[0-9+\-\s]{8,20}$/.test(d.hp)) return showMsg('Nomor HP tidak valid (8-20 angka).', 'error');
    if (!d.keperluan) return showMsg('Silakan pilih keperluan.', 'error');
    if (!d.setuju) return showMsg('Anda harus menyetujui pernyataan penggunaan data pribadi.', 'error');
    if (fotoData) d.foto = fotoData;
    if (ttdDirty) d.ttd = $('ttd').toDataURL('image/png');

    var btn = $('btnKirim'); btn.disabled = true; btn.textContent = 'Mengirim...';
    api('submit', { data: d, website: $('website').value, elapsedMs: Date.now() - startTime })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error || 'Gagal mengirim.');
        stopCam();
        $('formCard').classList.add('hidden'); $('thanks').classList.remove('hidden');
        $('thanksInfo').textContent = r.waktu ? ('Tercatat: ' + r.waktu) : '';
        window.scrollTo(0, 0);
      })
      .catch(function (err) {
        showMsg(err.message === 'Failed to fetch' ? 'Koneksi bermasalah. Coba lagi.' : err.message, 'error');
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Kirim'; });
  });

  $('btnLagi').onclick = function () {
    $('form').reset(); fotoData = ''; ttdDirty = false; startTime = Date.now();
    $('fotoPreview').classList.add('hidden'); $('btnUlangFoto').classList.add('hidden');
    $('btnKamera').classList.remove('hidden'); $('msg').className = 'msg';
    $('thanks').classList.add('hidden'); $('formCard').classList.remove('hidden');
    if (ctx) { var c = $('ttd'); ctx.clearRect(0, 0, c.width, c.height); }
  };
  window.addEventListener('pagehide', stopCam);
})();
