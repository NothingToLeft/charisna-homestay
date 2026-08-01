MANAGEMENT OFFLINE SUITE - PATCH v1.0.3

Masalah yang diperbaiki:
Build Windows selesai membuat installer dan portable EXE, tetapi electron-builder mencoba memublikasikan hasil secara implisit lalu gagal karena GH_TOKEN tidak tersedia pada langkah build.

Cara memasang:
1. Ekstrak isi ZIP patch ke folder utama project yang berisi package.json.
2. Pilih Replace files in the destination.
3. Klik dua kali APPLY_FIX_AND_RELEASE_V1.0.3.bat.
4. Tunggu sampai script menyatakan source dan tag v1.0.3 berhasil dikirim.
5. Buka GitHub > Actions > Build Release dan pilih run v1.0.3.
6. Setelah Windows dan Android hijau, unduh hasil di GitHub > Releases > v1.0.3.

Catatan:
- Jangan menjalankan ulang tag v1.0.2.
- Patch tidak membutuhkan Personal Access Token GitHub.
- Peringatan chunk Vite bukan penyebab kegagalan rilis.
