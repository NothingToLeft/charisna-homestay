# CHARISNA KOST

Aplikasi manajemen kos multi-properti. [Buka pratinjau web](https://nothingtoleft.github.io/charisna-homestay/).

## Fitur aktif

- Global search lintas kamar, penghuni, tagihan, pengeluaran, dan inventaris.
- Indikator Online/Offline sederhana, tema gelap, timeline ketersediaan kamar, reminder jatuh tempo, serta template WhatsApp.
- Inventaris, stok, mutasi, maintenance/perbaikan, kontrak, tagihan bertahap, dan meter.
- Audit log mutasi penting dengan undo privat serta pemeriksaan revision agar perubahan stale ditolak.
- Ekspor CSV aman, laporan print, dan mask NIK.
- Data penghuni, kontak darurat, foto KTP, deposit, tanggal masuk, akhir kontrak, pengingat kontrak yang mendekat, dan riwayat check-out.
- Tagihan, kuitansi, bukti bayar, pengeluaran, ringkasan okupansi dan keuangan.
- Pesan WhatsApp disiapkan untuk dibuka di WhatsApp; pengiriman otomatis belum tersedia.
- Backup dan pulihkan JSON; ekspor data penghuni ke CSV.
- Login Firebase untuk owner; owner membuat username dan PIN 4 digit petugas, lalu memberi tugas harian dengan checklist.
- Petugas mengunggah foto sebelum/sesudah pekerjaan; arsip otomatis masuk Google Drive Charisna dan ringkasan masuk Gmail.
- Panel Cloud owner untuk transfer data manual dengan konfirmasi.
- Pratinjau web otomatis lewat GitHub Pages.

## Struktur Google Drive

Rekap bulanan dan arsip foto disimpan dalam satu folder root `CHARISNA KOST` dengan struktur aset → tahun → bulan:

```text
CHARISNA KOST/
├── <Aset>/                  # mis. "Kost 1", "Gabungan Semua Properti"
│   └── <Tahun>/             # mis. 2026
│       └── <Tahun-Bulan>/   # mis. 2026-11
│           ├── Rekap-2026-11.xlsx
│           ├── Audit-2026-11.png
│           └── Kebersihan/<Tanggal>/<Petugas>/<Foto>
└── Sistem/Otomasi, Pemulihan, Proses Rekap
```

Arsip lama dari `CHARISNA KOST/Rekap Bulanan/...` dipindah otomatis ke struktur baru tanpa menghapus atau menduplikasi file (idempotent).

## Login dan data

Aplikasi menampilkan halaman login Firebase sebelum dashboard. Alamat repo masih memakai slug lama agar tautan pratinjau tetap berfungsi. Akun harus dibuat atau diaktifkan di Firebase Authentication. Reset password tersedia dari halaman login. Data lokal disimpan terpisah menurut UID akun; saat login pertama, aplikasi menawarkan menyalin data lokal dari versi lama. Login pertama memerlukan internet. Sesi yang sudah tersimpan dapat dipulihkan oleh Firebase, tetapi aset dari CDN tetap memerlukan koneksi bila belum ada dalam cache.

## Mulai pakai

Buka pratinjau web. Di sidebar, tekan **Kelola** pada **Scope Properti** untuk menambah, mengubah, atau menghapus properti dan lantai. Kamar harus dipindahkan lebih dulu sebelum properti atau lantainya dapat dihapus.

Data disimpan terenkripsi di `localStorage` browser setelah brankas dibuka. Buat backup JSON sebelum membersihkan data browser atau pindah perangkat. Penghapusan data browser menghapus data lokal yang belum diunggah.

## Peran dan Firebase

Lihat [panduan owner dan petugas](docs/ROLE_ACCESS.md). Aturan Firestore role harus diterbitkan sebelum fitur petugas dipakai.

Alur foto dan pengaturan Apps Script dijelaskan di [operasional kebersihan](docs/CLEANING_OPERATIONS.md). Arsip diproses tiap 15 menit, bukan seketika.

## Firebase

Konfigurasi Web App project `charisna-kost-manager` sudah tertanam. Buka panel **Cloud** dan login dengan akun Firebase Anda. Aktifkan Email/Password Authentication dan deploy `firestore.rules` bila belum aktif. **Unggah lokal** dan **Unduh cloud** memerlukan konfirmasi karena mengganti seluruh snapshot. Sinkronisasi otomatis dan penyelesaian konflik antarperangkat belum tersedia. Dokumen dengan foto besar dapat melampaui batas Firestore.

## Audit dan pembaruan 2026-11-21

Audit patch mengerjakan:

- Menutup public sharing Drive untuk lampiran baru, memvalidasi signature MIME, membatasi ukuran, menormalisasi nama file, memakai replacement lock, dan menyediakan penghapusan lampiran terotorisasi.
- Memisahkan snapshot undo privat dari audit display, membatasi 500 snapshot, dan menolak undo ketika revision entitas sudah berubah.
- Menutup XSS pada action hasil render dinamis, formula injection CSV, timeline yang salah lintas properti/rentang tanggal, serta audit mutation yang sebelumnya terlewat.
- Menambahkan changelog ini ke panel **Pengaturan → Changelog & Riwayat Pembaruan Sistem**.

Gate lokal lulus: `npm run check`, `npm test -- --run` (5 file/19 test), `npm run build`, dan `git diff --check`. Uji authenticated Google Drive/Apps Script, Firebase RBAC, vault lintas klien, dan konflik dua perangkat belum dapat dijalankan lokal.

Lihat [catatan perubahan](CHANGELOG.md), [arsitektur](docs/ARCHITECTURE.md), dan [status fitur](docs/FEATURE_MATRIX.md).

Halaman memakai Tailwind, Font Awesome, Google Fonts, dan Firebase SDK dari CDN saat fitur cloud dipakai. Koneksi internet diperlukan untuk aset dan cloud tersebut.

© CHARISNA KOST.

Lihat [audit keamanan](docs/SECURITY_AUDIT_2026-10-31.md) dan [kebijakan keamanan](SECURITY.md) sebelum mengelola data penghuni pada perangkat baru.

## Rilis lewat GitHub

Lihat bagian Menyiapkan rilis GitHub di bawah. Workflow menghasilkan draft dengan APK release bertanda tangan dan paket Windows.



## Pembaruan v1.0.5
Data perangkat kini memakai brankas terenkripsi. Saat pertama membuka sebagai owner, buat sandi brankas minimal 12 karakter dan simpan sendiri. Backup JSON baru ikut terenkripsi. Lihat [status lengkap](docs/PROJECT_STATUS.md).

### Menyiapkan rilis GitHub
1. Buka Actions → Build Release → Run workflow pada main.
2. Isi versi yang sama dengan package.json, misalnya `v1.0.5`.
3. Tunggu verify, Windows, dan Android selesai. Workflow menyiapkan draft GitHub Release.
4. Unduh dan uji paket, lalu tekan Publish release ketika siap.

APK release memakai GitHub Actions secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`. Jangan mengganti keystore untuk pembaruan berikutnya. Pengguna APK debug harus mencadangkan data sebelum pindah ke APK release; tanda tangannya berbeda. Windows installer/portable belum menggunakan sertifikat Authenticode.

Lihat [panduan rilis](docs/RELEASE.md). © Charisna.


## Layanan penghuni dan operasional

Buka Pengaturan → Layanan Penghuni untuk serah terima kamar dengan foto dan paraf, catatan internal penghuni, katalog publik, QRIS merchant, portal penghuni, serta ekspor ringkasan bulanan. Tautan portal acak berlaku 30 hari dan dapat dicabut owner. Check-out mencabut tautan terkait. Publikasikan ulang portal setelah pembaruan tagihan agar penghuni melihat snapshot terbaru. Portal menampilkan maksimum 60 tagihan yang cocok dengan identitas penghuni dan kamar unik.

Penghuni dapat mengirim keluhan dan foto bukti bayar. Owner memeriksa kiriman melalui tombol Portal Penghuni. Keluhan dapat dibuat menjadi tiket. Penyelesaian tiket dengan biaya membuat pengeluaran kas terkait. Pembayaran tetap perlu diverifikasi owner.

QRIS memakai gambar resmi merchant yang diunggah owner. Nominal dibaca dari tagihan dan dimasukkan penghuni pada aplikasi pembayaran. Kode dinamis dari penyedia pembayaran belum terhubung. Batas gambar QRIS 500 KB dan foto kiriman portal 140 KB.

Katalog menerbitkan hanya kamar kosong yang dipilih owner. Pembaruan dan penarikan dilakukan dengan menerbitkan ulang pilihan, termasuk pilihan kosong. Foto pemasaran opsional maksimum 140 KB per unit. Katalog tetap berupa snapshot sampai diperbarui owner.

Pengumuman mendukung template, arsip, dan draf WhatsApp berdasarkan properti. Owner mengirim setiap draf melalui WhatsApp. Ringkasan SuperApp yang tertunda dicoba lagi tiap menit saat aplikasi terbuka dan saat koneksi kembali. MoniFlow tersedia melalui ekspor JSON bulanan dengan pendapatan, pengeluaran, laba, dan okupansi. Endpoint penerimaan langsung MoniFlow belum dikonfigurasi. Pengeluaran tanpa properti ditampilkan terpisah dalam ekspor agar tidak salah dialokasikan.

Catatan kejadian penghuni merupakan catatan internal yang dapat dicari dan dihapus owner. Simpan fakta dan tindak lanjut secara proporsional.

Validasi paket mencakup pemeriksaan sintaks, build, tes unit, 34 pemeriksaan Firestore emulator, serta uji browser sintetis untuk simpan catatan dan paraf serah terima. Belum dilakukan transaksi pembayaran nyata atau pengiriman pesan WhatsApp otomatis. Modul web baru perlu build APK berikutnya agar tersedia dalam APK terpasang.

## v1.0.6 — pembayaran dan konektor
- QRIS unggahan dibaca lokal dan CRC diperiksa. QRIS statis IDR tanpa biaya khusus dapat dibuat bernominal tagihan; nama merchant dan nominal perlu diperiksa di aplikasi bank sebelum transaksi nyata.
- Money Management memiliki kode feed privat untuk ringkasan bisnis. Salin kode dari KOST → Ringkasan bulanan ke Pengaturan Money Management. Sumber dan penerima memperbarui saat aplikasi/brankas terbuka. Kode dapat dicabut dan kedaluwarsa setelah 30 hari tanpa sinkronisasi.
- WhatsApp gratis memakai pendamping Windows `tools/whatsapp-free/Jalankan-WhatsApp.cmd`. Scan QR WhatsApp Web pada PC, lalu simpan kode lokal ke Pengaturan KOST → WhatsApp gratis. Pengumuman memiliki tombol Kirim otomatis via PC. Periksa cakupan properti dan isi pesan pada konfirmasi sebelum mengirim. Status UNCERTAIN memerlukan pemeriksaan manual agar pesan tidak dikirim ganda.
- Pendamping memakai whatsapp-web.js dan sesi WhatsApp Web, bukan layanan resmi Meta Cloud API. Perubahan WhatsApp Web dapat mengganggu kompatibilitas. Sesi dan kode lokal berada di profil Windows di luar repo. PC harus menyala. Pengiriman tetap mengikuti batas dan kebijakan WhatsApp.
- Uji perangkat fisik ditunda karena HP owner sedang dipakai. Pembayaran nyata dan pengiriman WhatsApp memerlukan konfirmasi akun/session owner; jangan menganggap tes unit sebagai bukti transaksi nyata.

### Bukti uji integrasi v1.0.6
- QR bernominal berhasil dibuat dan dipindai ulang melalui pengujian bitmap sintetis; merchant dan checksum dipertahankan.
- Pendamping WhatsApp berhasil dipasangkan dan mengirim satu pesan uji ke akun sendiri. Endpoint menolak akses tanpa kode dan nomor penerima tidak valid. Audit dependency pendamping menunjukkan nol advisory pada saat pemeriksaan.
- Portal produksi menerima foto bukti bayar sintetis melalui browser. Uji ini memeriksa transport unggah, bukan transaksi bank.
- Konektor Money diuji terhadap feed Firestore langsung dengan data sintetis. Ringkasan bersifat tampilan bisnis terpisah agar transaksi ledger tidak tercatat ganda.
- HP Infinix Note 40 Pro Plus 5G belum tersambung; owner menyampaikan perangkat sedang dipakai. Pengujian fisik tetap tertunda.

## Sinkronisasi cloud otomatis
Setelah owner masuk dan membuka brankas, perubahan yang disimpan antre ke cloud sekitar 1,5 detik. Listener Firestore mengambil perubahan perangkat lain otomatis; koneksi online dan pemeriksaan berkala mengulang sinkronisasi yang tertunda. Aplikasi tertutup melanjutkan antrean dari data lokal saat dibuka kembali.

Dalam sesi yang sama, perubahan independen pada record ber-ID digabung. Jika kolom yang sama diubah bersamaan, nilai lokal dipakai dengan salinan konflik tersimpan. Pada koneksi awal tanpa baseline sesi, snapshot dengan waktu simpan terbaru dipakai dan salinan yang akan diganti disimpan terenkripsi. Perangkat lama tetap memakai format snapshot yang sama, tetapi sebaiknya memperbarui aplikasi agar ikut memakai proteksi transaksi baru.

Pengaturan → Cadangan sinkronisasi menyediakan tiga salinan terenkripsi terbaru per akun untuk diunduh dan dipulihkan melalui impor backup. Tidak ada password tersimpan dalam salinan. Jika ruang perangkat tidak cukup membuat salinan, penggantian ditunda. Tombol Cloud tetap tersedia untuk pemeriksaan dan pemulihan.

### Tampilan aplikasi

Tampilan owner, dialog layanan, petugas kebersihan, portal penghuni, dan katalog memakai sistem visual CHARISNA KOST yang konsisten. Layanan dikelompokkan berdasarkan pekerjaan; tema terang/gelap, formulir, tabel, dan kontrol menyesuaikan lebar layar. Panduan dan batas verifikasi tercatat di [DESIGN.md](DESIGN.md). Perubahan web ini belum termasuk build APK/Windows baru.

Pendamping WhatsApp harus berjalan selama pengiriman. Mode normal `Jalankan-WhatsApp.cmd` bekerja tanpa jendela WhatsApp terlihat; mode `Diagnosa-WhatsApp.cmd` menampilkan browser untuk pemeriksaan. Untuk berpindah mode, hentikan pendamping dengan Ctrl+C terlebih dahulu. Laptop harus tetap menyala, tersambung internet, dan tidak sleep.
