import { useEffect } from 'react';
import { WorkspaceProvider, useWorkspaceContext } from './store/WorkspaceContext';
import { AppProvider, useAppContext } from './store/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotifications } from './hooks/useNotifications';
import { checkForUpdate } from './shell/updater';
import { emitNotification } from './utils/notify';
import Sidebar from './workspace/Sidebar';
import StatusBar from './workspace/StatusBar';
import LayoutGrid from './workspace/LayoutGrid';
import PlanningDrawer from './workspace/PlanningDrawer';
import SettingsModal from './workspace/Settings/SettingsModal';
import FirstRun from './workspace/FirstRun';

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

  useNotifications({ config: wsState.notifications });

  // Check for updates once on startup
  useEffect(() => {
    checkForUpdate().then(result => {
      if (result?.available) {
        appDispatch({
          type: 'SET_UPDATE_AVAILABLE',
          version: result.version,
          notes: result.notes,
          update: result.update,
        });
        emitNotification('update.available', 'Update Available', `Version ${result.version} is available`);
      }
    });
  }, [appDispatch]);

  if (wsState.loading) return null;
  if (wsState.workspaces.length === 0) return <FirstRun />;

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
