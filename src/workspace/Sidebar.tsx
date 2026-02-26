import { useState } from 'react';
import { useWorkspaceContext } from '../store/WorkspaceContext';
import { useAppContext } from '../store/AppContext';
import WorkspaceCard from './WorkspaceCard';
import CreateWorkspaceModal from './CreateWorkspaceModal';

function Sidebar() {
  const { state, dispatch } = useWorkspaceContext();
  const { dispatch: appDispatch } = useAppContext();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
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
              onDelete={() => {
                dispatch({ type: 'DELETE_WORKSPACE', workspaceId: ws.id });
              }}
            />
          ))}
        </div>

        {/* New workspace button */}
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            margin: '4px 8px',
            padding: '6px',
            backgroundColor: 'transparent',
            border: '1px dashed var(--border-default)',
            borderRadius: 4,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--accent-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-default)';
          }}
        >
          + new workspace
        </button>

        {/* Bottom section — gear icon + version label */}
        <div style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-faint)',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <button
            onClick={() => appDispatch({ type: 'OPEN_SETTINGS' })}
            title="Settings (Ctrl+,)"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px 4px',
              fontSize: '14px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1,
              borderRadius: 3,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {'\u2699'}
          </button>
          <span>yggdrasil v3</span>
        </div>
      </div>

      {showCreateModal && (
        <CreateWorkspaceModal
          onConfirm={(workspace) => {
            dispatch({ type: 'CREATE_WORKSPACE', workspace });
            setShowCreateModal(false);
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

export default Sidebar;
