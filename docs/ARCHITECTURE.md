# Arsitektur aktif

- `index.html`: UI dan logika bisnis aktif, data lokal `CHARISNA_HOMESTAY_ENTERPRISE_V6`.
- `public/cloud-sync.js`: konfigurasi Web App publik, login Firebase, dan transfer snapshot manual. Path Firestore: `users/{uid}/charisna/current`.
- `firestore.rules`: akses dibatasi ke UID pemilik dokumen.
- `scripts/build-static.mjs`: menyalin aset aktif ke `dist/`.
- `.github/workflows/pages.yml`: menerbitkan `index.html` dan modul Cloud ke GitHub Pages.
- `capacitor.config.ts` dan `desktop/`: wadah Android dan Windows untuk hasil `dist/`.

Folder `src/` berisi implementasi React lama. Fitur di dalamnya tidak aktif pada halaman baru. Jangan menganggap Firebase sync lama berfungsi dalam desain baru.

## Data

Browser menyimpan data utama lokal. Upload/download Cloud mengganti satu snapshot penuh, tanpa antrean offline, merge, atau deteksi konflik. Perlu backup sebelum transfer. Batas dokumen Firestore dapat menjadi masalah bila foto disimpan sebagai data URL.

## Arah berikutnya

Pindahkan logika dari satu HTML ke modul bertipe; gunakan penyimpanan lokal terstruktur, sinkronisasi per-entitas, penyimpanan foto terpisah, dan migrasi data versi lama. Semua memerlukan uji data nyata sebelum diaktifkan.
