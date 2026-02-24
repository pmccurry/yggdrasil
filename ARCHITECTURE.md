# ARCHITECTURE.md
# Yggdrasil — Project Constitution
# Last Updated: 2026-02-24
# Version: 1.1
# Status: ACTIVE

---

## 0. PURPOSE OF THIS DOCUMENT

This document is the architectural constitution of Yggdrasil. It defines the stack,
file structure, data schemas, component contracts, and hard boundaries for the project.

It does not change unless a major architectural decision changes — and any such change
must be reflected in DECISIONS.md before it is reflected here.

Claude Code must read this document fully before writing any code, in any session,
without exception.

---

## 1. PROJECT OVERVIEW

Yggdrasil is a personal developer workspace application for Windows desktop. It is a
project-scoped, multi-panel command center that replaces the chaos of scattered tabs,
terminals, and applications with a single clean environment.

The core concept: a workspace is a named project with a defined panel layout and status
widgets. Switching workspaces instantly loads that project's environment. Every panel
is an interchangeable, typed container. The app is the developer's home base — not a
replacement for tools, but the place where tools live together.

### 1.1 Design Inspiration

Yggdrasil draws from two primary design references:

**VS Code** — the editor-as-home-base philosophy. A single application that hosts your
entire working context. File tree, terminal, editor, and extensions coexist in one
clean environment without requiring context switching between applications. The panel
grid, file tree, and Monaco editor panel are all direct expressions of this philosophy.

**Antigravity** — the persistent planning layer alongside active work. Antigravity's
planning panel is a collapsible structured context surface that annotates your workspace
without replacing it. In Yggdrasil this becomes the Planning Drawer — a collapsible
right-side surface that sits above the panel grid layer, accessible at any time without
consuming a panel slot. It surfaces workspace notes, current milestone context from
IMPLEMENTATION.md, and session planning. This is a V2 feature but the layout system
accounts for its space from day one so it never requires structural surgery to add.

### 1.2 Core Principles

- **Simplicity over complexity.** If two approaches solve the same problem, use the simpler one.
- **Data-driven architecture.** Layouts, panels, widgets, and workspaces are defined by
  data schemas — not hardcoded logic. New types are additive, never surgical.
- **Self-contained panels.** No panel reaches outside itself to mutate global state directly.
  Panels receive context, they do not own it.
- **Lightweight by design.** The application shell is always fast. Panels are lazy-loaded.
  Nothing is held in memory that is not actively rendered. No cloud, no database, no server.
- **Stable foundation first.** V1 is not feature-rich, it is rock-solid. Every feature
  added later depends on V1 not shifting beneath it.
- **The pre-flight checklist is non-negotiable.** Claude Code reads all reference files
  before writing any code. No exceptions.

### 1.3 V1 Scope (Hard Boundaries)

V1 includes:
- Project workspace sidebar with switching
- Three-panel fixed layout per workspace
- Panel type swapping via picker
- Terminal panel (real PowerShell via xterm.js + Tauri shell)
- Webview panel (embedded URL via Tauri WebviewWindow)
- File tree panel (project root aware, git status indicators)
- Monaco editor panel (syntax highlighting, file open from tree)
- Claude Desktop panel (local Claude Desktop integration, no API)
- Status widget bar (per workspace, real data sources)
- Workspace config persisted to JSON on local disk
- Workspace creation via native OS folder picker dialog
- Planning Drawer placeholder in layout (collapsed toggle in V1, V2 content)
- CLAUDE.md pre-flight enforcement

V1 explicitly excludes:
- Panel resizing via drag handles
- Adding or removing panels dynamically at runtime
- Plugin/extension system
- Cloud sync or user accounts
- Multi-window support
- Git operations beyond read-only status display
- Planning Drawer content and functionality (layout space reserved only)
- Claude API integration (Desktop integration only in V1)
- Any panel type not listed above

---

## 2. TECHNOLOGY STACK

