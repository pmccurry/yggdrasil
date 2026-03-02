# M21 — Git Diff + Branch Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the GitPanel with visual file diff viewing and branch management (list, create, switch).

**Architecture:** Three new views inside GitPanel controlled by a `view` state: `'files'` (existing), `'diff'`, and `'branches'`. Two new React components (`GitDiff.tsx`, `BranchManager.tsx`) render sub-views. Four new Rust commands (`git_diff`, `git_list_branches`, `git_create_branch`, `git_switch_branch`) extend the existing git.rs module. All git operations use the D017 pattern (shell out to git CLI via `std::process::Command`).

**Tech Stack:** Tauri v2 (Rust backend), React 19, TypeScript 5.9, CSS Modules with existing CSS variables.

---

## Task 1: Add Rust git_diff command

**Files:**
- Modify: `src-tauri/src/commands/git.rs` (append after `git_current_branch`)
- Modify: `src-tauri/src/lib.rs` (register command)

**Step 1: Add `git_diff` command to git.rs**

Append this function after `git_current_branch`:

```rust
#[tauri::command]
pub async fn git_diff(repo_path: String, file_path: String) -> Result<String, String> {
    let mut cmd = Command::new("git");
    cmd.args(["diff", "HEAD", "--", &file_path])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    // git diff returns exit code 0 for both diffs and no-diffs
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!("git diff failed: {}", stderr));
    }

    Ok(stdout)
}
```

**Step 2: Register in lib.rs**

Add `commands::git::git_diff,` after the `commands::git::git_current_branch,` line in the `generate_handler!` macro.

**Step 3: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: zero errors

---

## Task 2: Add Rust branch management commands

**Files:**
- Modify: `src-tauri/src/commands/git.rs` (append after `git_diff`)
- Modify: `src-tauri/src/lib.rs` (register commands)

**Step 1: Add `GitBranchInfo` struct and three commands to git.rs**

Append after `git_diff`:

```rust
#[derive(serde::Serialize)]
pub struct GitBranchInfo {
    pub name: String,
    pub is_current: bool,
    pub last_commit: String,
}

#[tauri::command]
pub async fn git_list_branches(repo_path: String) -> Result<Vec<GitBranchInfo>, String> {
    let mut cmd = Command::new("git");
    cmd.args(["branch", "--format=%(HEAD) %(refname:short) %(subject)"])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git branch failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut branches = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() { continue; }

        let is_current = line.starts_with('*');
        let rest = if is_current { &line[2..] } else { &line[2..] };
        let mut parts = rest.splitn(2, ' ');
        let name = parts.next().unwrap_or("").to_string();
        let last_commit = parts.next().unwrap_or("").to_string();

        if !name.is_empty() {
            branches.push(GitBranchInfo { name, is_current, last_commit });
        }
    }

    Ok(branches)
}

#[tauri::command]
pub async fn git_create_branch(repo_path: String, name: String) -> Result<(), String> {
    let mut cmd = Command::new("git");
    cmd.args(["checkout", "-b", &name])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to create branch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git checkout -b failed: {}", stderr));
    }

    Ok(())
}

#[tauri::command]
pub async fn git_switch_branch(repo_path: String, name: String) -> Result<(), String> {
    let mut cmd = Command::new("git");
    cmd.args(["checkout", &name])
        .current_dir(&repo_path);

    #[cfg(windows)]
    cmd.creation_flags(0x08000000);

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to switch branch: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("git checkout failed: {}", stderr));
    }

    Ok(())
}
```

**Step 2: Register all three in lib.rs**

Add these three lines after `commands::git::git_diff,`:
```
commands::git::git_list_branches,
commands::git::git_create_branch,
commands::git::git_switch_branch,
```

**Step 3: Verify Rust compiles**

Run: `cd src-tauri && cargo check`
Expected: zero errors

**Step 4: Commit**

```bash
git add src-tauri/src/commands/git.rs src-tauri/src/lib.rs
git commit -m "M21 — add Rust commands for git diff, branch list/create/switch"
```

---

## Task 3: Add TypeScript types and shell wrappers

