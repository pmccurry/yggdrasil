import type { LayoutPreset } from '../types/workspace';
import { PRESET_ORDER } from './presets';

interface LayoutPresetPickerProps {
  activePreset: LayoutPreset;
  onSelectPreset: (preset: LayoutPreset) => void;
}

const PRESET_ICONS: Record<LayoutPreset, string> = {
  'two-equal':         '[ | ]',
  'large-medium':      '[█| ]',
  'large-two-stacked': '[█|─]',
  'four-equal':        '[ ┼ ]',
};

const PRESET_LABELS: Record<LayoutPreset, string> = {
  'two-equal':         'Two equal panels',
  'large-medium':      'Large + medium',
  'large-two-stacked': 'Large + two stacked',
  'four-equal':        'Four equal panels',
};

function LayoutPresetPicker({ activePreset, onSelectPreset }: LayoutPresetPickerProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    }}>
      {PRESET_ORDER.map((preset) => {
        const isActive = preset === activePreset;
        return (
          <button
            key={preset}
            onClick={() => onSelectPreset(preset)}
            title={PRESET_LABELS[preset]}
            style={{
              background: isActive ? 'var(--accent-dim)' : 'none',
              border: '1px solid',
              borderColor: isActive ? 'var(--accent-border)' : 'transparent',
              borderRadius: '3px',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-xs)',
              padding: '2px 4px',
              lineHeight: 1,
              transition: 'color 0.15s, border-color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.borderColor = 'transparent';
              }
            }}
          >
            {PRESET_ICONS[preset]}
          </button>
        );
      })}
    </div>
  );
}

export default LayoutPresetPicker;
