# DECISIONS.md
# Yggdrasil — Decision Rationale Log
# Last Updated: 2026-02-24
# Version: 1.0

---

## PURPOSE

This file logs every major decision made in the Yggdrasil project — the choice,
the alternatives considered, and the rationale for why this path was taken.

Claude Code reads this file at the start of every session. Before suggesting
any architectural change, Claude Code checks this file. If the decision has
already been made, it is honored. Settled decisions are not relitigated unless
the user explicitly instructs otherwise.

When a decision changes, the old entry is marked `[SUPERSEDED]` and a new
entry is written. History is preserved. Nothing is deleted.

---

## STATUS TAGS

| Tag | Meaning |
|---|---|
| `[ACTIVE]` | This decision is current and in effect |
| `[SUPERSEDED]` | This decision was changed — see the replacement entry |
| `[DEFERRED]` | Decision not yet made — noted for future resolution |

---

## ENTRY FORMAT

```
## D{NNN} — {Decision title}
**Date:** YYYY-MM-DD
**Status:** [ACTIVE]
**Made By:** {User / Claude Code / Joint}

**Decision:**
{What was decided}

**Alternatives Considered:**
{What else was evaluated and why it was not chosen}

**Rationale:**
{Why this choice was made}

**Implications:**
{What this decision affects downstream}
```

---

## DECISIONS LOG

---

## D001 — Desktop shell: Tauri over Electron
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use Tauri v2 as the desktop shell framework.

**Alternatives Considered:**
- Electron — mature, widely used, large ecosystem. Rejected because it ships
  a full Chromium instance per app, resulting in 100MB+ binary size and high
  baseline memory usage. Unacceptable for a lightweight developer tool.
- NW.js — similar to Electron, same weight concerns.
- Native Win32/WPF — too low-level, no web frontend benefit, far higher
  development complexity for no meaningful gain.

**Rationale:**
Tauri produces a native Windows binary that uses the OS's built-in WebView2
renderer (already present on Windows 10/11). Binary size is ~10MB vs Electron's
~150MB. Memory footprint is significantly lower. Rust backend provides reliable
native OS interaction for shell spawning, filesystem, and dialog APIs.

**Implications:**
Frontend is React + TypeScript rendered in WebView2. All OS interaction goes
through Tauri invoke commands wrapped in `src/shell/`. The Rust backend is
intentionally minimal — it is a thin command executor, not a business logic layer.

---

## D002 — Frontend framework: React over alternatives
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use React 18 as the frontend framework.

**Alternatives Considered:**
- Svelte — lighter runtime, excellent performance. Rejected because the panel
  component architecture (typed containers, lazy registry, context propagation)
  maps more naturally to React's component model and ecosystem.
- Vue 3 — solid option, rejected for same ecosystem/familiarity reasons.
- Vanilla JS — rejected immediately. The panel registry, context system, and
  Suspense/lazy boundaries all benefit significantly from React's abstractions.

**Rationale:**
React's component model is a natural fit for the "panel is a typed container"
architecture. React.lazy() and Suspense provide exactly the code-splitting
behavior needed for Monaco and other heavy panels. React Context + useReducer
is sufficient for V1 state management without additional libraries.

**Implications:**
All UI is React components. State management is React Context. No Vue, no Svelte,
no mixing of frameworks. TypeScript is used throughout.

---

## D003 — State management: React Context + useReducer only
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use React Context with useReducer for global state. No external state library.

**Alternatives Considered:**
- Redux Toolkit — powerful, well-tested. Rejected as over-engineered for V1 scope.
  The boilerplate cost is not justified by the state complexity.
- Zustand — lighter than Redux, good API. Rejected because React Context is
  sufficient for V1 and adding a dependency for something the platform provides
  natively violates the simplicity principle.
- Jotai / Recoil — atomic state models. Rejected for same reasons.

