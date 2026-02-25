import { useEffect } from 'react';
import type { KeyboardShortcut } from '../types/shortcuts';
import type { Workspace } from '../types/workspace';

interface UseKeyboardShortcutsArgs {
  shortcuts: KeyboardShortcut[];
  workspaces: Workspace[];
  workspaceDispatch: React.Dispatch<{ type: 'SWITCH_WORKSPACE'; workspaceId: string }>;
  appDispatch: React.Dispatch<
    | { type: 'TOGGLE_PLANNING_DRAWER' }
    | { type: 'SET_PANEL_FOCUS'; index: number | null }
  >;
}

function buildKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  // Normalize key to lowercase; map special keys
  const key = e.key === '.' ? '.' : e.key.toLowerCase();
  parts.push(key);
  return parts.join('+');
}

function isInsideTerminalOrEditor(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest('.xterm-helper-textarea') !== null ||
    target.closest('.xterm') !== null ||
    target.closest('.monaco-editor') !== null
  );
}

export function useKeyboardShortcuts({
  shortcuts,
  workspaces,
  workspaceDispatch,
  appDispatch,
}: UseKeyboardShortcutsArgs) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't intercept terminal or editor input
      if (isInsideTerminalOrEditor(e.target)) return;

      const keyString = buildKeyString(e);

      const match = shortcuts.find(s => s.enabled && s.keys === keyString);
      if (!match) return;

      e.preventDefault();

      const { action } = match;

      // workspace.switch.N
      if (action.startsWith('workspace.switch.')) {
        const n = parseInt(action.split('.')[2], 10);
        const index = n - 1;
        if (index >= 0 && index < workspaces.length) {
          workspaceDispatch({ type: 'SWITCH_WORKSPACE', workspaceId: workspaces[index].id });
        }
        return;
      }

      // panel.focus.N
      if (action.startsWith('panel.focus.')) {
        const n = parseInt(action.split('.')[2], 10);
        appDispatch({ type: 'SET_PANEL_FOCUS', index: n });
        return;
      }

      // drawer.toggle
      if (action === 'drawer.toggle') {
        appDispatch({ type: 'TOGGLE_PLANNING_DRAWER' });
        return;
      }

      // layout.preset.cycle — no-op in M7
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, workspaces, workspaceDispatch, appDispatch]);
}
