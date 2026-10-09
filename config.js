/**
 * KONFIGURASI - ubah hanya 2 baris di bawah ini.
 *
 * API_URL  : URL Web App Google Apps Script (berakhiran /exec)
 * BASE_URL : alamat publik situs ini setelah di-hosting (tanpa garis miring di akhir)
 *            contoh GitHub Pages: https://namaakun.github.io/buku-tamu
 *            Dipakai untuk membuat isi QR Code. Jika dikosongkan, otomatis
 *            memakai alamat halaman yang sedang dibuka.
 */
window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbw97AQmeWME9RgqkOm66WysuYX8dScCh6u1KSbxsWZy33VCNEv4Mx4v4dCNP3qAPxLOxw/exec',
  BASE_URL: 'https://sekretariatperpustakaanboalemo-netizen.github.io/BUKU-TAMU/'
};

/* ---------- Fungsi bantu bersama (dipakai semua halaman) ---------- */

// Panggil API Apps Script. Memakai text/plain agar tidak memicu preflight CORS.
window.api = function (action, payload) {
  var body = Object.assign({ action: action }, payload || {});
  return fetch(window.APP_CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); });
};

// Escape HTML agar data tamu tidak bisa menjalankan skrip (anti-XSS)
window.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

window.baseUrl = function () {
  var b = window.APP_CONFIG.BASE_URL;
  if (b) return b.replace(/\/+$/, '');
  return location.href.replace(/[#?].*$/, '').replace(/\/[^\/]*$/, '');
};
