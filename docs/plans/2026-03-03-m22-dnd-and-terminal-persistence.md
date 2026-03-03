# M22 — File Drag-and-Drop + Terminal Persistence Design

**Date:** 2026-03-03
**Status:** Approved

---

## Overview

Two fixes addressing usability issues discovered during real usage:

1. **File drag-and-drop into AI Chat webview** — Files dropped onto the claude.ai webview are silently ignored
2. **Terminal persistence across workspace switches** — Switching workspaces kills terminal PTY processes and destroys all terminal state

---

## Feature 1: File Drag-and-Drop Fix

### Problem

Tauri's native drag-drop handler (`dragDropEnabled: true` by default) intercepts file drop events on child webviews before they reach the embedded website's HTML5 drag-drop handlers. On Windows, this completely blocks file drops into claude.ai, ChatGPT, or any embedded site.

The Tauri API docs explicitly state: "Disabling [dragDropEnabled] is required to use HTML5 drag and drop on the frontend on Windows."

### Solution

Set `dragDropEnabled: false` in the `Webview` constructor options for all three webview-hosting panels:

- `src/panels/ai-chat/AiChatPanel.tsx`
- `src/panels/claude/ClaudePanel.tsx`
- `src/panels/webview/WebviewPanel.tsx`

One property addition per file. No new files, no new dependencies, no Rust changes. Tauri's native drag-drop was never used for anything in these panels.

---

## Feature 2: Terminal Persistence

### Problem

When switching workspaces, panel IDs change (`${workspace.id}-${panel.id}`), causing React to unmount old panels and mount new ones. Terminal cleanup kills the PTY process and disposes xterm.js. All state is lost: scrollback, running processes, environment variables, working directory.

This defeats the notification system (M18) — a user can't start a long-running command, switch to another workspace, and get notified when it completes, because switching kills the process.

### Solution: Terminal State Store

A module-level store (`src/panels/terminal/terminalStore.ts`) manages terminal lifecycle independently from React's component lifecycle.

#### Store Structure

```typescript
interface TerminalEntry {
  terminal: Terminal;           // xterm.js instance
  ptyId: string;                // Rust-side PTY ID
  unlisten: () => void;         // Tauri event listener cleanup
  containerEl: HTMLDivElement;  // DOM element terminal was opened into
  fitAddon: FitAddon;           // For re-fitting on reattach
  busySince: number | null;     // For notification timing
  workspaceName: string;        // For notification body text
}

// Module-level, outside React lifecycle
const store = new Map<string, TerminalEntry>();
```

#### Lifecycle

**Mount (workspace switch to):**
1. Check store for existing entry with this `panelId`
2. If found: append existing `containerEl` to panel's wrapper ref. Call `fitAddon.fit()`. Full scrollback visible immediately.
3. If not found: create new Terminal, spawn PTY, set up listener, store entry.

**Unmount (workspace switch away):**
1. Detach `containerEl` from DOM (do NOT dispose terminal or kill PTY)
2. Store entry remains — PTY keeps running, listener keeps writing to terminal buffer
3. Notifications continue to fire from the background listener

**Cleanup (panel type change / workspace delete / app close):**
1. `terminal.dispose()`, `killShell(ptyId)`, `unlisten()`, remove from store

#### Background Notifications

The store's event listener includes prompt-detection logic (currently in TerminalPanel component). When a command completes in a backgrounded terminal, `emitNotification()` fires. The `useNotifications` hook in App.tsx receives it normally since it's a global window event listener.

#### Edge Cases

1. **PTY dies while backgrounded:** Listener gets EOF. Mark entry as dead. On reattach, show "Session ended" and offer restart.
2. **Panel type changed while away:** Cleanup store entry when slot type changes away from terminal.
3. **Workspace deleted:** Cleanup all terminal store entries for that workspace's panel IDs.
4. **App close:** Iterate terminal store and kill all PTYs, not just mounted ones.
5. **Terminal resize on reattach:** `fitAddon.fit()` handles dimension changes, triggers `resize_shell` on Rust side.

#### Key Technical Insight

xterm.js `Terminal.write()` works on a detached terminal — it writes to the internal buffer. When the container element is reappended to the DOM, the terminal renders the full buffer automatically. No serialization or replay needed.

---

## Files Changed

### Feature 1 (Drag-and-Drop)
- `src/panels/ai-chat/AiChatPanel.tsx` — add `dragDropEnabled: false`
- `src/panels/claude/ClaudePanel.tsx` — add `dragDropEnabled: false`
- `src/panels/webview/WebviewPanel.tsx` — add `dragDropEnabled: false`

### Feature 2 (Terminal Persistence)
- `src/panels/terminal/terminalStore.ts` — **new** — module-level terminal state store
- `src/panels/terminal/TerminalPanel.tsx` — refactor to use store for mount/unmount
- `src/store/WorkspaceContext.tsx` — cleanup store entries on workspace delete
- `src/App.tsx` — cleanup all store entries on app close (if needed)

---

## Decisions Required

- **D-NEW:** Terminal State Store pattern for cross-workspace panel persistence
- No new dependencies required
- No Rust-side changes required (PTY infrastructure already supports reconnection via `pty_exists`)