### 2.1 Core Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| Desktop Shell | Tauri | v2.x | Native Windows binary, far lighter than Electron, strong Rust backend |
| Frontend Framework | React | v18.x | Component model maps perfectly to panel container architecture |
| Language | TypeScript | v5.x | Type safety essential for long-term maintainability of schemas and contracts |
| Build Tool | Vite | v5.x | Fast HMR, native ESM, Tauri's recommended frontend build tool |
| Styling | CSS Modules + CSS Variables | — | No CSS-in-JS overhead, global theme via variables, scoped per component |
| Terminal Emulation | xterm.js | v5.x | Industry standard, VS Code uses it, proven Tauri compatibility |
| Code Editor | Monaco Editor | v0.45.x | VS Code's editor engine, embeddable, supports all languages, lazy loaded |
| State Management | React Context + useReducer | — | Sufficient for V1 scope, no external library needed |
| Persistence | Tauri Store Plugin | v2.x | JSON file persistence, native OS user data directory |

### 2.2 Tauri Backend (Rust)

The Rust backend is minimal by design. It exists only for things the web frontend
cannot do natively:

- Spawning and managing shell processes (PowerShell)
- Reading the filesystem for the file tree panel
- Reading git status via CLI invocation
- Writing/reading the workspace config JSON to disk
- Launching Claude Desktop if not running
- Native OS folder picker dialog for workspace creation
- Any other native OS interaction

The frontend never directly touches the OS. All OS interaction goes through
Tauri commands (invoke calls). This boundary is strict and never crossed.

### 2.3 Package Manager

pnpm. Faster than npm, better disk usage, strict dependency resolution.

---

## 3. LOADING AND PERFORMANCE STRATEGY

Performance is a first-class architectural concern. Yggdrasil must feel instant.
Every decision that affects startup time, memory usage, or render performance
is made deliberately.

### 3.1 Application Startup Sequence

1. Tauri shell launches (native binary — effectively instant)
2. React app mounts — renders the shell only: sidebar skeleton, topbar, empty layout grid
3. Config is read from disk via Tauri Store (single JSON file read)
4. Active workspace is loaded into WorkspaceContext
5. Sidebar populates with workspace list
6. Status widgets begin polling in background
7. Panel components mount and initialize in the active layout

The user sees a rendered shell within ~100ms. Panels fill in as they initialize.
The app never blocks startup on any panel's readiness.

### 3.2 Panel Lazy Loading

Every panel component is loaded via React.lazy(). Panels are not in the initial
bundle. They are code-split at build time and loaded on first mount.

Monaco Editor is the heaviest panel (~5MB+). It is loaded dynamically only when
an Editor panel slot is actually mounted. It is never loaded otherwise.

```typescript
// In panels/registry.ts — all panels are lazy
const TerminalPanel = React.lazy(() => import('./terminal/TerminalPanel'));
const WebviewPanel  = React.lazy(() => import('./webview/WebviewPanel'));
const FileTreePanel = React.lazy(() => import('./filetree/FileTreePanel'));
const EditorPanel   = React.lazy(() => import('./editor/EditorPanel'));
const ClaudePanel   = React.lazy(() => import('./claude/ClaudePanel'));
```

Each panel slot renders a Suspense boundary with a minimal skeleton loader
while its panel component loads.

### 3.3 Panel Lifecycle

Panels have a strict lifecycle that governs memory:

- **Mount** — panel initializes, establishes connections, starts processes
- **Active** — panel renders and updates normally
- **Unmount** — panel cleans up ALL resources: kills shell processes, clears
  intervals, closes connections, releases event listeners

When a workspace switch occurs, all three panels of the previous workspace unmount
and clean up before the new workspace panels mount. No panel persists across
workspace switches. Memory is fully released on unmount.

Memory footprint at any time:
- App shell (constant, minimal)
- Three active panel components (variable per panel type)
- Widget polling state for active workspace (minimal)

Nothing more. Inactive workspaces have zero memory footprint.

### 3.4 Widget Polling Strategy

Status widgets poll their data sources on a configurable interval. Polling is:

- Non-blocking — runs in async background loops, never on the main thread
- Debounced on workspace switch — does not fire during a switch, only after settled
- Interval-configurable per widget via pollInterval in WidgetConfig
- Graceful on failure — failed poll updates status to 'error' silently, never crashes

