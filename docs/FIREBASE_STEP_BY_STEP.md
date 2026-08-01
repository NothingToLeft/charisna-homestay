# Firebase Spark Langkah demi Langkah

## 1. Buat project

1. Buka Firebase Console.
2. Klik **Add project**.
3. Analytics boleh dinonaktifkan agar setup lebih sederhana.
4. Tetap gunakan Spark plan.

## 2. Authentication

1. Buka **Build > Authentication**.
2. Klik **Get started**.
3. Buka **Sign-in method**.
4. Aktifkan **Email/Password**.

## 3. Firestore

1. Buka **Build > Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi terdekat.
4. Pilih production mode.
5. Dari komputer project, install Firebase CLI jika diperlukan:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

Rules membatasi setiap akun hanya ke path UID miliknya.

## 4. Web App config

1. Buka **Project settings**.
2. Pada **Your apps**, klik ikon Web `</>`.
3. Beri nama `Management Offline`.
4. Tidak wajib mengaktifkan Hosting saat mendaftarkan app.
5. Salin nilai `apiKey`, `authDomain`, `projectId`, `appId`, dan nilai opsional lainnya.
6. Buka aplikasi > **Pengaturan** > isi semua field wajib > **Simpan konfigurasi**.
7. Muat ulang aplikasi satu kali.
8. Buat akun atau login.

## 5. Uji offline-online

1. Login dan tekan **Sinkronkan sekarang**.
2. Matikan internet.
3. Tambah atau edit data; perubahan harus langsung terlihat.
4. Tutup dan buka kembali aplikasi; data harus tetap ada.
5. Aktifkan internet.
6. Tunggu auto sync atau tekan tombol sinkron.
7. Login di perangkat kedua untuk memastikan data masuk.
