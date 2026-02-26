# M15 — Tauri Updater Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auto-update support using tauri-plugin-updater — startup check with status bar chip, manual check + install in About tab.

**Architecture:** No custom Rust commands. The tauri-plugin-updater JS API provides check/download/install. AppContext holds update state. StatusBar shows a chip when an update is available. AboutTab has check + install buttons with progress.

**Tech Stack:** tauri-plugin-updater 2.x, @tauri-apps/plugin-updater, @tauri-apps/plugin-process, React, Tauri v2

---

## Task 1: Add Dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `package.json` (via pnpm add)

**Step 1:** Add Rust dependency to `src-tauri/Cargo.toml`. Add under `[dependencies]`:

```toml
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

**Step 2:** Add JS packages:

```bash
pnpm add @tauri-apps/plugin-updater @tauri-apps/plugin-process
```

**Step 3:** Verify: `cargo check` in `src-tauri/` — zero errors.

---

## Task 2: Register Plugins + Capabilities

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Step 1:** In `src-tauri/src/lib.rs`, register the updater and process plugins. Add these two lines inside `tauri::Builder::default()` chain, after the existing `.plugin(tauri_plugin_dialog::init())` line:

```rust
.plugin(tauri_plugin_updater::Builder::new().build())
.plugin(tauri_plugin_process::init())
```

**Step 2:** In `src-tauri/capabilities/default.json`, add these permissions to the `permissions` array:

```json
"updater:default",
"updater:allow-check",
"updater:allow-download-and-install",
"process:allow-restart"
```

**Step 3:** Verify: `cargo check` in `src-tauri/` — zero errors.

---

## Task 3: Configure Updater in tauri.conf.json

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1:** Add `"createUpdaterArtifacts": true` to the existing `"bundle"` object.

**Step 2:** Add a top-level `"plugins"` object with updater config. The pubkey will be a placeholder until the signing key is generated:

```json
"plugins": {
  "updater": {
    "pubkey": "PLACEHOLDER_REPLACE_AFTER_KEY_GENERATION",
    "endpoints": [
      "https://github.com/pmccurry/yggdrasil/releases/latest/download/latest.json"
    ],
    "windows": {
      "installMode": "passive"
    }
  }
}
```

**Step 3:** Verify: `cargo check` in `src-tauri/` — zero errors. The placeholder pubkey is fine for development; builds will work but updates won't verify until the real key is set.

---

## Task 4: Updater Shell Wrapper

**Files:**
- Create: `src/shell/updater.ts`

**Step 1:** Create the updater wrapper module. This wraps the plugin's JS API with error handling:

```typescript
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: true;
  version: string;
  notes: string;
  update: Update;
}

export interface NoUpdate {
  available: false;
}

export type UpdateCheckResult = UpdateInfo | NoUpdate;

export type DownloadProgress = {
  total: number;
  downloaded: number;
};

export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  try {
    const update = await check();
    if (!update?.available) {
      return { available: false };
    }
    return {
      available: true,
      version: update.version,
      notes: update.body ?? '',
      update,
    };
  } catch (e) {
    console.error('Update check failed:', e);
    return null;
  }
}

export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started' && event.data.contentLength) {
      total = event.data.contentLength;
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength;
      onProgress?.({ total, downloaded });
    }
  });

  await relaunch();
}
```

**Step 2:** Verify: `pnpm tsc --noEmit` — zero errors.

---

## Task 5: AppContext Update State

**Files:**
- Modify: `src/store/AppContext.tsx`

**Step 1:** Add `Update` type import at the top of the file:

```typescript
import type { Update } from '@tauri-apps/plugin-updater';
```

**Step 2:** Add `updateAvailable` to `AppState` interface:

```typescript
interface AppState {
  focusedPanelIndex: number | null;
  settingsOpen: boolean;
  updateAvailable: { version: string; notes: string; update: Update } | null;
}
```

**Step 3:** Add two new actions to the `AppAction` union type:

```typescript
| { type: 'SET_UPDATE_AVAILABLE'; version: string; notes: string; update: Update }
| { type: 'DISMISS_UPDATE' }
```

**Step 4:** Add the two cases to `appReducer`:

```typescript
case 'SET_UPDATE_AVAILABLE':
  return { ...state, updateAvailable: { version: action.version, notes: action.notes, update: action.update } };
case 'DISMISS_UPDATE':
  return { ...state, updateAvailable: null };
