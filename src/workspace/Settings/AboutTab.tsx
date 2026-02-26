import { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';

function AboutTab() {
  const [version, setVersion] = useState('...');

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('unknown'));
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Version */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Version
        </span>
        <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', fontWeight: 600 }}>
          Yggdrasil v{version}
        </span>
      </div>

      {/* Check for Updates */}
      <div>
        <button
          disabled
          title="Coming soon"
          style={{
            padding: '6px 14px',
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--border-default)',
            borderRadius: 4,
            color: 'var(--text-faint)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-sm)',
            cursor: 'default',
          }}
        >
          Check for Updates (coming soon)
        </button>
      </div>

      {/* Privacy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Privacy
        </span>
        <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Yggdrasil collects no telemetry. Your data never leaves your machine.
        </span>
      </div>
    </div>
  );
}

export default AboutTab;
