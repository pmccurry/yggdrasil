# ERRORS.md
# Yggdrasil — Institutional Memory & Lessons Learned
# Last Updated: 2026-02-24
# Version: 1.0

---

## PURPOSE

This file is the institutional memory of the Yggdrasil project. Every bug,
unexpected behavior, failed approach, user correction, and non-obvious solution
is logged here permanently.

Claude Code reads this file at the start of every session as part of the
pre-flight checklist. The goal is simple: never solve the same problem twice
the wrong way. Never repeat a mistake that has already been made and corrected.

Entries are never deleted. They accumulate. The file grows smarter over time.

---

## HOW TO READ THIS FILE

Before touching any component, search this file for entries tagged to that
component. If a relevant entry exists, read it fully before proceeding.

Tags appear in each entry header: `[{COMPONENT}]`
Common tags: `terminal`, `xterm`, `tauri`, `webview`, `filetree`, `editor`,
`monaco`, `claude-panel`, `context`, `persistence`, `widgets`, `typescript`,
`css`, `panel-contract`, `build`, `windows`

---

## ENTRY FORMAT

```
## [{COMPONENT-TAG}] {One-line summary title}
**Date:** YYYY-MM-DD
**Milestone:** M{N}
**Tags:** {tag1}, {tag2}, {tag3}

**Problem:**
{What went wrong and in what context}

**Failed Approaches:**
{What was tried that didn't work, and why}

**Solution:**
{What actually fixed it}

**Implications:**
{What this means for other parts of the codebase or future work}
```

---

## KNOWN RISKS (Pre-logged from ARCHITECTURE.md)

These are not yet encountered errors — they are risks identified at architecture
time. They are logged here so Claude Code is primed to handle them correctly
when they manifest during implementation.

---

## [xterm][tauri][terminal] PTY on Windows may require specific shell configuration

**Date:** 2026-02-24
**Milestone:** M1 (anticipated)
**Tags:** xterm, tauri, terminal, windows

**Problem:**
Full PTY (pseudo-terminal) support on Windows via Tauri's shell API is the
highest-risk integration in the stack. Windows PTY behavior differs from
Unix PTY in ways that can break xterm.js rendering, input handling, and
process cleanup.

**Failed Approaches:**
None yet — this is a pre-logged risk, not a confirmed failure.

**Solution:**
Unknown until M1 implementation. If full PTY fails, the fallback is
command-execution mode: user types a command, it runs via Tauri shell,
output is captured and displayed. This is a degraded but functional mode.
Any fallback decision must be logged in DECISIONS.md before implementation.

**Implications:**
M1 must be completed and validated before any other milestone begins.
If PTY is non-viable, the terminal panel's capabilities change and
ARCHITECTURE.md Section 14.2 and DECISIONS.md must be updated.

---

## [webview][claude-panel] X-Frame-Options blocks HTML iframe embedding

**Date:** 2026-02-24
**Milestone:** M4 (anticipated)
**Tags:** webview, claude-panel, tauri, windows

**Problem:**
Sites like claude.ai and GitHub set X-Frame-Options or Content-Security-Policy
headers that prevent embedding in standard HTML iframes. A naive webview
implementation using an HTML iframe will fail silently or show a blank panel.

**Failed Approaches:**
HTML iframe — blocked by X-Frame-Options on most developer tools and services.

**Solution:**
All webview and Claude panels must use Tauri WebviewWindow — a native OS
webview, not an HTML iframe. This bypasses X-Frame-Options entirely.
This is a non-negotiable implementation detail documented in ARCHITECTURE.md
Section 10.1 and Section 14.1.

**Implications:**
Any panel that embeds an external URL must use Tauri WebviewWindow.
Never use an HTML iframe element for external content. Ever.

---

## [monaco][editor] Monaco bundle size impacts startup if loaded eagerly

**Date:** 2026-02-24
**Milestone:** M4 (anticipated)
**Tags:** monaco, editor, performance, build

**Problem:**
Monaco Editor is ~5MB+. If included in the main bundle it significantly
increases startup time and initial load — unacceptable for an app that must
feel instant.

**Failed Approaches:**
Eager import — adds Monaco to initial bundle regardless of whether an Editor
panel is mounted.

**Solution:**
Monaco must always be loaded via React.lazy(). It is code-split at build time
and only loaded when an Editor panel slot is actually mounted. Verify this is
working correctly by checking that Monaco chunks do not appear in the initial
network requests in devtools.

