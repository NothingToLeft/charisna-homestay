# Sinkronisasi otomatis

Owner cukup masuk, membuka brankas, dan menyimpan perubahan melalui formulir aplikasi. Perubahan dikirim setelah jeda singkat untuk menggabungkan penyimpanan berdekatan. Listener menerima perubahan perangkat lain; pemeriksaan berkala tetap tersedia sebagai cadangan. Aplikasi tidak menjalankan sinkronisasi setelah ditutup atau saat perangkat tidur.

Dialog Cloud memisahkan status, akun, dan integrasi SuperApp. Status **Tersinkron** hanya ditampilkan setelah data lokal dan server cocok atau perubahan selesai diterapkan. Pemeriksaan tanpa perubahan tidak mengubah status menjadi sibuk. Indikator online tambahan disembunyikan agar header tidak menampilkan dua status yang membingungkan.

Permintaan baca server memiliki batas 20 detik. Jika gagal atau tidak merespons, rincian kesalahan tetap terlihat dan pemeriksaan diantrekan ulang otomatis. Batas ini berlaku untuk pembacaan; transaksi penulisan tetap mengikuti penyelesaian SDK Firestore agar penulisan yang belum pasti tidak dibatalkan atau dikirim ganda. Saat offline, data yang sudah disimpan di brankas tetap berada di perangkat. Sinkronisasi dilanjutkan ketika koneksi kembali dan aplikasi aktif.

Tindakan **Coba sinkronkan ulang** dan **Pulihkan dari cloud** disimpan di bagian **Pemulihan & tindakan lanjutan**. Tindakan pemulihan mempertahankan konfirmasi dan cadangan terenkripsi. Bagian ini tidak perlu dipakai untuk pengeditan biasa.

SuperApp membutuhkan penghubungan akun sekali dengan kode yang dibuat di SuperApp. Setelah terhubung, mekanisme pengiriman ringkasan otomatis yang sudah ada tetap berjalan. Status membedakan koneksi tersimpan, pengiriman tertunda, dan pengiriman terakhir berhasil. Tidak ada izin akun baru atau akses data tambahan yang diberikan oleh perubahan dialog ini.

## Verifikasi

Tes mesin menggunakan sumber sinkronisasi asli dengan Firestore dan brankas simulasi: unggah setelah simpan, pembaruan dari listener, pemeriksaan tanpa perubahan, offline/online, batas waktu dan retry, serialisasi pembacaan, pergantian akun, serta penggabungan perubahan dua arah. Tes merge yang sudah ada tetap dijalankan.

Browser memakai sumber aplikasi lengkap dengan layanan Firebase simulasi. Penyimpanan formulir benar-benar memicu jalur simpan aplikasi dan unggah otomatis ke backend simulasi; perubahan remote diterapkan ke aplikasi. Dialog, fokus keyboard, tema gelap, status kesalahan/retry, dan ukuran 320/375/768 px serta landscape diperiksa. Tes ini tidak menggunakan data pelanggan dan bukan pengujian produksi langsung pada dua perangkat fisik.
