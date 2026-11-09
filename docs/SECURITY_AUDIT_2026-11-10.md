# Audit rilis 1.0.5 — 10 November 2026

## Perbaikan
- Enkripsi lokal per akun; migrasi menulis dan memverifikasi ciphertext sebelum menghapus plaintext.
- Backup terenkripsi, validasi impor, penolakan konflik tab, serta pemulihan saat kuota penyimpanan penuh.
- Daftar staf dibatasi owner; staf tidak memperoleh PIN atau snapshot penghuni owner.
- Checklist tugas menolak duplikasi untuk melewati kewajiban; foto dibatasi tipe gambar aman.
- Ekspor sumber tidak lagi menyertakan DOM pengguna. Kunci SuperApp disimpan dalam brankas, tidak dikirim dalam snapshot Cloud.
- Aset responsif ikut Pages; header tablet dan navigasi pengaturan HP diperbaiki.
- Workflow menghasilkan APK release bertanda tangan serta paket Windows dan checksum.

## Bukti dan batas
- Pemeriksaan sintaks dan build statis berhasil.
- CI sebelum perubahan dokumentasi terakhir: tes unit dan 17 pemeriksaan otorisasi Firestore emulator berhasil; CodeQL berhasil.
- Fixture sintetis memakai modul brankas asli: inventaris tetap ada setelah reload dan buka ulang brankas.
- Lebar 320, 390, 800, 1280, 1440 px tidak menyebabkan overflow dokumen pada halaman inventaris. Tabel memiliki gulir internal.
- Tes kriptografi menggunakan PBKDF2 600.000 iterasi asli; timeout suite 30 detik mengakomodasi mesin lambat.
- Android minimum 7.0 / SDK 24 dan WebView 100. Belum diuji pada perangkat fisik; tidak menjamin setiap model perangkat.
- Windows belum Authenticode-signed. Unggah foto nyata, kamera native, pemulihan file native, dan pengiriman Gmail belum diverifikasi ulang.
- Advisory deepmerge berlevel rendah berada pada tool development; tidak dilakukan downgrade paksa yang merusak PWA.
- Enkripsi lokal tidak melindungi memori saat aplikasi terbuka. Firebase/Drive memakai kontrol akses, bukan E2EE.
- Audit bukan jaminan bebas seluruh bug. Pantau hasil workflow dan backup sebelum memperbarui APK debug yang memakai tanda tangan berbeda.
- Verifikasi akhir CI e536831 berhasil (run 42699347164). Pengulangan lokal mengalami timeout kriptografi bahkan pada 30 detik; kelulusan tes merujuk runner CI, bukan hasil lokal tersebut.

## Hasil publikasi
- PR #22 digabung menjadi 9adb49d; Pages run 42699899503 berhasil. HTML versi terbaru dan seluruh modul brankas merespons HTTP 200.
- Firestore Rules berhasil diterbitkan ke charisna-kost-manager setelah web baru aktif.
- Build Release 42699902876 berhasil. Rilis publik v1.0.5 mencakup APK, installer Windows, portable, dan SHA256SUMS.txt.
- APK diunduh ulang: apksigner valid v2, package com.charisna.kost, versionCode 10005, SDK minimum 24/target 36, supports-screens small/normal/large/xlarge.
- SHA-256 APK: 581708b4fbc99f6e680214fb8d94a1cf8ded4f399997e5d8967bc39f92f81f80.
- GitHub mengubah spasi nama aset menjadi titik; nama dalam checksum rilis disesuaikan. Workflow berikutnya menormalisasi nama sebelum menghitung checksum.
