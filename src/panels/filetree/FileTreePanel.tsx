import { useEffect, useState } from 'react';
import type { PanelProps } from '../../types/panels';
import { readDirectory } from '../../shell/filesystem';
import type { FileNode as FileNodeType } from '../../shell/filesystem';
import { getGitStatus } from '../../shell/git';
import FileNode from './FileNode';
import styles from './filetree.module.css';

function FileTreePanel({ projectRoot }: PanelProps) {
  const [entries, setEntries] = useState<FileNodeType[] | null>(null);
  const [gitStatuses, setGitStatuses] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectRoot) return;

    let cancelled = false;

    async function loadRoot() {
      try {
        const result = await readDirectory(projectRoot);
        if (!cancelled) {
          setEntries(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setEntries(null);
        }
      }
    }

    async function loadGitStatus() {
      try {
        const status = await getGitStatus(projectRoot);
        if (!cancelled) {
          setGitStatuses(status);
        }
      } catch {
        // Git may not be available or not a git repo
      }
    }

    loadRoot();
    loadGitStatus();

    return () => {
      cancelled = true;
    };
  }, [projectRoot]);

  if (!projectRoot) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>⊞</span>
        <span className={styles.emptyLabel}>No project folder set</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        {error}
      </div>
    );
  }

  if (entries === null) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyLabel}>Loading...</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>⊞</span>
        <span className={styles.emptyLabel}>Empty directory</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {entries.map((node) => (
        <FileNode
          key={node.path}
          node={node}
          depth={0}
          gitStatuses={gitStatuses}
          projectRoot={projectRoot}
        />
      ))}
    </div>
  );
}

export default FileTreePanel;
