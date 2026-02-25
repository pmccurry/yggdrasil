import { useWorkspaceContext } from '../store/WorkspaceContext';
import { useWidgets } from '../hooks/useWidgets';
import WidgetChip from '../widgets/WidgetChip';
import LayoutPresetPicker from './LayoutPresetPicker';
import type { LayoutPreset } from '../types/workspace';

function StatusBar() {
  const { activeWorkspace, dispatch } = useWorkspaceContext();
  const widgetStates = useWidgets(activeWorkspace?.widgets ?? []);

  if (!activeWorkspace) return null;

  return (
    <div style={{
      height: 'var(--topbar-height)',
      minHeight: 'var(--topbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      backgroundColor: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border-subtle)',
      userSelect: 'none',
    }}>
      {/* Left: workspace icon + name */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: 'var(--font-size-lg)' }}>
          {activeWorkspace.icon}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-md)',
          color: 'var(--text-primary)',
          fontWeight: 500,
        }}>
          {activeWorkspace.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-faint)',
          marginLeft: '4px',
        }}>
          {activeWorkspace.projectRoot}
        </span>
      </div>

      {/* Center: layout preset picker */}
      <LayoutPresetPicker
        activePreset={activeWorkspace.layout.preset}
        onSelectPreset={(preset: LayoutPreset) => {
          dispatch({ type: 'SET_LAYOUT_PRESET', preset });
        }}
      />

      {/* Right: live widget chips */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        {activeWorkspace.widgets.map((widget) => {
          const state = widgetStates.get(widget.id) ?? {
            status: 'loading' as const,
            value: '...',
          };
          return (
            <WidgetChip
              key={widget.id}
              label={widget.label}
              state={state}
            />
          );
        })}
      </div>
    </div>
  );
}

export default StatusBar;
