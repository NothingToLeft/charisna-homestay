# Security

## Cloud isolation

Firestore data is stored under `users/{uid}/...`. The supplied rules only allow the authenticated owner UID to read or write that subtree.

## Credentials

- Firebase Web API keys are configuration identifiers, but they still must be restricted in Google Cloud Console where possible.
- Do not commit service-account JSON, keystores, passwords, or private tokens.
- Runtime Firebase config is stored locally in the browser/WebView profile.
- Firebase Authentication manages the password and persistent session.

## Desktop hardening

- `nodeIntegration` is disabled.
- `contextIsolation` and sandbox are enabled.
- Renderer access is limited to two IPC methods for text-file save/open.
- External navigation is denied and HTTPS links open in the system browser.

## Backup

JSON backups contain business data in readable text. Store them in an encrypted drive or protected cloud folder and delete obsolete copies.

## Reporting a vulnerability

Do not include production credentials or personal tenant data in a public issue. Use a private channel with the repository owner.
