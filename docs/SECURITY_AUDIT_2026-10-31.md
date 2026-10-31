# Audit keamanan — 31 Oktober 2026

## Diperiksa

Halaman web aktif, impor/ekspor JSON dan CSV, login owner dan petugas, Firestore Rules, Apps Script arsip foto, paket Android/Windows, workflow GitHub, pengaturan repo, dan dependensi npm. Data produksi penghuni tidak dibaca atau diubah.

## Perbaikan

- Teks pengguna pada kartu kamar, penghuni, tagihan, keluhan, pengeluaran, plugin, dan log WhatsApp di-escape sebelum masuk HTML. Argumen handler dari data impor dikodekan sebagai satu string JavaScript. Toast menggunakan `textContent`.
- URL foto impor dibatasi ke data JPEG. Input foto baru dibatasi ke JPEG/PNG/WebP maksimal 15 MB. Tautan WhatsApp eksternal tidak menerima akses `window.opener`.
- Ekspor CSV mengutip seluruh sel dan menetralkan awalan formula agar tidak dieksekusi spreadsheet.
- Aturan foto hanya memberi petugas aktif akses baca ke foto yang diunggahnya. Owner tetap dapat membaca foto propertinya.
- Versi Capacitor, Electron, electron-builder, Vite, Vitest, React Router, dan Zod diperbarui. Dependensi transitif gRPC ditetapkan ke versi perbaikan. Lockfile ditambahkan; CI memakai `npm ci` dan memblokir advisory tinggi/kritis.
- GitHub mengaktifkan Dependabot alerts/security updates, secret scanning, push protection, dan CodeQL. Branch `main` mewajibkan PR dan CI.

## Batas dan risiko tersisa

- Audit npm produksi: 0 temuan. Audit seluruh dependensi: 29 sedang dan 2 rendah pada rantai alat build/pengembangan; tidak ada tinggi/kritis. Sebagian perbaikan yang disarankan npm akan menurunkan versi mayor alat build, sehingga tidak diterapkan tanpa migrasi dan pengujian paket Android/Windows.
- PIN petugas empat digit serta salinan PIN teks biasa di Firestore mengikuti kebutuhan usaha. Firebase Auth membantu membatasi percobaan, tetapi tidak memberikan jaminan anti-serangan terdistribusi. Belum ada backend yang menerapkan laju percobaan khusus per petugas.
- Apps Script memakai izin Drive/Gmail dan peran IAM `Cloud Datastore User` pada akun Charisna. Peran IAM dapat mengakses seluruh Firestore, bukan hanya koleksi foto. Pembatasan per dokumen memerlukan arsitektur backend lain.
- Foto KTP, bukti pembayaran, dan data penghuni di `localStorage`/backup JSON belum terenkripsi pada tingkat aplikasi. Perangkat dan akun browser harus dijaga.
- Satu alert secret scanning untuk Firebase Web API key adalah konfigurasi publik yang memang diperlukan klien. Kunci ini bukan otorisasi data; pembatasan API telah diperiksa, tetapi belum dipersempit karena klien web/Android/Windows perlu uji regresi sebelum perubahan.
- Data bawaan `index.html` berisi NIK, telepon, dan rekening yang tampak seperti contoh. Statusnya sebagai contoh atau data asli perlu dikonfirmasi. Riwayat Git dapat tetap menyimpan nilai lama meskipun tampilan saat ini diubah.
- Alur unggah foto nyata dari akun petugas sampai Drive/Gmail belum diuji dengan akun produksi. Build web dan unit test tidak membuktikan paket Android/Windows baru berjalan.
