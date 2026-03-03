import { useEffect, useRef } from 'react';
import { WorkspaceProvider, useWorkspaceContext } from './store/WorkspaceContext';
import { AppProvider, useAppContext } from './store/AppContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSatellitePanel } from './hooks/useSatellitePanel';
import { useNotifications } from './hooks/useNotifications';
import { checkForUpdate } from './shell/updater';
import { emitNotification } from './utils/notify';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import Sidebar from './workspace/Sidebar';
import StatusBar from './workspace/StatusBar';
import LayoutGrid from './workspace/LayoutGrid';
import PlanningDrawer from './workspace/PlanningDrawer';
import SettingsModal from './workspace/Settings/SettingsModal';
import FirstRun from './workspace/FirstRun';
import SatelliteShell from './panels/SatelliteShell';

function AppShell() {
  const { state: wsState, dispatch: wsDispatch, activeWorkspace } = useWorkspaceContext();
  const { state: appState, dispatch: appDispatch } = useAppContext();
  const { popOut, recall, recallAll, closeAllOnExit } = useSatellitePanel();

  useKeyboardShortcuts({
    shortcuts: wsState.shortcuts,
    workspaces: wsState.workspaces,
    activeWorkspace,
    workspaceDispatch: wsDispatch,
    appDispatch,
    onSatellitePopOut: popOut,
    onSatelliteRecallAll: recallAll,
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

  // Listen for recall requests from satellite windows
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    // Dynamic listener: watch for recall events from any satellite
    // We subscribe to a general pattern — satellites emit panel:recall-requested:{panelId}
    const satellitePanelIds = Object.keys(wsState.satellitePanels);
    for (const panelId of satellitePanelIds) {
      listen(`panel:recall-requested:${panelId}`, () => {
        recall(panelId);
      }).then(fn => unlisteners.push(fn));
    }

    return () => {
      for (const fn of unlisteners) fn();
    };
  }, [wsState.satellitePanels, recall]);

  // Close all satellite windows when main app closes
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWebviewWindow();
    appWindow.onCloseRequested(async () => {
      const { destroyAll } = await import('./panels/terminal/terminalStore');
      destroyAll();
      await closeAllOnExit();
    }).then(fn => { unlisten = fn; });

    return () => { if (unlisten) unlisten(); };
  }, [closeAllOnExit]);

  // Clean up terminal store entries when a workspace is deleted
  const prevWorkspaceIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(wsState.workspaces.map(w => w.id));
    for (const prevId of prevWorkspaceIdsRef.current) {
      if (!currentIds.has(prevId)) {
        window.dispatchEvent(new CustomEvent('yggdrasil:terminal-cleanup-workspace', {
          detail: { workspaceId: prevId },
        }));
      }
    }
    prevWorkspaceIdsRef.current = currentIds;
  }, [wsState.workspaces]);

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
  // Detect satellite mode from URL params
  const params = new URLSearchParams(window.location.search);
  const isSatellite = params.get('satellite') === 'true';

  if (isSatellite) {
    return (
      <AppProvider>
        <WorkspaceProvider>
          <SatelliteShell />
        </WorkspaceProvider>
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </AppProvider>
  );
}

export default App;
