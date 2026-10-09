(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN_KEY = 'bt_admin_token';
  var token = '';
  try { token = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) {}
  var page = 1, pageSize = 10, total = 0, opsiKep = [], editId = null, settings = {};

  /* ---------- API admin (selalu menyertakan token) ---------- */
  function call(action, payload) {
    return api(action, Object.assign({ token: token }, payload || {})).then(function (r) {
      if (r.auth === false) { doLogout(true); throw new Error('Sesi berakhir. Silakan login ulang.'); }
      return r;
    });
  }

  /* ---------- Login / logout ---------- */
  function showApp() { $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden'); init(); }
  function doLogout(silent) {
    if (!silent && token) { api('logout', { token: token }).catch(function () {}); }
    token = ''; try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
    $('appView').classList.add('hidden'); $('loginView').classList.remove('hidden');
  }
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var m = $('loginMsg'); m.className = 'msg';
    api('login', { password: $('pw').value }).then(function (r) {
      if (!r.ok) { m.textContent = r.error; m.className = 'msg error'; return; }
      token = r.token; $('pw').value = '';
      try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) {}
      showApp();
    }).catch(function () { m.textContent = 'Gagal terhubung ke server.'; m.className = 'msg error'; });
  });
  $('btnLogout').onclick = function () { doLogout(false); };
  if (token) showApp();

  /* ---------- Tab ---------- */
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
      ['dash', 'data', 'set'].forEach(function (t) { $('tab-' + t).classList.toggle('hidden', t !== b.dataset.tab); });
      if (b.dataset.tab === 'dash') loadStats();
      if (b.dataset.tab === 'data') loadList();
      if (b.dataset.tab === 'set') fillSettings();
    };
  });

  function init() {
    call('getSettings').then(function (r) {
      if (!r.ok) return;
      settings = r.data;
      $('title').textContent = 'Admin - ' + settings.namaOPD;
      opsiKep = settings.keperluan.split(',').map(function (x) { return x.trim(); }).filter(String);
      var f = $('fKep'); f.innerHTML = '<option value="">Semua</option>';
      opsiKep.forEach(function (k) { f.insertAdjacentHTML('beforeend', '<option>' + esc(k) + '</option>'); });
      $('eKep').innerHTML = opsiKep.map(function (k) { return '<option>' + esc(k) + '</option>'; }).join('');
    }).catch(function () {});
    loadStats();
  }

  /* ---------- Dashboard ---------- */
  function loadStats() {
    call('stats').then(function (r) {
      if (!r.ok) return;
      var d = r.data;
      $('sHari').textContent = d.hariIni; $('sMinggu').textContent = d.mingguIni;
      $('sBulan').textContent = d.bulanIni; $('sTotal').textContent = d.total;
      var max = Math.max.apply(null, d.harian.map(function (x) { return x.jumlah; }).concat([1]));
      $('bars').innerHTML = d.harian.map(function (x) {
        return '<div class="bar" title="' + esc(x.tanggal) + ': ' + x.jumlah + ' tamu" style="height:' +
          Math.round(x.jumlah / max * 100) + '%"></div>';
      }).join('');
      $('xFrom').textContent = d.harian[0].tanggal; $('xTo').textContent = d.harian[d.harian.length - 1].tanggal;
      var tm = Math.max.apply(null, d.topKeperluan.map(function (x) { return x.jumlah; }).concat([1]));
      $('topKep').innerHTML = d.topKeperluan.length ? d.topKeperluan.map(function (x) {
        return '<div class="hbar"><div>' + esc(x.keperluan) + ' <strong>(' + x.jumlah + ')</strong></div>' +
          '<div class="track"><div class="fill" style="width:' + Math.round(x.jumlah / tm * 100) + '%"></div></div></div>';
      }).join('') : '<p class="hint">Belum ada data.</p>';
    }).catch(function () {});
  }

  /* ---------- Data tamu ---------- */
  function filters() {
    return { q: $('fQ').value, from: $('fFrom').value, to: $('fTo').value, keperluan: $('fKep').value };
  }
  function loadList() {
    $('tbody').innerHTML = '<tr><td colspan="10">Memuat...</td></tr>';
    call('list', Object.assign(filters(), { page: page, pageSize: pageSize })).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      total = r.data.total;
      var rows = r.data.rows;
      $('tbody').innerHTML = rows.length ? rows.map(function (x) {
        return '<tr><td>' + esc(x.tanggal) + '</td><td>' + esc(x.jam) + '</td><td>' + esc(x.nama) + '</td><td>' +
          esc(x.instansi) + '</td><td>' + esc(x.hp) + '</td><td>' + esc(x.keperluan) + '</td><td>' + esc(x.dituju) +
          '</td><td>' + esc(x.keterangan) + '</td><td>' + esc(x.lokasi) + '</td><td class="no-print"><div class="row">' +
          '<button class="btn secondary small" data-edit="' + esc(x.id) + '">Edit</button>' +
          '<button class="btn danger small" data-del="' + esc(x.id) + '">Hapus</button></div></td></tr>';
      }).join('') : '<tr><td colspan="10">Tidak ada data.</td></tr>';
      rowsCache = rows;
      var pages = Math.max(Math.ceil(total / pageSize), 1);
      $('pageInfo').textContent = 'Halaman ' + page + ' / ' + pages + ' (' + total + ' data)';
      $('prev').disabled = page <= 1; $('next').disabled = page >= pages;
    }).catch(function (e) { $('tbody').innerHTML = '<tr><td colspan="10">' + esc(e.message) + '</td></tr>'; });
  }
  var rowsCache = [];
  $('btnCari').onclick = function () { page = 1; loadList(); };
  $('btnReset').onclick = function () { ['fQ', 'fFrom', 'fTo', 'fKep'].forEach(function (i) { $(i).value = ''; }); page = 1; loadList(); };
  $('fQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { page = 1; loadList(); } });
  $('prev').onclick = function () { if (page > 1) { page--; loadList(); } };
  $('next').onclick = function () { page++; loadList(); };

  $('tbody').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) openEdit(b.dataset.edit);
    if (b.dataset.del) {
      if (!confirm('Hapus data tamu ini beserta foto/tanda tangannya? Tindakan ini tidak dapat dibatalkan.')) return;
      call('delete', { id: b.dataset.del }).then(function (r) {
        if (!r.ok) alert(r.error); else { loadList(); loadStats(); }
      }).catch(function (er) { alert(er.message); });
    }
  });

  /* ---------- Edit ---------- */
  function openEdit(id) {
    var x = rowsCache.filter(function (r) { return r.id === id; })[0]; if (!x) return;
    editId = id;
    $('eNama').value = x.nama; $('eInstansi').value = x.instansi; $('eHp').value = x.hp;
    var sel = $('eKep');
    if (opsiKep.indexOf(x.keperluan) === -1) sel.insertAdjacentHTML('beforeend', '<option>' + esc(x.keperluan) + '</option>');
    sel.value = x.keperluan; $('eDituju').value = x.dituju; $('eKet').value = x.keterangan;
    $('eMsg').className = 'msg';
    var med = $('eMedia'); med.innerHTML = '';
    if (x.adaFoto) addMedia(med, id, 'foto', 'Foto');
    if (x.adaTTD) addMedia(med, id, 'ttd', 'Tanda tangan');
    $('editModal').classList.add('open');
  }
  function addMedia(box, id, jenis, label) {
    var btn = document.createElement('button'); btn.className = 'btn secondary small'; btn.textContent = 'Lihat ' + label;
    btn.style.marginRight = '6px';
    btn.onclick = function () {
      btn.disabled = true;
      call('getFile', { id: id, jenis: jenis }).then(function (r) {
        if (!r.ok) { alert(r.error); return; }
        var im = document.createElement('img'); im.src = r.dataUrl; im.alt = label;
        im.style.cssText = 'max-width:100%;display:block;margin-top:8px;border:1px solid #ddd;border-radius:6px';
        box.appendChild(im); btn.remove();
      }).catch(function (e) { alert(e.message); btn.disabled = false; });
    };
    box.appendChild(btn);
  }
  $('eBatal').onclick = function () { $('editModal').classList.remove('open'); };
  $('eSimpan').onclick = function () {
    var m = $('eMsg'); m.className = 'msg';
    call('update', { id: editId, data: {
      nama: $('eNama').value, instansi: $('eInstansi').value, hp: $('eHp').value,
      keperluan: $('eKep').value, dituju: $('eDituju').value, keterangan: $('eKet').value
    } }).then(function (r) {
      if (!r.ok) { m.textContent = r.error; m.className = 'msg error'; return; }
      $('editModal').classList.remove('open'); loadList();
    }).catch(function (e) { m.textContent = e.message; m.className = 'msg error'; });
  };

  /* ---------- Export CSV ---------- */
  function fetchAll() {
    return call('list', Object.assign(filters(), { all: true })).then(function (r) {
      if (!r.ok) throw new Error(r.error); return r.data.rows;
    });
  }
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;           // cegah formula injection di Excel
    return '"' + s.replace(/"/g, '""') + '"';
  }
  $('btnCsv').onclick = function () {
    fetchAll().then(function (rows) {
      var head = ['Tanggal', 'Jam', 'Nama', 'Instansi', 'No HP', 'Keperluan', 'Dituju', 'Keterangan', 'Lokasi'];
      var lines = [head.map(csvCell).join(';')];
      rows.forEach(function (x) {
        lines.push([x.tanggal, x.jam, x.nama, x.instansi, x.hp, x.keperluan, x.dituju, x.keterangan, x.lokasi].map(csvCell).join(';'));
      });
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'buku-tamu-' + new Date().toISOString().substring(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
    }).catch(function (e) { alert(e.message); });
  };

  /* ---------- Cetak laporan / PDF ---------- */
  $('btnPdf').onclick = function () {
    fetchAll().then(function (rows) {
      var f = filters();
      $('repTitle').textContent = 'Laporan Buku Tamu - ' + (settings.namaOPD || '');
      $('repPeriod').textContent = 'Periode: ' + (f.from || 'awal') + ' s.d. ' + (f.to || 'sekarang') +
        (f.keperluan ? ' | Keperluan: ' + f.keperluan : '') + ' | Jumlah: ' + rows.length + ' tamu';
      $('tbody').innerHTML = rows.map(function (x) {
        return '<tr><td>' + esc(x.tanggal) + '</td><td>' + esc(x.jam) + '</td><td>' + esc(x.nama) + '</td><td>' +
          esc(x.instansi) + '</td><td>' + esc(x.hp) + '</td><td>' + esc(x.keperluan) + '</td><td>' + esc(x.dituju) +
          '</td><td>' + esc(x.keterangan) + '</td><td>' + esc(x.lokasi) + '</td><td class="no-print"></td></tr>';
      }).join('');
      setTimeout(function () { window.print(); loadList(); }, 200); // di dialog cetak pilih "Simpan sebagai PDF"
    }).catch(function (e) { alert(e.message); });
  };

  /* ---------- Pengaturan ---------- */
  function fillSettings() {
    call('getSettings').then(function (r) {
      if (!r.ok) return; settings = r.data;
      $('setNama').value = settings.namaOPD; $('setLogo').value = settings.logoUrl;
      $('setKep').value = settings.keperluan;
      $('setFoto').checked = settings.aktifFoto === 'true'; $('setTtd').checked = settings.aktifTTD === 'true';
    }).catch(function () {});
  }
  $('btnSimpan').onclick = function () {
    var m = $('setMsg'); m.className = 'msg';
    call('saveSettings', { settings: {
      namaOPD: $('setNama').value, logoUrl: $('setLogo').value, keperluan: $('setKep').value,
      aktifFoto: String($('setFoto').checked), aktifTTD: String($('setTtd').checked)
    } }).then(function (r) {
      if (!r.ok) { m.textContent = r.error; m.className = 'msg error'; return; }
      m.textContent = 'Pengaturan tersimpan.'; m.className = 'msg ok'; init();
    }).catch(function (e) { m.textContent = e.message; m.className = 'msg error'; });
  };
})();
