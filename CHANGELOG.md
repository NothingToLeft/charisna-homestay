# Changelog

## [1.0.3] - 2026-08-02

### Fixed

- Disabled electron-builder's deprecated implicit tag publishing with `--publish never`, preventing successful Windows packaging from failing when `GH_TOKEN` is intentionally reserved for the separate GitHub CLI upload step.
- Added explicit verification for the NSIS installer, portable executable, and Android APK before release upload.
- Hardened release uploads so a failed individual asset upload terminates the workflow with a clear error.
- Added package author metadata to remove the electron-builder package warning.

### Changed

- Kept artifact creation and GitHub Release upload as separate responsibilities: electron-builder only packages the application, while the authenticated `gh release upload` steps publish the final files.

## [1.0.2] - 2026-08-02

### Fixed

- Switched large Dexie transactions to the table-array overload so backup import and local-data reset compile safely with seven tables.
- Corrected Firebase auth subscription cleanup typing and prevented a delayed asynchronous subscription from leaking after component disposal.
- Added explicit Firestore query, constraint, and snapshot types to remove TypeScript 5.9 circular inference errors in paginated synchronization.
- Enabled `noEmit` for the Vite Node TypeScript project, making `allowImportingTsExtensions` valid during project builds.
- Synchronized the runtime application version with the package release version.

### Changed

- Added an explicit `typecheck` command and made `build` and `check` use TypeScript project-reference mode, so CI catches configuration and application type errors consistently.

## [1.0.1] - 2026-08-02

### Fixed

- Resolved `npm ERESOLVE` by aligning `typescript-eslint` with TypeScript 5.9.2.
- Updated GitHub Actions runtimes to Node 24-compatible action versions.
- Preserved separate Windows and Android release jobs with direct GitHub Release uploads.

## [1.0.0] - 2026-08-01

### Added

- Clean-room cross-platform project for Web/PWA, Android, and Windows.
- Dashboard with property, room, tenant, occupancy, task, and financial summaries.
- CRUD modules for properties, rooms, tenants, transactions, and tasks.
- IndexedDB offline database with Dexie.
- Local-first writes, sync queue, retry tracking, soft deletion, and last-write-wins conflict handling.
- Firebase Email/Password Authentication and Firestore synchronization compatible with Spark plan.
- Runtime Firebase configuration without committed cloud credentials.
- Automatic and manual synchronization.
- Cloud password change and reset-email flow.
- JSON backup/import and CSV export.
- Electron desktop bridge for native file save/open dialogs.
- Capacitor Android configuration.
- PWA manifest and offline app-shell cache.
- GitHub CI and tag-based Windows/Android release workflow without `upload-artifact`.
- Indonesian architecture, implementation, Firebase, GitHub, migration, and release documentation.