**Implications:**
The React.lazy() pattern is already enforced for all panels in the registry
(ARCHITECTURE.md Section 7.2). Monaco benefits most from this — never
deviate from lazy loading for the Editor panel.

---

## [claude-panel][tauri] Claude Desktop local server port may vary

**Date:** 2026-02-24
**Milestone:** M4 (anticipated)
**Tags:** claude-panel, tauri, windows

**Problem:**
Claude Desktop runs a local server when active. The port it uses may not be
stable across Claude Desktop versions or may vary by installation. Hardcoding
a port will cause the panel to fail silently when the port changes.

**Failed Approaches:**
Hardcoded port number — breaks when Claude Desktop changes its port.

**Solution:**
Port is configurable in ClaudeSettings (desktopPort field). Detection should
poll a range of common ports if the configured port fails. Fallback to
claude.ai WebviewWindow is always available and automatic.

**Implications:**
Never hardcode the Claude Desktop port anywhere in the codebase.
Always read from settings. The fallback to claude.ai must always be present.

---

## [widgets][git] Git CLI can be slow on large repositories

**Date:** 2026-02-24
**Milestone:** M5 (anticipated)
**Tags:** widgets, git, performance

**Problem:**
Invoking the git CLI via Tauri shell on a large repository can take
multiple seconds. If git polling is synchronous or runs on a tight interval
it will visibly freeze the UI or generate a backlog of pending operations.

**Failed Approaches:**
Synchronous git invocation — blocks the UI thread.
Tight polling interval (< 5 seconds) — creates backlog on large repos.

**Solution:**
All git calls are async and non-blocking. Default poll interval is 15000ms
(15 seconds). Polling debounces on workspace switch — does not fire during
a switch, only after the new workspace has settled (500ms delay).
A slow git call updates state when it completes — it never blocks anything.

**Implications:**
The useWidgets hook must enforce the debounce on workspace switch.
Never set a widget pollInterval below 5000ms without explicit user instruction.

---

## [claude-panel][onActivate] Claude Desktop does not expose a project-switching API

**Date:** 2026-02-24
**Milestone:** M4
**Tags:** claude-panel, onActivate, claude-desktop

**Problem:**
ARCHITECTURE.md Section 7.4 specifies that workspace activation should hint Claude
Desktop to the correct project path via `claudeDesktopProjectPath`. Investigation
during M4 found that Claude Desktop does not expose a documented local HTTP API or
IPC mechanism for programmatically switching the active project context.

**Failed Approaches:**
- Searching for Claude Desktop local server API documentation — none exists publicly.
- Checking for REST endpoints on the Claude Desktop port — the port serves the web UI,
  not a programmable API for context switching.

**Solution:**
Claude Desktop context shifting is best-effort in V1. The Claude panel shows the
Claude Desktop interface (or falls back to claude.ai), but does not automatically
switch the project context within Claude Desktop on workspace activation. The user
must manually switch project context within Claude Desktop.

**Implications:**
- `claudeDesktopProjectPath` in `WorkspaceActivationHook` is unused in V1
- If Claude Desktop adds an API in the future, this can be wired up without
  architectural changes — the data path already exists in the schema
- The fallback to claude.ai via Tauri Webview works regardless

---

## [webview][tauri] Child webviews require Tauri `unstable` feature flag

**Date:** 2026-02-24
**Milestone:** M4
**Tags:** webview, tauri, claude-panel

**Problem:**
Embedding a child webview inside the main Tauri window (not as a separate OS window)
requires the `unstable` feature flag on the `tauri` crate. Without it, `new Webview()`
from `@tauri-apps/api/webview` fails with a 400 error.

**Failed Approaches:**
- Using `WebviewWindow` (creates a separate floating OS window — defeats the purpose
  of embedded panels).

**Solution:**
Added `features = ["unstable"]` to the tauri dependency in Cargo.toml. Child webviews
are created via `new Webview(getCurrentWindow(), label, { url, x, y, width, height })`
and positioned over placeholder DOM elements using `getBoundingClientRect()` +
`ResizeObserver`.

**Implications:**
- The `unstable` feature flag must remain on the tauri crate for webview/claude panels
- Child webviews overlay the DOM — they are native OS webviews positioned over
  transparent placeholder divs, not rendered inside the DOM
- Z-ordering can be tricky — webviews always render above DOM content
- On panel unmount, `webview.close()` must be called to clean up the native resource

---

## [claude-panel][windows] Claude Desktop launch and detection — multiple corrections

