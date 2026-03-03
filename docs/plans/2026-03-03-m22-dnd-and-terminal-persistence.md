# M22 — File Drag-and-Drop + Terminal Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable HTML5 file drag-and-drop in embedded webviews and make terminal sessions persist across workspace switches with background notifications.

**Architecture:** Two independent features. Feature 1 is a config flag change on three webview panels. Feature 2 introduces a module-level Terminal State Store that owns xterm.js instances and PTY connections outside React's lifecycle, enabling terminals to survive workspace switches while keeping background notifications active.

**Tech Stack:** Tauri Webview API (`dragDropEnabled`), xterm.js Terminal + FitAddon, Tauri event listeners, module-level Map store

---

## Task 1: Enable HTML5 drag-and-drop on AiChatPanel webview

**Files:**
- Modify: `src/panels/ai-chat/AiChatPanel.tsx:74-80`

**Step 1: Add `dragDropEnabled: false` to webview options**

In `AiChatPanel.tsx`, the webview is created at line 74:

```typescript
const wv = new Webview(hostWindow, label, {
  url: provider!.webviewUrl ?? undefined,
  dragDropEnabled: false,
  x: rect.left,
  y: rect.top,
  width: Math.max(rect.width, 1),
  height: Math.max(rect.height, 1),
});
```

Add `dragDropEnabled: false` after the `url` property.

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

---

## Task 2: Enable HTML5 drag-and-drop on ClaudePanel webview

**Files:**
- Modify: `src/panels/claude/ClaudePanel.tsx:61-67`

**Step 1: Add `dragDropEnabled: false` to webview options**

In `ClaudePanel.tsx`, the webview is created at line 61:

```typescript
const wv = new Webview(hostWindow, label, {
  url: webviewTarget ?? undefined,
  dragDropEnabled: false,
  x: rect.left,
  y: rect.top,
  width: Math.max(rect.width, 1),
  height: Math.max(rect.height, 1),
});
```

Add `dragDropEnabled: false` after the `url` property.

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

---

## Task 3: Enable HTML5 drag-and-drop on WebviewPanel webview

**Files:**
- Modify: `src/panels/webview/WebviewPanel.tsx:104-110`

**Step 1: Add `dragDropEnabled: false` to webview options**

In `WebviewPanel.tsx`, the webview is created at line 104:

```typescript
const wv = new Webview(hostWindow, label, {
  url,
  dragDropEnabled: false,
  x: rect.left,
  y: rect.top,
  width: Math.max(rect.width, 1),
  height: Math.max(rect.height, 1),
});
```

Add `dragDropEnabled: false` after the `url` property.

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

**Step 3: Commit drag-and-drop fix**

```bash
git add src/panels/ai-chat/AiChatPanel.tsx src/panels/claude/ClaudePanel.tsx src/panels/webview/WebviewPanel.tsx
git commit -m "M22 — enable HTML5 drag-drop on embedded webviews"
```

---

## Task 4: Create Terminal State Store

**Files:**
- Create: `src/panels/terminal/terminalStore.ts`

**Step 1: Write the terminal store module**

This module owns terminal instances outside React's lifecycle. It exports functions to get, create, detach, reattach, and destroy terminal entries.

