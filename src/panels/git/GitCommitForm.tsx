import { useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './GitPanel.module.css';

interface GitCommitFormProps {
  onCommit: (message: string) => void;
  disabled: boolean;
  loading: boolean;
}

function GitCommitForm({ onCommit, disabled, loading }: GitCommitFormProps) {
  const [message, setMessage] = useState('');

  const handleCommit = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || disabled || loading) return;
    onCommit(trimmed);
    setMessage('');
  }, [message, disabled, loading, onCommit]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCommit();
    }
  }, [handleCommit]);

  return (
    <div className={styles.commitForm}>
      <textarea
        className={styles.commitInput}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Commit message (Ctrl+Enter to commit)"
        rows={2}
        disabled={loading}
      />
      <div className={styles.actionBar}>
        <button
          className={styles.commitBtn}
          onClick={handleCommit}
          disabled={!message.trim() || disabled || loading}
        >
          {loading ? 'Committing...' : 'Commit'}
        </button>
      </div>
    </div>
  );
}

export default GitCommitForm;
