# Security

## Cloud isolation

Firestore owner data is stored under `users/{uid}/...`. Security Rules permit the owner UID to access its subtree. Active cleaners can read only their assigned tasks and their own cleaning photo records. The Charisna Google account also holds `Cloud Datastore User` IAM access for the private Apps Script archive. IAM bypasses client Security Rules and can read/write the whole Firestore database; protect that account with two-step verification.

## Credentials

- Firebase Web API keys are public configuration identifiers. Authorization depends on Firebase Authentication, Security Rules, and IAM. The key is API restricted in Google Cloud Console; review its allowed API list before any change.
- Do not commit service-account JSON, keystores, passwords, or private tokens.
- Runtime Firebase config is stored locally in the browser/WebView profile.
- Firebase Authentication manages the password and persistent session.
- Cleaner login uses a four-digit PIN by product requirement. This has limited entropy; use unique PINs, disable unused staff, and monitor unusual sign-in attempts. The owner-only `staffPins` documents store recoverable PINs in plaintext as requested. Never export or share those documents.
- The active static page keeps business records and identity photos in browser `localStorage` until manually synced. Anyone with access to an unlocked device/browser profile can read them. Use device lock and encrypted disk; clear old browser profiles before handing a device to someone else.

## Desktop hardening

- `nodeIntegration` is disabled.
- `contextIsolation` and sandbox are enabled.
- Renderer access is limited to two IPC methods for text-file save/open.
- External navigation is denied and HTTPS links open in the system browser.

## Backup

JSON backups contain business data in readable text. Store them in an encrypted drive or protected cloud folder and delete obsolete copies.

## Repository

The public repo has branch protection, required CI, Dependabot alerts, secret scanning, push protection, and CodeQL. `package-lock.json` pins build dependencies. CI fails on high or critical npm advisories. See [security audit](docs/SECURITY_AUDIT_2026-10-31.md) for current findings and limits.

## Reporting a vulnerability

Do not include production credentials or personal tenant data in a public issue. Use a private channel with the repository owner.
