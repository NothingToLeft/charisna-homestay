CHARISNA KOST — Pendamping WhatsApp 1.0.2

Cara memperbarui:
1. Tutup pendamping lama dengan Ctrl+C.
2. Ekstrak ZIP ini ke folder baru.
3. Jalankan Jalankan-WhatsApp.cmd untuk mode normal.
4. Jika QR tidak muncul, tutup pendamping dengan Ctrl+C, lalu jalankan Diagnosa-WhatsApp.cmd.
5. Mode diagnosis membuka browser WhatsApp tersendiri. Biarkan jendelanya terbuka.
6. Periksa apakah WhatsApp Web berhasil terbuka. Scan QR di browser tersebut atau http://127.0.0.1:8772.
7. Jika sesi sudah tersambung, QR memang tidak muncul. Tunggu status WhatsApp terhubung.

Browser pendamping mendeteksi Chrome, Brave, lalu Edge. Browser pendamping menggunakan profil khusus,
bukan profil browsing pribadi. Browser untuk membuka localhost boleh berbeda.
Jika ingin memilih Brave secara manual, buka PowerShell di folder ini, lalu jalankan:
$env:CHARISNA_CHROME_PATH='C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe'
.\Diagnosa-WhatsApp.cmd
Gunakan lokasi brave.exe yang benar pada laptop. Pilihan ini hanya berlaku pada PowerShell tersebut.

Peringatan tampil setelah 2 menit jika persiapan tertahan. Proses tetap boleh pulih jika jaringan membaik.
Jika tetap gagal, kirim teks error atau tahap terakhir dari terminal. Jika browser diagnosis menampilkan
error koneksi atau browser terlalu lama, kirim teks error itu. Jangan kirim kode penghubung atau QR login.
Jangan menonaktifkan antivirus, menghapus sesi, atau memakai profil browser pribadi sebagai jalan pintas.

Node.js minimal 22.12 diperlukan. PC/laptop harus menyala dan tersambung internet.
Sesi dan kode penghubung tetap berada di profil Windows pengguna, bukan di folder ZIP.
Jangan membagikan folder .charisna-kost-whatsapp. Tidak ada pesan yang dikirim otomatis saat startup.
