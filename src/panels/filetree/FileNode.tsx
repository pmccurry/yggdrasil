import { useState, useCallback } from 'react';
import { readDirectory } from '../../shell/filesystem';
import type { FileNode as FileNodeType } from '../../shell/filesystem';
import styles from './filetree.module.css';

interface FileNodeProps {
  node: FileNodeType;
  depth: number;
  gitStatuses: Record<string, string>;
  projectRoot: string;
}

function getRelativePath(fullPath: string, projectRoot: string): string {
  const normalized = fullPath.replace(/\\/g, '/');
  const normalizedRoot = projectRoot.replace(/\\/g, '/');
  if (normalized.startsWith(normalizedRoot)) {
    return normalized.slice(normalizedRoot.length).replace(/^\//, '');
  }
  return normalized;
}

function getGitIndicator(relativePath: string, gitStatuses: Record<string, string>) {
  const status = gitStatuses[relativePath];
  if (!status) return null;

  if (status === 'M' || status === 'MM') {
    return <span className={`${styles.gitStatus} ${styles.gitModified}`}>M</span>;
  }
  if (status === '??' || status === 'U') {
    return <span className={`${styles.gitStatus} ${styles.gitUntracked}`}>?</span>;
  }
  if (status === 'A' || status === 'AM') {
    return <span className={`${styles.gitStatus} ${styles.gitAdded}`}>A</span>;
  }
  return <span className={`${styles.gitStatus} ${styles.gitModified}`}>{status}</span>;
}

function FileNode({ node, depth, gitStatuses, projectRoot }: FileNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNodeType[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (node.is_directory) {
      if (!expanded && children === null) {
        setLoading(true);
        try {
          const entries = await readDirectory(node.path);
          setChildren(entries);
        } catch {
          setChildren([]);
        }
        setLoading(false);
      }
      setExpanded(!expanded);
    } else {
      window.dispatchEvent(
        new CustomEvent('yggdrasil:open-file', { detail: { path: node.path } })
      );
    }
  }, [node, expanded, children]);

  const relativePath = getRelativePath(node.path, projectRoot);

  return (
    <>
      <div
        className={styles.nodeRow}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        <span className={styles.chevron}>
          {node.is_directory ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span className={`${styles.nodeIcon} ${node.is_directory ? styles.dirIcon : styles.fileIcon}`}>
          {node.is_directory ? '◆' : '◇'}
        </span>
        <span className={styles.nodeName}>{node.name}</span>
        {!node.is_directory && getGitIndicator(relativePath, gitStatuses)}
        {loading && <span className={styles.gitStatus} style={{ color: 'var(--text-faint)' }}>...</span>}
      </div>
      {expanded && children && (
        <div className={styles.children}>
          {children.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              depth={depth + 1}
              gitStatuses={gitStatuses}
              projectRoot={projectRoot}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default FileNode;
