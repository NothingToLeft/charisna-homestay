# CHARISNA KOST

Aplikasi manajemen kos multi-properti. [Buka pratinjau web](https://nothingtoleft.github.io/charisna-homestay/).

## Fitur aktif

- Kelola properti, lantai, kamar, kapasitas, dan status unit.
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

## Build

`npm run build` menyiapkan halaman aktif di `dist/`. Build Android memakai Capacitor; build Windows memakai Electron. Paket terbaru belum diuji pada perangkat. Lihat [arsitektur](docs/ARCHITECTURE.md), [status fitur](docs/FEATURE_MATRIX.md), dan [catatan perubahan](CHANGELOG.md).

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
