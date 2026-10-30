# Charisna Homestay

Aplikasi manajemen properti dengan desain terbaru di `index.html`.

**Pratinjau web:** https://nothingtoleft.github.io/charisna-homestay/

## Data dan cloud

Data utama disimpan di browser ini (`localStorage`). Tombol **Cloud** menyediakan login Firebase dan pilihan **Unggah lokal** atau **Unduh cloud**. Keduanya meminta konfirmasi sebelum menimpa data. Sinkronisasi otomatis belum tersedia. Buat backup JSON sebelum berpindah perangkat. Foto berbentuk data URL dapat membuat dokumen Firestore melampaui batas ukuran; perkecil atau keluarkan foto dari backup jika unggah gagal.

Masukkan konfigurasi Web App Firebase project `charisna-kost-manager` lewat panel Cloud. Aktifkan Email/Password Authentication dan deploy `firestore.rules`. Jangan masukkan token sesi editor ke repo.

## Web, Android, Windows

- Web: `index.html` diterbitkan otomatis ke GitHub Pages melalui `.github/workflows/pages.yml`.
- Build aset: `npm run build` membuat `dist/` dari desain terbaru.
- Android: `npm install`, lalu `npm run android:add` (sekali), `npm run android:debug`.
- Windows: `npm install`, lalu `npm run build:desktop:win`.

Paket Android/Windows versi baru belum terverifikasi pada perangkat. Kode React lama masih tersimpan untuk migrasi; build aktif memakai halaman Charisna terbaru.
