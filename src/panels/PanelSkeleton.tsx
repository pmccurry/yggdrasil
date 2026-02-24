function PanelSkeleton() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-md)',
      }}
    >
      Loading...
    </div>
  );
}

export default PanelSkeleton;
