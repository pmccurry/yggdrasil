import { useState } from 'react';
import { pickFolder, createNewWorkspace } from '../shell/workspace';
import type { Workspace } from '../types/workspace';

interface CreateWorkspaceModalProps {
  onConfirm: (workspace: Workspace) => void;
  onCancel: () => void;
}

const EMOJI_PRESETS = [
  '\u26A1', '\uD83D\uDE80', '\uD83C\uDF0A', '\uD83D\uDD25',
  '\uD83C\uDF3F', '\uD83D\uDC8E', '\u2B50', '\uD83C\uDFAF',
  '\uD83E\uDDE0', '\uD83D\uDEE0\uFE0F', '\uD83C\uDFB5', '\uD83C\uDF08',
];

const COLOR_PRESETS = [
  '#00ff88', '#60a5fa', '#f472b6', '#fb923c',
  '#a78bfa', '#34d399', '#fbbf24', '#f87171',
];

function CreateWorkspaceModal({ onConfirm, onCancel }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(EMOJI_PRESETS[0]);
  const [accentColor, setAccentColor] = useState(COLOR_PRESETS[0]);
  const [projectRoot, setProjectRoot] = useState('');

  const handlePickFolder = async () => {
    const folder = await pickFolder();
    if (folder) setProjectRoot(folder);
  };

  const handleConfirm = () => {
    if (!name.trim()) return;
    const workspace = createNewWorkspace(name.trim(), icon, accentColor, projectRoot);
    onConfirm(workspace);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div style={{
        width: 380,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        fontFamily: 'var(--font-mono)',
      }}>
        {/* Title */}
        <div style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--text-primary)',
          fontWeight: 600,
        }}>
          New Workspace
        </div>

        {/* Name input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Project"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border-default)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-md)',
              outline: 'none',
            }}
          />
        </div>

        {/* Icon picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Icon
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 4,
          }}>
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                style={{
                  padding: 6,
                  fontSize: 16,
                  backgroundColor: icon === emoji ? 'var(--accent-dim)' : 'var(--bg-base)',
                  border: icon === emoji
                    ? '1px solid var(--accent-border)'
                    : '1px solid var(--border-subtle)',
                  borderRadius: 4,
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Accent Color
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => setAccentColor(color)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: accentColor === color
                    ? '2px solid var(--text-primary)'
                    : '2px solid transparent',
                  cursor: 'pointer',
                  outline: accentColor === color
                    ? `2px solid ${color}`
                    : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Folder picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            Project Folder
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handlePickFolder}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--bg-base)',
                border: '1px solid var(--border-default)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Choose Folder
            </button>
            <span style={{
              flex: 1,
              fontSize: 'var(--font-size-xs)',
              color: projectRoot ? 'var(--text-secondary)' : 'var(--text-faint)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {projectRoot || 'No folder selected'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              padding: '6px 16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            style={{
              padding: '6px 16px',
              backgroundColor: name.trim() ? 'var(--accent)' : 'var(--bg-overlay)',
              border: 'none',
              borderRadius: 4,
              color: name.trim() ? 'var(--bg-base)' : 'var(--text-faint)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'default',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateWorkspaceModal;