**Files:**
- Modify: `src/panels/git/git.types.ts` (add types)
- Modify: `src/shell/git.ts` (add wrappers)

**Step 1: Add types to git.types.ts**

Append after `GitFileEntry`:

```typescript
export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  lastCommit: string;
}
```

Note: Tauri auto-converts Rust `snake_case` fields to `camelCase` in JS (see MEMORY.md M1 decisions).

**Step 2: Add wrappers to shell/git.ts**

Append after `getCurrentBranch`:

```typescript
export async function gitDiff(repoPath: string, filePath: string): Promise<string> {
  return invoke<string>('git_diff', { repoPath, filePath });
}

export async function gitListBranches(repoPath: string): Promise<GitBranchInfo[]> {
  return invoke<GitBranchInfo[]>('git_list_branches', { repoPath });
}

export async function gitCreateBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>('git_create_branch', { repoPath, name });
}

export async function gitSwitchBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>('git_switch_branch', { repoPath, name });
}
```

Add the import at the top of git.ts:
```typescript
import type { GitBranchInfo } from '../panels/git/git.types';
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc -b`
Expected: zero errors

**Step 4: Commit**

```bash
git add src/panels/git/git.types.ts src/shell/git.ts
git commit -m "M21 — add TypeScript types and wrappers for diff and branch commands"
```

---

## Task 4: Create GitDiff component

**Files:**
- Create: `src/panels/git/GitDiff.tsx`
- Modify: `src/panels/git/GitPanel.module.css` (add diff styles)

**Step 1: Create GitDiff.tsx**

```tsx
import styles from './GitPanel.module.css';

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk' | 'header';
  content: string;
}

function parseDiff(raw: string): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('@@')) {
      lines.push({ type: 'hunk', content: line });
    } else if (line.startsWith('+')) {
      lines.push({ type: 'added', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      lines.push({ type: 'removed', content: line.slice(1) });
    } else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      lines.push({ type: 'header', content: line });
    } else {
      lines.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line });
    }
  }
  return lines;
}

interface GitDiffProps {
  filePath: string;
  diff: string;
  onBack: () => void;
}

function GitDiff({ filePath, diff, onBack }: GitDiffProps) {
  const isBinary = diff.includes('Binary files');

  return (
    <div className={styles.diffContainer}>
      <div className={styles.diffHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          &#x2190; Back
        </button>
        <span className={styles.diffFileName}>{filePath}</span>
      </div>
      <div className={styles.diffContent}>
        {isBinary ? (
          <div className={styles.diffBinary}>Binary file — diff not available</div>
        ) : diff.trim() === '' ? (
          <div className={styles.diffBinary}>No changes (file may be staged)</div>
        ) : (
          parseDiff(diff).map((line, i) => (
            <div
              key={i}
              className={`${styles.diffLine} ${
                line.type === 'added' ? styles.diffAdded :
                line.type === 'removed' ? styles.diffRemoved :
                line.type === 'hunk' ? styles.diffHunk :
                line.type === 'header' ? styles.diffMeta :
                ''
              }`}
            >
              <span className={styles.diffPrefix}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              <span className={styles.diffText}>{line.content || '\u00A0'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default GitDiff;
```

**Step 2: Add diff CSS styles to GitPanel.module.css**

Append at end of file:

```css
/* ── Diff View ──────────────────────────────────── */

.diffContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-surface);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.diffHeader {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  min-height: var(--panel-header-height);
  background-color: var(--bg-elevated);
  border-bottom: 1px solid var(--border-subtle);
  gap: 8px;
}

.backBtn {
  background: none;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  padding: 2px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.1s, color 0.1s;
}

.backBtn:hover {
  background-color: var(--bg-overlay);
  color: var(--text-primary);
}

.diffFileName {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.diffContent {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.diffLine {
  display: flex;
  min-height: 20px;
  line-height: 20px;
  white-space: pre;
}

.diffPrefix {
  width: 20px;
  flex-shrink: 0;
  text-align: center;
  color: var(--text-muted);
  user-select: none;
}

.diffText {
  flex: 1;
  padding-right: 10px;
}

.diffAdded {
  background-color: color-mix(in srgb, var(--status-ok) 12%, transparent);
}

.diffAdded .diffPrefix {
  color: var(--status-ok);
}

.diffRemoved {
  background-color: color-mix(in srgb, var(--status-error) 12%, transparent);
}

.diffRemoved .diffPrefix {
  color: var(--status-error);
}

.diffHunk {
  background-color: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.diffMeta {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}

.diffBinary {
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
}
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc -b`
Expected: zero errors

