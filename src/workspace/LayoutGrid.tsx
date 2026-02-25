import { useWorkspaceContext } from '../store/WorkspaceContext';
import { useAppContext } from '../store/AppContext';
import PanelContainer from '../panels/PanelContainer';
import type { PanelSettings } from '../types/panels';

function LayoutGrid() {
  const { activeWorkspace, dispatch } = useWorkspaceContext();
  const { state: appState } = useAppContext();

  if (!activeWorkspace) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-md)',
      }}>
        No workspace selected
      </div>
    );
  }

  const { panels } = activeWorkspace.layout;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-base)',
    }}>
      {panels.map((slot, index) => (
        <PanelContainer
          key={`${activeWorkspace.id}-${slot.id}`}
          panelType={slot.type}
          isFocused={appState.focusedPanelIndex === index}
          panelProps={{
            panelId: `${activeWorkspace.id}-${slot.id}`,
            settings: slot.settings,
            projectRoot: activeWorkspace.projectRoot,
            accentColor: activeWorkspace.accentColor,
            onSettingsChange: (settings: PanelSettings) => {
              dispatch({
                type: 'UPDATE_PANEL_SETTINGS',
                slotIndex: index,
                settings,
              });
            },
          }}
          onSwapPanel={(newType) => {
            dispatch({
              type: 'UPDATE_PANEL_TYPE',
              slotIndex: index,
              panelType: newType,
            });
          }}
        />
      ))}
    </div>
  );
}

export default LayoutGrid;
