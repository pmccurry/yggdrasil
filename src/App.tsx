import PanelContainer from './panels/PanelContainer';
import type { PanelSettings } from './types/panels';

// M1 temporary test layout — will be replaced in M2
function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <PanelContainer
        panelProps={{
          panelId: 'test-terminal',
          settings: {
            shell: 'powershell.exe',
            cwd: 'C:/users/patri',
            startupCommands: [],
          },
          projectRoot: 'C:/users/patri',
          accentColor: '#00ff88',
          onSettingsChange: (_settings: PanelSettings) => {},
        }}
      />
    </div>
  );
}

export default App;
