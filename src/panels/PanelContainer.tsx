import { Suspense, useState } from 'react';
import { PanelType } from '../types/panels';
import type { PanelProps } from '../types/panels';
import { PANEL_REGISTRY } from './registry';
import PanelSkeleton from './PanelSkeleton';
import PanelPicker from './PanelPicker';

interface PanelContainerProps {
  panelType: PanelType;
  panelProps: PanelProps;
  onSwapPanel: (newType: PanelType) => void;
}

function PanelContainer({ panelType, panelProps, onSwapPanel }: PanelContainerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entry = PANEL_REGISTRY[panelType];
  const PanelComponent = entry.component;

  function openPicker() {
    setPickerOpen(true);
    window.dispatchEvent(new CustomEvent('yggdrasil:picker-open', { detail: { panelId: panelProps.panelId } }));
  }

  function closePicker() {
    setPickerOpen(false);
    window.dispatchEvent(new CustomEvent('yggdrasil:picker-close', { detail: { panelId: panelProps.panelId } }));
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
    }}>
      {/* Panel Header */}
      <div
        style={{
        height: 'var(--panel-header-height)',
        minHeight: 'var(--panel-header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        backgroundColor: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        userSelect: 'none',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
        }}>
          <span style={{ fontSize: 'var(--font-size-md)' }}>{entry.icon}</span>
          <span>{entry.label}</span>
        </div>
        <button
          onClick={openPicker}
          title="Change panel type"
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: '3px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            padding: '2px 6px',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderColor = 'var(--accent-border)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          swap
        </button>
      </div>

      {/* Panel Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Suspense fallback={<PanelSkeleton />}>
          <PanelComponent {...panelProps} />
        </Suspense>

        {pickerOpen && (
          <PanelPicker
            currentType={panelType}
            onSelect={(newType) => {
              closePicker();
              if (newType !== panelType) {
                onSwapPanel(newType);
              }
            }}
            onClose={closePicker}
          />
        )}
      </div>
    </div>
  );
}

export default PanelContainer;
