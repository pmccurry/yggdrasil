import { useState } from 'react';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import { useWorkspaceContext } from '../store/WorkspaceContext';
import type { Workspace } from '../types/workspace';

function FirstRun() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { dispatch } = useWorkspaceContext();

  const handleConfirm = (workspace: Workspace) => {
    dispatch({ type: 'CREATE_WORKSPACE', workspace });
    setShowCreateModal(false);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-base)',
      fontFamily: 'var(--font-mono)',
      gap: 32,
    }}>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        color: 'var(--accent)',
        letterSpacing: '0.04em',
      }}>
        Yggdrasil
      </div>

      <div style={{
        maxWidth: 480,
        textAlign: 'center',
        lineHeight: 1.7,
        fontSize: 'var(--font-size-lg)',
        color: 'var(--text-secondary)',
      }}>
        Yggdrasil is a project-aware workspace for Windows developers.
        Each workspace is a named project with its own panel layout, terminal
        environment, and status widgets. Switch between projects instantly
        — your context shifts with you. Create your first workspace to get started.
      </div>

      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          marginTop: 8,
          padding: '10px 28px',
          backgroundColor: 'var(--accent)',
          border: 'none',
          borderRadius: 6,
          color: 'var(--bg-base)',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 600,
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        Create Workspace
      </button>

      {showCreateModal && (
        <CreateWorkspaceModal
          onConfirm={handleConfirm}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

export default FirstRun;
