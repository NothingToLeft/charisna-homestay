# Panduan GitHub Langkah demi Langkah

## A. Buat repository

1. Masuk ke GitHub.
2. Klik **New repository**.
3. Isi nama, misalnya `management-offline-suite`.
4. Pilih **Private** bila data atau source tidak ingin dilihat publik.
5. Jangan centang README, `.gitignore`, atau License karena sudah tersedia.
6. Klik **Create repository**.

## B. Upload paling mudah melalui website

1. Ekstrak ZIP project.
2. Buka repository kosong di GitHub.
3. Klik **uploading an existing file**.
4. Seret seluruh isi folder project, termasuk folder `.github`.
5. Isi commit message `Initial offline-first release`.
6. Klik **Commit changes**.

Catatan: beberapa file tersembunyi seperti `.gitignore` dan folder `.github` kadang tidak ikut saat drag dari aplikasi tertentu. Metode Git di bawah lebih aman.

## C. Upload melalui Git di Windows

Buka Terminal/PowerShell di dalam folder project:

```powershell
git init
git add .
git commit -m "Initial offline-first release"
git branch -M main
git remote add origin https://github.com/USERNAME/management-offline-suite.git
git push -u origin main
```

Ganti `USERNAME` dan nama repository.

## D. Build otomatis Windows dan Android

Workflow rilis berjalan ketika Anda membuat tag versi:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Lalu:

1. Buka tab **Actions** dan pilih **Build Release**.
2. Tunggu job `windows` dan `android` selesai.
3. Buka tab **Releases**.
4. Download installer `.exe`, portable `.exe`, atau APK debug.

File diunggah langsung ke GitHub Release memakai GitHub CLI pada runner. Workflow tidak memakai `actions/upload-artifact`, sehingga tidak menambah kuota artifact sementara yang sebelumnya penuh.

## E. Update versi berikutnya

```powershell
git add .
git commit -m "Describe the update"
git push
git tag v1.0.1
git push origin v1.0.1
```

Gunakan tag baru setiap rilis. Jangan mengulang tag yang sama.

## F. Bila npm memakai registry perusahaan yang tidak lengkap

Gunakan registry publik untuk project ini:

```powershell
npm config set registry https://registry.npmjs.org/
npm install --no-audit --no-fund
```

Setelah instalasi berhasil, commit `package-lock.json` agar build berikutnya dapat kembali memakai `npm ci`.
