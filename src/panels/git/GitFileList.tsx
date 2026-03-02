import type { GitFileEntry } from './git.types';
import styles from './GitPanel.module.css';

function statusLabel(code: string): string {
  switch (code) {
    case 'M': return 'M';
    case 'A': return 'A';
    case 'D': return 'D';
    case 'R': return 'R';
    case 'C': return 'C';
    case '?': return '?';
    default:  return code;
  }
}

function statusClass(code: string): string {
  switch (code) {
    case 'M': return styles.statusModified;
    case 'A': return styles.statusAdded;
    case 'D': return styles.statusDeleted;
    case '?': return styles.statusUntracked;
    default:  return styles.statusModified;
  }
}

interface GitFileListProps {
  files: GitFileEntry[];
  staged: boolean;
  onToggle: (path: string) => void;
  onFileClick?: (path: string) => void;
}

function GitFileList({ files, staged, onToggle, onFileClick }: GitFileListProps) {
  if (files.length === 0) return null;

  return (
    <div className={styles.fileSection}>
      <div className={styles.sectionLabel}>
        {staged ? 'Staged Changes' : 'Changes'} ({files.length})
      </div>
      {files.map((file) => {
        const code = staged ? file.indexStatus : file.workTreeStatus;
        return (
          <div key={file.path} className={styles.fileRow} onClick={() => onFileClick?.(file.path)} style={{ cursor: onFileClick ? 'pointer' : 'default' }}>
            <span className={`${styles.statusBadge} ${statusClass(code)}`}>
              {statusLabel(code)}
            </span>
            <span className={styles.filePath}>{file.path}</span>
            <button
              className={styles.toggleBtn}
              onClick={(e) => { e.stopPropagation(); onToggle(file.path); }}
              title={staged ? 'Unstage' : 'Stage'}
            >
              {staged ? '\u2212' : '+'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default GitFileList;
