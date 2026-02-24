import { useState } from 'react';
import type { Workspace } from '../types/workspace';
import { PANEL_REGISTRY } from '../panels/registry';

interface WorkspaceCardProps {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function WorkspaceCard({ workspace, isActive, onSelect, onDelete }: WorkspaceCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onSelect}
        onContextMenu={handleContextMenu}
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

      {/* Delete confirmation overlay */}
      {showConfirm && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 4,
          zIndex: 10,
          padding: '0 8px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}>
            Delete?
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowConfirm(false);
            }}
            style={{
              padding: '2px 8px',
              backgroundColor: 'var(--status-error)',
              border: 'none',
              borderRadius: 3,
              color: 'var(--bg-base)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Yes
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowConfirm(false);
            }}
            style={{
              padding: '2px 8px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 3,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              cursor: 'pointer',
            }}
          >
            No
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceCard;
