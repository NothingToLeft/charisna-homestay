# Layanan kalender kamar

Worker ini menyimpan rentang tanggal lokal, blok yang diimpor, dan URL feed eksternal pada D1 khusus. Feed keluar hanya berisi tanggal berstatus tidak tersedia. Nama tamu, data pembayaran, dan identitas tidak dikirim. Pemegang tautan iCal dapat membaca tanggal. Cabut tautan dari aplikasi jika perlu memutuskan akses.

## Pemasangan

1. Gunakan akun Cloudflare yang berwenang untuk CHARISNA KOST. Buat D1 khusus dan salin database ID ke salinan lokal dari wrangler.example.toml.
2. Isi CALENDAR_FEED_HOSTS dengan hostname HTTPS penyedia yang sudah diverifikasi, dipisahkan koma. Worker menolak pengalihan URL dan tidak mengambil URL dari host di luar daftar.
3. Jalankan migrasi schema.sql pada D1. Pasang secret CALENDAR_ADMIN_KEY berupa 32 byte acak dalam format hex melalui Wrangler, lalu deploy Worker dengan konfigurasi tersebut. Jangan commit secret.
4. Di Registry, aktifkan iCal dan pilih kamar. Simpan URL impor penyedia bila ada. Buka bagian Kalender OTA di server dan masukkan origin Worker serta kunci khusus kalender. Publikasikan dan salin tautan .ics ke kolom impor kalender OTA.
5. Cocokkan satu perubahan tanggal dua arah sebelum mengandalkan sinkronisasi. Setiap kamar menyimpan satu feed masuk. Penyedia mengatur waktu pengambilan kalender keluar. Worker mengambil kalender masuk setiap 15 menit. Aplikasi membaca hasil dan mempublikasikan perubahan lokal selama owner dan brankas aktif.

Format masuk saat ini adalah VEVENT sehari penuh dengan DTSTART dan DTEND eksklusif. Acara berulang dan acara berjam ditolak. Jika pembacaan gagal, blok terakhir tetap berlaku. Jangan menganggap koneksi Airbnb, Booking.com, Agoda, atau Google Calendar telah terverifikasi sampai contoh feed dan hasil impor nyata diperiksa.

URL feed masuk dapat berisi token penyedia. D1 dan brankas menyimpannya sebagai konfigurasi privat. Gunakan satu deployment untuk satu operator. Tautan yang dicabut dibuat ulang dengan token baru ketika diterbitkan kembali.
