import { WorkspaceProvider } from './store/WorkspaceContext';
import { AppProvider } from './store/AppContext';
import Sidebar from './workspace/Sidebar';
import StatusBar from './workspace/StatusBar';
import LayoutGrid from './workspace/LayoutGrid';
import PlanningDrawer from './workspace/PlanningDrawer';

function App() {
  return (
    <AppProvider>
      <WorkspaceProvider>
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
        </div>
      </WorkspaceProvider>
    </AppProvider>
  );
}

export default App;
