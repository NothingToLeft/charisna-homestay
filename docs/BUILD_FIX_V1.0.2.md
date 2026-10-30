> ARSIP: Dokumen ini membahas implementasi React lama. Untuk desain Charisna aktif, baca README.md di akar repo, docs/ARCHITECTURE.md, dan docs/FEATURE_MATRIX.md.

# Build Fix v1.0.2

## Akar masalah

Build v1.0.1 sudah melewati instalasi dependency, lalu berhenti pada pemeriksaan TypeScript karena empat masalah terpisah:

1. Dua transaksi Dexie memasukkan tujuh tabel sebagai argumen terpisah, sementara overload TypeScript yang tersedia hanya menerima jumlah argumen terbatas.
2. Fungsi kosong untuk cleanup Firebase terinferensi sebagai `() => undefined`, sedangkan Firebase mengembalikan cleanup `() => void`.
3. Cursor dan snapshot pagination Firestore membentuk inferensi tipe melingkar pada TypeScript 5.9.
4. `allowImportingTsExtensions` dipakai pada project Node tanpa `noEmit`.

## Solusi

- Gunakan array tabel pada transaksi Dexie tanpa mengurangi cakupan transaksi.
- Berikan tipe cleanup `() => void` dan tangani race condition ketika unsubscribe terjadi sebelum Firebase selesai diinisialisasi.
- Berikan tipe Firestore eksplisit pada constraints, query, dan snapshot.
- Aktifkan `noEmit` pada `tsconfig.node.json`.
- Gunakan `tsc -b` melalui perintah `npm run typecheck` agar project references benar-benar diperiksa.

## Dampak

Tidak ada perubahan skema database, format backup, struktur Firestore, atau tampilan. Data lokal dan cloud tetap kompatibel dengan v1.0.0/v1.0.1. Perubahan hanya memperbaiki build dan lifecycle listener Auth.

## Verifikasi rilis

GitHub Actions harus melewati urutan berikut:

```text
npm install
npm run build
npm run build:desktop:win
npx cap add android
npx cap sync android
./gradlew assembleDebug
```

Tag rilis yang digunakan adalah `v1.0.2`; jangan menimpa tag `v1.0.1` yang sudah gagal.
