import { useEffect, useRef, useState, useCallback } from 'react';
import type { PanelProps } from '../../types/panels';
import { detectClaudeDesktop, launchClaudeDesktop } from '../../shell/claude';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import styles from './claude.module.css';

type ClaudeState = 'detecting' | 'not-running' | 'launching' | 'running' | 'webview' | 'error';

function ClaudePanel({ panelId, settings }: PanelProps) {
  const webviewUrl = (settings as { webviewUrl?: string }).webviewUrl || 'https://claude.ai';

  const [state, setState] = useState<ClaudeState>('detecting');
  const [statusText, setStatusText] = useState('Detecting Claude Desktop...');
  const [webviewTarget, setWebviewTarget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Webview | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupWebview = useCallback(async () => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (webviewRef.current) {
      try {
        await webviewRef.current.close();
      } catch {
        // Already closed
      }
      webviewRef.current = null;
    }
  }, []);

  // Create webview when webviewTarget is set AND containerRef is in the DOM
  useEffect(() => {
    if (!webviewTarget || !containerRef.current) return;

    let cancelled = false;
    const label = `claude-${panelId}`;

    async function create() {
      const el = containerRef.current;
      if (!el || cancelled) return;

      try {
        const existing = await Webview.getByLabel(label);
        if (existing) {
          await existing.close();
        }
      } catch {
        // No existing webview
      }

      if (cancelled) return;

      try {
        const hostWindow = getCurrentWindow();
        const rect = el.getBoundingClientRect();

        const wv = new Webview(hostWindow, label, {
          url: webviewTarget,
          x: rect.left,
          y: rect.top,
          width: Math.max(rect.width, 1),
          height: Math.max(rect.height, 1),
        });

        await new Promise<void>((resolve, reject) => {
          wv.once('tauri://created', () => resolve());
          wv.once('tauri://error', (e) => reject(e));
        });

        if (cancelled) {
          await wv.close();
          return;
        }

        webviewRef.current = wv;

        const observer = new ResizeObserver(async () => {
          if (!webviewRef.current || !el) return;
          const r = el.getBoundingClientRect();
          try {
            await Promise.all([
              webviewRef.current.setPosition(new LogicalPosition(r.left, r.top)),
              webviewRef.current.setSize(new LogicalSize(Math.max(r.width, 1), Math.max(r.height, 1))),
            ]);
          } catch {
            // Webview may have been closed
          }
        });
        observer.observe(el);
        observerRef.current = observer;
      } catch (e) {
        if (!cancelled) {
          setState('error');
          setStatusText(`Failed to create webview: ${e}`);
        }
      }
    }

    create();

    return () => {
      cancelled = true;
      cleanupWebview();
    };
  }, [webviewTarget, panelId, cleanupWebview]);

  // Move webview off-screen when panel picker opens (webview overlays DOM and
  // captures pointer events even when hidden via hide()). Restore position on close.
  useEffect(() => {
    const handlePickerOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ panelId: string }>).detail;
      if (detail?.panelId === panelId && webviewRef.current) {
        webviewRef.current.setPosition(new LogicalPosition(-10000, -10000)).catch(() => {});
      }
    };
    const handlePickerClose = (e: Event) => {
      const detail = (e as CustomEvent<{ panelId: string }>).detail;
      if (detail?.panelId === panelId && webviewRef.current && containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        webviewRef.current.setPosition(new LogicalPosition(r.left, r.top)).catch(() => {});
      }
    };

    window.addEventListener('yggdrasil:picker-open', handlePickerOpen);
    window.addEventListener('yggdrasil:picker-close', handlePickerClose);
    return () => {
      window.removeEventListener('yggdrasil:picker-open', handlePickerOpen);
      window.removeEventListener('yggdrasil:picker-close', handlePickerClose);
    };
  }, [panelId]);

  // Initial detection
  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        const found = await detectClaudeDesktop();
        if (cancelled) return;

        if (found) {
          setState('running');
          setStatusText('Claude Desktop is running');
          // Don't auto-load claude.ai — let user choose
        } else {
          setState('not-running');
          setStatusText('Claude Desktop not running');
        }
      } catch {
        if (!cancelled) {
          setState('not-running');
          setStatusText('Claude Desktop not detected');
        }
      }
    }

    detect();

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWebview();
    };
  }, [cleanupWebview]);

  const handleLaunch = useCallback(async () => {
    setState('launching');
    setStatusText('Launching Claude Desktop...');

    try {
      await launchClaudeDesktop();
    } catch {
      // Launch is fire-and-forget
    }

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const found = await detectClaudeDesktop();
        if (found) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setState('running');
          setStatusText('Claude Desktop is running');
          return;
        }
      } catch {
        // Continue polling
      }

      if (attempts >= 5) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setState('not-running');
        setStatusText('Claude Desktop not detected');
      }
    }, 2000);
  }, []);

  const handleOpenClaude = useCallback(() => {
    setState('webview');
    setStatusText('claude.ai');
    setWebviewTarget(webviewUrl);
  }, [webviewUrl]);

  // Detecting
  if (state === 'detecting') {
    return (
      <div className={styles.container}>
        <div className={styles.statusBar}>
          <span className={`${styles.statusDot} ${styles.statusSearching}`} />
          <span className={styles.statusText}>{statusText}</span>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.emptyLabel}>Detecting Claude Desktop...</span>
        </div>
      </div>
    );
  }

  // Webview active — container div is rendered, useEffect creates the webview
  if (state === 'webview') {
    return (
      <div className={styles.container}>
        <div className={styles.statusBar}>
          <span className={`${styles.statusDot} ${styles.statusConnected}`} />
          <span className={styles.statusText}>{statusText}</span>
        </div>
        <div ref={containerRef} className={styles.webviewArea} />
      </div>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.statusBar}>
          <span className={`${styles.statusDot} ${styles.statusDisconnected}`} />
          <span className={styles.statusText}>{statusText}</span>
        </div>
        <div className={styles.emptyState}>
          <span className={styles.emptyLabel}>Failed to connect</span>
          <span className={styles.emptyHint}>{statusText}</span>
        </div>
      </div>
    );
  }

  // Running, not-running, or launching — show action buttons
  return (
    <div className={styles.container}>
      <div className={styles.statusBar}>
        <span className={`${styles.statusDot} ${
          state === 'running' ? styles.statusConnected :
          state === 'launching' ? styles.statusSearching :
          styles.statusDisconnected
        }`} />
        <span className={styles.statusText}>{statusText}</span>
      </div>
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>✦</span>
        <span className={styles.emptyLabel}>
          {state === 'running' ? 'Claude Desktop is running' : 'Claude Desktop not running'}
        </span>
        <span className={styles.emptyHint}>
          {state === 'running'
            ? 'Launch another instance, or open claude.ai here'
            : 'Launch Claude Desktop alongside, or open claude.ai here'}
        </span>
        <button
          className={styles.launchButton}
          onClick={handleLaunch}
          disabled={state === 'launching'}
        >
          {state === 'launching' ? 'Launching...' : 'Launch Claude Desktop'}
        </button>
        <button
          className={styles.launchButton}
          onClick={handleOpenClaude}
          disabled={state === 'launching'}
        >
          Open claude.ai
        </button>
      </div>
    </div>
  );
}

export default ClaudePanel;