---

## 4. STORAGE AND DATA STRATEGY

### 4.1 Storage Philosophy

Everything lives locally. No cloud, no database, no server, no external dependency
for persistence. Yggdrasil works fully offline. Network access is only required by
panels that embed web content — and that is the user's concern, not the app's.

### 4.2 Config File Location

```
Windows: C:\Users\{username}\AppData\Roaming\Yggdrasil\config.json
```

Managed by Tauri Store Plugin — never hardcoded in application logic.
The application stores nothing else. No logs, no cache, no telemetry.

### 4.3 Read/Write Pattern

- **On startup:** Config read once from disk into WorkspaceContext
- **During session:** All reads from context (in-memory, instant)
- **On any mutation:** useEffect watcher writes to disk immediately — no save button
- **On close:** No additional write needed — last mutation already persisted

### 4.4 Project Files

Yggdrasil never copies, indexes, ingests, or modifies project files.
The projectRoot in workspace config is a pointer only. File tree reads live
on mount. Git widget reads live on poll interval. No file content is cached.

---

## 5. WORKSPACE MANAGEMENT

### 5.1 Workspace Creation Flow

1. User clicks "New Workspace" in the sidebar
2. Creation modal opens with three fields: Name, Icon (emoji picker), Accent Color (8 presets)
3. User clicks "Choose Project Folder" — triggers native OS folder picker via Tauri dialog
4. User confirms — workspace created with default layout, saved to config, becomes active

Default layout for any new workspace: Terminal | Webview | Claude Desktop.

### 5.2 Workspace Switching

1. User clicks workspace in sidebar
2. WorkspaceContext updates activeWorkspaceId immediately
3. Previous workspace panels unmount and clean up
4. Accent color CSS variable updates on document root
5. Status bar updates to new workspace widgets
6. New workspace panels mount (skeletons shown while loading)

Total perceived switch time: under 200ms for the shell.

### 5.3 Workspace Deletion

Removes workspace from config. Does not touch project files. If deleted workspace
was active, first remaining workspace becomes active. If none remain, creation
modal opens automatically.

---

## 6. CORE DATA SCHEMAS

These TypeScript interfaces are the ground truth for all data in the application.
Nothing gets stored, passed, or persisted that doesn't conform to these schemas.
These interfaces live in `src/types/` and are imported everywhere needed.

### 6.1 Panel Types

```typescript
// src/types/panels.ts

export enum PanelType {
  Terminal  = 'terminal',
  Webview   = 'webview',
  FileTree  = 'filetree',
  Editor    = 'editor',
  Claude    = 'claude',
}

export interface PanelRegistryEntry {
  type:        PanelType;
  label:       string;
  icon:        string;
  description: string;
  component:   React.LazyExoticComponent<React.ComponentType<PanelProps>>;
  defaults:    PanelSettings;
}

export interface PanelSettings {
  [key: string]: unknown;
}

export interface TerminalSettings extends PanelSettings {
  shell:           string;    // 'powershell.exe'
  cwd:             string;    // defaults to workspace projectRoot
  startupCommands: string[];  // commands run automatically on panel mount
                              // e.g. ['cd C:/users/patri/Ratatoskr', 'claude']
}

export interface WebviewSettings extends PanelSettings {
  url:   string;
  label: string;
}

export interface FileTreeSettings extends PanelSettings {
  rootPath: string;   // defaults to workspace projectRoot
}

export interface EditorSettings extends PanelSettings {
  rootPath:  string;
  openFile?: string;  // path relative to rootPath
  language?: string;
}

export interface ClaudeSettings extends PanelSettings {
  mode:         'desktop' | 'webview';
  desktopPort?: number;    // Claude Desktop local server port
  webviewUrl?:  string;    // fallback URL if desktop not detected
}

export interface PanelProps {
  panelId:          string;
  settings:         PanelSettings;
  projectRoot:      string;
  accentColor:      string;
  onSettingsChange: (settings: PanelSettings) => void;
}
```

### 6.2 Widget Types

