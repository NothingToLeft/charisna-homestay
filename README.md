# Management Offline Suite

Aplikasi manajemen properti **offline-first** untuk Web/PWA, Android (Capacitor), dan Windows Desktop (Electron).

> ZIP yang diberikan adalah hasil dekompilasi aplikasi Flutter, bukan source Flutter/Dart asli. Repository ini merupakan rekonstruksi clean-room: tidak menyalin source hasil dekompilasi, tidak memakai credential Firebase lama, dan tidak menanam API key di GitHub.

## Fitur yang sudah tersedia

- Dashboard okupansi dan arus kas
- CRUD properti, kamar, penghuni, transaksi, dan tugas
- Penyimpanan lokal IndexedDB melalui Dexie
- Tetap dapat dipakai tanpa internet
- Antrean sinkronisasi otomatis ketika koneksi kembali
- Firebase Authentication Email/Password
- Firestore per akun dengan rules terisolasi
- Konflik data berdasarkan `updatedAt` terbaru
- Soft delete/tombstone agar penghapusan ikut tersinkron
- Ganti password dari Pengaturan
- Reset password melalui email
- Backup JSON, import backup, dan export CSV
- PWA installable
- Windows installer dan portable executable
- Android debug APK melalui GitHub Release
- UI responsif untuk HP, tablet, desktop, dan web

## Menjalankan di komputer

```bash
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite, biasanya `http://localhost:5173`.

## Menjalankan sebagai aplikasi desktop

```bash
npm install
npm run dev:desktop
```

## Build Windows

Di Windows:

```bash
npm install --no-audit --no-fund
npm run build:desktop:win
```

Hasil berada di folder `release/` dalam bentuk installer dan portable `.exe`.

## Build Android

```bash
npm install --no-audit --no-fund
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

Untuk build tanpa Android Studio setelah folder Android tersedia:

```bash
cd android
gradlew.bat assembleDebug
```

APK debug berada di `android/app/build/outputs/apk/debug/app-debug.apk`.

## Firebase Spark

Aplikasi tidak menggunakan Cloud Functions, App Hosting, atau layanan yang mewajibkan Blaze.

1. Buat project Firebase.
2. Aktifkan Authentication > Email/Password.
3. Buat Firestore Database.
4. Deploy `firestore.rules`.
5. Tambahkan Web App di Firebase Project Settings.
6. Salin config Web App ke menu **Pengaturan > Konfigurasi Firebase Spark**.
7. Buat akun atau login dari aplikasi.

## GitHub

Panduan paling rinci ada di [docs/GITHUB_STEP_BY_STEP.md](docs/GITHUB_STEP_BY_STEP.md).

Workflow `release.yml` tidak menggunakan `actions/upload-artifact`. File `.exe` dan `.apk` langsung diunggah ke GitHub Release ketika tag `v*` dibuat, sehingga menghindari masalah kuota artifact sementara.

## Pengujian

```bash
npm run check
npm test
npm run build
```

## Struktur dokumentasi

- `docs/ARCHITECTURE.md`
- `docs/IMPLEMENTATION_NOTES.md`
- `docs/API.md`
- `docs/GITHUB_STEP_BY_STEP.md`
- `docs/FIREBASE_STEP_BY_STEP.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/MIGRATION_FROM_APK.md`
- `SECURITY.md`
- `CHANGELOG.md`

## Skrip bantuan Windows

Buka folder `scripts/windows/`:

- `START_WEB.bat` — install dependency dan menjalankan aplikasi Web.
- `BUILD_WINDOWS.bat` — validasi, test, lalu membuat installer/portable EXE.
- `PUSH_GITHUB.bat` — upload repository ke GitHub.
- `RELEASE_GITHUB.bat` — membuat tag dan memicu build GitHub.
- `DEPLOY_FIREBASE_RULES.bat` — login Firebase dan deploy security rules.
