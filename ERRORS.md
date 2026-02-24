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

*No additional entries yet. Entries will be added as the project is built.*
*Every bug fixed, every user correction, every non-obvious solution goes here.*

---

*End of ERRORS.md*
*Version 1.0 — Created 2026-02-24*
*This file only grows. Entries are never deleted.*
