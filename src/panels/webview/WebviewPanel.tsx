import { useEffect, useRef, useState } from 'react';
import type { PanelProps } from '../../types/panels';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import styles from './webview.module.css';

function WebviewPanel({ panelId, settings, onSettingsChange }: PanelProps) {
  const url = (settings as { url?: string }).url || '';
  const [inputValue, setInputValue] = useState(url);
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Webview | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep input in sync when settings change externally
  useEffect(() => {
    setInputValue(url);
  }, [url]);

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

    const handleDragStart = () => {
      if (webviewRef.current) {
        webviewRef.current.setPosition(new LogicalPosition(-10000, -10000)).catch(() => {});
      }
    };
    const handleDragEnd = () => {
      if (webviewRef.current && containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        webviewRef.current.setPosition(new LogicalPosition(r.left, r.top)).catch(() => {});
      }
    };

    // Global modals (settings, create workspace) — move ALL webviews off-screen
    const handleModalOpen = () => {
      if (webviewRef.current) {
        webviewRef.current.setPosition(new LogicalPosition(-10000, -10000)).catch(() => {});
      }
    };
    const handleModalClose = () => {
      if (webviewRef.current && containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        webviewRef.current.setPosition(new LogicalPosition(r.left, r.top)).catch(() => {});
      }
    };

    window.addEventListener('yggdrasil:picker-open', handlePickerOpen);
    window.addEventListener('yggdrasil:picker-close', handlePickerClose);
    window.addEventListener('yggdrasil:drag-start', handleDragStart);
    window.addEventListener('yggdrasil:drag-end', handleDragEnd);
    window.addEventListener('yggdrasil:modal-open', handleModalOpen);
    window.addEventListener('yggdrasil:modal-close', handleModalClose);
    return () => {
      window.removeEventListener('yggdrasil:picker-open', handlePickerOpen);
      window.removeEventListener('yggdrasil:picker-close', handlePickerClose);
      window.removeEventListener('yggdrasil:drag-start', handleDragStart);
      window.removeEventListener('yggdrasil:drag-end', handleDragEnd);
      window.removeEventListener('yggdrasil:modal-open', handleModalOpen);
      window.removeEventListener('yggdrasil:modal-close', handleModalClose);
    };
  }, [panelId]);

  useEffect(() => {
    if (!url || !containerRef.current) return;

    let cancelled = false;
    const label = `webview-${panelId}`;

    async function createWebview() {
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
          url,
          dragDropEnabled: false,
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
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
        }
      }
    }

    createWebview();

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (webviewRef.current) {
        webviewRef.current.close().catch(() => {});
        webviewRef.current = null;
      }
    };
  }, [url, panelId]);

  function handleNavigate() {
    const trimmed = inputValue.trim();
    if (!trimmed || trimmed === url) return;
    onSettingsChange({ ...settings, url: trimmed });
  }

  return (
    <div className={styles.container}>
      <div className={styles.urlBar}>
        <div className={styles.urlDots}>
          <span className={`${styles.dot} ${styles.dotRed}`} />
          <span className={`${styles.dot} ${styles.dotYellow}`} />
          <span className={`${styles.dot} ${styles.dotGreen}`} />
        </div>
        <input
          className={styles.urlInput}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNavigate();
          }}
          onBlur={handleNavigate}
          placeholder="Enter URL and press Enter"
          spellCheck={false}
        />
      </div>
      {!url ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>⬡</span>
          <span className={styles.emptyLabel}>No URL configured</span>
          <span className={styles.emptyHint}>Type a URL above and press Enter</span>
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyLabel}>Failed to load webview</span>
          <span className={styles.emptyHint}>{error}</span>
        </div>
      ) : (
        <div ref={containerRef} className={styles.webviewArea} />
      )}
    </div>
  );
}

export default WebviewPanel;
