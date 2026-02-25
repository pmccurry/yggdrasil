import { createContext, useContext, useReducer, type ReactNode } from 'react';

interface AppState {
  planningDrawerOpen: boolean;
  focusedPanelIndex: number | null;
}

type AppAction =
  | { type: 'TOGGLE_PLANNING_DRAWER' }
  | { type: 'SET_PANEL_FOCUS'; index: number | null };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_PLANNING_DRAWER':
      return { ...state, planningDrawerOpen: !state.planningDrawerOpen };
    case 'SET_PANEL_FOCUS':
      return { ...state, focusedPanelIndex: action.index };
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
    planningDrawerOpen: false,
    focusedPanelIndex: null,
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
