import { useEffect } from 'react';
import type { KeyboardShortcut } from '../types/shortcuts';
import type { Workspace, LayoutPreset, PlanningDrawerContent } from '../types/workspace';
import { PRESET_ORDER } from '../workspace/presets';

interface UseKeyboardShortcutsArgs {
  shortcuts: KeyboardShortcut[];
  workspaces: Workspace[];
  activeWorkspace?: Workspace;
  workspaceDispatch: React.Dispatch<
    | { type: 'SWITCH_WORKSPACE'; workspaceId: string }
    | { type: 'SET_LAYOUT_PRESET'; preset: LayoutPreset }
    | { type: 'UPDATE_PLANNING'; planning: Partial<PlanningDrawerContent> }
  >;
  appDispatch: React.Dispatch<
    | { type: 'SET_PANEL_FOCUS'; index: number | null }
    | { type: 'OPEN_SETTINGS' }
  >;
}

export function buildKeyString(e: KeyboardEvent): string {
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
  activeWorkspace,
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

      // settings.open
      if (action === 'settings.open') {
        appDispatch({ type: 'OPEN_SETTINGS' });
        return;
      }

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

      // drawer.toggle — per-workspace via WorkspaceContext
      if (action === 'drawer.toggle' && activeWorkspace) {
        workspaceDispatch({
          type: 'UPDATE_PLANNING',
          planning: { drawerOpen: !activeWorkspace.planning.drawerOpen },
        });
        return;
      }

      // layout.preset.cycle
      if (action === 'layout.preset.cycle' && activeWorkspace) {
        const currentIndex = PRESET_ORDER.indexOf(activeWorkspace.layout.preset);
        const nextIndex = (currentIndex + 1) % PRESET_ORDER.length;
        workspaceDispatch({ type: 'SET_LAYOUT_PRESET', preset: PRESET_ORDER[nextIndex] });
        return;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, workspaces, activeWorkspace, workspaceDispatch, appDispatch]);
}
