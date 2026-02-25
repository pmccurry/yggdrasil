import { useWorkspaceContext } from '../store/WorkspaceContext';
import Scratchpad from './PlanningDrawer/Scratchpad';
import MilestoneReader from './PlanningDrawer/MilestoneReader';

const COLLAPSED_WIDTH = 32;
const EXPANDED_WIDTH = 280;

function PlanningDrawer() {
  const { dispatch, activeWorkspace } = useWorkspaceContext();
  const isOpen = activeWorkspace?.planning.drawerOpen ?? false;
  const width = isOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const toggleDrawer = () => {
    dispatch({ type: 'UPDATE_PLANNING', planning: { drawerOpen: !isOpen } });
  };

  return (
    <div style={{
      width: `${width}px`,
      minWidth: `${width}px`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
      transition: 'width 0.15s, min-width 0.15s',
      overflow: 'hidden',
    }}>
      {/* Header with toggle button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isOpen ? 'space-between' : 'center',
        padding: isOpen ? '8px 10px' : '8px 0',
        flexShrink: 0,
      }}>
        {isOpen && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            userSelect: 'none',
          }}>
            Planning
          </span>
        )}
        <button
          onClick={toggleDrawer}
          title={isOpen ? 'Collapse drawer (Ctrl+.)' : 'Open planning drawer (Ctrl+.)'}
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: '3px',
            color: isOpen ? 'var(--text-secondary)' : 'var(--text-faint)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            transition: 'color 0.15s, border-color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isOpen ? 'var(--text-secondary)' : 'var(--text-faint)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          {isOpen ? '\u2039' : 'P'}
        </button>
      </div>

      {/* Expanded content: Scratchpad + MilestoneReader */}
      {isOpen && activeWorkspace && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Scratchpad
            scratchpad={activeWorkspace.planning.scratchpad}
            scratchpadVisible={activeWorkspace.planning.scratchpadVisible}
            workspaceId={activeWorkspace.id}
            dispatch={dispatch}
          />
          <MilestoneReader
            projectRoot={activeWorkspace.projectRoot}
            milestoneVisible={activeWorkspace.planning.milestoneVisible}
            dispatch={dispatch}
          />
        </div>
      )}
    </div>
  );
}

export default PlanningDrawer;
