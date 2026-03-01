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
  onShellOutput,
} from '../../shell/terminal';
import type { PanelProps, TerminalSettings } from '../../types/panels';
import { emitNotification } from '../../utils/notify';
import styles from './terminal.module.css';

const PROMPT_REGEX = /(?:PS [A-Z]:\\[^>]*>|[A-Z]:\\[^>]*>)\s*$/;
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;
const MIN_COMMAND_DURATION_MS = 3000;

function TerminalPanel({ panelId, settings, projectRoot }: PanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const busySinceRef = useRef(0);
  const initialPromptSeenRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const termSettings = settings as TerminalSettings;
    const cwd = termSettings.cwd || projectRoot;
    const shell = termSettings.shell || 'powershell.exe';

    // Read theme from CSS custom properties
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
    term.open(container);
    fitAddon.fit();

    let ptyId: string | null = null;
    let unlistenFn: (() => void) | null = null;
    let disposed = false;

    // Spawn shell and wire I/O
    (async () => {
      try {
        ptyId = await spawnShell(cwd, shell);

        if (disposed) {
          await killShell(ptyId);
          return;
        }

        // PTY output → xterm display + prompt detection
        const unlisten = await onShellOutput(ptyId, (data) => {
          if (!disposed) {
            term.write(data);

            // Detect prompt to track command completion
            const clean = data.replace(ANSI_REGEX, '');
            if (PROMPT_REGEX.test(clean)) {
              if (!initialPromptSeenRef.current) {
                initialPromptSeenRef.current = true;
              } else if (busyRef.current) {
                const elapsed = Date.now() - busySinceRef.current;
                busyRef.current = false;
                if (elapsed >= MIN_COMMAND_DURATION_MS) {
                  emitNotification('terminal.command.complete', 'Terminal', 'Command finished');
                }
              }
            }
          }
        });
        unlistenFn = unlisten;

        // xterm user input → PTY
        term.onData((data) => {
          if (ptyId && !disposed) {
            writeToShell(ptyId, data);
            // Enter key (\r) marks start of a command
            if (data === '\r' && !busyRef.current) {
              busyRef.current = true;
              busySinceRef.current = Date.now();
            }
          }
        });

        // Sync terminal dimensions with PTY
        const dims = fitAddon.proposeDimensions();
        if (dims && ptyId) {
          await resizeShell(ptyId, dims.cols, dims.rows);
        }

        // Execute workspace startup commands
        const startupCommands = termSettings.startupCommands || [];
        for (const cmd of startupCommands) {
          await writeToShell(ptyId, cmd + '\r');
        }
      } catch (err) {
        if (!disposed) {
          setError(String(err));
        }
      }
    })();

    // Auto-fit terminal on container resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims && ptyId) {
        resizeShell(ptyId, dims.cols, dims.rows);
      }
    });
    resizeObserver.observe(container);

    // Cleanup: kill shell, dispose xterm, disconnect observer
    return () => {
      disposed = true;
      resizeObserver.disconnect();
      if (unlistenFn) unlistenFn();
      if (ptyId) killShell(ptyId);
      term.dispose();
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

  return <div ref={containerRef} className={styles.container} />;
}

export default TerminalPanel;
