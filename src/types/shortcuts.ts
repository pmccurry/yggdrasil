// src/types/shortcuts.ts

// All shortcut actions available in the app
export type ShortcutAction =
  | 'workspace.switch.1'
  | 'workspace.switch.2'
  | 'workspace.switch.3'
  | 'workspace.switch.4'
  | 'workspace.switch.5'
  | 'panel.focus.0'
  | 'panel.focus.1'
  | 'panel.focus.2'
  | 'panel.focus.3'
  | 'drawer.toggle'
  | 'layout.preset.cycle';

export interface KeyboardShortcut {
  action:  ShortcutAction;
  keys:    string;
  enabled: boolean;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { action: 'workspace.switch.1', keys: 'ctrl+1', enabled: true },
  { action: 'workspace.switch.2', keys: 'ctrl+2', enabled: true },
  { action: 'workspace.switch.3', keys: 'ctrl+3', enabled: true },
  { action: 'workspace.switch.4', keys: 'ctrl+4', enabled: true },
  { action: 'workspace.switch.5', keys: 'ctrl+5', enabled: true },
  { action: 'panel.focus.0',      keys: 'alt+1',  enabled: true },
  { action: 'panel.focus.1',      keys: 'alt+2',  enabled: true },
  { action: 'panel.focus.2',      keys: 'alt+3',  enabled: true },
  { action: 'panel.focus.3',      keys: 'alt+4',  enabled: true },
  { action: 'drawer.toggle',      keys: 'ctrl+.',  enabled: true },
  { action: 'layout.preset.cycle',keys: 'ctrl+shift+l', enabled: true },
];