```typescript
// src/types/widgets.ts

export type WidgetStatus = 'ok' | 'warn' | 'error' | 'idle' | 'loading';

export enum WidgetType {
  Docker  = 'docker',
  Git     = 'git',
  Generic = 'generic',
}

export interface WidgetConfig {
  id:           string;
  type:         WidgetType;
  label:        string;
  pollInterval: number;   // ms — 0 means no polling
  settings:     WidgetSettings;
}

export interface WidgetSettings {
  [key: string]: unknown;
}

export interface DockerWidgetSettings extends WidgetSettings {
  containerName: string;
}

export interface GitWidgetSettings extends WidgetSettings {
  repoPath: string;
}

export interface WidgetState {
  status:   WidgetStatus;
  value:    string;
  tooltip?: string;
}
```

### 6.3 Workspace Schema

```typescript
// src/types/workspace.ts

export interface PanelSlot {
  id:       string;       // 'slot-0' | 'slot-1' | 'slot-2'
  type:     PanelType;
  settings: PanelSettings;
}

export interface WorkspaceLayout {
  panels: [PanelSlot, PanelSlot, PanelSlot]; // exactly 3 in V1
}

export interface WorkspaceActivationHook {
  terminalStartupCommands: string[];               // fired in every terminal panel on mount
  environmentVariables:    Record<string, string>; // injected into terminal environment
  claudeDesktopProjectPath?: string;               // hints Claude Desktop to this path on activation
                                                   // defaults to projectRoot if not specified
}

export interface Workspace {
  id:          string;   // uuid
  name:        string;
  icon:        string;   // emoji
  accentColor: string;   // hex — one of 8 presets
  projectRoot: string;   // absolute path
  layout:      WorkspaceLayout;
  widgets:     WidgetConfig[];
  onActivate:  WorkspaceActivationHook;  // fires every time this workspace becomes active
  createdAt:   string;   // ISO date string
  updatedAt:   string;   // ISO date string
}

export interface AppConfig {
  version:           string;
  activeWorkspaceId: string;
  workspaces:        Workspace[];
}
```

### 6.4 Persisted Config Shape (JSON)

```json
{
  "version": "1.0.0",
  "activeWorkspaceId": "uuid-here",
  "workspaces": [
    {
      "id": "uuid-here",
      "name": "Ratatoskr",
      "icon": "⚡",
      "accentColor": "#00ff88",
      "projectRoot": "C:/users/patri/Ratatoskr",
      "layout": {
        "panels": [
          {
            "id": "slot-0",
            "type": "terminal",
            "settings": { "shell": "powershell.exe", "cwd": "C:/users/patri/Ratatoskr" }
          },
          {
            "id": "slot-1",
            "type": "webview",
            "settings": { "url": "http://localhost:8080", "label": "localhost:8080" }
          },
          {
            "id": "slot-2",
            "type": "claude",
            "settings": { "mode": "desktop", "desktopPort": 5173, "webviewUrl": "https://claude.ai" }
          }
        ]
      },
      "widgets": [
        {
          "id": "widget-docker",
          "type": "docker",
          "label": "Docker",
          "pollInterval": 10000,
          "settings": { "containerName": "ratatoskr-api" }
        },
        {
          "id": "widget-git",
          "type": "git",
          "label": "Git",
          "pollInterval": 15000,
          "settings": { "repoPath": "C:/users/patri/Ratatoskr" }
        }
      ],
      "onActivate": {
        "terminalStartupCommands": ["cd C:/users/patri/Ratatoskr"],
        "environmentVariables": { "PROJECT": "ratatoskr" },
        "claudeDesktopProjectPath": "C:/users/patri/Ratatoskr"
      },
      "createdAt": "2026-02-24T00:00:00.000Z",
      "updatedAt": "2026-02-24T00:00:00.000Z"
    }
  ]
}
```

---

## 7. WORKSPACE STATE INJECTION

### 7.1 Concept

Switching workspaces in Yggdrasil is not just a visual change — it is a full
context shift. The onActivate hook on each workspace defines what happens to
the environment when that workspace becomes active. The goal is that clicking
Ratatoskr in the sidebar shifts your entire working context: the terminal is
in the right folder, Claude Desktop is pointed at the right project, environment
variables reflect the project. No manual re-pointing. No re-navigation.

