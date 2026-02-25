import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import { PanelType } from '../types/panels';
import type { PanelSettings } from '../types/panels';
import type { Workspace, AppConfig } from '../types/workspace';
import type { KeyboardShortcut } from '../types/shortcuts';
import { loadConfig, saveConfig } from '../shell/workspace';

// --- State Shape ---

interface WorkspaceState {
  loading: boolean;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  shortcuts: KeyboardShortcut[];
}

// --- Actions ---

type WorkspaceAction =
  | { type: 'SWITCH_WORKSPACE'; workspaceId: string }
  | { type: 'UPDATE_PANEL_TYPE'; slotIndex: number; panelType: PanelType }
  | { type: 'UPDATE_PANEL_SETTINGS'; slotIndex: number; settings: PanelSettings }
  | { type: 'SET_WORKSPACES'; workspaces: Workspace[]; activeWorkspaceId: string }
  | { type: 'CREATE_WORKSPACE'; workspace: Workspace }
  | { type: 'DELETE_WORKSPACE'; workspaceId: string }
  | { type: 'LOADED'; config: AppConfig };

// --- Reducer ---

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'LOADED': {
      const ws = action.config.workspaces.find(w => w.id === action.config.activeWorkspaceId);
      if (ws) {
        document.documentElement.style.setProperty('--accent', ws.accentColor);
      }
      return {
        loading: false,
        workspaces: action.config.workspaces,
        activeWorkspaceId: action.config.activeWorkspaceId,
        shortcuts: action.config.shortcuts,
      };
    }
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
      return { ...state, workspaces: action.workspaces, activeWorkspaceId: action.activeWorkspaceId };
    case 'CREATE_WORKSPACE': {
      document.documentElement.style.setProperty('--accent', action.workspace.accentColor);
      return {
        ...state,
        workspaces: [...state.workspaces, action.workspace],
        activeWorkspaceId: action.workspace.id,
      };
    }
    case 'DELETE_WORKSPACE': {
      const remaining = state.workspaces.filter(w => w.id !== action.workspaceId);
      const wasActive = state.activeWorkspaceId === action.workspaceId;
      let nextActiveId = state.activeWorkspaceId;
      if (wasActive && remaining.length > 0) {
        nextActiveId = remaining[0].id;
        document.documentElement.style.setProperty('--accent', remaining[0].accentColor);
      } else if (remaining.length === 0) {
        nextActiveId = '';
      }
      return {
        ...state,
        workspaces: remaining,
        activeWorkspaceId: nextActiveId,
      };
    }
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
    loading: true,
    workspaces: [],
    activeWorkspaceId: '',
    shortcuts: [],
  });

  const initialLoadDone = useRef(false);

  // Load config from disk on mount
  useEffect(() => {
    loadConfig().then((config) => {
      dispatch({ type: 'LOADED', config });
      initialLoadDone.current = true;
    });
  }, []);

  // Save to disk on every state change (skip during initial load)
  useEffect(() => {
    if (!initialLoadDone.current || state.loading) return;
    const config: AppConfig = {
      version: '1.0.0',
      activeWorkspaceId: state.activeWorkspaceId,
      workspaces: state.workspaces,
      shortcuts: state.shortcuts,
    };
    saveConfig(config);
  }, [state.workspaces, state.activeWorkspaceId, state.shortcuts, state.loading]);

  const activeWorkspace = state.workspaces.find(w => w.id === state.activeWorkspaceId);

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
