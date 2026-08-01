# API Internal

Aplikasi tidak menyediakan HTTP API publik. Modul berikut adalah kontrak internal utama.

## Repository

### `saveEntity(collection, input)`

Menyimpan record ke IndexedDB, mengisi metadata versi, dan membuat outbox.

### `softDeleteEntity(collection, id)`

Mengisi `deletedAt` dan membuat outbox agar penghapusan tersinkron.

### `getTable(collection)`

Mengembalikan table Dexie untuk collection domain.

## Synchronization

### `synchronizeNow()`

Mengirim queue, menarik perubahan remote per collection, lalu mengirim kembali local record yang masih lebih baru.

### `setAutoSyncEnabled(enabled)`

Menyimpan preferensi lokal dan mengaktifkan atau menghentikan interval sinkronisasi.

## Firebase

### `saveFirebaseConfig(config)`

Memvalidasi dan menyimpan runtime config pada perangkat.

### `loginWithEmail(email, password)` / `registerWithEmail(...)`

Menggunakan Firebase Authentication Email/Password.

### `changeCloudPassword(currentPassword, newPassword)`

Melakukan reauthentication lalu mengganti password.

## Backup

### `exportBackup()`

Membuat file JSON lengkap.

### `importBackup(content, replaceExisting)`

Memvalidasi schema version, menggabungkan atau mengganti database, lalu membuat queue sinkronisasi.

### `exportAllCsv()`

Menghasilkan satu file CSV dengan section untuk setiap collection.
