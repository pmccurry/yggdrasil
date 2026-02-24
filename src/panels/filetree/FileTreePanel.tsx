import type { PanelProps } from '../../types/panels';

function FileTreePanel({ projectRoot }: PanelProps) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-md)',
      flexDirection: 'column', gap: '8px',
    }}>
      <span style={{ color: 'var(--text-secondary)' }}>File Tree Panel</span>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-faint)' }}>{projectRoot}</span>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-faint)' }}>Implementation in M4</span>
    </div>
  );
}

export default FileTreePanel;