**Rationale:**
V1 has two contexts: WorkspaceContext (workspace list, active workspace, layout)
and AppContext (theme, drawer state). This is not complex state. React Context +
useReducer handles it cleanly without dependencies. If V2 state complexity grows
significantly, this decision can be revisited.

**Implications:**
No state management libraries in package.json. If state management needs grow
beyond what Context handles cleanly, a new decision entry must be written
before introducing any library.

---

## D004 — Styling: CSS Modules + CSS Custom Properties
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use CSS Modules for component-scoped styles and CSS Custom Properties for the
global design system. No CSS-in-JS library.

**Alternatives Considered:**
- Tailwind CSS — utility-first, fast to write. Rejected because it conflicts
  with the dynamic accent color system (CSS custom property override per workspace
  cannot be expressed cleanly in utility classes).
- styled-components / Emotion — CSS-in-JS. Rejected for runtime overhead and
  because the dynamic theming requirement is solved more cleanly with CSS variables.
- Plain global CSS — rejected for lack of component scoping.

**Rationale:**
CSS Custom Properties solve the dynamic per-workspace accent color requirement
elegantly — one property override on the document root updates every accent-colored
element instantly without React re-renders. CSS Modules provide component scoping
without runtime cost. Zero dependencies, maximum performance.

**Implications:**
All global design tokens live in `src/theme/variables.css`. No hardcoded hex
values in component files. Per-workspace accent color is applied via:
`document.documentElement.style.setProperty('--accent', workspace.accentColor)`

---

## D005 — Typography: JetBrains Mono exclusively
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use JetBrains Mono as the sole typeface across the entire application.
No sans-serif, no serif, no system fonts.

**Alternatives Considered:**
- Mixed type system (sans-serif for UI, mono for code) — rejected because
  it weakens the terminal-native aesthetic and creates visual inconsistency.
- System fonts — rejected for visual inconsistency across Windows installations.
- Other mono fonts (Fira Code, Cascadia Code) — listed as fallbacks only.
  JetBrains Mono is the primary choice for its ligature support and readability.

**Rationale:**
Yggdrasil is a developer tool with a deliberate terminal-native aesthetic.
Monospace everywhere reinforces this identity. The visual consistency of a
single typeface across UI chrome, panel headers, status widgets, and code
content creates a cohesive, intentional design.

**Implications:**
`--font-mono` CSS variable is used everywhere. No other font imports.
JetBrains Mono is loaded via Google Fonts or bundled — evaluate at M0.
Cascadia Code and Fira Code are CSS fallbacks in case JetBrains Mono fails to load.

---

## D006 — Persistence: Tauri Store Plugin (local JSON only)
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use Tauri Store Plugin for persistence. Config is stored as a single JSON file
in the OS user data directory. No database, no cloud sync, no server.

**Alternatives Considered:**
- SQLite via Tauri — over-engineered for a config file with < 10 workspaces.
  Query overhead, schema migrations, and connection management add complexity
  with no benefit at this data scale.
- localStorage / IndexedDB — web storage APIs, not appropriate for a native
  desktop app with a filesystem.
- Custom JSON read/write via Tauri fs — viable but Tauri Store Plugin handles
  file location, serialization, and atomic writes correctly out of the box.

**Rationale:**
The AppConfig is a small JSON document. It is read once on startup and written
on mutation. Tauri Store Plugin is purpose-built for this exact use case, handles
the OS-appropriate file location automatically, and requires no schema management.

**Implications:**
Config lives at `C:\Users\{username}\AppData\Roaming\Yggdrasil\config.json`
on Windows. All reads come from context (in-memory). All writes go to disk
immediately via useEffect on state change. No save button exists or will exist.

---

## D007 — Terminal: xterm.js with Tauri PTY
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use xterm.js for terminal rendering with Tauri's shell API for process management.

**Alternatives Considered:**
- node-pty — Node.js PTY library. Not applicable in a Tauri context where there
  is no Node.js runtime in production.