This is what separates Yggdrasil from a tab manager. A tab manager shows you
different things. Yggdrasil shifts your entire working environment.

### 7.2 Activation Sequence

When a workspace becomes active (on startup or on switch), the following fires
in order:

1. WorkspaceContext updates activeWorkspaceId
2. Accent color CSS variable updates on document root
3. Status bar updates to new workspace widgets
4. Layout grid unmounts previous panels, mounts new panels
5. **onActivate hook fires:**
   a. Terminal panels receive startupCommands — executed automatically on mount
   b. Environment variables are injected into the terminal shell environment
   c. Claude Desktop is hinted toward claudeDesktopProjectPath if detectable
6. Widget polling begins for new workspace

Step 5 is what makes the workspace feel alive rather than just visual.

### 7.3 Terminal Startup Commands

Each workspace's onActivate.terminalStartupCommands is an ordered array of
shell commands that fire automatically when any terminal panel mounts for
that workspace. The terminal panel executes them sequentially after the shell
spawns.

Common patterns:
- `cd {projectRoot}` — always the first command, ensures correct directory
- Environment setup commands specific to the project
- Status commands the developer wants to see on context switch

The cwd in TerminalSettings sets the spawn directory. startupCommands run
after spawn. Both work together — cwd gets the shell into the right folder
instantly, startupCommands handle anything more complex.

### 7.4 Claude Desktop Context Shifting

When a workspace activates, the Claude panel attempts to inform Claude Desktop
of the new project path via claudeDesktopProjectPath (defaults to projectRoot
if not explicitly set). This behavior depends on what Claude Desktop's local
server API exposes — it is investigated and implemented during M4.

If Claude Desktop does not expose a project-switching API, the context shift
is best-effort: the Claude Desktop window is still shown, but the project
context within it is not automatically updated. This is documented in ERRORS.md
during M4 regardless of outcome.

### 7.5 Default onActivate Values

Every new workspace gets a sensible default onActivate on creation:

```typescript
const defaultOnActivate = (projectRoot: string): WorkspaceActivationHook => ({
  terminalStartupCommands: [`cd ${projectRoot}`],
  environmentVariables: {},
  claudeDesktopProjectPath: projectRoot,
});
```

The user can extend startupCommands per workspace in settings. The cd command
is always first and always present — it cannot be removed, only appended to.

---

## 8. THE PANEL CONTRACT

This is the single most important architectural rule in the codebase.

Every panel component is self-contained. It receives data through props. It communicates
changes upward only through the callbacks in PanelProps. It never imports from another
panel's directory. It never reads global state directly — it uses hooks from `src/hooks/`.

### 7.1 Panel Contract Rules

1. A panel receives `PanelProps` and nothing else as external input
2. A panel may import from `src/hooks/`, `src/shell/`, `src/utils/`, `src/theme/`
3. A panel must never import from another panel's directory
4. A panel must never dispatch to global state directly — use `onSettingsChange`
5. A panel must handle its own loading, error, and empty states internally
6. A panel must clean up ALL resources on unmount — shell processes, intervals,
   event listeners, connections. Memory leaks are a critical failure.

### 7.2 Panel Registry

Adding a new panel type means adding one entry to the registry and creating its
self-contained directory. No other file changes required.

