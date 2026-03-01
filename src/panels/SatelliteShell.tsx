import { useEffect, useState, useRef, Suspense } from 'react';
import { PanelType } from '../types/panels';
import type { PanelProps, PanelSettings } from '../types/panels';
import { PANEL_REGISTRY } from './registry';
import { loadConfig } from '../shell/workspace';
import { emitRecallRequested } from '../shell/satellite';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import PanelSkeleton from './PanelSkeleton';

function SatelliteShell() {
  const params = new URLSearchParams(window.location.search);
  const panelId = params.get('panelId') || '';
  const panelType = (params.get('panelType') || 'terminal') as PanelType;
  const workspaceId = params.get('workspaceId') || '';
  const ptyId = params.get('ptyId') || undefined;

  const [panelSettings, setPanelSettings] = useState<PanelSettings | null>(null);
  const [projectRoot, setProjectRoot] = useState('');
  const [accentColor, setAccentColor] = useState('#00ff88');
  const skipKillRef = useRef(false);

  const entry = PANEL_REGISTRY[panelType];
  const PanelComponent = entry?.component;

  // Load workspace config to get panel settings + workspace props
  useEffect(() => {
    loadConfig().then((config) => {
      const ws = config.workspaces.find(w => w.id === workspaceId);
      if (ws) {
        setProjectRoot(ws.projectRoot);
        setAccentColor(ws.accentColor);
        document.documentElement.style.setProperty('--accent', ws.accentColor);

        // Find the matching panel slot
        const slot = ws.layout.panels.find(p => `${ws.id}-${p.id}` === panelId);
        if (slot) {
          const settings: PanelSettings = { ...slot.settings };
          // For terminal panels, pass ptyId and skipKill
          if (panelType === PanelType.Terminal && ptyId) {
            (settings as Record<string, unknown>)._ptyId = ptyId;
            (settings as Record<string, unknown>)._skipKill = false;
          }
          setPanelSettings(settings);
        } else {
          // Slot not found — use defaults
          setPanelSettings({ ...entry.defaults });
        }
      } else {
        setPanelSettings({ ...entry.defaults });
      }
    });
  }, [panelId, panelType, workspaceId, ptyId, entry.defaults]);

  // Listen for recall from main window — set skipKill then self-close
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen(`panel:recall-requested:${panelId}`, () => {
      // Set skipKill so terminal PTY survives unmount
      skipKillRef.current = true;
      setPanelSettings(prev => prev ? { ...prev, _skipKill: true } : prev);
      // Wait for React to propagate skipKill, then destroy this window
      setTimeout(() => {
        getCurrentWebviewWindow().destroy();
      }, 100);
    }).then(fn => { unlisten = fn; });

    return () => { if (unlisten) unlisten(); };
  }, [panelId]);

  if (!PanelComponent || !panelSettings) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        Loading...
      </div>
    );
  }

  const panelProps: PanelProps = {
    panelId: `satellite-${panelId}`,
    settings: panelSettings,
    projectRoot,
    accentColor,
    onSettingsChange: (settings: PanelSettings) => {
      setPanelSettings(settings);
    },
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-base)',
    }}>
      {/* Satellite header strip */}
      <div style={{
        height: '32px',
        minHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        backgroundColor: 'var(--bg-elevated)',
        borderBottom: '2px solid var(--accent)',
        userSelect: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--text-secondary)',
        }}>
          <span>{entry.icon}</span>
          <span>{entry.label}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)' }}>satellite</span>
        </div>
        <button
          onClick={() => {
            // Set skipKill before emitting recall
            skipKillRef.current = true;
            setPanelSettings(prev => prev ? { ...prev, _skipKill: true } : prev);
            // Emit recall to main window, then self-close after React propagates skipKill
            setTimeout(async () => {
              await emitRecallRequested(panelId);
              setTimeout(() => {
                getCurrentWebviewWindow().destroy();
              }, 100);
            }, 50);
          }}
          style={{
            background: 'none',
            border: '1px solid var(--accent-border)',
            borderRadius: '3px',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            padding: '2px 8px',
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
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Suspense fallback={<PanelSkeleton />}>
          <PanelComponent {...panelProps} />
        </Suspense>
      </div>
    </div>
  );
}

export default SatelliteShell;
