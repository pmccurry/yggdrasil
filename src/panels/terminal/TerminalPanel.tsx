import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  spawnShell,
  writeToShell,
  resizeShell,
  killShell,
  ptyExists,
} from '../../shell/terminal';
import {
  getEntry,
  setEntry,
  attachListener,
} from './terminalStore';
import type { PanelProps, TerminalSettings } from '../../types/panels';
import styles from './terminal.module.css';

function TerminalPanel({ panelId, settings, projectRoot, onSettingsChange }: PanelProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const existing = getEntry(panelId);

    // --- Reattach existing terminal ---
    if (existing) {
      wrapper.appendChild(existing.containerEl);
      existing.fitAddon.fit();
      const dims = existing.fitAddon.proposeDimensions();
      if (dims) {
        resizeShell(existing.ptyId, dims.cols, dims.rows);
      }
      onSettingsChange({ ...settings, _ptyId: existing.ptyId });

      const resizeObserver = new ResizeObserver(() => {
        existing.fitAddon.fit();
        const d = existing.fitAddon.proposeDimensions();
        if (d) resizeShell(existing.ptyId, d.cols, d.rows);
      });
      resizeObserver.observe(existing.containerEl);

      return () => {
        resizeObserver.disconnect();
        if (existing.containerEl.parentNode) {
          existing.containerEl.parentNode.removeChild(existing.containerEl);
        }
      };
    }

    // --- Create new terminal ---
    const termSettings = settings as TerminalSettings;
    const cwd = termSettings.cwd || projectRoot;
    const shell = termSettings.shell || 'powershell.exe';
    const existingPtyId = (settings as Record<string, unknown>)._ptyId as string | undefined;

    const rootStyles = getComputedStyle(document.documentElement);
    const term = new Terminal({
      fontFamily: rootStyles.getPropertyValue('--font-mono').trim(),
      fontSize: 13,
      theme: {
        background: rootStyles.getPropertyValue('--bg-base').trim(),
        foreground: rootStyles.getPropertyValue('--text-primary').trim(),
        cursor: rootStyles.getPropertyValue('--accent').trim(),
        cursorAccent: rootStyles.getPropertyValue('--bg-base').trim(),
        selectionBackground: rootStyles.getPropertyValue('--accent-dim').trim(),
      },
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    const containerEl = document.createElement('div');
    containerEl.style.width = '100%';
    containerEl.style.height = '100%';
    wrapper.appendChild(containerEl);
    term.open(containerEl);
    fitAddon.fit();

    let cancelled = false;

    (async () => {
      try {
        let ptyId: string | null = null;
        let isReconnect = false;

        if (existingPtyId) {
          const alive = await ptyExists(existingPtyId);
          if (alive) {
            ptyId = existingPtyId;
            isReconnect = true;
          }
        }

        if (!ptyId) {
          ptyId = await spawnShell(cwd, shell);
        }

        if (cancelled) {
          if (!isReconnect) await killShell(ptyId);
          term.dispose();
          return;
        }

        onSettingsChange({ ...settings, _ptyId: ptyId });

        const entry = {
          terminal: term,
          ptyId,
          unlisten: () => {},
          containerEl,
          fitAddon,
          busySince: null as number | null,
          initialPromptSeen: false,
        };

        const unlisten = await attachListener(entry);
        entry.unlisten = unlisten;

        setEntry(panelId, entry);

        term.onData((data) => {
          writeToShell(entry.ptyId, data);
          if (data === '\r' && entry.busySince === null) {
            entry.busySince = Date.now();
          }
        });

        const dims = fitAddon.proposeDimensions();
        if (dims) {
          await resizeShell(ptyId, dims.cols, dims.rows);
        }

        if (!isReconnect) {
          const startupCommands = termSettings.startupCommands || [];
          for (const cmd of startupCommands) {
            await writeToShell(ptyId, cmd + '\r');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
        }
      }
    })();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const entry = getEntry(panelId);
      if (entry) {
        const dims = fitAddon.proposeDimensions();
        if (dims) resizeShell(entry.ptyId, dims.cols, dims.rows);
      }
    });
    resizeObserver.observe(containerEl);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      if (containerEl.parentNode) {
        containerEl.parentNode.removeChild(containerEl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  if (error) {
    return (
      <div className={styles.error}>
        <span>Terminal error: {error}</span>
      </div>
    );
  }

  return <div ref={wrapperRef} className={styles.container} />;
}

export default TerminalPanel;