```typescript
// src/panels/registry.ts

import React from 'react';
import { PanelType, PanelRegistryEntry } from '../types/panels';

const TerminalPanel  = React.lazy(() => import('./terminal/TerminalPanel'));
const WebviewPanel   = React.lazy(() => import('./webview/WebviewPanel'));
const FileTreePanel  = React.lazy(() => import('./filetree/FileTreePanel'));
const EditorPanel    = React.lazy(() => import('./editor/EditorPanel'));
const ClaudePanel    = React.lazy(() => import('./claude/ClaudePanel'));

export const PANEL_REGISTRY: Record<PanelType, PanelRegistryEntry> = {
  [PanelType.Terminal]: {
    type: PanelType.Terminal, label: 'Terminal', icon: '>_',
    description: 'PowerShell session', component: TerminalPanel,
    defaults: { shell: 'powershell.exe', cwd: '' },
  },
  [PanelType.Webview]: {
    type: PanelType.Webview, label: 'Webview', icon: '⬡',
    description: 'Embedded browser panel', component: WebviewPanel,
    defaults: { url: '', label: 'Webview' },
  },
  [PanelType.FileTree]: {
    type: PanelType.FileTree, label: 'File Tree', icon: '⊞',
    description: 'Project file explorer', component: FileTreePanel,
    defaults: { rootPath: '' },
  },
  [PanelType.Editor]: {
    type: PanelType.Editor, label: 'Editor', icon: '</>',
    description: 'Monaco code editor', component: EditorPanel,
    defaults: { rootPath: '', openFile: undefined },
  },
  [PanelType.Claude]: {
    type: PanelType.Claude, label: 'Claude', icon: '✦',
    description: 'Claude Desktop integration', component: ClaudePanel,
    defaults: { mode: 'desktop', desktopPort: 5173 },
  },
};
```

---

## 9. STATE MANAGEMENT

### 8.1 Global State Shape

**WorkspaceContext** owns:
- Full workspace list
- Active workspace ID
- Current layout (panel slots, types, settings)
- Widget states for active workspace
- Actions: switchWorkspace, updatePanelType, updatePanelSettings,
  updateWidgetState, createWorkspace, deleteWorkspace

**AppContext** owns:
- Theme (dark only in V1)
- Planning drawer open/closed state (V1: layout state only, no content)
- App settings (future use)

### 8.2 State Flow

```
AppConfig (JSON on disk)
    ↓ loaded once on startup
WorkspaceContext (in memory — single source of truth)
    ↓ consumed by
Sidebar → workspace list + active ID
StatusBar → active workspace widgets + states
LayoutGrid → active workspace layout
PlanningDrawer → open/closed state
    ↓ LayoutGrid renders
PanelContainer → slot data → correct panel via registry
    ↓ panel swap
updatePanelType → context update → immediate disk write
```

### 8.3 Persistence Rule

Every WorkspaceContext mutation writes to disk immediately via useEffect.
No save button. Write is async and non-blocking.

---

## 10. LAYOUT SYSTEM

### 9.1 V1 Layout — Fixed Three-Column Grid

```
┌──────────────┬──────────────┬──────────────┐
│   Panel 0    │   Panel 1    │   Panel 2    │
│  (slot-0)    │  (slot-1)    │  (slot-2)    │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

Three equal-width panel slots. No resizing, no drag handles, no dynamic panel count.

### 9.2 Planning Drawer — V1 Layout Placeholder

Inspired by Antigravity's planning panel. In V1 the layout reserves space for a
collapsible right-side drawer and renders only the collapsed toggle button.
No content is implemented in V1. Space is reserved to avoid layout surgery in V2.

```
┌────────┬──────────────────────────────────┬──┐
│        │                                  │  │
│Sidebar │    Panel Grid (slot-0|1|2)        │PD│
│        │                                  │  │
└────────┴──────────────────────────────────┴──┘
         PD = Planning Drawer toggle (collapsed, V1)
```

### 9.3 Panel Swap Interaction

Swap button on panel header opens PanelPicker overlay. Selecting a type dispatches
updatePanelType, unmounts current panel (cleanup fires), mounts new panel with
defaults merged from registry. Settings persist per slot per workspace.

---

## 11. CLAUDE DESKTOP INTEGRATION

### 10.1 Strategy

Claude panel integrates with Claude Desktop locally — not the Claude API.
Uses existing Pro/Max subscription. No per-token cost. No API key required.

Claude Desktop runs a local server when active. Claude panel connects via
Tauri WebviewWindow (native OS webview, not HTML iframe — bypasses all
X-Frame-Options restrictions).

### 10.2 Connection Sequence

1. Claude panel mounts
2. Detect Claude Desktop local server on configured port
3. If detected → Tauri WebviewWindow opens on local server URL
4. If not detected → panel renders "Launch Claude Desktop" state
5. Launch button → Tauri shell spawns Claude Desktop process
6. Panel polls for availability, connects when ready

### 10.3 Fallback

If Claude Desktop cannot be launched or detected, panel falls back to a Tauri
WebviewWindow pointed at claude.ai (webviewUrl in ClaudeSettings). Automatic,
no user action required.

---

## 12. TAURI COMMAND INTERFACE

All Tauri invoke commands are wrapped in `src/shell/`. The frontend never calls
`invoke()` directly outside these wrapper files.

```typescript
// src/shell/terminal.ts
export async function spawnShell(cwd: string, shell: string): Promise<string>
export async function writeToShell(ptyId: string, data: string): Promise<void>
export async function killShell(ptyId: string): Promise<void>

