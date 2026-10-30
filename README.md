# Charisna Homestay

Aplikasi manajemen kos dan homestay multi-properti. [Buka pratinjau web](https://nothingtoleft.github.io/charisna-homestay/).

## Fitur aktif

- Kelola properti, lantai, kamar, kapasitas, dan status unit.
- Data penghuni, kontak darurat, foto KTP, deposit, tanggal masuk, akhir kontrak, dan riwayat check-out.
- Tagihan, kuitansi, bukti bayar, pengeluaran, ringkasan okupansi dan keuangan.
- Pesan WhatsApp disiapkan untuk dibuka di WhatsApp; pengiriman otomatis belum tersedia.
- Backup dan pulihkan JSON; ekspor data penghuni ke CSV.
- Panel Cloud untuk login Firebase dan transfer data manual dengan konfirmasi.
- Pratinjau web otomatis lewat GitHub Pages.

## Mulai pakai

Buka pratinjau web. Di sidebar, tekan **Kelola** pada **Scope Properti** untuk menambah, mengubah, atau menghapus properti dan lantai. Kamar harus dipindahkan lebih dulu sebelum properti atau lantainya dapat dihapus.

Data disimpan di `localStorage` browser. Buat backup JSON sebelum membersihkan data browser atau pindah perangkat. Penghapusan data browser menghapus data lokal yang belum diunggah.

## Firebase

Panel **Cloud** menerima konfigurasi Web App dari project `charisna-kost-manager`. Aktifkan Email/Password Authentication dan deploy `firestore.rules`. **Unggah lokal** dan **Unduh cloud** memerlukan konfirmasi karena mengganti seluruh snapshot. Sinkronisasi otomatis dan penyelesaian konflik antarperangkat belum tersedia. Dokumen dengan foto besar dapat melampaui batas Firestore.

## Build

`npm run build` menyiapkan halaman aktif di `dist/`. Build Android memakai Capacitor; build Windows memakai Electron. Paket terbaru belum diuji pada perangkat. Kode React lama tetap disimpan sebagai referensi migrasi, tetapi bukan halaman yang diterbitkan. Lihat [arsitektur](docs/ARCHITECTURE.md), [status fitur](docs/FEATURE_MATRIX.md), dan [catatan perubahan](CHANGELOG.md).

Halaman memakai Tailwind, Font Awesome, Google Fonts, dan Firebase SDK dari CDN saat fitur cloud dipakai. Koneksi internet diperlukan untuk aset dan cloud tersebut.

© Charisna Homestay.
