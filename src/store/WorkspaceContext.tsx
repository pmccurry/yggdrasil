import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { PanelType } from '../types/panels';
import type { PanelSettings } from '../types/panels';
import type { Workspace } from '../types/workspace';

// --- State Shape ---

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
}

// --- Actions ---

type WorkspaceAction =
  | { type: 'SWITCH_WORKSPACE'; workspaceId: string }
  | { type: 'UPDATE_PANEL_TYPE'; slotIndex: number; panelType: PanelType }
  | { type: 'UPDATE_PANEL_SETTINGS'; slotIndex: number; settings: PanelSettings }
  | { type: 'SET_WORKSPACES'; workspaces: Workspace[] };

// --- Hardcoded Workspaces (M2 only — persistence in M3) ---

const now = new Date().toISOString();

const HARDCODED_WORKSPACES: Workspace[] = [
  {
    id: 'ws-ratatoskr',
    name: 'Ratatoskr',
    icon: '\u26A1',
    accentColor: '#00ff88',
    projectRoot: 'C:/users/patri/Ratatoskr',
    layout: {
      panels: [
        { id: 'slot-0', type: PanelType.Terminal, settings: { shell: 'powershell.exe', cwd: 'C:/users/patri/Ratatoskr', startupCommands: ['cd C:/users/patri/Ratatoskr'] } },
        { id: 'slot-1', type: PanelType.Webview, settings: { url: 'http://localhost:8080', label: 'localhost:8080' } },
        { id: 'slot-2', type: PanelType.Claude, settings: { mode: 'desktop', desktopPort: 5173, webviewUrl: 'https://claude.ai' } },
      ],
    },
    widgets: [],
    onActivate: {
      terminalStartupCommands: ['cd C:/users/patri/Ratatoskr'],
      environmentVariables: {},
      claudeDesktopProjectPath: 'C:/users/patri/Ratatoskr',
    },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'ws-elementals',
    name: 'Elementals',
    icon: '\uD83C\uDF0A',
    accentColor: '#60a5fa',
    projectRoot: 'C:/users/patri/Elementals',
    layout: {
      panels: [
        { id: 'slot-0', type: PanelType.Terminal, settings: { shell: 'powershell.exe', cwd: 'C:/users/patri/Elementals', startupCommands: ['cd C:/users/patri/Elementals'] } },
        { id: 'slot-1', type: PanelType.Webview, settings: { url: 'http://localhost:3000', label: 'localhost:3000' } },
        { id: 'slot-2', type: PanelType.Claude, settings: { mode: 'desktop', desktopPort: 5173, webviewUrl: 'https://claude.ai' } },
      ],
    },
    widgets: [],
    onActivate: {
      terminalStartupCommands: ['cd C:/users/patri/Elementals'],
      environmentVariables: {},
      claudeDesktopProjectPath: 'C:/users/patri/Elementals',
    },
    createdAt: now,
    updatedAt: now,
  },
];

// --- Reducer ---

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SWITCH_WORKSPACE': {
      const workspace = state.workspaces.find(w => w.id === action.workspaceId);
      if (!workspace) return state;
      document.documentElement.style.setProperty('--accent', workspace.accentColor);
      return { ...state, activeWorkspaceId: action.workspaceId };
    }
    case 'UPDATE_PANEL_TYPE': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          const panels = [...ws.layout.panels] as [typeof ws.layout.panels[0], typeof ws.layout.panels[1], typeof ws.layout.panels[2]];
          panels[action.slotIndex] = {
            ...panels[action.slotIndex],
            type: action.panelType,
            settings: {},
          };
          return { ...ws, layout: { panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'UPDATE_PANEL_SETTINGS': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          const panels = [...ws.layout.panels] as [typeof ws.layout.panels[0], typeof ws.layout.panels[1], typeof ws.layout.panels[2]];
          panels[action.slotIndex] = {
            ...panels[action.slotIndex],
            settings: action.settings,
          };
          return { ...ws, layout: { panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'SET_WORKSPACES':
      return { ...state, workspaces: action.workspaces };
    default:
      return state;
  }
}

// --- Context ---

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  activeWorkspace: Workspace | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, {
    workspaces: HARDCODED_WORKSPACES,
    activeWorkspaceId: HARDCODED_WORKSPACES[0].id,
  });

  const activeWorkspace = state.workspaces.find(w => w.id === state.activeWorkspaceId);

  // Set initial accent color
  if (activeWorkspace) {
    document.documentElement.style.setProperty('--accent', activeWorkspace.accentColor);
  }

  return (
    <WorkspaceContext.Provider value={{ state, dispatch, activeWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaceContext must be used within WorkspaceProvider');
  return ctx;
}
