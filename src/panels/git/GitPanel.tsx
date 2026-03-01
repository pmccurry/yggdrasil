import { useEffect, useState, useCallback, useRef } from 'react';
import type { PanelProps, GitPanelSettings } from '../../types/panels';
import type { GitFileEntry } from './git.types';
import {
  getGitStatus,
  getCurrentBranch,
  gitStage,
  gitUnstage,
  gitCommit,
  gitPush,
  gitPull,
} from '../../shell/git';
import GitFileList from './GitFileList';
import GitCommitForm from './GitCommitForm';
import { emitNotification } from '../../utils/notify';
import styles from './GitPanel.module.css';

function GitPanel({ settings, projectRoot }: PanelProps) {
  const repoPath = (settings as GitPanelSettings).repoPath || projectRoot;

  const [branch, setBranch] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<GitFileEntry[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<GitFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);

  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!repoPath) return;

    try {
      const [branchName, statuses] = await Promise.all([
        getCurrentBranch(repoPath),
        getGitStatus(repoPath),
      ]);

      if (cancelledRef.current) return;

      setBranch(branchName);
      setError(null);

      const staged: GitFileEntry[] = [];
      const unstaged: GitFileEntry[] = [];

      for (const [path, code] of Object.entries(statuses)) {
        const indexStatus = code[0];
        const workTreeStatus = code[1];
        const entry: GitFileEntry = { path, indexStatus, workTreeStatus };

        // Untracked files go to unstaged
        if (code === '??') {
          unstaged.push(entry);
          continue;
        }

        // Index has a real status (not space) = staged
        if (indexStatus !== ' ') {
          staged.push(entry);
        }

        // Work tree has a real status (not space) = unstaged
        if (workTreeStatus !== ' ') {
          unstaged.push(entry);
        }
      }

      setStagedFiles(staged);
      setUnstagedFiles(unstaged);
    } catch (e) {
      if (cancelledRef.current) return;
      const msg = String(e);
      if (msg.includes('not a git repository')) {
        setError('Not a git repository');
      } else {
        setError(msg);
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [repoPath]);

  // Initial load + polling
  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    refresh();

    const interval = setInterval(refresh, 10000);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [refresh]);

  const handleStage = useCallback(async (path: string) => {
    if (!repoPath) return;
    setOperationLoading(true);
    try {
      await gitStage(repoPath, [path]);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setOperationLoading(false);
    }
  }, [repoPath, refresh]);

  const handleUnstage = useCallback(async (path: string) => {
    if (!repoPath) return;
    setOperationLoading(true);
    try {
      await gitUnstage(repoPath, [path]);
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setOperationLoading(false);
    }
  }, [repoPath, refresh]);

  const handleCommit = useCallback(async (message: string) => {
    if (!repoPath) return;
    setOperationLoading(true);
    setOperationMessage(null);
    try {
      await gitCommit(repoPath, message);
      emitNotification('git.operation.complete', 'Git', 'Commit complete');
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setOperationLoading(false);
    }
  }, [repoPath, refresh]);

  const handlePush = useCallback(async () => {
    if (!repoPath) return;
    setOperationLoading(true);
    setOperationMessage(null);
    try {
      const result = await gitPush(repoPath);
      setOperationMessage(result);
      emitNotification('git.operation.complete', 'Git', 'Push complete');
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setOperationLoading(false);
    }
  }, [repoPath, refresh]);

  const handlePull = useCallback(async () => {
    if (!repoPath) return;
    setOperationLoading(true);
    setOperationMessage(null);
    try {
      const result = await gitPull(repoPath);
      setOperationMessage(result);
      emitNotification('git.operation.complete', 'Git', 'Pull complete');
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setOperationLoading(false);
    }
  }, [repoPath, refresh]);

  if (!repoPath) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>&#x2387;</span>
        <span className={styles.emptyLabel}>No project folder set</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyLabel}>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>{error}</div>
      </div>
    );
  }

  const hasChanges = stagedFiles.length > 0 || unstagedFiles.length > 0;

  return (
    <div className={styles.container} style={{ position: 'relative' }}>
      {operationLoading && (
        <div className={styles.loadingOverlay}>Working...</div>
      )}

      <div className={styles.header}>
        <span className={styles.branchIcon}>&#x2387;</span>
        <span className={styles.branchName}>{branch || 'HEAD'}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            className={styles.actionBtn}
            onClick={handlePull}
            disabled={operationLoading}
            title="Pull"
          >
            Pull
          </button>
          <button
            className={styles.actionBtn}
            onClick={handlePush}
            disabled={operationLoading}
            title="Push"
          >
            Push
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {operationMessage && (
          <div className={styles.cleanState}>{operationMessage}</div>
        )}

        {!hasChanges && !operationMessage && (
          <div className={styles.cleanState}>Working tree clean</div>
        )}

        <GitFileList
          files={stagedFiles}
          staged={true}
          onToggle={handleUnstage}
        />
        <GitFileList
          files={unstagedFiles}
          staged={false}
          onToggle={handleStage}
        />
      </div>

      {stagedFiles.length > 0 && (
        <GitCommitForm
          onCommit={handleCommit}
          disabled={stagedFiles.length === 0}
          loading={operationLoading}
        />
      )}
    </div>
  );
}

export default GitPanel;
