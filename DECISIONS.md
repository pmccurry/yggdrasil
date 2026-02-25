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

## D019 — Keyboard shortcuts: app-level only, no OS global registration
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Keyboard shortcuts are app-level only. They fire when the Yggdrasil window is
focused via a single window keydown listener. No OS-level global shortcut
registration via Tauri's global shortcut API.

**Alternatives Considered:**
- Tauri global shortcuts — fire even when Yggdrasil is not the focused window.
  Rejected because OS-level permission handling adds complication, risks conflicts
  with other applications using the same key combinations, and is unnecessary for
  a tool the developer is actively working in.

**Rationale:**
Yggdrasil is a focused work environment. If you're using a shortcut to switch
workspaces, you're already in Yggdrasil. App-level shortcuts are simpler,
zero-permission, conflict-free, and sufficient for the use case.

**Implications:**
useKeyboardShortcuts hook mounted at App root. Single window keydown listener.
Shortcuts do not fire when terminal or Monaco editor has focus.

---

## D020 — Layout system: two-row max, not true arbitrary grid
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
V2 layout supports a maximum of two rows. A true arbitrary grid (N rows × M columns)
is deferred to V3.

**Alternatives Considered:**
- True arbitrary grid — maximum flexibility but significantly more complex layout
  engine, more complex data schema, more complex drag handle interactions. Rejected
  for V2 because the four target presets all fit within two rows and the incremental
  complexity is not justified by V2 use cases.

**Rationale:**
All four requested presets (2-equal, large-medium, large-two-stacked, 4-equal)
work within a two-row maximum. Building a full grid engine before validating
whether two rows covers real needs violates the simplicity principle. V2 ships,
gets used, and the gap (if any) becomes clear from actual use rather than speculation.

**Implications:**
PanelSlot.row is typed as 0 | 1. WorkspaceLayout has rowWeight for row 0 vs row 1
height ratio. Maximum 4 panels total. True grid is V3 consideration in Appendix A.

---

## D021 — Layout rows are invisible implementation detail
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Rows are never surfaced in the Yggdrasil UI. The user sees a canvas with panels
and resize handles. No row labels, row boundaries, or row management UI exists.

**Alternatives Considered:**
- Explicit row UI — row headers, add-row buttons, row labels. Rejected because it
  exposes implementation complexity to the user unnecessarily and clutters the
  canvas aesthetic.

**Rationale:**
The user's mental model is "I have panels arranged on a canvas." The row constraint
is an implementation detail of how we manage layout in a two-row system. Exposing it
breaks the canvas mental model and adds UI complexity with no user benefit.

**Implications:**
DragHandle between rows is a plain resize handle — same appearance as vertical handles.
Preset picker is the primary way to change layout structure. Row assignment is
determined by preset definitions, not by user-facing row controls.

---

## D022 — Planning Drawer: scratchpad + milestone reader only, no task list
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Planning Drawer V2 contains exactly two sections: per-workspace scratchpad and
live IMPLEMENTATION.md milestone reader. A separate quick task list was considered
and rejected.

**Alternatives Considered:**
- Quick task list (separate from milestone reader) — rejected because it duplicates
  the milestone reader's function. The IMPLEMENTATION.md definition of done IS the
  task list. Two task lists that could diverge creates confusion rather than clarity.
- Terminal command pinning (separate from scratchpad) — rejected because pinning
  commands to reference them is functionally identical to writing them in the scratchpad.
  No separate mechanism needed.

**Rationale:**
The scratchpad handles freeform notes and command references. The milestone reader
handles project task tracking via the IMPLEMENTATION.md system already maintained
by Claude Code. These two functions are distinct and non-overlapping. Everything
else considered was either redundant with one of these or better served by existing
tools.

**Implications:**
PlanningDrawerContent has scratchpad, scratchpadVisible, milestoneVisible, drawerOpen.
No additional content sections in V2. Each section is independently collapsible.

---

## D023 — HTTP endpoint widget: Rust-side polling to avoid CORS
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
HTTP endpoint polling for the status widget runs Rust-side via a Tauri command,
not from the JavaScript frontend.

