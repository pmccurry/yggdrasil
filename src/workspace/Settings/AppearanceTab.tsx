import { useWorkspaceContext } from '../../store/WorkspaceContext';

function AppearanceTab() {
  const { state, dispatch } = useWorkspaceContext();
  const { appearance } = state;

  function update(field: 'terminalFontSize' | 'editorFontSize', value: number) {
    dispatch({
      type: 'UPDATE_APPEARANCE',
      appearance: { ...appearance, [field]: value },
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SliderRow
        label="Terminal Font Size"
        value={appearance.terminalFontSize}
        onChange={(v) => update('terminalFontSize', v)}
      />
      <SliderRow
        label="Editor Font Size"
        value={appearance.editorFontSize}
        onChange={(v) => update('editorFontSize', v)}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <label style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {label}
        </label>
        <span style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
        }}>
          {value}px
        </span>
      </div>
      <input
        type="range"
        min={12}
        max={18}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          width: '100%',
          accentColor: 'var(--accent)',
        }}
      />
    </div>
  );
}

export default AppearanceTab;