```typescript
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { killShell, onShellOutput, resizeShell } from '../../shell/terminal';
import { emitNotification } from '../../utils/notify';

const PROMPT_REGEX = /(?:PS [A-Z]:\\[^>]*>|[A-Z]:\\[^>]*>)\s*$/;
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;
const MIN_COMMAND_DURATION_MS = 3000;

export interface TerminalEntry {
  terminal: Terminal;
  ptyId: string;
  unlisten: () => void;
  containerEl: HTMLDivElement;
  fitAddon: FitAddon;
  busySince: number | null;
  initialPromptSeen: boolean;
  dead: boolean;
}

const store = new Map<string, TerminalEntry>();

export function getEntry(panelId: string): TerminalEntry | undefined {
  return store.get(panelId);
}

export function hasEntry(panelId: string): boolean {
  return store.has(panelId);
}

export function setEntry(panelId: string, entry: TerminalEntry): void {
  store.set(panelId, entry);
}

/** Start listening for PTY output, write to terminal buffer, and emit notifications. */
export async function attachListener(
  panelId: string,
  entry: TerminalEntry,
): Promise<() => void> {
  const unlisten = await onShellOutput(entry.ptyId, (data) => {
    entry.terminal.write(data);

    // Prompt detection for notifications
    const clean = data.replace(ANSI_REGEX, '');
    if (PROMPT_REGEX.test(clean)) {
      if (!entry.initialPromptSeen) {
        entry.initialPromptSeen = true;
      } else if (entry.busySince !== null) {
        const elapsed = Date.now() - entry.busySince;
        entry.busySince = null;
        if (elapsed >= MIN_COMMAND_DURATION_MS) {
          emitNotification('terminal.command.complete', 'Terminal', 'Command finished');
        }
      }
    }
  });
  return unlisten;
}

/** Full cleanup: dispose terminal, kill PTY, unlisten, remove from store. */
export function destroy(panelId: string): void {
  const entry = store.get(panelId);
  if (!entry) return;
  entry.unlisten();
  killShell(entry.ptyId);
  entry.terminal.dispose();
  store.delete(panelId);
}

/** Destroy all entries whose panelId starts with the given workspace ID prefix. */
export function destroyForWorkspace(workspaceId: string): void {
  const prefix = `${workspaceId}-`;
  for (const panelId of store.keys()) {
    if (panelId.startsWith(prefix)) {
      destroy(panelId);
    }
  }
}

/** Destroy every entry in the store. Called on app close. */
export function destroyAll(): void {
  for (const panelId of store.keys()) {
    destroy(panelId);
  }
}

// Listen for explicit cleanup events (panel type swap, panel removal)
window.addEventListener('yggdrasil:terminal-cleanup', ((e: CustomEvent<{ panelId: string }>) => {
  destroy(e.detail.panelId);
}) as EventListener);
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

---

## Task 5: Refactor TerminalPanel to use the store

**Files:**
- Modify: `src/panels/terminal/TerminalPanel.tsx` (full refactor of the main useEffect)

**Step 1: Rewrite TerminalPanel to use store-based lifecycle**

The refactored component checks the store on mount. If an entry exists, it reattaches the existing terminal. If not, it creates a new one. On unmount, it only detaches from the DOM — never kills the PTY or disposes the terminal.

```typescript
import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  spawnShell,
  writeToShell,
  resizeShell,
  killShell,
  ptyExists,
} from '../../shell/terminal';
import {
  getEntry,
  hasEntry,
  setEntry,
  destroy as destroyTerminal,
  attachListener,
} from './terminalStore';
import type { PanelProps, TerminalSettings } from '../../types/panels';
import styles from './terminal.module.css';

