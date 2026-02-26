import type { PanelSettings } from './panels';
import { PanelType } from './panels';
import type { WidgetConfig } from './widgets';
import type { KeyboardShortcut } from './shortcuts';

export interface PanelSlot {
  id:         string;
  type:       PanelType;
  settings:   PanelSettings;
  sizeWeight: number;       // relative flex weight within its row (default: 1)
  row:        0 | 1;        // which row this panel lives in (0 = top, 1 = bottom)
}

export type LayoutPreset =
  | 'two-equal'          // [A | B]                    — 2 panels, 1 row
  | 'large-medium'       // [A (large) | B (medium)]   — 2 panels, 1 row, weighted
  | 'large-two-stacked'  // [A (large) | B / C]        — 3 panels, B and C stacked in row 1
  | 'four-equal';        // [A | B] / [C | D]          — 4 panels, 2 rows equal

export interface WorkspaceLayout {
  preset:    LayoutPreset;
  rowWeight: number;       // relative height weight of row 0 vs row 1 (default: 1)
  panels:    PanelSlot[];  // ordered array, 1–4 panels
}

export interface WorkspaceActivationHook {
  terminalStartupCommands: string[];
  environmentVariables:    Record<string, string>;
  claudeDesktopProjectPath?: string;
}

export interface PlanningDrawerContent {
  scratchpad:        string;
  scratchpadVisible: boolean;
  milestoneVisible:  boolean;
  drawerOpen:        boolean;
}

export interface Workspace {
  id:          string;
  name:        string;
  icon:        string;
  accentColor: string;
  projectRoot: string;
  layout:      WorkspaceLayout;
  widgets:     WidgetConfig[];
  onActivate:  WorkspaceActivationHook;
  planning:    PlanningDrawerContent;
  createdAt:   string;
  updatedAt:   string;
}

export interface AppearanceSettings {
  terminalFontSize: number;  // 12–18, default 14
  editorFontSize:   number;  // 12–18, default 14
}

export interface AppConfig {
  version:           string;
  activeWorkspaceId: string;
  workspaces:        Workspace[];
  shortcuts:         KeyboardShortcut[];
  appearance:        AppearanceSettings;
}
