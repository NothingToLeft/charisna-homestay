# Feature Matrix

| Area | Web/PWA | Android | Windows | Offline | Cloud Sync |
|---|---:|---:|---:|---:|---:|
| Dashboard | Ya | Ya | Ya | Ya | Dari data tersinkron |
| Properti | Ya | Ya | Ya | Ya | Ya |
| Kamar | Ya | Ya | Ya | Ya | Ya |
| Penghuni | Ya | Ya | Ya | Ya | Ya |
| Keuangan | Ya | Ya | Ya | Ya | Ya |
| Tugas | Ya | Ya | Ya | Ya | Ya |
| Ganti password | Ya | Ya | Ya | Tidak | Firebase Auth |
| Reset password email | Ya | Ya | Ya | Tidak | Firebase Auth |
| Backup JSON | Ya | Ya | Ya | Ya | Tidak diperlukan |
| Import backup | Ya | Ya | Ya | Ya | Masuk queue |
| Export CSV | Ya | Ya | Ya | Ya | Tidak diperlukan |
| Installer/portable | Tidak | Tidak | Ya | Ya | Ya saat online |
| Install PWA | Ya | WebView native | Tidak diperlukan | Ya | Ya |
| APK debug via Release | Tidak | Ya | Tidak | Ya | Ya |

## Belum direkonstruksi dari aplikasi asal

- Kamera/barcode dan OCR.
- Bluetooth/ESC-POS receipt.
- QRIS payment integration.
- WhatsApp template automation.
- Push notification dari server.
- Statistik lanjutan dan PDF receipt/invoice.
- Fasilitas dan maintenance dengan foto.

Fondasi data dan shell platform sudah dibuat agar modul tersebut dapat ditambahkan tanpa mengganti arsitektur utama.
