# Build Fix v1.0.3

## Gejala

Build web, TypeScript, Electron packaging, installer NSIS, dan portable EXE selesai. Workflow baru gagal pada tahap terakhir dengan pesan:

```text
GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"
```

## Akar masalah

`electron-builder` mendeteksi bahwa workflow dijalankan dari tag Git dan mengaktifkan publikasi implisit. Konfigurasi project sebenarnya sudah mempunyai langkah publikasi terpisah menggunakan `gh release upload`, sehingga `electron-builder` tidak seharusnya mencoba mengunggah file sendiri.

Akibatnya, dua tanggung jawab tercampur:

1. `electron-builder` membuat paket Windows.
2. `electron-builder` mencoba memublikasikan paket tanpa token di proses build.
3. Workflow baru seharusnya mengunggah paket dengan token GitHub bawaan pada langkah berikutnya.

## Solusi

Perintah desktop sekarang menggunakan:

```text
electron-builder --win nsis portable --publish never
```

Dengan desain ini:

- `electron-builder` hanya membuat installer dan portable EXE.
- Workflow memverifikasi bahwa kedua paket benar-benar tersedia.
- `gh release upload` menangani publikasi dengan `${{ github.token }}`.
- Tidak dibutuhkan Personal Access Token pribadi.
- Tidak ada publikasi ganda atau aset yang saling menimpa tanpa pemeriksaan.

## Dampak

Tidak ada perubahan pada database, sinkronisasi, UI, Firebase, atau format data. Perubahan hanya memengaruhi proses packaging dan release automation.

Peringatan chunk Vite di atas 500 kB tidak menyebabkan kegagalan build. Optimasi code splitting sebaiknya dilakukan sebagai perubahan performa tersendiri agar hotfix rilis tetap kecil dan mudah diverifikasi.
