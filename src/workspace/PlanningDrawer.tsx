import { useAppContext } from '../store/AppContext';

function PlanningDrawer() {
  const { dispatch } = useAppContext();

  return (
    <div style={{
      width: 'var(--planning-drawer-width)',
      minWidth: 'var(--planning-drawer-width)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      backgroundColor: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border-subtle)',
    }}>
      <button
        onClick={() => dispatch({ type: 'TOGGLE_PLANNING_DRAWER' })}
        title="Planning Drawer (V2)"
        style={{
          marginTop: '8px',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: '1px solid var(--border-subtle)',
          borderRadius: '3px',
          color: 'var(--text-faint)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-faint)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
        }}
      >
        P
      </button>
    </div>
  );
}

export default PlanningDrawer;
