# Buku Tamu Digital + QR Code
Dinas Perpustakaan dan Kearsipan Kabupaten Boalemo

Aplikasi buku tamu 100% gratis: tamu memindai QR Code, mengisi form dari HP (tanpa instal aplikasi, tanpa login), data masuk ke Google Sheets milik Anda. Admin melihat, mencari, dan merekap data lewat halaman admin.

## 1. Pilihan teknologi dan alasannya

| Bagian | Teknologi | Alasan |
|---|---|---|
| Tampilan | HTML + CSS + JavaScript biasa | Tanpa build, mudah dirawat pemula |
| Hosting | GitHub Pages (gratis) | URL publik HTTPS, wajib HTTPS agar kamera HP bisa dipakai |
| Backend + database | Google Apps Script + Google Sheets | Tanpa server, gratis, data bisa dibuka langsung di Sheets |
| Foto & tanda tangan | Folder Google Drive privat | Tidak bisa diakses publik, hanya lewat login admin |
| QR Code | qrcode-generator (cdnjs, lisensi MIT) | Gratis, mendukung SVG dan PNG |

## 2. Struktur folder

```
bukutamu/
├── README.md
├── backend/
│   └── Code.gs              <- tempel di Google Apps Script
└── frontend/                <- unggah ke GitHub Pages
    ├── index.html           <- form tamu (alamat yang di-QR)
    ├── qr.html              <- halaman cetak QR
    ├── admin.html           <- login + dashboard admin
    ├── css/style.css
    └── js/
        ├── config.js        <- HANYA file ini yang perlu Anda edit
        ├── guest.js
        ├── qr.js
        └── admin.js
```

## 3. Skema data (Google Sheets)

Sheet **Tamu** (dibuat otomatis oleh `setup()`):

| Kolom | Isi |
|---|---|
| ID | Kode unik, contoh `BT-1A2B3C4D` |
| Waktu | Waktu ISO WITA |
| Tanggal / Jam | `yyyy-MM-dd` / `HH:mm:ss` (WITA) |
| Nama, Instansi, NoHP | Diisi tamu |
| Keperluan, Dituju, Keterangan | Diisi tamu |
| Lokasi | Dari parameter `?lokasi=` pada QR |
| FotoID, TTDID | ID berkas di folder Drive privat |

Sheet **Pengaturan**: pasangan Kunci/Nilai (nama OPD, URL logo, daftar keperluan, foto/tanda tangan aktif atau tidak).

### Kebijakan keamanan
- Publik hanya bisa memanggil `submit` dan `publicSettings`. Semua aksi lain (lihat, edit, hapus, pengaturan, ambil foto) wajib token admin.
- Password admin disimpan di **Script properties**, bukan di kode atau Sheets. Token login berlaku 6 jam, dan login dibatasi 5 kali gagal per 10 menit.
- Spreadsheet dan folder Drive **jangan dibagikan** ke publik. Hanya Anda (dan admin yang Anda tunjuk) yang boleh punya akses.
- Semua input dibersihkan di server (tag HTML dibuang, panjang dibatasi) dan di-escape saat ditampilkan (anti-XSS). Sel yang diawali `= + - @` diberi tanda petik agar tidak dieksekusi sebagai rumus.
- Anti-spam: kolom honeypot, batas waktu minimal pengisian 3 detik, maksimal 3 kiriman per nomor HP per 10 menit, dan 40 kiriman global per menit.
- Form memuat pernyataan persetujuan data pribadi (UU PDP No. 27 Tahun 2022) dan wajib dicentang.
- **Catatan jujur:** Apps Script web app gratis tidak bisa membaca alamat IP pengunjung, jadi pembatasan laju memakai nomor HP dan batas global, bukan IP. Itu cukup untuk buku tamu instansi, tetapi bukan perlindungan setara firewall.

## 4. Panduan langkah demi langkah (pemula)

### A. Siapkan Google Sheets dan backend (±10 menit)
1. Buka https://sheets.google.com dengan akun Google Anda → **Blank** → beri nama `Buku Tamu Boalemo`.
2. Menu **Extensions → Apps Script**. Hapus kode bawaan, lalu tempel seluruh isi `backend/Code.gs`. Klik ikon simpan.
3. Pilih fungsi `setup` di daftar fungsi atas, klik **Run**. Setujui izin akses (klik *Advanced → Go to ... (unsafe)* → *Allow*; ini aman karena skrip milik Anda sendiri). Ini membuat sheet `Tamu`, `Pengaturan`, dan folder Drive privat.
4. Klik ikon roda gigi **Project Settings** → bagian **Script properties** → **Add script property**:
   - Property: `ADMIN_PASSWORD`
   - Value: password admin Anda (panjang, sulit ditebak) → **Save**.
