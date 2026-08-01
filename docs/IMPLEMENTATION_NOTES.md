# Implementation Notes

## Keputusan utama

- Rekonstruksi menggunakan React/TypeScript karena source Flutter asli tidak tersedia.
- IndexedDB dipilih agar Web, Electron, dan Capacitor memakai model penyimpanan yang sama.
- Firebase SDK digunakan hanya untuk Auth dan Firestore yang tersedia di Spark.
- Tidak ada Cloud Functions, server berbayar, atau proses backend khusus.
- Firebase config dimasukkan melalui UI agar repository aman dan mudah dipindah antar project.

## Dukungan perangkat

Layout menggunakan breakpoint 1120 px, 820 px, 620 px, dan 390 px. Pada HP, tabel berubah menjadi kartu dan navigasi berpindah ke bawah. Pada tablet dan desktop, sidebar dan tabel penuh digunakan.

## Data contoh

Pada instalasi kosong, aplikasi membuat satu set data contoh. Data contoh dapat diedit/dihapus. Queue contoh dikosongkan agar tidak otomatis terkirim ke cloud sebelum pengguna menilai datanya.

## Area pengembangan berikutnya

- Invoice periodik dan generator tagihan bulanan.
- Foto properti/kamar dengan penyimpanan lokal dan opsi Firebase Storage sesuai kuota Spark.
- Role owner/manager/staff dengan custom claims memerlukan backend tepercaya; untuk Spark murni dapat memakai membership documents dan rules yang lebih kompleks.
- PDF invoice/receipt lokal.
- Audit log immutable.
- Android notification scheduling lokal.

## Perbaikan build 1.0.2

- Dexie menyediakan overload transaksi bertipe untuk jumlah tabel terbatas. Operasi backup dan reset memakai tujuh tabel, sehingga sekarang menggunakan bentuk array agar seluruh tabel tetap berada dalam satu transaksi atomik tanpa melemahkan tipe.
- Subscription Firebase Auth dibentuk secara asinkron. Cleanup sekarang menangani kondisi komponen sudah dilepas sebelum Firebase selesai diinisialisasi, sehingga listener terlambat tidak bocor.
- Pagination Firestore menggunakan anotasi `Query`, `QueryConstraint`, dan `QuerySnapshot` eksplisit untuk menghindari inferensi melingkar TypeScript 5.9 antara cursor dan snapshot.
- Project TypeScript untuk konfigurasi Vite menggunakan `noEmit`, sesuai kebutuhan `allowImportingTsExtensions`.
- Perintah `typecheck` menggunakan mode project references (`tsc -b`) agar pemeriksaan lokal dan CI sama dengan pemeriksaan build rilis.


## Perbaikan rilis desktop 1.0.3

Build Windows dan publikasi aset dipisahkan secara eksplisit. `electron-builder` selalu dijalankan dengan `--publish never`, sehingga tugasnya hanya menghasilkan installer NSIS dan portable EXE. Workflow kemudian memverifikasi kedua file tersebut dan mengunggahnya ke GitHub Release melalui GitHub CLI dengan token bawaan workflow.

Pemisahan ini mencegah dua mekanisme publikasi bersaing, menghindari kebutuhan Personal Access Token pribadi, dan tetap kompatibel dengan repository privat selama workflow memiliki izin `contents: write`.
