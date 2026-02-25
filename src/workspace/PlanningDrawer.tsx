import { useAppContext } from '../store/AppContext';

const COLLAPSED_WIDTH = 32;
const EXPANDED_WIDTH = 280;

function PlanningDrawer() {
  const { state, dispatch } = useAppContext();
  const isOpen = state.planningDrawerOpen;
  const width = isOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

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
        alignItems: isOpen ? 'center' : 'center',
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
          onClick={() => dispatch({ type: 'TOGGLE_PLANNING_DRAWER' })}
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

      {/* Expanded content placeholder — M9 will add scratchpad + milestone reader */}
      {isOpen && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          color: 'var(--text-faint)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          textAlign: 'center',
          userSelect: 'none',
        }}>
          Scratchpad &amp; milestone reader coming in M9
        </div>
      )}
    </div>
  );
}

export default PlanningDrawer;
