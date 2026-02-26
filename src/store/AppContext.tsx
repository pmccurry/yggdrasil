import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { Update } from '@tauri-apps/plugin-updater';

interface AppState {
  focusedPanelIndex: number | null;
  settingsOpen: boolean;
  updateAvailable: { version: string; notes: string; update: Update } | null;
}

type AppAction =
  | { type: 'SET_PANEL_FOCUS'; index: number | null }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'SET_UPDATE_AVAILABLE'; version: string; notes: string; update: Update }
  | { type: 'DISMISS_UPDATE' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_PANEL_FOCUS':
      return { ...state, focusedPanelIndex: action.index };
    case 'OPEN_SETTINGS':
      return { ...state, settingsOpen: true };
    case 'CLOSE_SETTINGS':
      return { ...state, settingsOpen: false };
    case 'SET_UPDATE_AVAILABLE':
      return { ...state, updateAvailable: { version: action.version, notes: action.notes, update: action.update } };
    case 'DISMISS_UPDATE':
      return { ...state, updateAvailable: null };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    focusedPanelIndex: null,
    settingsOpen: false,
    updateAvailable: null,
  });

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
