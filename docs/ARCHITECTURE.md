# Arsitektur aktif

- `index.html`: UI dan logika bisnis aktif, dengan login gate Firebase. Data lokal dipisah per UID memakai prefiks legacy `CHARISNA_HOMESTAY_ENTERPRISE_V6`.
- `public/cloud-sync.js`: autentikasi Firebase, pemetaan role, dan transfer snapshot owner.
- `public/roles.js`: pembuatan akun petugas oleh owner, tugas kebersihan, dan portal petugas.
- `firestore.rules`: owner mengakses data utama; petugas hanya profil serta tugas yang ditugaskan. Path Firestore: `users/{uid}/charisna/current`.
- `firestore.rules`: akses dibatasi ke UID pemilik dokumen.
- `scripts/build-static.mjs`: menyalin aset aktif ke `dist/`.
- `.github/workflows/pages.yml`: menerbitkan `index.html` dan modul Cloud ke GitHub Pages.
- `capacitor.config.ts` dan `desktop/`: wadah Android dan Windows untuk hasil `dist/`.

## Data

Browser menyimpan data utama lokal. Upload/download Cloud mengganti satu snapshot penuh, tanpa antrean offline, merge, atau deteksi konflik. Perlu backup sebelum transfer. Batas dokumen Firestore dapat menjadi masalah bila foto disimpan sebagai data URL.

## Arah berikutnya

Pindahkan logika dari satu HTML ke modul bertipe; gunakan penyimpanan lokal terstruktur, sinkronisasi per-entitas, penyimpanan foto terpisah, dan migrasi data versi lama. Semua memerlukan uji data nyata sebelum diaktifkan.

## Brankas v1.0.5
Snapshot lokal memakai kunci per akun bersufiks `:vault`, dienkripsi AES-256-GCM oleh `vault-crypto.js` dan `vault-store.js`. Migrasi mempertahankan sumber sampai ciphertext tersimpan. UI dibuka setelah brankas berhasil didekripsi. Konflik penulisan antartab ditolak. Kunci integrasi SuperApp berada dalam `privateIntegrations` di brankas dan tidak ikut snapshot Cloud. Enkripsi lokal tidak berarti Cloud terenkripsi end-to-end.