---

## Task 5: Create BranchManager component

**Files:**
- Create: `src/panels/git/BranchManager.tsx`
- Modify: `src/panels/git/GitPanel.module.css` (add branch styles)

**Step 1: Create BranchManager.tsx**

```tsx
import { useState, useCallback } from 'react';
import type { GitBranchInfo } from './git.types';
import styles from './GitPanel.module.css';

interface BranchManagerProps {
  branches: GitBranchInfo[];
  hasDirtyTree: boolean;
  onSwitch: (name: string) => void;
  onCreate: (name: string) => void;
  onBack: () => void;
}

function BranchManager({ branches, hasDirtyTree, onSwitch, onCreate, onBack }: BranchManagerProps) {
  const [newBranch, setNewBranch] = useState('');
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    const trimmed = newBranch.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewBranch('');
  }, [newBranch, onCreate]);

  const handleBranchClick = useCallback((name: string) => {
    if (hasDirtyTree) {
      setConfirmSwitch(name);
    } else {
      onSwitch(name);
    }
  }, [hasDirtyTree, onSwitch]);

  const handleConfirmSwitch = useCallback(() => {
    if (confirmSwitch) {
      onSwitch(confirmSwitch);
      setConfirmSwitch(null);
    }
  }, [confirmSwitch, onSwitch]);

  return (
    <div className={styles.branchContainer}>
      <div className={styles.diffHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          &#x2190; Back
        </button>
        <span className={styles.diffFileName}>Branches</span>
      </div>

      <div className={styles.branchCreateRow}>
        <input
          className={styles.branchInput}
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="New branch name..."
        />
        <button
          className={styles.branchCreateBtn}
          onClick={handleCreate}
          disabled={!newBranch.trim()}
        >
          Create
        </button>
      </div>

      <div className={styles.branchList}>
        {branches.map((b) => (
          <div
            key={b.name}
            className={`${styles.branchRow} ${b.isCurrent ? styles.branchCurrent : ''}`}
            onClick={() => { if (!b.isCurrent) handleBranchClick(b.name); }}
          >
            <span className={styles.branchRowName}>
              {b.isCurrent ? '\u2713 ' : ''}{b.name}
            </span>
            <span className={styles.branchRowCommit}>{b.lastCommit}</span>
          </div>
        ))}
      </div>

      {confirmSwitch && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p>You have uncommitted changes. Switch to <strong>{confirmSwitch}</strong> anyway?</p>
            <div className={styles.confirmActions}>
              <button className={styles.backBtn} onClick={() => setConfirmSwitch(null)}>
                Cancel
              </button>
              <button className={styles.branchCreateBtn} onClick={handleConfirmSwitch}>
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BranchManager;
```

**Step 2: Add branch CSS styles to GitPanel.module.css**

Append at end of file:

```css
/* ── Branch Manager ─────────────────────────────── */

.branchContainer {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-surface);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.branchCreateRow {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-subtle);
}

.branchInput {
  flex: 1;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--font-size-sm);
  padding: 4px 8px;
  outline: none;
}

.branchInput:focus {
  border-color: var(--accent-border);
}

.branchInput::placeholder {
  color: var(--text-faint);
}

.branchCreateBtn {
  background-color: var(--accent-dim);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: var(--font-size-xs);
  padding: 4px 10px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.branchCreateBtn:hover:not(:disabled) {
  background-color: color-mix(in srgb, var(--accent) 25%, transparent);
}

.branchCreateBtn:disabled {
  opacity: 0.4;
  cursor: default;
}

.branchList {
  flex: 1;
  overflow-y: auto;
}

.branchRow {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.1s;
}

.branchRow:hover {
  background-color: var(--bg-overlay);
}

.branchCurrent {
  cursor: default;
}

.branchCurrent .branchRowName {
  color: var(--accent);
  font-weight: 600;
}

.branchRowName {
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.branchRowCommit {
  flex: 1;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
}

.confirmOverlay {
  position: absolute;
  inset: 0;
  background-color: color-mix(in srgb, var(--bg-surface) 80%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.confirmDialog {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 16px;
  max-width: 300px;
  text-align: center;
}

.confirmDialog p {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.4;
}

.confirmActions {
  display: flex;
  gap: 8px;
  justify-content: center;
}
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc -b`
Expected: zero errors