```

**Step 5:** Add `updateAvailable: null` to the initial state in `useReducer`.

**Step 6:** Verify: `pnpm tsc --noEmit` — zero errors.

---

## Task 6: Startup Update Check

**Files:**
- Modify: `src/App.tsx`

**Step 1:** Add imports at the top of App.tsx:

```typescript
import { checkForUpdate } from './shell/updater';
```

**Step 2:** In the `AppShell` component, add a `useEffect` that runs once on mount to check for updates. Place it after the existing `useKeyboardShortcuts` call:

```typescript
useEffect(() => {
  checkForUpdate().then(result => {
    if (result?.available) {
      appDispatch({
        type: 'SET_UPDATE_AVAILABLE',
        version: result.version,
        notes: result.notes,
        update: result.update,
      });
    }
  });
}, [appDispatch]);
```

Also add `useEffect` to the import from `react` (it's not currently imported in App.tsx — check if it needs to be added).

**Step 3:** Verify: `pnpm tsc --noEmit` — zero errors.

---

## Task 7: Status Bar Update Chip

**Files:**
- Modify: `src/workspace/StatusBar.tsx`

**Step 1:** Import `useAppContext` at the top:

```typescript
import { useAppContext } from '../store/AppContext';
```

**Step 2:** Inside the `StatusBar` function, destructure app state:

```typescript
const { state: appState, dispatch: appDispatch } = useAppContext();
```

**Step 3:** Add the update chip inside the right-side widget area div (before the widget map). Only render when `appState.updateAvailable` is not null:

```tsx
{appState.updateAvailable && (
  <button
    onClick={() => appDispatch({ type: 'OPEN_SETTINGS' })}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      background: 'none',
      border: '1px solid var(--status-warning)',
      borderRadius: '3px',
      color: 'var(--status-warning)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--font-size-xs)',
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'rgba(255, 170, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'transparent';
    }}
    title="Click to view update details"
  >
    v{appState.updateAvailable.version} available
  </button>
)}
```

**Step 4:** Verify: `pnpm tsc --noEmit` — zero errors.

---

## Task 8: AboutTab Update UI

**Files:**
- Modify: `src/workspace/Settings/AboutTab.tsx`

**Step 1:** Replace the entire `AboutTab.tsx` with the working implementation. The component needs `useAppContext` for update state, local state for check/install flow, and the updater shell wrappers:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useAppContext } from '../../store/AppContext';
import { checkForUpdate, downloadAndInstall, type DownloadProgress } from '../../shell/updater';

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  backgroundColor: 'var(--bg-overlay)',
  border: '1px solid var(--border-default)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
};

function AboutTab() {
  const { state: appState, dispatch } = useAppContext();
  const [version, setVersion] = useState('...');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'up-to-date' | 'error' | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('unknown'));
  }, []);

  // Auto-clear "up to date" message after 5 seconds
  useEffect(() => {
    if (checkResult === 'up-to-date') {
      const timer = setTimeout(() => setCheckResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [checkResult]);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setCheckResult(null);
    const result = await checkForUpdate();
    setChecking(false);

    if (result === null) {
      setCheckResult('error');
    } else if (result.available) {
      dispatch({
        type: 'SET_UPDATE_AVAILABLE',
        version: result.version,
        notes: result.notes,
        update: result.update,
      });
    } else {
      setCheckResult('up-to-date');
    }
  }, [dispatch]);

  const handleInstall = useCallback(async () => {
    if (!appState.updateAvailable) return;
    setInstalling(true);
    setProgress(null);
    try {
      await downloadAndInstall(appState.updateAvailable.update, (p) => {
        setProgress(p);
      });
      // relaunch() is called inside downloadAndInstall — we won't reach here
    } catch (e) {
      console.error('Install failed:', e);
      setInstalling(false);
    }
  }, [appState.updateAvailable]);

  const updateInfo = appState.updateAvailable;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Version */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Version
        </span>
        <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', fontWeight: 600 }}>
          Yggdrasil v{version}
        </span>
      </div>

      {/* Update section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Updates
        </span>

        {updateInfo && !installing && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--status-warning)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <span style={{ color: 'var(--status-warning)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
              v{updateInfo.version} available
            </span>
            {updateInfo.notes && (
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                {updateInfo.notes}
              </span>
            )}
            <button
              style={{ ...btnStyle, borderColor: 'var(--status-warning)', color: 'var(--status-warning)', alignSelf: 'flex-start', marginTop: '4px' }}
              onClick={handleInstall}
            >
              Install Update
            </button>
          </div>
        )}

        {installing && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-overlay)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {progress && progress.total > 0
                ? `Downloading... ${Math.round((progress.downloaded / progress.total) * 100)}%`
                : 'Installing...'}
            </span>
            {progress && progress.total > 0 && (
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.round((progress.downloaded / progress.total) * 100)}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent)',
                  transition: 'width 0.2s',
                }} />
              </div>
            )}
          </div>
        )}

        {!updateInfo && !installing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{ ...btnStyle, opacity: checking ? 0.6 : 1, cursor: checking ? 'default' : 'pointer' }}
              onClick={handleCheck}
              disabled={checking}
            >
              {checking ? 'Checking...' : 'Check for Updates'}
            </button>
            {checkResult === 'up-to-date' && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--status-ok)' }}>
                You're on the latest version
              </span>
            )}
            {checkResult === 'error' && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Could not check for updates
              </span>
            )}
          </div>
        )}
      </div>

      {/* Privacy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Privacy
        </span>
        <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Yggdrasil collects no telemetry. Your data never leaves your machine.
        </span>
      </div>
    </div>
  );
}

export default AboutTab;
```