**Date:** 2026-02-24
**Milestone:** M4
**Tags:** claude-panel, windows, user-correction

**Problem (1 — launch):**
`cmd /c start "" "claude"` resolves to Claude Code CLI in PATH, not Claude Desktop.

**Problem (2 — detection):**
TCP port detection on port 5173 is wrong — Claude Desktop is an Electron app that
does not expose a local HTTP server. Port 5173 is Vite's default.

**Problem (3 — fallback webview race condition):**
`createWebview()` called synchronously after `setState('fallback')` fails because
React hasn't re-rendered the `containerRef` div into the DOM yet.

**Failed Approaches:**
- `cmd /c start "" "claude"` — resolves to Claude Code CLI
- `read_dir` on `WindowsApps` — permission denied
- `TcpStream::connect_timeout` on port 5173 — Claude Desktop doesn't serve HTTP
- Synchronous `createWebview()` after `setState()` — React race condition

**Solution:**
- **Launch:** PowerShell `Get-AppxPackage` + `shell:AppsFolder\{AUMID}!App`
- **Detection:** `tasklist /FI "IMAGENAME eq Claude.exe"` for process existence
- **Webview:** Separate `useEffect` watching `webviewTarget` state — React renders
  the container div first, then the effect creates the webview
- **UX:** Always embeds claude.ai since Desktop doesn't serve localhost web UI.
  Added "Open claude.ai" button to skip detection entirely.

**Implications:**
- Never use TCP port detection for Electron apps — check process existence
- Never call DOM-dependent async code synchronously after setState — use useEffect
- Windows Store apps must be launched via AUMID, not exe path or shell name

---

## [webview][panel-container] Native webview blocks PanelPicker — hide() doesn't prevent input capture

**Date:** 2026-02-24
**Milestone:** M4
**Tags:** webview, panel-container, tauri, react, windows

**Problem:**
When a native Tauri webview is active (Claude or Webview panel), clicking the "swap"
button opens the PanelPicker DOM overlay — but the native WebView2 control captures
all pointer events in its area, making the picker buttons unclickable even when the
picker DOM overlay is rendered.

**Failed Approaches:**
- `webviewRef.current.hide()` — Tauri's `hide()` on child webviews does not prevent
  the native WebView2 control from capturing mouse/pointer events on Windows. The
  webview may be visually hidden but still intercepts clicks in its original area.
