import { useWorkspaceContext } from '../store/WorkspaceContext';
import WorkspaceCard from './WorkspaceCard';

function Sidebar() {
  const { state, dispatch } = useWorkspaceContext();

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      minWidth: 'var(--sidebar-width)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      overflow: 'hidden',
    }}>
      {/* Sidebar header */}
      <div style={{
        height: 'var(--topbar-height)',
        minHeight: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--text-muted)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        userSelect: 'none',
      }}>
        workspaces
      </div>

      {/* Workspace list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '4px 0',
      }}>
        {state.workspaces.map((ws) => (
          <WorkspaceCard
            key={ws.id}
            workspace={ws}
            isActive={ws.id === state.activeWorkspaceId}
            onSelect={() => {
              if (ws.id !== state.activeWorkspaceId) {
                dispatch({ type: 'SWITCH_WORKSPACE', workspaceId: ws.id });
              }
            }}
          />
        ))}
      </div>

      {/* Bottom section — version label */}
      <div style={{
        padding: '8px 12px',
        borderTop: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-faint)',
        userSelect: 'none',
      }}>
        yggdrasil v1
      </div>
    </div>
  );
}

export default Sidebar;
