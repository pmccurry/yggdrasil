import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import { PanelType } from '../types/panels';
import type { PanelSettings, AiProvider } from '../types/panels';
import type { Workspace, AppConfig, LayoutPreset, PlanningDrawerContent, AppearanceSettings } from '../types/workspace';
import type { NotificationConfig } from '../types/widgets';
import type { KeyboardShortcut } from '../types/shortcuts';
import { PANEL_REGISTRY } from '../panels/registry';
import { PRESET_CONFIGS } from '../workspace/presets';
import { loadConfig, saveConfig, defaultNotifications } from '../shell/workspace';

// --- State Shape ---

interface WorkspaceState {
  loading: boolean;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  shortcuts: KeyboardShortcut[];
  appearance: AppearanceSettings;
  providers: AiProvider[];
  notifications: NotificationConfig;
}

// --- Actions ---

type WorkspaceAction =
  | { type: 'SWITCH_WORKSPACE'; workspaceId: string }
  | { type: 'UPDATE_PANEL_TYPE'; slotIndex: number; panelType: PanelType }
  | { type: 'UPDATE_PANEL_SETTINGS'; slotIndex: number; settings: PanelSettings }
  | { type: 'SET_WORKSPACES'; workspaces: Workspace[]; activeWorkspaceId: string }
  | { type: 'CREATE_WORKSPACE'; workspace: Workspace }
  | { type: 'DELETE_WORKSPACE'; workspaceId: string }
  | { type: 'LOADED'; config: AppConfig }
  | { type: 'SET_LAYOUT_PRESET'; preset: LayoutPreset }
  | { type: 'ADD_PANEL'; panelType: PanelType }
  | { type: 'REMOVE_PANEL'; slotIndex: number }
  | { type: 'UPDATE_PANEL_SIZE_WEIGHT'; slotIndex: number; sizeWeight: number }
  | { type: 'UPDATE_ROW_WEIGHT'; rowWeight: number }
  | { type: 'UPDATE_PLANNING'; planning: Partial<PlanningDrawerContent> }
  | { type: 'UPDATE_WORKSPACE'; workspace: Workspace }
  | { type: 'UPDATE_SHORTCUTS'; shortcuts: KeyboardShortcut[] }
  | { type: 'UPDATE_APPEARANCE'; appearance: AppearanceSettings }
  | { type: 'ADD_PROVIDER'; provider: AiProvider }
  | { type: 'UPDATE_PROVIDER'; provider: AiProvider }
  | { type: 'DELETE_PROVIDER'; providerId: string }
  | { type: 'UPDATE_NOTIFICATIONS'; notifications: NotificationConfig };

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
        appearance: action.config.appearance,
        providers: action.config.providers,
        notifications: action.config.notifications,
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
          const panels = ws.layout.panels.map((p, i) =>
            i === action.slotIndex ? { ...p, type: action.panelType, settings: {} } : p,
          );
          return { ...ws, layout: { ...ws.layout, panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'UPDATE_PANEL_SETTINGS': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          const panels = ws.layout.panels.map((p, i) =>
            i === action.slotIndex ? { ...p, settings: action.settings } : p,
          );
          return { ...ws, layout: { ...ws.layout, panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'SET_LAYOUT_PRESET': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          const presetDef = PRESET_CONFIGS[action.preset];
          const panels = presetDef.defaultSlots.map((slot, i) => {
            const existing = ws.layout.panels[i];
            return {
              id: `slot-${i}`,
              type: existing?.type ?? PanelType.Terminal,
              settings: existing?.settings ?? { ...PANEL_REGISTRY[PanelType.Terminal].defaults },
              sizeWeight: slot.sizeWeight,
              row: slot.row,
            };
          });
          return {
            ...ws,
            layout: { preset: action.preset, rowWeight: 1, panels },
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }
    case 'ADD_PANEL': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          if (ws.layout.panels.length >= 4) return ws;
          const newPanel = {
            id: `slot-${ws.layout.panels.length}`,
            type: action.panelType,
            settings: { ...PANEL_REGISTRY[action.panelType].defaults },
            sizeWeight: 1,
            row: 0 as const,
          };
          const panels = [...ws.layout.panels, newPanel];
          return { ...ws, layout: { ...ws.layout, panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'REMOVE_PANEL': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          if (ws.layout.panels.length <= 1) return ws;
          const panels = ws.layout.panels
            .filter((_, i) => i !== action.slotIndex)
            .map((p, i) => ({ ...p, id: `slot-${i}` }));
          return { ...ws, layout: { ...ws.layout, panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'UPDATE_PANEL_SIZE_WEIGHT': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          const panels = ws.layout.panels.map((p, i) =>
            i === action.slotIndex ? { ...p, sizeWeight: action.sizeWeight } : p,
          );
          return { ...ws, layout: { ...ws.layout, panels }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'UPDATE_ROW_WEIGHT': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          return { ...ws, layout: { ...ws.layout, rowWeight: action.rowWeight }, updatedAt: new Date().toISOString() };
        }),
      };
    }
    case 'UPDATE_PLANNING': {
      return {
        ...state,
        workspaces: state.workspaces.map(ws => {
          if (ws.id !== state.activeWorkspaceId) return ws;
          return { ...ws, planning: { ...ws.planning, ...action.planning }, updatedAt: new Date().toISOString() };
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
    case 'UPDATE_WORKSPACE': {
      const updated = { ...action.workspace, updatedAt: new Date().toISOString() };
      if (updated.id === state.activeWorkspaceId) {
        document.documentElement.style.setProperty('--accent', updated.accentColor);
      }
      return {
        ...state,
        workspaces: state.workspaces.map(ws => ws.id === updated.id ? updated : ws),
      };
    }
    case 'UPDATE_SHORTCUTS':
      return { ...state, shortcuts: action.shortcuts };
    case 'UPDATE_APPEARANCE':
      return { ...state, appearance: action.appearance };
    case 'ADD_PROVIDER':
      return { ...state, providers: [...state.providers, action.provider] };
    case 'UPDATE_PROVIDER':
      return {
        ...state,
        providers: state.providers.map(p => p.id === action.provider.id ? action.provider : p),
      };
    case 'DELETE_PROVIDER':
      return {
        ...state,
        providers: state.providers.filter(p => p.id !== action.providerId),
      };
    case 'UPDATE_NOTIFICATIONS':
      return { ...state, notifications: action.notifications };
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
    appearance: { terminalFontSize: 14, editorFontSize: 14 },
    providers: [],
    notifications: defaultNotifications(),
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
      appearance: state.appearance,
      providers: state.providers,
      notifications: state.notifications,
    };
    saveConfig(config);
  }, [state.workspaces, state.activeWorkspaceId, state.shortcuts, state.appearance, state.providers, state.notifications, state.loading]);

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