- Custom terminal emulator — rejected immediately. xterm.js is what VS Code uses.
  There is no reason to build what already exists at production quality.
- Embedded OS terminal (Windows Terminal) — cannot be embedded inside a Tauri
  webview. External windows defeat the purpose of Yggdrasil.

**Rationale:**
xterm.js is the industry standard embeddable terminal emulator. It has proven
Tauri compatibility and handles ANSI codes, color, and input correctly. VS Code's
terminal is built on it. Tauri's shell API handles process spawning, PTY management,
and output streaming on the Rust side.

**Implications:**
If PTY is not achievable on Windows (see ERRORS.md pre-logged risk), the fallback
is command-execution mode. Any fallback decision requires a new DECISIONS.md entry.

---

## D008 — Code editor: Monaco Editor
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use Monaco Editor for the code editor panel.

**Alternatives Considered:**
- CodeMirror 6 — lighter, more modular. Rejected because Monaco provides the
  exact VS Code editing experience the design calls for, including familiar
  keyboard shortcuts, IntelliSense scaffolding, and consistent syntax highlighting.
- Ace Editor — older, less actively maintained. Rejected.
- VS Code extension API integration — too complex for V1. Deferred to V3 consideration.

**Rationale:**
Monaco is the VS Code editor engine extracted as an embeddable library. Since
VS Code is the primary design inspiration for Yggdrasil's editor panel, Monaco
is the natural and correct choice. The heavy bundle size is mitigated by React.lazy().

**Implications:**
Monaco is always loaded via React.lazy(). Never import Monaco eagerly.
Verify at M4 that Monaco chunks do not appear in initial network requests.

---

## D009 — Claude integration: Desktop app, not API
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
The Claude panel integrates with Claude Desktop locally. No Claude API integration in V1.

**Alternatives Considered:**
- Claude API (Anthropic SDK) — per-token billing. Rejected for V1 because the
  user has a Pro/Max subscription to Claude Desktop. Using the API for a daily
  driver tool that runs Claude constantly would accumulate significant cost with
  no benefit over the subscription.
- claude.ai webview only — viable fallback but not primary. The Desktop
  integration is preferred because it is the user's existing workflow.

**Rationale:**
Claude Desktop uses the user's existing subscription. No API key, no per-token
cost, no billing management. Claude Desktop runs a local server when active —
the panel connects to it via Tauri WebviewWindow (native OS webview, bypasses
X-Frame-Options). Claude.ai webview is the automatic fallback if Desktop is
not running or detectable.

**Implications:**
ClaudeSettings uses `mode: 'desktop' | 'webview'`. Desktop mode is the default.
Claude API integration is a V2 consideration — see IMPLEMENTATION.md Appendix A.
If API integration is added in V2, it requires a new DECISIONS.md entry and
schema additions to ClaudeSettings.

---

## D010 — Package manager: pnpm
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use pnpm as the package manager.

**Alternatives Considered:**
- npm — universal but slower, less efficient disk usage, non-strict dependency
  resolution allows phantom dependencies.
- yarn — faster than npm but pnpm is faster and stricter.
- bun — fast but less mature for Tauri projects at time of decision.

**Rationale:**
pnpm is faster than npm and yarn, uses a content-addressable store for efficient
disk usage, and enforces strict dependency resolution that prevents phantom
dependency bugs. It is the correct choice for a project that values correctness
and efficiency.

**Implications:**
All install commands use pnpm. Lockfile is `pnpm-lock.yaml`. Do not use npm
or yarn install commands in any session. If a dependency requires npm, log it
in ERRORS.md and find a pnpm-compatible approach.

---

## D011 — V1 layout: Fixed three-column, no resizing
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
V1 layout is a fixed three-column panel grid. No drag-to-resize, no dynamic
panel count, no layout mode switching.

**Alternatives Considered:**
- Resizable panels from day one — technically straightforward with a resize
  library. Rejected because it adds complexity to the layout data schema
  (panel size weights) before the foundation is stable.
