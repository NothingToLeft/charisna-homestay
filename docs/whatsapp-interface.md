# Pengaturan koneksi WhatsApp

Dialog ini mengikuti identitas CHARISNA KOST yang sudah ada: Plus Jakarta Sans, warna emerald, permukaan terang, dan teks operasional dalam bahasa Indonesia. Emerald menandai tindakan utama dan koneksi yang benar-benar siap. Warna status selalu disertai penjelasan teks.

ENERGY 1 / RHYTHM 2 / MOTION 1. Pemisah dan jarak membedakan koneksi, kode penghubung, dan pengiriman terakhir. Bayangan hanya mengangkat dialog dari halaman. Tidak ada animasi, gambar baru, dekorasi, atau statistik pemasaran. Bantuan instalasi dilipat karena tidak diperlukan setiap kali membuka pengaturan.

## Perilaku

- Kode tersimpan diperiksa otomatis ketika dialog dibuka. Status terhubung hanya muncul setelah endpoint pendamping mengembalikan `ready: true`.
- Kode baru tetap tersamarkan, bisa ditampilkan saat diisi, dan dikosongkan setelah berhasil disimpan. Kode tersimpan tidak ditampilkan kembali.
- Kode lama dipertahankan jika penyimpanan kode pengganti gagal. Memeriksa kode tersimpan tidak menulis ulang data.
- Kesalahan koneksi tampil di dialog. Pengiriman dengan status `UNCERTAIN` meminta pemeriksaan WhatsApp agar pesan tidak terkirim dua kali.
- Tombol buka pendamping dan unduh pendamping memakai tautan asli. Membuka dialog tidak mengirim pesan.
- Dialog memakai semantik native, label input, pesan status, fokus keyboard, Escape, dan pengembalian fokus ke tombol pembuka.

## Verifikasi

Pengujian browser memakai fixture terisolasi dengan respons pendamping simulasi, tanpa akun, data pelanggan, atau pengiriman pesan. Cakupan: kode kosong, tampil/sembunyikan kode, simpan berhasil, antrean kosong, status tidak pasti, sesi belum siap, kode ditolak, jaringan gagal, rollback kode saat simpan gagal, Escape, pemeriksaan kode tersimpan, dan bantuan instalasi.

Ukuran yang diperiksa: 320×640, 375×812, 768×1024, 812×375, dan 1280×900. Dialog tidak meluber horizontal dan semua kontrol yang terlihat memiliki tinggi minimal 44 CSS px. Mode reduced motion dan pembesaran teks dialog juga diperiksa. Pemeriksaan ini bukan uji perangkat Android fisik atau pengiriman WhatsApp nyata.
