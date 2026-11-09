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
