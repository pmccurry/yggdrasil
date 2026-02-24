import type { WidgetState } from '../types/widgets';

const STATUS_COLORS: Record<string, string> = {
  ok:      'var(--status-ok)',
  warn:    'var(--status-warn)',
  error:   'var(--status-error)',
  idle:    'var(--status-idle)',
  loading: 'var(--text-muted)',
};

interface WidgetChipProps {
  label: string;
  state: WidgetState;
}

function WidgetChip({ label, state }: WidgetChipProps) {
  const dotColor = STATUS_COLORS[state.status] ?? 'var(--text-muted)';
  const isPulsing = state.status === 'ok';

  return (
    <span
      title={state.tooltip ?? `${label}: ${state.value}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--text-muted)',
        backgroundColor: 'var(--bg-surface)',
        padding: '2px 8px',
        borderRadius: '3px',
        border: '1px solid var(--border-subtle)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
          animation: isPulsing ? 'widget-pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      <span>{label}</span>
      {state.value && (
        <span style={{ color: 'var(--text-secondary)' }}>{state.value}</span>
      )}
    </span>
  );
}

export default WidgetChip;