**Alternatives Considered:**
- Frontend fetch() — blocked by CORS for most non-browser-accessible endpoints
  (VPS health checks, internal services, localhost services on different ports).
  Rejected because CORS would make the widget useless for the primary use case.

**Rationale:**
VPS health endpoints and internal service endpoints do not serve CORS headers
because they are not intended to be called from browsers. A Rust-side HTTP request
has no CORS restriction. The Tauri command returns only the HTTP status code —
no response body is needed or returned.

**Implications:**
New `src-tauri/src/commands/http.rs` and `src/shell/http.ts`. Either reqwest crate
or curl CLI — to be decided during M10 implementation and logged as a sub-decision.
5 second timeout enforced Rust-side.

---

## D024 — Token usage widget: deferred indefinitely — no public API available
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
A token usage widget showing Claude/Gemini/Codex session usage is not implemented.
Deferred indefinitely pending public API availability from providers.

**Alternatives Considered:**
- Screen scraping the Claude.ai usage UI — fragile, breaks on any UI change,
  violates terms of service spirit. Rejected.
- OpenAI usage API — returns billing period totals, not session-level usage.
  Not the granular per-session percentage the user wants. Rejected as insufficient.

**Rationale:**
Anthropic does not expose a public API for Claude Max session token usage.
The percentage indicator visible in the Claude UI is not programmatically accessible.
Building a widget that cannot reliably get its data is worse than not building it.
If providers add public usage APIs in the future, this decision can be revisited.

**Implications:**
Logged in Appendix A as deferred indefinitely. The HTTP endpoint widget covers
the VPS health check use case that was discussed alongside token usage.

---

## D025 — Layout engine: CSS Grid for all layout presets
**Date:** 2026-02-25
**Status:** [SUPERSEDED]
**Made By:** Joint

**Decision:**
Use CSS Grid for the LayoutGrid component across all four layout presets.

**Superseded by:** D025b — CSS Grid forces shared column tracks across both rows,
preventing independent per-row column sizing. See D025b.

---

## D025b — Layout engine: nested flex containers with per-row independence
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint (user correction)

**Decision:**
Use nested flex containers for the LayoutGrid component. Each row is its own
`display: flex` container, so vertical drag handles between panels in one row
do not affect column proportions in other rows.

**Alternatives Considered:**
- CSS Grid with shared columns (D025) — column tracks are shared between rows,
  so dragging a vertical handle in the four-equal layout adjusts both the top
  and bottom row proportions simultaneously. Users expect independent resizing
  per row. Rejected for this fundamental limitation.
- CSS Grid with subgrid — browser support is insufficient and the complexity
  is not justified when nested flex solves the problem cleanly.

**Rationale:**
When a user is in a four-equal layout and removes one bottom panel, they expect to
drag the remaining bottom panel to span the full width independently of the top row.
Nested flex containers give each row its own column proportions. The `large-two-stacked`
preset uses a horizontal flex (panel A + right column) where the right column is a
vertical flex (B over C). This naturally supports independent sizing everywhere.

**Implications:**
- LayoutGrid has three rendering paths: SingleRow, TwoRow, SpanningLayout
- Each PanelRow component owns its own container ref for drag calculations
- Vertical drag handles are inline flex siblings, not grid overlays
- `presets.ts` no longer exports grid placement helpers

---

## D026 — LayoutPresetPicker placement: StatusBar between workspace info and widgets
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
The LayoutPresetPicker (four small icon buttons for preset selection) is mounted in the
StatusBar, positioned between the workspace name/path on the left and the widget chips
on the right.

**Alternatives Considered:**
- Panel header area — would require picking one panel header to host the picker, which
  is semantically wrong (presets affect all panels, not one).
- Floating toolbar — adds a new UI element that needs its own positioning logic.
  Unnecessary when the StatusBar already serves as the workspace-level control surface.
- Context menu on right-click — hidden UI, not discoverable.

