import { useState } from 'react';
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import { pickFolder } from '../../shell/workspace';
import { EMOJI_PRESETS_EXTENDED, COLOR_PRESETS } from '../shared-presets';
import type { Workspace } from '../../types/workspace';

function WorkspacesTab() {
  const { state, dispatch } = useWorkspaceContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Workspace | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(ws: Workspace) {
    setEditingId(ws.id);
    setEditForm({ ...ws });
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function saveEdit() {
    if (!editForm) return;
    dispatch({ type: 'UPDATE_WORKSPACE', workspace: editForm });
    setEditingId(null);
    setEditForm(null);
  }

  async function handlePickFolder() {
    if (!editForm) return;
    const folder = await pickFolder();
    if (folder) {
      setEditForm({ ...editForm, projectRoot: folder });
    }
  }

  function handleDelete(workspaceId: string) {
    dispatch({ type: 'DELETE_WORKSPACE', workspaceId });
    setConfirmDeleteId(null);
    if (editingId === workspaceId) cancelEdit();
  }

  const startupCommandsText = editForm
    ? (editForm.onActivate.terminalStartupCommands || []).join('\n')
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {state.workspaces.map((ws) => (
        <div key={ws.id} style={{
          backgroundColor: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          {/* Workspace row — click to expand */}
          <button
            onClick={() => editingId === ws.id ? cancelEdit() : startEdit(ws)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-md)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '16px' }}>{ws.icon}</span>
            <span style={{ flex: 1 }}>{ws.name}</span>
            {ws.id === state.activeWorkspaceId && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent)' }}>active</span>
            )}
            <span style={{ color: 'var(--text-faint)', fontSize: 'var(--font-size-sm)' }}>
              {editingId === ws.id ? '\u25B2' : '\u25BC'}
            </span>
          </button>

          {/* Expanded edit form */}
          {editingId === ws.id && editForm && (
            <div style={{
              padding: '12px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}>
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={inputStyle}
                />
              </div>

              {/* Icon */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Icon</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '3px' }}>
                  {EMOJI_PRESETS_EXTENDED.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setEditForm({ ...editForm, icon: emoji })}
                      style={{
                        padding: '4px',
                        fontSize: '14px',
                        backgroundColor: editForm.icon === emoji ? 'var(--accent-dim)' : 'var(--bg-surface)',
                        border: editForm.icon === emoji
                          ? '1px solid var(--accent-border)'
                          : '1px solid var(--border-subtle)',
                        borderRadius: 3,
                        cursor: 'pointer',
                        lineHeight: 1,
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Accent Color</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditForm({ ...editForm, accentColor: color })}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: editForm.accentColor === color
                          ? '2px solid var(--text-primary)'
                          : '2px solid transparent',
                        cursor: 'pointer',
                        outline: editForm.accentColor === color
                          ? `2px solid ${color}`
                          : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Project Root */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Project Root</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={handlePickFolder} style={smallButtonStyle}>
                    Change Folder
                  </button>
                  <span style={{
                    flex: 1,
                    fontSize: 'var(--font-size-xs)',
                    color: editForm.projectRoot ? 'var(--text-secondary)' : 'var(--text-faint)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {editForm.projectRoot || 'No folder selected'}
                  </span>
                </div>
              </div>

              {/* Startup Commands */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>Startup Commands (one per line)</label>
                <textarea
                  value={startupCommandsText}
                  onChange={(e) => {
                    const cmds = e.target.value.split('\n');
                    setEditForm({
                      ...editForm,
                      onActivate: { ...editForm.onActivate, terminalStartupCommands: cmds },
                    });
                  }}
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '48px',
                  }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                <div>
                  {state.workspaces.length > 1 && (
                    confirmDeleteId === ws.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--status-error)' }}>
                          Delete this workspace?
                        </span>
                        <button
                          onClick={() => handleDelete(ws.id)}
                          style={{ ...smallButtonStyle, color: 'var(--status-error)', borderColor: 'var(--status-error)' }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={smallButtonStyle}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(ws.id)}
                        style={{ ...smallButtonStyle, color: 'var(--status-error)' }}
                      >
                        Delete
                      </button>
                    )
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={cancelEdit} style={smallButtonStyle}>
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={!editForm.name.trim()}
                    style={{
                      ...smallButtonStyle,
                      backgroundColor: editForm.name.trim() ? 'var(--accent)' : 'var(--bg-overlay)',
                      color: editForm.name.trim() ? 'var(--bg-base)' : 'var(--text-faint)',
                      borderColor: 'transparent',
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--text-secondary)',
};

const inputStyle: React.CSSProperties = {
  padding: '5px 8px',
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  borderRadius: 4,
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-md)',
  outline: 'none',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  backgroundColor: 'transparent',
  border: '1px solid var(--border-default)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
};

export default WorkspacesTab;
