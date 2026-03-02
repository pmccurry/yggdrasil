import styles from './GitPanel.module.css';

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk' | 'header';
  content: string;
}

function parseDiff(raw: string): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const line of raw.split('\n')) {
    if (line.startsWith('@@')) {
      lines.push({ type: 'hunk', content: line });
    } else if (line.startsWith('+')) {
      lines.push({ type: 'added', content: line.slice(1) });
    } else if (line.startsWith('-')) {
      lines.push({ type: 'removed', content: line.slice(1) });
    } else if (line.startsWith('diff ') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      lines.push({ type: 'header', content: line });
    } else {
      lines.push({ type: 'context', content: line.startsWith(' ') ? line.slice(1) : line });
    }
  }
  return lines;
}

interface GitDiffProps {
  filePath: string;
  diff: string;
  onBack: () => void;
}

function GitDiff({ filePath, diff, onBack }: GitDiffProps) {
  const isBinary = diff.includes('Binary files');

  return (
    <div className={styles.diffContainer}>
      <div className={styles.diffHeader}>
        <button className={styles.backBtn} onClick={onBack}>
          &#x2190; Back
        </button>
        <span className={styles.diffFileName}>{filePath}</span>
      </div>
      <div className={styles.diffContent}>
        {isBinary ? (
          <div className={styles.diffBinary}>Binary file — diff not available</div>
        ) : diff.trim() === '' ? (
          <div className={styles.diffBinary}>No changes (file may be staged)</div>
        ) : (
          parseDiff(diff).map((line, i) => (
            <div
              key={i}
              className={`${styles.diffLine} ${
                line.type === 'added' ? styles.diffAdded :
                line.type === 'removed' ? styles.diffRemoved :
                line.type === 'hunk' ? styles.diffHunk :
                line.type === 'header' ? styles.diffMeta :
                ''
              }`}
            >
              <span className={styles.diffPrefix}>
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              <span className={styles.diffText}>{line.content || '\u00A0'}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default GitDiff;
