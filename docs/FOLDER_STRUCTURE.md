# Folder Structure

```text
management-offline-suite/
├─ .github/workflows/       CI dan build GitHub Release
├─ build/                   Icon Electron
├─ desktop/                 Main process dan preload Electron
├─ docs/                    Dokumentasi arsitektur dan operasional
├─ public/                  PWA icons dan static asset
├─ scripts/windows/         Skrip bantuan pengguna Windows
├─ src/
│  ├─ components/           UI reusable
│  ├─ core/                 Type, validation, format, constants
│  ├─ db/                   Dexie schema dan repository
│  ├─ hooks/                Reactive data/network/cloud hooks
│  ├─ pages/                Halaman bisnis
│  ├─ services/             Firebase, sync, backup, domain service
│  └─ styles/               Responsive design system
├─ tests/                   Unit tests
├─ capacitor.config.ts      Android shell config
├─ firebase.json            Firestore/Hosting config
├─ firestore.rules          Security rules
├─ package.json             Dependency dan build scripts
└─ vite.config.ts           Web/PWA build
```
