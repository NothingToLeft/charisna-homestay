# Rilis CHARISNA KOST

Workflow Build Release hanya menyiapkan draft; tidak menerbitkan otomatis. Gunakan tag versi yang belum ada dan cocok dengan package.json. Kedua paket dibangun dari commit workflow yang sama. Rilis lama tidak ditimpa.

## Signing Android
Keystore harus dipertahankan selamanya agar update bisa dipasang. Secrets repository hanya diakses workflow rilis, bukan PR dari fork. Cadangkan keystore privat di luar repo. Password lokal dilindungi Windows DPAPI, sehingga salinannya membutuhkan akun Windows yang sama; pindah mesin memerlukan ekspor rahasia secara aman oleh pemilik. Jangan kirim kunci/password ke chat atau commit.

## Pembaruan desktop Windows

- Pasang installer NSIS v1.0.8 atau lebih baru satu kali. Versi portable tetap diperbarui manual.
- Aplikasi memeriksa rilis stabil GitHub saat dibuka dan setiap empat jam. Pengguna memilih kapan mengunduh dan memulai ulang.
- Tiap pembaruan desktop memerlukan versi paket baru dan rilis stabil yang dipublikasikan. Commit, deploy web, dan draft belum memicu popup.
- Pertahankan nama installer, `latest.yml`, dan `.exe.blockmap` dari build yang sama pada rilis. Workflow memeriksa metadata sebelum membuat draft.
- Uji OTA dengan dua versi installer, akun Windows serta data contoh yang terpisah. Setelah mulai ulang, periksa nomor versi dan data brankas.

## Sebelum Publish
- Download APK, installer, portable, dan checksum.
- Uji login owner/staf, buka/kunci brankas, simpan, restart, backup/restore, tugas/foto, rekap, serta keluar akun.
- Uji HP/tablet dan Windows dengan data contoh dahulu.
- Cadangkan aplikasi lama. APK debug dan release berbeda tanda tangan, sehingga update langsung dapat ditolak Android. Jangan uninstall sebelum backup selesai.
- Windows tanpa Authenticode dapat menampilkan reputasi publisher belum dikenal; jangan mengklaim signed installer.

## Rollback
Pertahankan backup dan versi lama. Snapshot v1 terenkripsi tidak dapat dibaca aplikasi sebelum v1.0.5. Untuk masalah UI gunakan perbaikan maju dengan brankas tetap dipertahankan. Jangan menghapus folder data aplikasi sebagai langkah troubleshooting.
