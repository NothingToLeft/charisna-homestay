# Contributing

1. Buat branch dari `main`.
2. Jangan commit credential, backup pengguna, APK produksi, keystore, atau service-account JSON.
3. Jalankan `npm run check`, `npm test`, dan `npm run build`.
4. Perubahan data model wajib menyertakan migrasi Dexie dan pembaruan dokumentasi.
5. Perubahan sync wajib diuji dalam kondisi offline, reconnect, dan dua perangkat.
6. Gunakan commit message yang menjelaskan dampak bisnis, bukan hanya nama file.
