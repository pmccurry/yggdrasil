import { useWorkspaceContext } from '../store/WorkspaceContext';

function StatusBar() {
  const { activeWorkspace } = useWorkspaceContext();

  if (!activeWorkspace) return null;

  return (
    <div style={{
      height: 'var(--topbar-height)',
      minHeight: 'var(--topbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      backgroundColor: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border-subtle)',
      userSelect: 'none',
    }}>
      {/* Left: workspace icon + name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: 'var(--font-size-lg)' }}>
          {activeWorkspace.icon}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-md)',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}>
          {activeWorkspace.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-faint)',
          marginLeft: '4px',
        }}>
          {activeWorkspace.projectRoot}
        </span>
      </div>

      {/* Right: widget placeholders — real widgets in M5 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {activeWorkspace.widgets.map((widget) => (
          <span
            key={widget.id}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface)',
              padding: '2px 8px',
              borderRadius: '3px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {widget.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default StatusBar;
