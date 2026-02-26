import { useEffect, useRef } from 'react';
import { PanelType } from '../types/panels';
import { PANEL_REGISTRY } from './registry';

interface PanelPickerProps {
  currentType: PanelType;
  onSelect: (type: PanelType) => void;
  onClose: () => void;
}

function PanelPicker({ currentType, onSelect, onClose }: PanelPickerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 10,
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
        {Object.values(PANEL_REGISTRY).filter(e => !e.hidden).map((entry) => {
          const isActive = entry.type === currentType;
          return (
            <button
              key={entry.type}
              onClick={() => onSelect(entry.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: isActive ? 'var(--accent-dim)' : 'none',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--font-size-sm)',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                textAlign: 'left',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-overlay)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ fontSize: 'var(--font-size-md)', width: '18px', textAlign: 'center' }}>
                {entry.icon}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{entry.label}</span>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-muted)',
                }}>
                  {entry.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PanelPicker;
