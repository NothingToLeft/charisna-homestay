# Arsitektur

## Tujuan

Satu codebase menghasilkan tiga target: Web/PWA, Android, dan Windows. Android-first tetap dipertahankan, tetapi UI dan data layer tidak bergantung pada platform tertentu.

## Lapisan

1. **Presentation** — React pages dan reusable components.
2. **Domain** — entity types, validation, formatting, dan aturan relasi.
3. **Local data** — Dexie/IndexedDB sebagai source of truth perangkat.
4. **Synchronization** — outbox queue dan Firestore adapter.
5. **Platform shell** — Capacitor untuk Android dan Electron untuk Windows.

## Alur tulis data

1. Form divalidasi dengan Zod.
2. Record disimpan ke IndexedDB.
3. Record diberi `updatedAt`, `version`, dan `deviceId`.
4. Outbox `syncQueue` dibuat atau diganti dengan ID deterministik `collection:entityId`.
5. UI langsung membaca perubahan lokal melalui Dexie live query.
6. Ketika online dan login, outbox dikirim ke Firestore.

Aplikasi tidak menunggu server sebelum menampilkan hasil. Ini menjaga respons cepat dan menjamin fungsi utama tetap tersedia saat offline.

## Konflik

Strategi awal adalah last-write-wins berdasarkan `updatedAt`:

- Remote lebih baru: remote mengganti local dan queue lama dihapus.
- Local lebih baru: local tetap dipertahankan dan dimasukkan ke queue.
- Timestamp sama: tidak ada perubahan.

Untuk skala bisnis lebih besar, strategi dapat ditingkatkan ke field-level merge atau audit-log tanpa mengganti UI.

## Penghapusan

Data tidak langsung dihapus secara fisik. `deletedAt` diisi dan record tetap disinkron. Semua query UI memfilter tombstone. Ini mencegah record yang sudah dihapus muncul kembali dari perangkat lain.

## Firestore

Path setiap collection:

```text
users/{uid}/properties/{id}
users/{uid}/rooms/{id}
users/{uid}/tenants/{id}
users/{uid}/transactions/{id}
users/{uid}/tasks/{id}
```

## Skalabilitas

Pull memakai pagination 250 record dan filter `updatedAt > lastSync`. Queue memakai satu item per entity sehingga edit berulang ketika offline tidak menghasilkan ratusan operasi duplikat.
