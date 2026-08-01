# Release Checklist

## Logic dan data

- [ ] Tambah, edit, dan hapus pada seluruh modul.
- [ ] Relasi properti-kamar dan kamar-penghuni valid.
- [ ] Nominal negatif/0 ditolak sesuai aturan.
- [ ] Data bertahan setelah restart.
- [ ] Import merge dan replace diuji dengan backup terpisah.

## Offline dan sync

- [ ] CRUD bekerja saat airplane mode.
- [ ] Queue terkirim setelah koneksi kembali.
- [ ] Penghapusan tidak muncul kembali dari perangkat kedua.
- [ ] Akun A tidak dapat membaca data akun B.
- [ ] Error jaringan tidak menghapus local data.

## UI

- [ ] Infinix Note 40 Pro+ portrait/landscape.
- [ ] Huawei MatePad SE 11 portrait/landscape.
- [ ] Windows minimum 920x620.
- [ ] Browser Chrome/Edge terbaru.
- [ ] Keyboard navigation untuk form dan modal.

## Build

- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Windows installer membuka aplikasi.
- [ ] Portable EXE dapat menyimpan backup.
- [ ] APK debug dapat diinstal dan database bertahan.
