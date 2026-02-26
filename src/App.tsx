import { WorkspaceProvider, useWorkspaceContext } from './store/WorkspaceContext';
import { AppProvider, useAppContext } from './store/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Sidebar from './workspace/Sidebar';
import StatusBar from './workspace/StatusBar';
import LayoutGrid from './workspace/LayoutGrid';
import PlanningDrawer from './workspace/PlanningDrawer';
import SettingsModal from './workspace/Settings/SettingsModal';

function AppShell() {
  const { state: wsState, dispatch: wsDispatch, activeWorkspace } = useWorkspaceContext();
  const { state: appState, dispatch: appDispatch } = useAppContext();

  useKeyboardShortcuts({
    shortcuts: wsState.shortcuts,
    workspaces: wsState.workspaces,
    activeWorkspace,
    workspaceDispatch: wsDispatch,
    appDispatch,
  });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-base)',
    }}>
      {/* Top bar: StatusBar spans above the panel grid */}
      <StatusBar />

      {/* Main area: Sidebar | LayoutGrid | PlanningDrawer */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        <Sidebar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <LayoutGrid />
        </div>
        <PlanningDrawer />
      </div>

      {appState.settingsOpen && (
        <SettingsModal onClose={() => appDispatch({ type: 'CLOSE_SETTINGS' })} />
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </AppProvider>
  );
}

export default App;
