import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { killShell, onShellOutput } from '../../shell/terminal';
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
}

const store = new Map<string, TerminalEntry>();

export function getEntry(panelId: string): TerminalEntry | undefined {
  return store.get(panelId);
}

export function setEntry(panelId: string, entry: TerminalEntry): void {
  store.set(panelId, entry);
}

/** Start listening for PTY output, write to terminal buffer, and emit notifications. */
export async function attachListener(
  entry: TerminalEntry,
): Promise<() => void> {
  const unlisten = await onShellOutput(entry.ptyId, (data) => {
    entry.terminal.write(data);

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
  for (const panelId of [...store.keys()]) {
    if (panelId.startsWith(prefix)) {
      destroy(panelId);
    }
  }
}

/** Destroy every entry in the store. Called on app close. */
export function destroyAll(): void {
  for (const panelId of [...store.keys()]) {
    destroy(panelId);
  }
}

// Listen for explicit cleanup events (panel type swap, panel removal)
window.addEventListener('yggdrasil:terminal-cleanup', ((e: CustomEvent<{ panelId: string }>) => {
  destroy(e.detail.panelId);
}) as EventListener);

// Listen for workspace deletion cleanup events
window.addEventListener('yggdrasil:terminal-cleanup-workspace', ((e: CustomEvent<{ workspaceId: string }>) => {
  destroyForWorkspace(e.detail.workspaceId);
}) as EventListener);