5. Klik **Deploy → New deployment** → ikon roda gigi → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, salin **Web app URL** (berakhiran `/exec`).

> Setiap kali Anda mengubah `Code.gs`, buat versi baru: **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**. URL tetap sama.

### B. Pasang URL backend di front-end
Buka `frontend/js/config.js`, ganti `GANTI_DENGAN_URL_WEB_APP_ANDA/exec` dengan URL dari langkah A.5. Biarkan `BASE_URL` kosong dulu.

### C. Hosting gratis di GitHub Pages
1. Daftar di https://github.com → **New repository** → nama `buku-tamu`, **Public** → Create.
2. **Add file → Upload files**, unggah **isi folder `frontend/`** (index.html, qr.html, admin.html, folder css dan js). Klik **Commit changes**.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)` → Save.
4. Tunggu 1–2 menit. Alamat Anda: `https://NAMAAKUN.github.io/buku-tamu/`.
   - Form tamu: `.../index.html`
   - Cetak QR: `.../qr.html`
   - Admin: `.../admin.html`
5. Isi `BASE_URL` di `config.js` dengan alamat itu (tanpa garis miring akhir), unggah ulang file tersebut.

> Repo harus Public pada paket gratis GitHub Pages. Itu aman: di dalamnya hanya kode tampilan. Data tamu dan password tidak ada di repo.
> Alternatif hosting gratis lain: Cloudflare Pages atau Netlify (unggah folder `frontend/`).

### D. Uji coba
1. Buka `index.html`, isi form, kirim. Cek sheet `Tamu` di Google Sheets.
2. Buka `admin.html`, login dengan password tadi, periksa dashboard dan tabel.
3. Atur nama OPD, logo, dan pilihan keperluan di tab **Pengaturan**. Untuk logo, unggah `logo.png` ke repo GitHub lalu isi alamat publiknya (https).

## 5. Membuat dan mencetak QR Code
1. Buka `https://NAMAAKUN.github.io/buku-tamu/qr.html`.
2. Isi **Lokasi**, misalnya `resepsionis, ruang-baca` (satu QR per lokasi, dipisah koma), pilih A4 atau A5, klik **Buat QR**.
3. **Unduh PNG/SVG** per lembar, atau klik **Cetak** (di dialog cetak bisa pilih *Save as PDF*).
4. Tempel di meja resepsionis atau pintu masuk, lalu **uji pindai dengan HP** sebelum dicetak banyak. Kolom Lokasi di data akan menunjukkan dari QR mana tamu mengisi.

Tips cetak: biarkan area putih di sekeliling QR, jangan diperkecil di bawah ±4 cm, dan laminasi agar awet.

## 6. Pemeliharaan dan batas kuota gratis

| Layanan | Batas gratis (perkiraan, bisa berubah) | Dampak untuk buku tamu |
|---|---|---|
| Google Sheets | ±10 juta sel per file | Sangat longgar; arsipkan per tahun |
| Apps Script | Waktu eksekusi total harian terbatas, tiap eksekusi maks. beberapa menit; jumlah penerima/penggunaan layanan ada kuota harian | Cukup untuk ratusan tamu per hari |
| Google Drive | 15 GB per akun (dibagi Gmail dan Foto) | Foto dikompres ±30–60 KB, jadi puluhan ribu foto masih muat |
| GitHub Pages | Situs ±1 GB, trafik ±100 GB/bulan | Jauh lebih dari cukup |

Periksa kuota terbaru di dokumentasi Google (Apps Script quotas) dan GitHub Pages sebelum mengandalkan angka di atas.

Rutinitas yang disarankan:
- **Bulanan:** unduh CSV dari admin sebagai cadangan.
- **Tahunan:** salin sheet `Tamu` ke file arsip, lalu kosongkan baris lama (sisakan baris judul).
- **Ganti password admin** berkala di Script properties. Token lama otomatis kedaluwarsa dalam 6 jam.
- Jika menonaktifkan foto/tanda tangan di Pengaturan, tamu tidak lagi diminta mengunggahnya (hemat penyimpanan Drive).
- Kebijakan retensi data: tetapkan berapa lama data tamu disimpan dan hapus data yang sudah tidak diperlukan (prinsip UU PDP).
- Jika form menampilkan "Gagal memuat formulir": cek `API_URL` di `config.js` dan pastikan deployment diatur *Anyone*.

## 7. Batasan yang perlu diketahui
- Halaman admin dapat dibuka siapa saja, tetapi tanpa password yang benar tidak ada data yang bisa dilihat; semua data dijaga di sisi server.
- Pengiriman form memakai Apps Script sehingga respons bisa 1–3 detik.
- Ekspor PDF memakai fitur cetak browser (pilih *Save as PDF*), sehingga tidak butuh layanan berbayar.