- Using React state (`pickerOpen`) in `mouseLeave` handler — stale due to batching
  (secondary issue, fixed with `useRef` but didn't solve the core input capture problem)

**Solution:**
Replace `hide()`/`show()` with `setPosition(new LogicalPosition(-10000, -10000))` to
physically move the webview off-screen when the picker opens. On picker close, restore
position from `containerRef.current.getBoundingClientRect()`. `setPosition()` is known
to work reliably because it's used in the ResizeObserver for continuous repositioning.

Also added `pickerOpenRef` (useRef) in PanelContainer to prevent `mouseLeave` from
dispatching `picker-close` while the picker is open (React state batching secondary fix).

**Implications:**
- Never use `hide()`/`show()` for Tauri child webviews on Windows when you need to
  prevent input capture — use `setPosition()` to move off-screen instead
- `setPosition()` is the only reliable method to prevent native WebView2 from capturing
  pointer events — it physically removes the control from the clickable area
- The ResizeObserver in each panel already handles position restoration on resize, so
  the off-screen approach integrates cleanly

---

## [typescript][build] `tsc --noEmit` passes but `tsc -b` fails on null vs undefined

**Date:** 2026-02-25
**Milestone:** M6
**Tags:** typescript, build, claude-panel

**Problem:**
`pnpm tsc --noEmit` (used for dev checks) passed with zero errors, but `pnpm build`
(which runs `tsc -b`) caught a type error in ClaudePanel.tsx line 62: `Type 'string | null'
is not assignable to type 'string | undefined'`. The `webviewTarget` state was typed as
`string | null` but the Tauri `Webview` constructor expects `string | undefined` for the
`url` option.

**Failed Approaches:**
None — caught during production build verification in M6.

**Solution:**
Changed `url: webviewTarget` to `url: webviewTarget ?? undefined`. The null case is
already guarded by an early return (`if (!webviewTarget) return`), but TypeScript's
type narrowing doesn't carry across the async function boundary.

**Implications:**
- Always run `tsc -b` (or the full `pnpm build` pipeline) as the definitive type check,
  not just `tsc --noEmit` — they use different tsconfig resolution
- When passing state values to third-party APIs, prefer `?? undefined` over `!` assertions
  for null-to-undefined conversions

---

## [widgets][docker] Docker widget must be scoped to workspace project, not global

**Date:** 2026-02-25
**Milestone:** M6
**Tags:** widgets, docker, user-correction

**Problem:**
Docker widget ran `docker ps` globally and displayed all containers regardless of
which workspace was active. Ratatoskr and Elementals both showed the same "2/3 up"
status even though the containers belonged only to Ratatoskr's docker-compose setup.

**Failed Approaches:**
- Global `docker ps` with no filtering — shows unrelated containers on every workspace.
- Requiring a hardcoded `containerName` in settings — users don't want to manually
  configure container names for every workspace.

**Solution:**
Filter `docker ps` output by project directory name prefix. Docker Compose names
containers as `{directory}-{service}-{instance}` (e.g., `ratatoskr-v2-db-1`).
The widget stores `projectDir` (extracted from `projectRoot`) in its settings and
filters containers where `name.startsWith(projectDir + '-')`. Workspaces with no
matching containers show "No containers" (idle state).

Migration in `loadConfig()` backfills `projectDir` into existing Docker widget settings.

**Implications:**
- Docker widget settings must include `projectDir` — seeded automatically from
  `projectRoot` on workspace creation
- Filtering assumes Docker Compose naming convention (`{dir}-{service}-{n}`)
- Workspaces without docker-compose correctly show idle rather than error

---

## [layout][css] CSS Grid forces shared column tracks across rows — use nested flex instead
**Date:** 2026-02-25
**Milestone:** M8
**Tags:** layout, css, user-correction

**Problem:**
Initial M8 implementation used a single CSS Grid container for all layout presets.
In the four-equal layout `[A|B] / [C|D]`, dragging the vertical handle between A
and B also moved C and D because CSS Grid column tracks are shared between rows.
When a bottom panel was removed leaving `[A|B] / [C]`, the remaining bottom panel
couldn't be dragged to span the full width independently.

**Failed Approaches:**
- Single `display: grid` container with `gridColumn`/`gridRow` placement per panel.
  Grid tracks are inherently shared — columns defined by row-0 panels constrain
  row-1 panels to the same proportions.

**Solution:**
Switched to nested flex containers. Each row is its own `display: flex` container,
so vertical drag handles between panels in one row are completely independent of
other rows. Three rendering paths:
1. **SingleRow** — horizontal flex with all panels + vertical drag handles
2. **TwoRow** — vertical flex stacking two independent PanelRow components
3. **SpanningLayout** — horizontal flex with spanning panel + vertical flex right column

**Implications:**
- Each row manages its own container ref for drag handle calculations
- `presets.ts` no longer needs grid placement helpers (`getGridPlacement`, etc.)
- Drag handle components are inline flex siblings, not grid overlays
- D025 superseded by D025b in DECISIONS.md

---

## [webview][modal] Native webviews block global modals — same as PanelPicker issue
**Date:** 2026-02-26
**Milestone:** M11
**Tags:** webview, modal, tauri, windows

**Problem:**
When a native Tauri webview (Claude or Webview panel) is active, opening CreateWorkspaceModal
or SettingsModal renders the DOM overlay behind the native WebView2 control. The webview captures
all pointer events in its area, making the modal unclickable. This is the same root cause as the
PanelPicker issue logged above — native WebView2 controls render above all DOM content.

**Failed Approaches:**
None — recognized the pattern from the existing PanelPicker fix immediately.

**Solution:**
Added `yggdrasil:modal-open` / `yggdrasil:modal-close` custom events. Both WebviewPanel and
ClaudePanel listen for these events (no panelId filter — ALL webviews move off-screen). Both
SettingsModal and CreateWorkspaceModal dispatch these events on mount/unmount via useEffect.
This mirrors the existing `yggdrasil:drag-start` / `yggdrasil:drag-end` pattern.

**Implications:**
- Any future global modal or overlay must dispatch `yggdrasil:modal-open` on mount and
  `yggdrasil:modal-close` on unmount to avoid webview input capture
- The pattern is now used in three contexts: picker (per-panel), drag (global), modal (global)
- All three use `setPosition(-10000, -10000)` to move webviews off-screen

---

*End of ERRORS.md*
*Version 1.0 — Created 2026-02-24*
*This file only grows. Entries are never deleted.*
