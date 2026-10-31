# CHARISNA KOST

Aplikasi manajemen kos multi-properti. [Buka pratinjau web](https://nothingtoleft.github.io/charisna-homestay/).

## Fitur aktif

- Kelola properti, lantai, kamar, kapasitas, dan status unit.
- Data penghuni, kontak darurat, foto KTP, deposit, tanggal masuk, akhir kontrak, pengingat kontrak yang mendekat, dan riwayat check-out.
- Tagihan, kuitansi, bukti bayar, pengeluaran, ringkasan okupansi dan keuangan.
- Pesan WhatsApp disiapkan untuk dibuka di WhatsApp; pengiriman otomatis belum tersedia.
- Backup dan pulihkan JSON; ekspor data penghuni ke CSV.
- Login Firebase untuk owner; owner membuat username dan PIN 4 digit petugas, lalu memberi tugas. Petugas hanya melihat tugasnya.
- Panel Cloud owner untuk transfer data manual dengan konfirmasi.
- Pratinjau web otomatis lewat GitHub Pages.

## Login dan data

Aplikasi menampilkan halaman login Firebase sebelum dashboard. Alamat repo masih memakai slug lama agar tautan pratinjau tetap berfungsi. Akun harus dibuat atau diaktifkan di Firebase Authentication. Reset password tersedia dari halaman login. Data lokal disimpan terpisah menurut UID akun; saat login pertama, aplikasi menawarkan menyalin data lokal dari versi lama. Login pertama memerlukan internet. Sesi yang sudah tersimpan dapat dipulihkan oleh Firebase, tetapi aset dari CDN tetap memerlukan koneksi bila belum ada dalam cache.

## Mulai pakai

Buka pratinjau web. Di sidebar, tekan **Kelola** pada **Scope Properti** untuk menambah, mengubah, atau menghapus properti dan lantai. Kamar harus dipindahkan lebih dulu sebelum properti atau lantainya dapat dihapus.

Data disimpan di `localStorage` browser. Buat backup JSON sebelum membersihkan data browser atau pindah perangkat. Penghapusan data browser menghapus data lokal yang belum diunggah.

## Peran dan Firebase

Lihat [panduan owner dan petugas](docs/ROLE_ACCESS.md). Aturan Firestore role harus diterbitkan sebelum fitur petugas dipakai.

## Firebase

Konfigurasi Web App project `charisna-kost-manager` sudah tertanam. Buka panel **Cloud** dan login dengan akun Firebase Anda. Aktifkan Email/Password Authentication dan deploy `firestore.rules` bila belum aktif. **Unggah lokal** dan **Unduh cloud** memerlukan konfirmasi karena mengganti seluruh snapshot. Sinkronisasi otomatis dan penyelesaian konflik antarperangkat belum tersedia. Dokumen dengan foto besar dapat melampaui batas Firestore.

## Build

`npm run build` menyiapkan halaman aktif di `dist/`. Build Android memakai Capacitor; build Windows memakai Electron. Paket terbaru belum diuji pada perangkat. Kode React lama tetap disimpan sebagai referensi migrasi, tetapi bukan halaman yang diterbitkan. Lihat [arsitektur](docs/ARCHITECTURE.md), [status fitur](docs/FEATURE_MATRIX.md), dan [catatan perubahan](CHANGELOG.md).

Halaman memakai Tailwind, Font Awesome, Google Fonts, dan Firebase SDK dari CDN saat fitur cloud dipakai. Koneksi internet diperlukan untuk aset dan cloud tersebut.

© CHARISNA KOST.