**Rationale:**
The StatusBar is the workspace-level control surface. Layout presets are a workspace-level
concern (they affect the entire panel grid). Placing the preset picker in the StatusBar is
semantically correct and visually non-intrusive. The four small icon buttons occupy minimal
horizontal space.

**Implications:**
- StatusBar imports and renders LayoutPresetPicker
- LayoutPresetPicker dispatches SET_LAYOUT_PRESET to WorkspaceContext
- Active preset is highlighted with `var(--accent)`

---

## D027 — File monitoring via polling, not tauri-plugin-fs watcher
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
IMPLEMENTATION.md is read via the existing `readFile` Tauri command with a 5-second
setInterval poll. No file watcher dependency is added.

**Alternatives Considered:**
- `tauri-plugin-fs` watch API — adds a new npm and Cargo dependency for a single
  use case. File watching on Windows has known edge cases with locked files and
  delayed notifications. Rejected for unnecessary complexity.
- Shorter poll interval (1s) — rejected because IMPLEMENTATION.md changes
  infrequently and 5s provides a good balance of responsiveness and efficiency.

**Rationale:**
The readFile command already exists and works reliably. Polling every 5 seconds
is simple, predictable, and sufficient for a file that changes only during active
Claude Code sessions. The hook skips re-parsing if file content is unchanged,
so the 5s poll has near-zero cost when the file hasn't changed.

**Implications:**
- No new dependencies added (npm or Cargo)
- useMilestoneReader hook manages its own setInterval and cleanup
- Content comparison prevents unnecessary re-renders

---

## D028 — Drawer state migration from AppContext to WorkspaceContext
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Planning drawer open/closed state is migrated from AppContext (global) to
WorkspaceContext (per-workspace) via the `planning.drawerOpen` field on each
Workspace.

**Alternatives Considered:**
- Keep drawer state in AppContext (global) — all workspaces share a single
  drawer toggle. Rejected because the drawer content (scratchpad, milestone
  reader) is workspace-specific, so the drawer visibility should also be
  workspace-specific.

**Rationale:**
Each workspace has its own scratchpad notes and its own project root for
milestone reading. A user may want the drawer open for one workspace
(actively planning) and closed for another (focused on coding). Per-workspace
state is the correct model.

**Implications:**
- `planningDrawerOpen` removed from AppState in AppContext.tsx
- `TOGGLE_PLANNING_DRAWER` removed from AppAction
- Keyboard shortcut `drawer.toggle` now dispatches `UPDATE_PLANNING` via
  workspaceDispatch instead of appDispatch
- Drawer state persists per workspace in config.json

---

## D029 — HTTP endpoint widget: curl over reqwest
**Date:** 2026-02-25
**Status:** [ACTIVE]
**Made By:** Joint

**Decision:**
Use `curl.exe` via `std::process::Command` instead of adding the `reqwest` crate
for the HTTP endpoint widget's Rust-side polling.

**Alternatives Considered:**
- `reqwest` crate — full-featured Rust HTTP client. Rejected because it pulls in
  `hyper`, `tokio`, `http`, `h2`, and other heavy dependencies. Binary size would
  increase significantly for a single status-code-only HTTP GET.

**Rationale:**
Windows 10+ ships with `curl.exe` in System32. The command
`curl -o /dev/null -s -w "%{http_code}" --max-time 5 {url}` returns just the HTTP
status code. This follows the established CLI pattern already used by the Docker
widget (`docker` via `std::process::Command`). No new Cargo dependencies, stable
binary size, proven pattern.

**Implications:**
- `src-tauri/src/commands/http.rs` uses `Command::new("curl")` with `creation_flags(0x08000000)` on Windows
- curl returns `000` for unreachable hosts — mapped to `Err("http_unreachable: ...")`
- If curl is not in PATH, returns `Err("curl_not_found: ...")` — widget shows error state
- 5-second timeout enforced via `--max-time` argument

---

*End of DECISIONS.md*
*Version 1.0 — Created 2026-02-24*
*Entries are never deleted. Superseded entries are marked [SUPERSEDED].*