**Step 2:** Verify: `pnpm tsc --noEmit` — zero errors.

---

## Task 9: Signing Key Generation + Documentation

**Files:**
- Modify: `src-tauri/tauri.conf.json` (replace placeholder pubkey)
- Modify: `DECISIONS.md`
- Modify: `IMPLEMENTATION.md`

**Step 1:** Generate signing keypair (manual step — run in terminal):

```bash
pnpm tauri signer generate -w ~/.tauri/yggdrasil.key
```

This creates `~/.tauri/yggdrasil.key` (private) and `~/.tauri/yggdrasil.key.pub` (public). Copy the contents of `yggdrasil.key.pub`.

**Step 2:** Replace `"PLACEHOLDER_REPLACE_AFTER_KEY_GENERATION"` in `src-tauri/tauri.conf.json` with the actual public key string from the `.key.pub` file.

**Step 3:** Add DECISIONS.md entry:

```
## D039 — Tauri Updater Signing Key Storage
**Date:** 2026-02-26
**Milestone:** M15
**Decision:** Store private signing key at `~/.tauri/yggdrasil.key` outside the repo. Public key committed in tauri.conf.json. For CI, private key stored as GitHub repository secret `TAURI_SIGNING_PRIVATE_KEY`.
**Rationale:** Private key must never be committed. Home directory location is standard for Tauri projects. GitHub secrets provide secure CI injection.
**Alternatives rejected:** Env-only (no persistent file — easy to lose), in-repo encrypted (adds complexity, risk of accidental exposure).
```

**Step 4:** Append M15 plan journal entry to IMPLEMENTATION.md under `### M15 — Plan Journal`. Update status snapshot: M15 → `[IN PROGRESS]`.

**Step 5:** Verify full build: `pnpm tsc --noEmit` + `cargo check` + `pnpm build` — zero errors.

---

## Files Summary

| File | Action |
|------|--------|
| `src-tauri/Cargo.toml` | Edit: add tauri-plugin-updater, tauri-plugin-process |
| `src-tauri/src/lib.rs` | Edit: register updater + process plugins |
| `src-tauri/tauri.conf.json` | Edit: createUpdaterArtifacts + plugins.updater config |
| `src-tauri/capabilities/default.json` | Edit: add updater + process permissions |
| `package.json` | Edit: add @tauri-apps/plugin-updater, @tauri-apps/plugin-process (via pnpm add) |
| `src/shell/updater.ts` | Create: JS API wrappers |
| `src/store/AppContext.tsx` | Edit: updateAvailable state + SET_UPDATE_AVAILABLE/DISMISS_UPDATE actions |
| `src/App.tsx` | Edit: startup update check useEffect |
| `src/workspace/StatusBar.tsx` | Edit: update available chip |
| `src/workspace/Settings/AboutTab.tsx` | Edit: full rewrite with check + install + progress |
| `DECISIONS.md` | Edit: D039 signing key storage |
| `IMPLEMENTATION.md` | Edit: plan journal + status |

## Verification

- `pnpm tsc --noEmit` + `cargo check` + `pnpm build` — zero errors
- AboutTab "Check for Updates" button is clickable and shows checking state
- Status bar chip appears when update is available
- Install button shows download progress bar
- No update is applied without explicit user click on "Install Update"