**Step 4: Commit**

```bash
git add src/panels/git/GitDiff.tsx src/panels/git/BranchManager.tsx src/panels/git/GitPanel.module.css
git commit -m "M21 — add GitDiff and BranchManager components with styles"
```

---

## Task 6: Update GitPanel with view routing and file click → diff

**Files:**
- Modify: `src/panels/git/GitPanel.tsx`
- Modify: `src/panels/git/GitFileList.tsx` (add onClick handler for files)

**Step 1: Update GitFileList to support onFileClick**

Add an `onFileClick` prop to GitFileList. When a file row is clicked (not the toggle button), call `onFileClick(path)`:

In the `GitFileListProps` interface, add:
```typescript
onFileClick?: (path: string) => void;
```

In the file row `<div>`, add an onClick handler:
```tsx
<div
  key={file.path}
  className={styles.fileRow}
  onClick={() => onFileClick?.(file.path)}
  style={{ cursor: onFileClick ? 'pointer' : 'default' }}
>
```

The toggle button needs `e.stopPropagation()` to avoid triggering the row click:
```tsx
<button
  className={styles.toggleBtn}
  onClick={(e) => { e.stopPropagation(); onToggle(file.path); }}
  title={staged ? 'Unstage' : 'Stage'}
>
```

**Step 2: Update GitPanel.tsx with view state and new imports**

Add to imports:
```typescript
import {
  getGitStatus,
  getCurrentBranch,
  gitStage,
  gitUnstage,
  gitCommit,
  gitPush,
  gitPull,
  gitDiff,
  gitListBranches,
  gitCreateBranch,
  gitSwitchBranch,
} from '../../shell/git';
import type { GitBranchInfo } from './git.types';
import GitDiff from './GitDiff';
import BranchManager from './BranchManager';
```

Add view state after existing state declarations:
```typescript
const [view, setView] = useState<'files' | 'diff' | 'branches'>('files');
const [diffFile, setDiffFile] = useState<string>('');
const [diffContent, setDiffContent] = useState<string>('');
const [branches, setBranches] = useState<GitBranchInfo[]>([]);
```

Add handlers:

```typescript
const handleFileClick = useCallback(async (path: string) => {
  if (!repoPath) return;
  setOperationLoading(true);
  try {
    const raw = await gitDiff(repoPath, path);
    setDiffFile(path);
    setDiffContent(raw);
    setView('diff');
  } catch (e) {
    setError(String(e));
  } finally {
    setOperationLoading(false);
  }
}, [repoPath]);

const handleShowBranches = useCallback(async () => {
  if (!repoPath) return;
  setOperationLoading(true);
  try {
    const list = await gitListBranches(repoPath);
    setBranches(list);
    setView('branches');
  } catch (e) {
    setError(String(e));
  } finally {
    setOperationLoading(false);
  }
}, [repoPath]);

const handleCreateBranch = useCallback(async (name: string) => {
  if (!repoPath) return;
  setOperationLoading(true);
  try {
    await gitCreateBranch(repoPath, name);
    emitNotification('git.operation.complete', 'Git', `Created branch: ${name}`);
    await refresh();
    const list = await gitListBranches(repoPath);
    setBranches(list);
  } catch (e) {
    setError(String(e));
  } finally {
    setOperationLoading(false);
  }
}, [repoPath, refresh]);

const handleSwitchBranch = useCallback(async (name: string) => {
  if (!repoPath) return;
  setOperationLoading(true);
  try {
    await gitSwitchBranch(repoPath, name);
    emitNotification('git.operation.complete', 'Git', `Switched to: ${name}`);
    await refresh();
    setView('files');
  } catch (e) {
    setError(String(e));
  } finally {
    setOperationLoading(false);
  }
}, [repoPath, refresh]);
```

