# Catatan Migrasi dari APK

## Yang dapat dipastikan dari hasil dekompilasi

- Aplikasi asal dibangun dengan Flutter.
- Package Android: `com.kelolapro_apk`.
- Version name: `1.37.36`.
- Ada jejak Firebase Auth, Firestore, Storage, Functions, Messaging, Analytics, dan Crashlytics.
- Ada izin kamera, kontak, lokasi, Bluetooth, notifikasi, penyimpanan, audio, dan billing.
- Aset menunjukkan modul properti, penghuni, okupansi, keuangan, statistik, tenggat, fasilitas, bantuan, WhatsApp, QRIS, dan receipt.

## Batasan

Hasil dekompilasi tidak menyediakan source Dart yang maintainable, model database lengkap, atau test suite asli. File native Flutter AOT tidak layak dijadikan dasar source produksi baru.

## Pendekatan repository ini

Repository membuat ulang fondasi bisnis umum secara clean-room. Credential dan API key yang tertanam di aplikasi lama tidak disalin. Modul yang belum direkonstruksi harus diverifikasi melalui penggunaan APK/APKS asli atau rekaman layar agar perilakunya dapat dipetakan tanpa menyalin source proprietary.

## Kapan APK/APKS asli dibutuhkan

- Membandingkan urutan layar dan menu.
- Memeriksa format invoice/receipt.
- Mencatat aturan bisnis yang tidak terlihat di asset.
- Menguji flow kamera, barcode, Bluetooth, WhatsApp, dan notifikasi.

APK tambahan tidak diperlukan untuk membangun atau menguji fondasi repository ini.
