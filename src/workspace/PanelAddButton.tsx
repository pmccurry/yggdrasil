import { useState } from 'react';
import { PanelType } from '../types/panels';
import { PANEL_REGISTRY } from '../panels/registry';

interface PanelAddButtonProps {
  onAddPanel: (type: PanelType) => void;
}

function PanelAddButton({ onAddPanel }: PanelAddButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '48px',
      height: '100%',
      position: 'relative',
    }}>
      <button
        onClick={() => setPickerOpen(!pickerOpen)}
        title="Add panel"
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: '1px dashed var(--border-default)',
          borderRadius: '4px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-lg)',
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--accent)';
          e.currentTarget.style.borderColor = 'var(--accent-border)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }}
      >
        +
      </button>

      {pickerOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
          }}
        >
          <div style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '180px',
          }}>
            {Object.values(PANEL_REGISTRY).filter(e => !e.hidden).map((entry) => (
              <button
                key={entry.type}
                onClick={() => {
                  setPickerOpen(false);
                  onAddPanel(entry.type);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--text-secondary)',
                  textAlign: 'left',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-overlay)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span style={{ fontSize: 'var(--font-size-md)', width: '18px', textAlign: 'center' }}>
                  {entry.icon}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{entry.label}</span>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    {entry.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PanelAddButton;