function TerminalPanel({ panelId, settings, projectRoot, onSettingsChange }: PanelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const existing = getEntry(panelId);

    // --- Reattach existing terminal ---
    if (existing && !existing.dead) {
      wrapper.appendChild(existing.containerEl);
      existing.fitAddon.fit();
      const dims = existing.fitAddon.proposeDimensions();
      if (dims) {
        resizeShell(existing.ptyId, dims.cols, dims.rows);
      }
      // Expose ptyId upward
      onSettingsChange({ ...settings, _ptyId: existing.ptyId });

      // Resize observer for this mount
      const resizeObserver = new ResizeObserver(() => {
        existing.fitAddon.fit();
        const d = existing.fitAddon.proposeDimensions();
        if (d) resizeShell(existing.ptyId, d.cols, d.rows);
      });
      resizeObserver.observe(existing.containerEl);

      return () => {
        resizeObserver.disconnect();
        // Detach from DOM but keep alive
        if (existing.containerEl.parentNode) {
          existing.containerEl.parentNode.removeChild(existing.containerEl);
        }
      };
    }

    // --- If entry exists but is dead, remove it and start fresh ---
    if (existing?.dead) {
      destroyTerminal(panelId);
    }

    // --- Create new terminal ---
    const termSettings = settings as TerminalSettings;
    const cwd = termSettings.cwd || projectRoot;
    const shell = termSettings.shell || 'powershell.exe';
    const existingPtyId = (settings as Record<string, unknown>)._ptyId as string | undefined;

    const rootStyles = getComputedStyle(document.documentElement);
    const term = new Terminal({
      fontFamily: rootStyles.getPropertyValue('--font-mono').trim(),
      fontSize: 13,
      theme: {
        background: rootStyles.getPropertyValue('--bg-base').trim(),
        foreground: rootStyles.getPropertyValue('--text-primary').trim(),
        cursor: rootStyles.getPropertyValue('--accent').trim(),
        cursorAccent: rootStyles.getPropertyValue('--bg-base').trim(),
        selectionBackground: rootStyles.getPropertyValue('--accent-dim').trim(),
      },
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Create a dedicated container element owned by the store
    const containerEl = document.createElement('div');
    containerEl.style.width = '100%';
    containerEl.style.height = '100%';
    wrapper.appendChild(containerEl);
    term.open(containerEl);
    fitAddon.fit();

    let cancelled = false;

    (async () => {
      try {
        let ptyId: string | null = null;
        let isReconnect = false;

        if (existingPtyId) {
          const alive = await ptyExists(existingPtyId);
          if (alive) {
            ptyId = existingPtyId;
            isReconnect = true;
          }
        }

        if (!ptyId) {
          ptyId = await spawnShell(cwd, shell);
        }

        if (cancelled) {
          if (!isReconnect) await killShell(ptyId);
          term.dispose();
          return;
        }

        // Expose ptyId upward
        onSettingsChange({ ...settings, _ptyId: ptyId });

        // Create store entry (listener will be attached next)
        const entry = {
          terminal: term,
          ptyId,
          unlisten: () => {},
          containerEl,
          fitAddon,
          busySince: null as number | null,
          initialPromptSeen: false,
          dead: false,
        };

        // Attach background listener (writes to buffer + notifications)
        const unlisten = await attachListener(panelId, entry);
        entry.unlisten = unlisten;

        // Store the entry
        setEntry(panelId, entry);

        // Wire user input
        term.onData((data) => {
          if (!entry.dead) {
            writeToShell(entry.ptyId, data);
            if (data === '\r' && entry.busySince === null) {
              entry.busySince = Date.now();
            }
          }
        });

        // Initial resize sync
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          await resizeShell(ptyId, dims.cols, dims.rows);
        }

        // Startup commands only on fresh spawn
        if (!isReconnect) {
          const startupCommands = termSettings.startupCommands || [];
          for (const cmd of startupCommands) {
            await writeToShell(ptyId, cmd + '\r');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      }
    })();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const entry = getEntry(panelId);
      if (entry) {
        const dims = fitAddon.proposeDimensions();
        if (dims) resizeShell(entry.ptyId, dims.cols, dims.rows);
      }
    });
    resizeObserver.observe(containerEl);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      // Detach from DOM but keep store entry alive
      if (containerEl.parentNode) {
        containerEl.parentNode.removeChild(containerEl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  if (error) {
    return (
      <div className={styles.error}>
        <span>Terminal error: {error}</span>
      </div>
    );
  }

  if (dead) {
    return (
      <div className={styles.error}>
        <span>Session ended</span>
        <button
          className={styles.restartBtn}
          onClick={() => {
            destroyTerminal(panelId);
            setDead(false);
          }}
        >
          Restart
        </button>
      </div>
    );
  }

  return <div ref={wrapperRef} className={styles.container} />;
}

export default TerminalPanel;
```

**Key differences from old code:**
- Terminal and PTY are owned by the store, not the component
- On unmount: detach containerEl from DOM, keep store entry alive
- On remount: reattach existing containerEl, call fitAddon.fit()
- Notification logic (prompt detection) moved to store's `attachListener`
- busySince state lives on the store entry, not in a component ref
- `skipKillRef` is no longer needed — terminals are never killed on unmount

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

**Step 3: Commit terminal store and panel refactor**

```bash
git add src/panels/terminal/terminalStore.ts src/panels/terminal/TerminalPanel.tsx
git commit -m "M22 — terminal state store for cross-workspace persistence"
```

---

## Task 6: Wire cleanup events for panel swap and removal

**Files:**
- Modify: `src/workspace/LayoutGrid.tsx:170-189` (PanelRow's onSwapPanel and onRemovePanel)
- Modify: `src/workspace/LayoutGrid.tsx:340-362` (SpanningLayout's spanning panel)
- Modify: `src/workspace/LayoutGrid.tsx:384-450` (SpanningLayout's right column panels)

**Step 1: Import PanelType at top of LayoutGrid.tsx**

Add `PanelType` to the existing imports from `../types/panels`:

```typescript
import type { PanelSettings } from '../types/panels';
import { PanelType } from '../types/panels';
```

**Step 2: Dispatch terminal cleanup events in PanelRow**

In `PanelRow`, update `onSwapPanel` and `onRemovePanel` callbacks to emit cleanup events when swapping/removing a terminal panel:

```typescript
onRemovePanel={() => {
  if (panel.type === PanelType.Terminal) {
    window.dispatchEvent(new CustomEvent('yggdrasil:terminal-cleanup', {
      detail: { panelId },
    }));
  }
  dispatch({ type: 'REMOVE_PANEL', slotIndex: panel.globalIndex });
}}
```

```typescript
onSwapPanel={(newType) => {
  if (panel.type === PanelType.Terminal && newType !== PanelType.Terminal) {
    window.dispatchEvent(new CustomEvent('yggdrasil:terminal-cleanup', {
      detail: { panelId },
    }));
  }
  dispatch({ type: 'UPDATE_PANEL_TYPE', slotIndex: panel.globalIndex, panelType: newType });
}}
```

**Step 3: Apply the same pattern to SpanningLayout**

The SpanningLayout renders panels in three places: the spanning panel (line 341), rightTopPanels (line 389), and rightBottomPanels (line 430). Each has its own `onRemovePanel` and `onSwapPanel`. Apply the same cleanup dispatch pattern to all six callbacks.

**Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

---

## Task 7: Wire cleanup for workspace deletion and app close

**Files:**
- Modify: `src/App.tsx:69-78` (closeAllOnExit / onCloseRequested)
- Modify: `src/store/WorkspaceContext.tsx:195-209` (DELETE_WORKSPACE reducer)

**Step 1: Add terminal store cleanup on app close**

In `App.tsx`, import `destroyAll` from the terminal store and call it in the `onCloseRequested` handler:

```typescript
import { destroyAll as destroyAllTerminals } from './panels/terminal/terminalStore';
```

Update the close handler (around line 73):

```typescript
appWindow.onCloseRequested(async () => {
  destroyAllTerminals();
  await closeAllOnExit();
})
```

**Step 2: Dispatch workspace cleanup events on DELETE_WORKSPACE**

The reducer in `WorkspaceContext.tsx` can't have side effects, but we can dispatch a custom event from the component that calls dispatch. However, since `DELETE_WORKSPACE` can come from multiple sources (settings modal, sidebar), the cleanest approach is to add a `useEffect` in `AppShell` that watches for workspace removals:

Actually, the simplest approach: add a custom event dispatch in the `WorkspaceProvider` by watching workspace list changes. Or better yet — dispatch the cleanup event from `WorkspaceContext.tsx` right in the `DELETE_WORKSPACE` case. While reducers should be pure, this side effect (dispatching a DOM event) is safe and idempotent. Alternatively, add a `useEffect` in AppShell.

The pragmatic approach: use a `useEffect` in `AppShell` that tracks previous workspace IDs and dispatches cleanup when one disappears:

```typescript
// In AppShell, after the existing hooks
const prevWorkspaceIdsRef = useRef<Set<string>>(new Set());

useEffect(() => {
  const currentIds = new Set(wsState.workspaces.map(w => w.id));
  for (const prevId of prevWorkspaceIdsRef.current) {
    if (!currentIds.has(prevId)) {
      // Workspace was deleted — clean up its terminals
      window.dispatchEvent(new CustomEvent('yggdrasil:terminal-cleanup-workspace', {
        detail: { workspaceId: prevId },
      }));
    }
  }
  prevWorkspaceIdsRef.current = currentIds;
}, [wsState.workspaces]);
```

And in `terminalStore.ts`, add a second event listener:

```typescript
window.addEventListener('yggdrasil:terminal-cleanup-workspace', ((e: CustomEvent<{ workspaceId: string }>) => {
  destroyForWorkspace(e.detail.workspaceId);
}) as EventListener);
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

**Step 4: Commit cleanup wiring**

```bash
git add src/workspace/LayoutGrid.tsx src/App.tsx src/panels/terminal/terminalStore.ts
git commit -m "M22 — wire terminal cleanup for swap, removal, delete, and app close"
```

---

## Task 8: Remove skipKill pattern (no longer needed)

**Files:**
- Modify: `src/panels/terminal/TerminalPanel.tsx` (remove skipKillRef, remove _skipKill sync effect)
- Modify: `src/hooks/useSatellitePanel.ts` (remove _skipKill logic for terminal panels)

**Step 1: Remove skipKillRef from TerminalPanel**

The `skipKillRef` and its sync `useEffect` (lines 28-33) are no longer needed since terminals never kill on unmount. These were already removed in the Task 5 refactor. Verify they are not present.

**Step 2: Simplify satellite panel popOut/recall**

In `useSatellitePanel.ts`, the `_skipKill` setting logic for terminal panels (lines 30-36 in popOut, lines 74-83 and 90-98 in recall) is no longer needed. The terminal store handles lifecycle — popping out and recalling just detaches/reattaches from the store.

Remove the terminal-specific `_skipKill` blocks from `popOut` and `recall`.

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

**Step 4: Commit skipKill removal**

```bash
git add src/panels/terminal/TerminalPanel.tsx src/hooks/useSatellitePanel.ts
git commit -m "M22 — remove skipKill pattern, terminal store handles lifecycle"
```

---

## Task 9: Log decision and update IMPLEMENTATION.md

**Files:**
- Modify: `DECISIONS.md` — add D-NEW for Terminal State Store
- Modify: `IMPLEMENTATION.md` — add M22 milestone entry

**Step 1: Add decision entry**

Add a new decision entry for the Terminal State Store pattern.

**Step 2: Add M22 to the milestone table and plan journal**

Add M22 row to the status snapshot table in IMPLEMENTATION.md. Add a plan journal entry under M22.

**Step 3: Commit docs**

```bash
git add DECISIONS.md IMPLEMENTATION.md
git commit -m "M22 — decision log and implementation journal"
```

---

## Task 10: Full verification

**Step 1: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: Zero errors

**Step 2: Production build check**

Run: `pnpm tsc -b` (via the build pipeline)
Expected: Zero errors (catches things tsc --noEmit misses, per ERRORS.md)

**Step 3: Manual testing checklist**

1. **Drag-and-drop:** Open AI Chat panel with claude.ai webview. Drag a file from Explorer onto the chat input area. File should be accepted by the website.
2. **Terminal persistence:** Open workspace A with a terminal. Run a command. Switch to workspace B. Switch back to workspace A. Terminal should show full scrollback and running session.
3. **Background notifications:** In workspace A's terminal, run a long command (e.g., `Start-Sleep -Seconds 5; echo done`). Switch to workspace B. Wait for command to complete. OS notification should fire.
4. **Panel swap cleanup:** In a workspace, swap a terminal panel to a file tree. Switch away and back. No orphaned PTY should remain.
5. **Workspace delete:** Delete a workspace that has terminal panels. No orphaned PTYs.
6. **App close:** Close the app with active terminals across multiple workspaces. All PTYs should be cleaned up (check Task Manager for orphaned powershell.exe).

**Step 4: Final commit**

```bash
git add -A
git commit -m "M22 — file drag-drop + terminal persistence complete"
```
