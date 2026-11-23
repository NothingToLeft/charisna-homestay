# Sewa harian dan komunikasi bilingual

## Atur kamar

Di Units, tambah atau edit kamar. Pilih **Bulanan**, **Harian**, atau **Harian & Bulanan**. Harga bulanan tetap menggunakan kolom lama. Harga per malam disimpan terpisah dan wajib untuk mode harian. Kamar lama tanpa pilihan mode tetap dianggap bulanan.

Mode kamar tidak boleh bertentangan dengan penghuni yang masih aktif. Gunakan mode gabungan jika kamar masih memiliki kontrak bulanan dan juga akan ditawarkan harian. Mengedit kamar mempertahankan metadata yang sudah tersimpan.

## Check-in tamu harian

Pilih interval **Harian**, isi tanggal masuk dan tanggal check-out. Tanggal check-out harus setelah tanggal masuk. Sistem menghitung malam secara eksklusif terhadap check-out: 22–25 November berarti tiga malam, bukan empat.

Harga per malam × jumlah malam menjadi sewa pokok invoice awal. Tarif yang disepakati tersimpan pada penghuni dan invoice; perubahan harga kamar tidak mengubah invoice lama. Invoice manual untuk tamu harian menyediakan tanggal masuk, check-out, dan harga per malam. Listrik dan biaya lainnya ditambahkan secara terpisah. Tamu harian dilewati oleh penerbitan invoice bulanan otomatis. Kalender menandai malam menginap dan mengecualikan tanggal check-out.

Tamu asing dapat memakai jenis identitas **Paspor / Passport**. Nomor paspor tidak dianggap sebagai verifikasi NIK KTP. Dokumen dan identitas tetap mengikuti brankas, sinkronisasi, dan aturan akses data penghuni yang sudah ada.

## Bahasa

Pengaturan profil menyediakan bahasa default. Setiap penghuni dapat memilih **Bahasa Indonesia**, **English**, atau **Indonesia + English**. Bahasa penghuni dipakai untuk pesan tagihan, pengingat, template sambutan, dan kuitansi. Invoice menyimpan bahasa sebagai fallback untuk arsip ketika penghuni tidak lagi aktif.

Pada daftar penghuni, tombol **Sambutan WA** membuka draf sambutan sesuai bahasa tamu, termasuk tanggal masuk, check-out, mode sewa, dan deposit.

Pada pratinjau kuitansi, pilihan **Bahasa / Language** mengubah tampilan dan pesan WhatsApp yang dikirim dari dialog tersebut. Dokumen belum lunas ditampilkan sebagai tagihan, bukan bukti pembayaran. Kuitansi lunas memisahkan sewa, listrik/air, dan biaya lain. Mata uang tetap Rupiah/IDR; tidak ada konversi kurs otomatis.

WhatsApp membuka draf untuk diperiksa dan dikirim pemilik. Nomor internasional dengan kode negara dapat digunakan pada tautan WhatsApp langsung. Pendamping WhatsApp PC versi lama masih membatasi siaran otomatis ke nomor Indonesia; fitur bahasa tidak mengubah batas pendamping itu.

## Kompatibilitas dan verifikasi

Data lama tidak dihapus atau dikonversi massal. Kolom baru bersifat tambahan, dan nilai bulanan lama tetap dipakai. Gunakan web terbaru untuk mengelola sewa harian; APK/Windows lama belum memiliki kontrol dan perhitungan baru. Jalur build native tetap menggunakan aset web yang sama, tetapi binary rilis lama tidak berubah.

Pengujian mencakup jumlah malam lintas tahun/tahun kabisat, tanggal tidak valid, nominal, harga tersimpan, rincian biaya, Indonesia/Inggris/dua bahasa, dokumen belum lunas, check-in paspor, invoice pertama/manual, pengecualian batch bulanan, kalender malam, dan draf WhatsApp. Browser diuji memakai data contoh serta penyimpanan simulasi, tanpa mengirim pesan atau memungut pembayaran nyata. Perangkat Android fisik belum diuji.

## Plugin operasional homestay

Aktifkan modul pada Akses & Ekstensi. Akun lama menerima entri baru sambil mempertahankan pilihan yang tersimpan.

- **Paspor:** simpan kebangsaan, jenis visa dan masa berlaku melalui formulir penghuni. Dari Edit Penghuni, cetak ringkasan untuk RT atau lingkungan. Ringkasan ini merupakan format internal.
- **Sewa harian:** harga per malam menjadi tarif dasar. Tarif tambahan mengikuti Sabtu–Minggu dan tanggal libur yang ditetapkan owner. Invoice menyimpan rincian tarif per tanggal. Jam masuk dan keluar dapat diatur per kamar.
- **Dwibahasa:** kuitansi dan draf WhatsApp mengikuti bahasa tamu. Jika modul dimatikan, dokumen kembali ke bahasa Indonesia. Kuitansi lunas menyembunyikan rincian listrik dan air serta biaya lain yang bernilai nol.
- **iCal:** impor acara sehari penuh melalui file .ics dan unduh kalender per kamar. Blok impor diperiksa saat check-in. Feed HTTPS yang mengizinkan pembacaan browser diperiksa saat brankas terbuka, setelah koneksi kembali, dan setiap lima menit saat tab aktif. URL tersimpan lokal di brankas. Ekspor adalah file .ics berisi hunian lokal. Sinkronisasi dua arah saat aplikasi tutup memerlukan backend dan verifikasi penyedia OTA.
- **Turnover:** check-out harian terakhir menahan kamar. Owner memilih petugas dari form kebersihan yang sudah ada. Aplikasi owner memantau tugas dan melepas blok kamar setelah menerima status DONE dari server. Aplikasi yang ditutup memeriksa status saat dibuka kembali.
- **QRIS:** invoice yang belum lunas dapat menampilkan QRIS dan estimasi USD/EUR/AUD dari kurs yang dimasukkan owner. Pembayaran dan nominal tagihan tetap dalam IDR.

Transit menggunakan tarif per kunjungan dan jam masuk/keluar pada tanggal yang sama. Kalender menahan hari tersebut pada ekspor iCal. Mode ini tidak membuat tagihan bulanan otomatis.
