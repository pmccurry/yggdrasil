import { useState, useEffect, useCallback } from 'react';
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import { buildKeyString } from '../../hooks/useKeyboardShortcuts';
import { DEFAULT_SHORTCUTS } from '../../types/shortcuts';
import type { ShortcutAction } from '../../types/shortcuts';

const ACTION_LABELS: Record<ShortcutAction, string> = {
  'workspace.switch.1':  'Switch to Workspace 1',
  'workspace.switch.2':  'Switch to Workspace 2',
  'workspace.switch.3':  'Switch to Workspace 3',
  'workspace.switch.4':  'Switch to Workspace 4',
  'workspace.switch.5':  'Switch to Workspace 5',
  'panel.focus.0':       'Focus Panel 1',
  'panel.focus.1':       'Focus Panel 2',
  'panel.focus.2':       'Focus Panel 3',
  'panel.focus.3':       'Focus Panel 4',
  'panel.satellite.0':   'Pop Out Panel 1',
  'panel.satellite.1':   'Pop Out Panel 2',
  'panel.satellite.2':   'Pop Out Panel 3',
  'panel.satellite.3':   'Pop Out Panel 4',
  'panel.recall.all':    'Recall All Satellites',
  'drawer.toggle':       'Toggle Planning Drawer',
  'layout.preset.cycle': 'Cycle Layout Preset',
  'settings.open':       'Open Settings',
};

function ShortcutsTab() {
  const { state, dispatch } = useWorkspaceContext();
  const [remappingAction, setRemappingAction] = useState<ShortcutAction | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);

  const handleCapture = useCallback((e: KeyboardEvent) => {
    if (!remappingAction) return;

    // Ignore bare modifier keys
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setRemappingAction(null);
      setConflict(null);
      return;
    }

    const newKeys = buildKeyString(e);

    // Check for conflicts
    const existing = state.shortcuts.find(
      s => s.keys === newKeys && s.action !== remappingAction,
    );
    if (existing) {
      setConflict(`"${newKeys}" is already used by ${ACTION_LABELS[existing.action]}`);
      return;
    }

    const updated = state.shortcuts.map(s =>
      s.action === remappingAction ? { ...s, keys: newKeys } : s,
    );
    dispatch({ type: 'UPDATE_SHORTCUTS', shortcuts: updated });
    setRemappingAction(null);
    setConflict(null);
  }, [remappingAction, state.shortcuts, dispatch]);

  useEffect(() => {
    if (!remappingAction) return;
    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [remappingAction, handleCapture]);

  function handleResetDefaults() {
    dispatch({ type: 'UPDATE_SHORTCUTS', shortcuts: [...DEFAULT_SHORTCUTS] });
    setRemappingAction(null);
    setConflict(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {state.shortcuts.map((shortcut) => (
        <button
          key={shortcut.action}
          onClick={() => {
            setRemappingAction(shortcut.action);
            setConflict(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            background: remappingAction === shortcut.action ? 'var(--accent-dim)' : 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-md)',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'background-color 0.15s',
          }}
        >
          <span>{ACTION_LABELS[shortcut.action]}</span>
          <span style={{
            padding: '2px 8px',
            backgroundColor: 'var(--bg-overlay)',
            borderRadius: 3,
            fontSize: 'var(--font-size-sm)',
            color: remappingAction === shortcut.action ? 'var(--accent)' : 'var(--text-secondary)',
          }}>
            {remappingAction === shortcut.action ? 'Press new key combo...' : shortcut.keys}
          </span>
        </button>
      ))}

      {conflict && (
        <div style={{
          padding: '6px 10px',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--status-error)',
        }}>
          {conflict}
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={handleResetDefaults}
          style={{
            padding: '6px 14px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-default)',
            borderRadius: 4,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

export default ShortcutsTab;
