import { useState, useCallback } from 'react';
import type { GitBranchInfo } from './git.types';
import styles from './GitPanel.module.css';

interface BranchManagerProps {
  branches: GitBranchInfo[];
  hasDirtyTree: boolean;
  onSwitch: (name: string) => void;
  onCreate: (name: string) => void;
  onBack: () => void;
}

function BranchManager({ branches, hasDirtyTree, onSwitch, onCreate, onBack }: BranchManagerProps) {
  const [newBranch, setNewBranch] = useState('');
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    const trimmed = newBranch.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setNewBranch('');
  }, [newBranch, onCreate]);

  const handleBranchClick = useCallback((name: string) => {
    if (hasDirtyTree) {
      setConfirmSwitch(name);
    } else {
      onSwitch(name);
    }
  }, [hasDirtyTree, onSwitch]);

  const handleConfirmSwitch = useCallback(() => {
    if (confirmSwitch) {
      onSwitch(confirmSwitch);
      setConfirmSwitch(null);
    }
  }, [confirmSwitch, onSwitch]);

  return (
    <div className={styles.branchContainer}>
      <div className={styles.diffHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          &#x2190; Back
        </button>
        <span className={styles.diffFileName}>Branches</span>
      </div>

      <div className={styles.branchCreateRow}>
        <input
          className={styles.branchInput}
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          placeholder="New branch name..."
        />
        <button
          className={styles.branchCreateBtn}
          onClick={handleCreate}
          disabled={!newBranch.trim()}
        >
          Create
        </button>
      </div>

      <div className={styles.branchList}>
        {branches.map((b) => (
          <div
            key={b.name}
            className={`${styles.branchRow} ${b.isCurrent ? styles.branchCurrent : ''}`}
            onClick={() => { if (!b.isCurrent) handleBranchClick(b.name); }}
          >
            <span className={styles.branchRowName}>
              {b.isCurrent ? '\u2713 ' : ''}{b.name}
            </span>
            <span className={styles.branchRowCommit}>{b.lastCommit}</span>
          </div>
        ))}
      </div>

      {confirmSwitch && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            <p>You have uncommitted changes. Switch to <strong>{confirmSwitch}</strong> anyway?</p>
            <div className={styles.confirmActions}>
              <button className={styles.backBtn} onClick={() => setConfirmSwitch(null)}>
                Cancel
              </button>
              <button className={styles.branchCreateBtn} onClick={handleConfirmSwitch}>
                Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BranchManager;
