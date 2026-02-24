import type { Workspace } from '../types/workspace';
import { PANEL_REGISTRY } from '../panels/registry';

interface WorkspaceCardProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
}

function WorkspaceCard({ workspace, isActive, onSelect }: WorkspaceCardProps) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        padding: '10px',
        background: isActive ? 'var(--accent-dim)' : 'transparent',
        border: 'none',
        borderLeft: isActive
          ? `2px solid var(--accent)`
          : '2px solid transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--bg-overlay)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {/* Workspace name + icon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ fontSize: 'var(--font-size-lg)' }}>{workspace.icon}</span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-sm)',
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          fontWeight: isActive ? 600 : 400,
        }}>
          {workspace.name}
        </span>
      </div>

      {/* Layout preview — shows panel type icons */}
      <div style={{
        display: 'flex',
        gap: '4px',
        paddingLeft: '22px',
      }}>
        {workspace.layout.panels.map((slot) => {
          const entry = PANEL_REGISTRY[slot.type];
          return (
            <span
              key={slot.id}
              title={entry.label}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-surface)',
                padding: '1px 4px',
                borderRadius: '2px',
              }}
            >
              {entry.icon}
            </span>
          );
        })}
      </div>
    </button>
  );
}

export default WorkspaceCard;
