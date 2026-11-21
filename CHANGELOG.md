## 1.0.5

- Aktifkan brankas lokal dan backup terenkripsi dengan migrasi serta deteksi konflik tab.
- Batasi akses profil staf/owner dan validasi checklist tugas selesai.
- Sertakan seluruh aset Pages; perbaiki foto perbaikan, aksi cicilan, dan ekspor kode privat.
- Siapkan draft rilis Windows dan APK release bertanda tangan.
- Tambahkan regresi brankas, Firestore emulator, dan migrasi Drive dari kode asli.

# Changelog

## 2026-11-21 — Audit keamanan dan 10 fitur online-first

- Tambah global search lintas kamar, penghuni, tagihan, pengeluaran, dan inventaris.
- Tambah indikator Online/Offline sederhana, tema gelap, timeline ketersediaan kamar, reminder jatuh tempo, serta template WhatsApp.
- Tambah inventaris, stok, mutasi, jadwal perawatan, perbaikan, kontrak, tagihan bertahap, dan meter.
- Tambah audit log untuk mutasi penting dengan snapshot undo privat, batas 500 snapshot, dan penolakan undo stale.
- Tambah ekspor CSV aman dari formula injection, print report, dan mask NIK.
- Perketat upload Google Drive: validasi signature MIME, normalisasi ekstensi, batas ukuran, ACL private, replacement lock, dan hapus lampiran terotorisasi.
- Pertahankan `cloud-sync.js`, `charisnaVault`, Firebase auth, dan role-based access.
- Tambah regresi Apps Script untuk iterator Drive, signature JPEG/PNG, dan `LockService`.
- Browser smoke terbatas dan gate lokal lulus; uji authenticated Drive, RBAC, dan multi-client sync belum tersedia di lingkungan lokal.

## 2026-11-03

- Struktur Google Drive dirapikan: rekap bulanan dan foto kebersihan kini langsung di `CHARISNA KOST/<Aset>/<Tahun>/<Tahun-Bulan>/` (lapisan "Rekap Bulanan" dihapus). Migrasi arsip lama berjalan otomatis, idempotent, tanpa menghapus atau menduplikasi file.
- Tambah pengujian unit untuk algoritma layout folder + migrasi (`tests/drive-layout.test.js`).

## 2026-10-31

- Audit keamanan: escape data pada tampilan aktif, perlindungan ekspor CSV, pembatasan foto, pembaruan dependensi dan lockfile, serta pemeriksaan CI yang lebih ketat.

- Tugas kebersihan harian memiliki checklist, pengulangan tujuh hari, dan foto bukti. Apps Script akun Charisna mengarsipkan foto di Drive dan mengirim ringkasan Gmail setiap 15 menit.

- Owner membuat username dan PIN petugas; petugas masuk tanpa pendaftaran. Owner dapat melihat PIN tersimpan, mengganti PIN, dan menonaktifkan akun.

- Login petugas kebersihan, permintaan persetujuan owner, portal tugas, dan aturan Firestore terpisah.

- Halaman login Firebase sebelum dashboard, reset password, pemisahan data lokal per UID, dan rebranding tampilan menjadi CHARISNA KOST.

- Konfigurasi Web App Firebase Charisna tertanam; panel Cloud kini langsung meminta login.

- Desain Charisna menjadi sumber halaman web dan build paket.
- GitHub Pages untuk pratinjau sebelum memakai aplikasi.
- Panel Cloud Firebase untuk login dan transfer snapshot manual.
- Pengelolaan properti dan lantai, dengan penghapusan aman bila kamar masih terkait.
- Tanggal akhir kontrak dan riwayat check-out penghuni.
- Dokumentasi disesuaikan dengan kemampuan desain aktif.

Paket Android/Windows dan alur Firebase dengan akun pengguna belum diverifikasi langsung.