// src/shell/filesystem.ts
export async function readDirectory(path: string): Promise<FileNode[]>
export async function readFile(path: string): Promise<string>

// src/shell/git.ts
export async function getGitStatus(repoPath: string): Promise<GitStatus>

// src/shell/docker.ts
export async function dockerInspect(containerName: string): Promise<string>

// src/shell/workspace.ts
export async function loadConfig(): Promise<AppConfig>
export async function saveConfig(config: AppConfig): Promise<void>
export async function pickFolder(): Promise<string | null>

// src/shell/claude.ts
export async function detectClaudeDesktop(port: number): Promise<boolean>
export async function launchClaudeDesktop(): Promise<void>
```

---

## 13. FILE STRUCTURE

This structure is the law. Do not create files outside it without a DECISIONS.md entry.

```
Yggdrasil/
├── ARCHITECTURE.md
├── IMPLEMENTATION.md
├── ERRORS.md
├── DECISIONS.md
├── CLAUDE.md
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── shell.rs
│   │   │   ├── filesystem.rs
│   │   │   ├── git.rs
│   │   │   ├── docker.rs
│   │   │   ├── claude.rs
│   │   │   └── workspace.rs
│   │   └── types.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── types/
│   │   ├── workspace.ts
│   │   ├── panels.ts
│   │   └── widgets.ts
│   │
│   ├── store/
│   │   ├── WorkspaceContext.tsx
│   │   └── AppContext.tsx
│   │
│   ├── shell/
│   │   ├── terminal.ts
│   │   ├── filesystem.ts
│   │   ├── git.ts
│   │   ├── docker.ts
│   │   ├── workspace.ts
│   │   └── claude.ts
│   │
│   ├── panels/
│   │   ├── registry.ts
│   │   ├── PanelContainer.tsx
│   │   ├── PanelPicker.tsx
│   │   ├── PanelSkeleton.tsx
│   │   ├── terminal/
│   │   │   ├── TerminalPanel.tsx
│   │   │   ├── terminal.types.ts
│   │   │   └── terminal.module.css
│   │   ├── webview/
│   │   │   ├── WebviewPanel.tsx
│   │   │   ├── webview.types.ts
│   │   │   └── webview.module.css
│   │   ├── filetree/
│   │   │   ├── FileTreePanel.tsx
│   │   │   ├── FileNode.tsx
│   │   │   ├── filetree.types.ts
│   │   │   └── filetree.module.css
│   │   ├── editor/
│   │   │   ├── EditorPanel.tsx
│   │   │   ├── editor.types.ts
│   │   │   └── editor.module.css
│   │   └── claude/
│   │       ├── ClaudePanel.tsx
│   │       ├── claude.types.ts
│   │       └── claude.module.css
│   │
│   ├── workspace/
│   │   ├── Sidebar.tsx
│   │   ├── StatusBar.tsx
│   │   ├── LayoutGrid.tsx
│   │   ├── PlanningDrawer.tsx      # V1: collapsed toggle only
│   │   ├── WorkspaceCard.tsx
│   │   └── CreateWorkspaceModal.tsx
│   │
│   ├── widgets/
│   │   ├── registry.ts
│   │   ├── WidgetChip.tsx
│   │   ├── docker/
│   │   │   └── DockerWidget.tsx
│   │   ├── git/
│   │   │   └── GitWidget.tsx
│   │   └── generic/
│   │       └── GenericWidget.tsx
│   │
│   ├── hooks/
│   │   ├── useWorkspace.ts
│   │   ├── usePanel.ts
│   │   └── useWidgets.ts
│   │
│   ├── theme/
│   │   ├── variables.css
│   │   ├── reset.css
│   │   └── typography.css
│   │
│   └── utils/
│       ├── cn.ts
│       └── format.ts
│
├── public/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── vite.config.ts
```

---

## 14. DESIGN SYSTEM

### 13.1 Color System

All colors are CSS custom properties in `src/theme/variables.css`.
No hardcoded hex values in any component file.

```css
:root {
  --bg-base:        #0a0a0f;
  --bg-surface:     #0d0d14;
  --bg-elevated:    #13131f;
  --bg-overlay:     #1a1a2e;

  --border-subtle:  #1a1a2e;
  --border-default: #1e1e30;

  --text-primary:   #e5e7eb;
  --text-secondary: #9ca3af;
  --text-muted:     #6b7280;
  --text-faint:     #374151;

  --status-ok:      #00ff88;
  --status-warn:    #fbbf24;
  --status-error:   #f87171;
  --status-idle:    #374151;

  /* Overridden per workspace at runtime */
  --accent:         #00ff88;
  --accent-dim:     color-mix(in srgb, var(--accent) 18%, transparent);
  --accent-border:  color-mix(in srgb, var(--accent) 30%, transparent);

  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace;
  --font-size-xs: 9px;
  --font-size-sm: 10px;
  --font-size-md: 11px;
  --font-size-lg: 13px;

  --sidebar-width:         190px;
  --topbar-height:         42px;
  --panel-header-height:   36px;
  --planning-drawer-width: 32px;   /* collapsed V1 toggle width */
}
```

### 13.2 Accent Color Scoping

```typescript
// Applied in WorkspaceContext on active workspace change
document.documentElement.style.setProperty('--accent', workspace.accentColor);
```

### 13.3 Accent Color Presets (8 options)

```
#00ff88  Green    #60a5fa  Blue
#f472b6  Pink     #fb923c  Orange
#a78bfa  Purple   #34d399  Teal
#fbbf24  Yellow   #f87171  Red
```

### 13.4 Typography

Single font: JetBrains Mono across all text and all sizes.
No serif or sans-serif fonts anywhere in the application.

---

## 15. KNOWN CONSTRAINTS AND RISKS

### 14.1 Webview Embedding (X-Frame-Options)
**Risk:** HTML iframes blocked by sites with X-Frame-Options.
**Mitigation:** All webview and Claude panels use Tauri WebviewWindow (native OS
webview, not iframe). Bypasses X-Frame-Options entirely. Non-negotiable.

### 14.2 xterm.js + Tauri PTY on Windows
**Risk:** Full PTY support on Windows requires specific Tauri shell configuration.
Highest-risk integration in the stack.
**Mitigation:** Built and validated in Milestone 1 before anything else.
Fallback: command-execution mode (discrete commands, captured output).

### 14.3 Monaco Bundle Size
**Risk:** Monaco is ~5MB+. Impacts startup if eagerly bundled.
**Mitigation:** Always loaded via React.lazy(). Never in the initial bundle.
Only loads when an Editor panel is mounted.

### 14.4 Claude Desktop Local Server Port
**Risk:** Claude Desktop's local server port may vary or change across versions.
**Mitigation:** Port is configurable in ClaudeSettings. Detection polls common
ports if configured port fails. Fallback to claude.ai webview is always available.

### 14.5 Git Status on Large Repos
**Risk:** Git CLI invocation can be slow on large repositories.
**Mitigation:** 15-second poll interval by default. All git calls async and
non-blocking. Never blocks UI or other panels.

---

## 16. WHAT THIS DOCUMENT IS NOT

- Implementation steps or build order → IMPLEMENTATION.md
- Error logs or lessons learned → ERRORS.md
- Decision rationale → DECISIONS.md
- Session instructions for Claude Code → CLAUDE.md

---

*End of ARCHITECTURE.md*
*Version 1.1 — Updated 2026-02-24*
*This document is the constitution. Changes require a DECISIONS.md entry first.*
