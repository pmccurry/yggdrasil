# M15 — Tauri Updater Design

## Overview

Add auto-update infrastructure to Yggdrasil using `tauri-plugin-updater`. The app checks for updates on startup (silently), shows a non-intrusive status bar chip when an update is available, and lets the user install from Settings > About. No update is ever applied without explicit user confirmation.

## Architecture

**Plugin-driven, no custom Rust commands.** The `tauri-plugin-updater` JS API provides `check()`, `downloadAndInstall()`, and progress callbacks. The `@tauri-apps/plugin-process` provides `relaunch()`. All update logic lives in TypeScript.

**Update endpoint:** `https://github.com/pmccurry/yggdrasil/releases/latest/download/latest.json` — a static JSON file attached to each GitHub release containing version, platform URLs, and signatures.

## Section 1: Plugin Setup & Configuration

- **Cargo.toml**: `tauri-plugin-updater = "2"`
- **JS packages**: `@tauri-apps/plugin-updater`, `@tauri-apps/plugin-process`
- **lib.rs**: Register `tauri_plugin_updater::Builder::new().build()`
- **tauri.conf.json**: `bundle.createUpdaterArtifacts: true`, `plugins.updater` block with pubkey + endpoint
- **capabilities/default.json**: Add `updater:default`, `updater:allow-check`, `updater:allow-download-and-install`, `process:allow-restart`
- **Signing key**: `pnpm tauri signer generate -w ~/.tauri/yggdrasil.key`. Public key in tauri.conf.json (committed). Private key at `~/.tauri/yggdrasil.key` (never committed). For CI: `TAURI_SIGNING_PRIVATE_KEY` repository secret.

## Section 2: Update Check Flow

**`src/shell/updater.ts`** wraps the plugin JS API:
- `checkForUpdate()` — returns `{ available, version, notes, update }` or null on error
- `downloadAndInstall(update, onProgress)` — downloads, installs, calls `relaunch()`

**Startup check**: `useEffect` in `AppShell` (App.tsx), runs once on mount. Calls `checkForUpdate()`. If available, sets `updateAvailable` in AppContext. Silent on error — no interruption.

**Manual check**: AboutTab button calls same function, shows inline result.

## Section 3: Status Bar Update Chip

When `appState.updateAvailable` is set, StatusBar renders a chip:
- Text: `"v{version} available"`
- Color: `var(--status-warning)` accent
- Click: Opens Settings modal (About tab)
- Disappears on install or dismiss

**AppContext additions:**
- `updateAvailable: { version: string; notes: string; update: Update } | null`
- `SET_UPDATE_AVAILABLE` and `DISMISS_UPDATE` actions

## Section 4: AboutTab Update UI

Replace disabled "Check for Updates" button with working implementation:
- **Button**: Calls `checkForUpdate()`, shows "Checking..." while running
- **No update**: "You're on the latest version" (green, auto-clears)
- **Update available**: Version + notes + "Install Update" button
- **Error**: "Could not check for updates" (muted)
- **Install flow**: "Downloading... 45%" → "Installing..." → `relaunch()`
- **No auto-install**: User must explicitly click "Install Update"

All inline in AboutTab — no separate components needed.

## Section 5: Signing & Build

- Key generated once via `pnpm tauri signer generate`
- Private key: `~/.tauri/yggdrasil.key` (never committed, CI secret)
- Public key: pasted into `tauri.conf.json` (committed)
- Build with `TAURI_SIGNING_PRIVATE_KEY` env var produces `.sig` files
- `latest.json` manually created per release (automated in M16 via GitHub Actions)

## Files

| File | Action |
|------|--------|
| `src-tauri/Cargo.toml` | Edit: add tauri-plugin-updater |
| `src-tauri/src/lib.rs` | Edit: register updater plugin |
| `src-tauri/tauri.conf.json` | Edit: add updater config + createUpdaterArtifacts |
| `src-tauri/capabilities/default.json` | Edit: add updater + process permissions |
| `package.json` | Edit: add @tauri-apps/plugin-updater, @tauri-apps/plugin-process |
| `src/shell/updater.ts` | Create: JS API wrappers |
| `src/store/AppContext.tsx` | Edit: add updateAvailable state + actions |
| `src/App.tsx` | Edit: startup update check useEffect |
| `src/workspace/StatusBar.tsx` | Edit: add update available chip |
| `src/workspace/Settings/AboutTab.tsx` | Edit: wire check + install buttons |
| `DECISIONS.md` | Edit: signing key storage decision |
