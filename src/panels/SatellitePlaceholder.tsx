import { PanelType } from '../types/panels';
import { PANEL_REGISTRY } from './registry';

interface SatellitePlaceholderProps {
  panelType: PanelType;
  onRecall: () => void;
}

function SatellitePlaceholder({ panelType, onRecall }: SatellitePlaceholderProps) {
  const entry = PANEL_REGISTRY[panelType];
  const isWebviewMode = panelType === PanelType.Webview || panelType === PanelType.AiChat;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      backgroundColor: 'var(--bg-base)',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: 'var(--font-size-lg)',
      }}>
        <span style={{ fontSize: '24px' }}>{entry.icon}</span>
        <span>{entry.label}</span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 'var(--font-size-sm)',
        color: 'var(--accent)',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span>Open in satellite window</span>
      </div>

      {isWebviewMode && (
        <div style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--text-muted)',
          maxWidth: '260px',
          textAlign: 'center',
          lineHeight: 1.5,
        }}>
          Satellite opened a new session. Your login state is preserved by the website.
        </div>
      )}

      <button
        onClick={onRecall}
        style={{
          marginTop: '8px',
          padding: '6px 16px',
          background: 'none',
          border: '1px solid var(--accent-border)',
          borderRadius: '4px',
          color: 'var(--accent)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-sm)',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--accent-dim)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Recall
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default SatellitePlaceholder;
