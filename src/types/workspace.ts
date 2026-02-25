import type { PanelSettings } from './panels';
import { PanelType } from './panels';
import type { WidgetConfig } from './widgets';
import type { KeyboardShortcut } from './shortcuts';

export interface PanelSlot {
  id:       string;
  type:     PanelType;
  settings: PanelSettings;
}

export interface WorkspaceLayout {
  panels: [PanelSlot, PanelSlot, PanelSlot];
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

export interface AppConfig {
  version:           string;
  activeWorkspaceId: string;
  workspaces:        Workspace[];
  shortcuts:         KeyboardShortcut[];
}
