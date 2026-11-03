# CHARISNA KOST — status v1.0.5

## Perubahan
- Brankas lokal per akun: AES-256-GCM, PBKDF2-SHA256 600.000 iterasi, salt/IV acak. Sandi tidak dipersistenkan.
- Migrasi menulis snapshot terenkripsi sebelum menghapus salinan lokal biasa. Gagal tulis mempertahankan sumber.
- Backup JSON baru terenkripsi; impor JSON lama tetap didukung. Backup terenkripsi memerlukan sandi yang sama.
- Konflik tab menolak penimpaan. Ekspor cadangan tetap bisa dilakukan saat kuota penyimpanan penuh.
- Firestore membatasi daftar staf ke owner terkait; staf tidak dapat membaca PIN atau data penghuni owner.
- Pages menyertakan semua aset public, termasuk CSS responsif dan helper rekap.
- URL foto perbaikan dibatasi JPEG/PNG/WebP; argumen aksi cicilan di-escape.
- Ekspor kode membuka repo publik, tidak mengekspor DOM yang berisi data pengguna.
- Rilis membuat draft setelah build; APK memakai signing key privat, bukan debug. Windows belum Authenticode-signed.

## Sepuluh fitur operasional yang tersedia
1. Inventaris per properti/kamar.
2. Stok barang dan batas minimum.
3. Riwayat mutasi masuk/keluar/pindah lokasi.
4. Peringatan stok menipis dalam aplikasi.
5. Jadwal perawatan aset.
6. Riwayat perbaikan, biaya, dan foto.
7. Kontrak dan pengingat akhir sewa.
8. Tagihan bertahap dan pencatatan cicilan lunas.
9. Pencatatan meter listrik/air dan biaya.
10. Rekap bulanan Excel/PNG per properti serta arsip Drive.

Pengingat WhatsApp membuka draf; aplikasi tidak dapat membuktikan pesan terkirim. Peringatan operasional bukan push notification saat aplikasi ditutup.

## Batas pengamanan
Enkripsi melindungi data lokal saat terkunci, bukan data di memori saat brankas terbuka. Snapshot Firebase, foto Drive, dan PIN cadangan owner dilindungi akses akun/Rules, bukan end-to-end encryption. PIN staf empat digit tetap mengikuti permintaan owner; jangan bagikan username/PIN di repo.

## Pengujian dan batas bukti
- Tes unit mencakup migrasi brankas, password salah, ciphertext diubah, kuota penuh, antrean simpan, dan migrasi Drive dari kode asli.
- Tes Firestore memakai emulator demo, tidak menyentuh data produksi.
- Uji perangkat fisik ditunda atas permintaan pengguna; hasil web/build bukan bukti kamera/lifecycle perangkat.
- Uji unggah foto nyata dan hasil Gmail/Drive harus dibedakan dari pemeriksaan kode/pemicu.
- Dependency development deepmerge memiliki advisory rendah tanpa patch kompatibel; jangan downgrade PWA secara paksa.

## Pemulihan
Simpan backup sebelum update. Jangan kembali ke versi sebelum brankas tanpa mengekspor data yang dapat dibaca versi tujuan; versi lama tidak memahami snapshot terenkripsi. Jika sandi brankas hilang, snapshot lokal tidak bisa dibuka. Simpan sandi melalui pengelola sandi pribadi.
