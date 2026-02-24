import { createContext, useContext, useReducer, type ReactNode } from 'react';

interface AppState {
  planningDrawerOpen: boolean;
}

type AppAction = { type: 'TOGGLE_PLANNING_DRAWER' };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TOGGLE_PLANNING_DRAWER':
      return { ...state, planningDrawerOpen: !state.planningDrawerOpen };
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