- Flexible panel count (1, 2, 3, or 4 panels) — rejected for same reason.
  The schema supports it in theory but the UI complexity is a V2 concern.

**Rationale:**
A fixed three-panel layout delivers the core value of Yggdrasil — project context,
clean layout, panel switching — without layout management complexity. Once V1
is stable and in daily use, the right resizing behavior becomes clearer from
actual usage rather than speculation.

**Implications:**
WorkspaceLayout.panels is typed as a tuple of exactly three PanelSlots.
Panel resizing and dynamic panel count are V2 features — see IMPLEMENTATION.md
Appendix A. The layout grid uses equal-width flex columns in V1.

---

## D012 — Planning Drawer: V1 placeholder only
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
The Planning Drawer (inspired by Antigravity's planning panel) is included in
the V1 layout as a collapsed toggle placeholder only. No content is implemented.

**Alternatives Considered:**
- Full Planning Drawer in V1 — rejected. The content (workspace notes, milestone
  context from IMPLEMENTATION.md, session planning) requires design work that
  would delay V1. The layout space must be reserved now to avoid surgery later.
- Omit Planning Drawer entirely until V2 — rejected. If the layout does not
  account for the drawer's collapsed width from day one, adding it in V2 requires
  layout restructuring that risks introducing layout bugs.

**Rationale:**
Reserving the layout space costs nothing. Building the content incorrectly costs
time. The right tradeoff is: correct layout structure in V1, real content in V2.

**Implications:**
`--planning-drawer-width: 32px` CSS variable is defined in V1 for the collapsed
toggle. PlanningDrawer.tsx renders only the toggle button in V1. The toggle
updates AppContext planningDrawerOpen state but opening reveals no content in V1.

---

*End of initial decisions log.*
*New entries are appended below as decisions are made during implementation.*

---

## D013 — Workspace activation hook: onActivate state injection
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Each workspace has an onActivate hook that fires every time that workspace becomes
active. It contains: terminalStartupCommands (shell commands run on terminal mount),
environmentVariables (injected into the terminal shell environment), and
claudeDesktopProjectPath (hints Claude Desktop to the correct project folder).

**Alternatives Considered:**
- Manual navigation each time — the current painful status quo. Rejected because
  eliminating this friction is a core Yggdrasil value proposition.
- Persistent shell sessions that survive workspace switching — rejected because
  it violates the panel lifecycle rule (panels unmount and clean up on switch).
  A persistent shell that doesn't belong to the active workspace is a resource leak.
- OS-level environment switching — too invasive, affects other applications running
  outside Yggdrasil. Rejected in favor of shell-scoped injection.

**Rationale:**
Workspace switching should shift the entire development context, not just the
visual layout. A developer switching from Ratatoskr to Elementals should not need
to cd, re-point Claude Code, or re-orient. The onActivate hook makes this automatic.
The implementation is simple — startup commands are just strings written to the shell
after spawn. Environment variables are passed to the Tauri shell spawn call.

**Implications:**
WorkspaceActivationHook interface added to workspace.ts.
TerminalSettings gains a startupCommands field.
WorkspaceContext SWITCH_WORKSPACE action fires the hook.
defaultOnActivate() helper generates sensible defaults for new workspaces.
The cd to projectRoot is always the first startupCommand and is non-removable.
Claude Desktop context shifting is best-effort pending M4 API investigation.

---

## D014 — Terminal PTY: portable-pty over tauri-plugin-shell
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Claude Code

**Decision:**
Use the `portable-pty` Rust crate (from wezterm project) for terminal PTY management
instead of `tauri-plugin-shell`.

**Alternatives Considered:**
- tauri-plugin-shell — Tauri's official shell plugin. Provides pipe-based process
  spawning with stdin/stdout/stderr streams. Rejected because it does not provide
  PTY emulation — output lacks ANSI escape sequences, colors, cursor movement,
  and interactive program support that xterm.js requires.
- conpty crate — Lower-level Windows ConPTY wrapper. Rejected in favor of
  portable-pty which provides a cross-platform abstraction over ConPTY.
- std::process::Command — Simple process spawning. Same pipe-based limitations
  as tauri-plugin-shell.

**Rationale:**
xterm.js is a terminal emulator that expects PTY output (ANSI escape sequences,
VT100 control codes, colors, cursor positioning). Without a real PTY, PowerShell
runs in pipe mode and strips all interactive features — no colors, no tab
completion rendering, no cursor movement. portable-pty wraps Windows ConPTY
(available on Windows 10 1809+) and provides the exact PTY behavior xterm.js needs.
It is the same library used by wezterm, a production terminal emulator.

**Implications:**
- tauri-plugin-shell is not added to Cargo.toml or tauri.conf.json for M1
- PTY management is handled by custom Tauri commands in src-tauri/src/commands/shell.rs
- PTY instances are stored in Tauri managed state (PtyStore)
- Output streaming uses Tauri events rather than the shell plugin's event system
- For future simple command execution (git status, etc.), std::process::Command
  or tauri-plugin-shell can be added separately

---

## D015 — FileTree→Editor communication via custom DOM events
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
FileTree and Editor panels communicate via custom DOM events on the window object.
FileTree dispatches `window.dispatchEvent(new CustomEvent('yggdrasil:open-file', { detail: { path } }))`.
Editor listens via `window.addEventListener('yggdrasil:open-file', handler)`.

**Alternatives Considered:**
- Shared React Context (e.g., EditorContext) — would require both panels to import
  from a shared context module. While technically not violating the panel contract
  (context is in `src/store/`), it creates tight coupling between two specific panel
  types and adds state management overhead.
- URL hash or query params — fragile, not type-safe, inappropriate for internal events.
- Redux or Zustand shared store — rejected per D003, no external state library in V1.

**Rationale:**
Custom DOM events require zero shared state, zero imports between panels, and zero
additional infrastructure. FileTree dispatches; Editor listens. If neither panel is
mounted, the events are simply ignored. This is the simplest mechanism that fully
respects the panel contract (ARCHITECTURE.md Section 7.1).

**Implications:**
Any future panel that wants to open files in the Editor can dispatch the same event.
The event is a public contract: `CustomEvent<{ path: string }>` on `'yggdrasil:open-file'`.
Editor panel must clean up the event listener on unmount.

---

## D015b — Webview embedding: Tauri child Webview with `unstable` feature
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Claude Code

**Decision:**
Webview and Claude panels use Tauri's child `Webview` API (from `@tauri-apps/api/webview`)
to embed native OS webviews inside the main application window. This requires the
`unstable` feature flag on the `tauri` crate in Cargo.toml.

**Alternatives Considered:**
- `WebviewWindow` (from `@tauri-apps/api/webviewWindow`) — creates a separate OS window.
  This is stable API but defeats the panel-based UI: the webview would float as a
  separate window rather than rendering inside the panel grid.
- HTML iframe — blocked by X-Frame-Options on most sites (see ERRORS.md pre-logged risk).
  Non-negotiable rejection per ARCHITECTURE.md Section 14.1.

**Rationale:**
The panel architecture requires webviews to render inside panel slots, not as separate
windows. The child `Webview` API positions a native OS webview over a placeholder DOM
element using `getBoundingClientRect()` and `ResizeObserver`. This provides true
embedding within the panel grid while bypassing X-Frame-Options.

**Implications:**
- `tauri = { features = ["unstable"] }` must remain in Cargo.toml
- Webviews overlay the DOM at a higher z-level — they are not DOM elements
- `ResizeObserver` is required to keep webview position in sync with layout changes
- `webview.close()` must be called on unmount to release native resources

---

## D016 — Filesystem via custom Rust commands, not plugin-fs
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Filesystem operations (read_directory, read_file) are implemented as custom Rust
commands in `src-tauri/src/commands/filesystem.rs`, not via `@tauri-apps/plugin-fs`.

**Alternatives Considered:**
- `@tauri-apps/plugin-fs` — official Tauri plugin for filesystem access. Rejected
  because it requires scope configuration (allowed paths), returns generic file
  system types, and adds a dependency for operations that are simple with `std::fs`.
  Custom Rust commands give exact control over the return shape (FileNode struct).

**Rationale:**
The FileTree panel needs a specific response shape: `Vec<FileNode>` with name, path,
and is_directory fields, sorted directories-first then alphabetical. This is trivial
with `std::fs::read_dir` and a custom struct. The plugin-fs approach would require
post-processing on the TypeScript side and adds configuration overhead (scope patterns).

**Implications:**
`std::fs` is used directly in the Rust backend. No `@tauri-apps/plugin-fs` dependency.
File paths are validated on the Rust side before reading.

---

## D017 — Docker widget polling via CLI docker inspect
**Date:** 2026-02-24
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Docker container status is polled via `docker inspect {name} --format={{.State.Status}}` CLI
invocation. A new Rust command `docker_inspect` lives in `src-tauri/src/commands/docker.rs`
and a TypeScript wrapper in `src/shell/docker.ts`. Both new files are additive to the
ARCHITECTURE.md Section 12 file structure.

**Alternatives Considered:**
- Docker Engine API (HTTP) — requires exposing the Docker daemon TCP socket or named pipe.
  Adds complexity (HTTP client in Rust, authentication) for no benefit in a local desktop tool.
- docker-compose ps — only works for compose-managed containers, not general purpose.

**Rationale:**
The Docker CLI is the simplest, most reliable way to query container status on a local machine.
`creation_flags(0x08000000)` prevents console window flash on Windows. Error prefixes
(`docker_not_installed:` vs `docker_error:`) allow the frontend to distinguish "Docker not
installed" (idle state) from "Docker error" (error state).

**Implications:**
- `src-tauri/src/commands/docker.rs` and `src/shell/docker.ts` are new files added to the
  file structure
- Docker must be in PATH for the widget to function; if not, widget shows idle "No Docker"

---

## D018 — Docker widget scoped to workspace via project directory prefix
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint (user correction)

**Decision:**
Docker widget auto-discovers containers via `docker ps -a` and filters results to
only show containers belonging to the active workspace. Filtering uses the project
directory name as a prefix match against container names (case-insensitive).

**Alternatives Considered:**
- Global `docker ps` with no filtering — shows all containers on every workspace.
  Rejected because it is misleading: Elementals showed Ratatoskr's containers.
- Requiring manual `containerName` configuration per workspace — rejected because
  users don't want to manually configure container names, and projects may have
  multiple containers (db, redis, api, etc.).
- Parsing `docker-compose.yml` to extract service names — more accurate but adds
  YAML parsing dependency and filesystem reads. Rejected for complexity when the
  naming convention approach works reliably.

**Rationale:**
Docker Compose names containers as `{directory}-{service}-{instance}` by default
(e.g., `ratatoskr-v2-db-1`). The project directory name from `projectRoot` is
already available in widget settings. Filtering by `name.startsWith(projectDir + '-')`
is simple, zero-dependency, and matches Compose's default naming convention.
Workspaces without matching containers show "No containers" (idle) instead of error.

**Implications:**
- `DockerWidgetSettings` carries `projectDir` extracted from workspace `projectRoot`
- `docker_ps` Rust command added alongside existing `docker_inspect`
- Migration in `loadConfig()` backfills `projectDir` into existing Docker widgets
- Custom container names that don't follow Compose convention won't be matched;
  the `containerName` field remains available for future explicit override support

---

*End of DECISIONS.md*
*Version 1.0 — Created 2026-02-24*
*Entries are never deleted. Superseded entries are marked [SUPERSEDED].*