**Step 3: Update the return JSX in GitPanel**

Replace the return block (after the loading/error guards). The key changes:

1. Add a "Branches" button next to Pull/Push in the header
2. Conditionally render the view based on `view` state
3. Pass `onFileClick` to both `GitFileList` instances

The header gets a Branches button:
```tsx
<button
  className={styles.actionBtn}
  onClick={handleShowBranches}
  disabled={operationLoading}
  title="Branches"
>
  Branches
</button>
```

The content area switches on view:
```tsx
{view === 'diff' ? (
  <GitDiff
    filePath={diffFile}
    diff={diffContent}
    onBack={() => setView('files')}
  />
) : view === 'branches' ? (
  <BranchManager
    branches={branches}
    hasDirtyTree={stagedFiles.length > 0 || unstagedFiles.length > 0}
    onSwitch={handleSwitchBranch}
    onCreate={handleCreateBranch}
    onBack={() => setView('files')}
  />
) : (
  <>
    <div className={styles.content}>
      {/* existing content: operationMessage, cleanState, file lists */}
      <GitFileList files={stagedFiles} staged={true} onToggle={handleUnstage} onFileClick={handleFileClick} />
      <GitFileList files={unstagedFiles} staged={false} onToggle={handleStage} onFileClick={handleFileClick} />
    </div>
    {stagedFiles.length > 0 && (
      <GitCommitForm onCommit={handleCommit} disabled={stagedFiles.length === 0} loading={operationLoading} />
    )}
  </>
)}
```

Important: The diff and branch views replace the entire content area (they have their own headers with back buttons). The main header with branch name and Pull/Push/Branches buttons stays visible in all views.

**Step 4: Verify TypeScript compiles**

Run: `pnpm tsc -b`
Expected: zero errors

**Step 5: Commit**

```bash
git add src/panels/git/GitPanel.tsx src/panels/git/GitFileList.tsx
git commit -m "M21 — wire GitPanel view routing: files, diff, branches"
```

---

## Task 7: Manual testing and final verification

**Step 1: Start dev server**

Run: `pnpm tauri dev`

**Step 2: Test diff view**

1. Open a workspace with a git repo that has modified files
2. In the Git panel, click a modified file name (not the +/- button)
3. Verify: diff view opens showing added lines (green tint), removed lines (red tint), context lines
4. Verify: "Back" button returns to file list
5. Test with a binary file if one exists — should show "Binary file — diff not available"
6. Test clicking a staged file — if `git diff HEAD` shows nothing for a clean staged file, the "No changes" message should appear

**Step 3: Test branch management**

1. Click "Branches" button in header
2. Verify: branch list shows all local branches, current branch highlighted with accent color and checkmark
3. Type a new branch name, click "Create" → new branch created and listed
4. Click a non-current branch to switch → switches immediately (clean tree)
5. Make a change (stage a file), then try switching → confirmation dialog appears
6. Click "Cancel" → dialog closes, no switch
7. Click "Switch" → switches branch, returns to files view

**Step 4: Verify no TypeScript or console errors**

Run: `pnpm tsc -b`
Expected: zero errors

Check browser devtools console — zero errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "M21 — git diff + branch management"
```

---

## Summary of files touched

| Action | File |
|--------|------|
| Modify | `src-tauri/src/commands/git.rs` |
| Modify | `src-tauri/src/lib.rs` |
| Modify | `src/panels/git/git.types.ts` |
| Modify | `src/shell/git.ts` |
| Create | `src/panels/git/GitDiff.tsx` |
| Create | `src/panels/git/BranchManager.tsx` |
| Modify | `src/panels/git/GitPanel.module.css` |
| Modify | `src/panels/git/GitPanel.tsx` |
| Modify | `src/panels/git/GitFileList.tsx` |
