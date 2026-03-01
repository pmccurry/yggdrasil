import { useEffect, useRef, useState, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import type { PanelProps, AiChatPanelSettings } from '../../types/panels';
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import { Webview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { listen } from '@tauri-apps/api/event';
import type { AiMessage } from '../../shell/ai';
import { aiChatStream } from '../../shell/ai';
import { emitNotification } from '../../utils/notify';
import styles from './AiChatPanel.module.css';

function AiChatPanel({ panelId, settings, onSettingsChange }: PanelProps) {
  const { state } = useWorkspaceContext();
  const providerId = (settings as AiChatPanelSettings).providerId;
  const provider = state.providers.find(p => p.id === providerId);
  const enabledProviders = state.providers.filter(p => p.enabled);

  const selectProvider = useCallback((id: string) => {
    onSettingsChange({ ...settings, providerId: id });
  }, [settings, onSettingsChange]);

  // --- Webview mode state ---
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<Webview | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // --- API mode state ---
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Webview cleanup ---
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

  // --- Webview creation (webview mode only) ---
  useEffect(() => {
    if (!provider || provider.mode !== 'webview' || !provider.webviewUrl || !containerRef.current) return;

    let cancelled = false;
    const label = `ai-chat-${panelId}`;

    async function create() {
      const el = containerRef.current;
      if (!el || cancelled) return;

      try {
        const existing = await Webview.getByLabel(label);
        if (existing) await existing.close();
      } catch {
        // No existing webview
      }

      if (cancelled) return;

      try {
        const hostWindow = getCurrentWindow();
        const rect = el.getBoundingClientRect();

        const wv = new Webview(hostWindow, label, {
          url: provider!.webviewUrl ?? undefined,
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
          setError(`Failed to create webview: ${e}`);
        }
      }
    }

    create();

    return () => {
      cancelled = true;
      cleanupWebview();
    };
  }, [provider, panelId, cleanupWebview]);

  // --- Webview off-screen handlers (picker, drag, modal) ---
  useEffect(() => {
    if (!provider || provider.mode !== 'webview') return;

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
  }, [panelId, provider]);

  // Cleanup webview on unmount
  useEffect(() => {
    return () => { cleanupWebview(); };
  }, [cleanupWebview]);

  // --- API mode: auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- API mode: send message ---
  const handleSend = useCallback(async () => {
    if (!provider || !inputValue.trim() || streaming) return;
    if (!provider.apiEndpoint || !provider.apiKeyRef || !provider.model) {
      setError('Provider missing endpoint, API key, or model configuration');
      return;
    }

    const userMsg: AiMessage = { role: 'user', content: inputValue.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setStreaming(true);
    setError(null);

    const requestId = crypto.randomUUID();
    const assistantMsg: AiMessage = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantMsg]);

    const unlisteners: Array<() => void> = [];

    try {
      const unlisten1 = await listen<{ content: string }>(`ai-stream-${requestId}`, (event) => {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + event.payload.content };
          }
          return updated;
        });
      });
      unlisteners.push(unlisten1);

      const unlisten2 = await listen(`ai-stream-done-${requestId}`, () => {
        setStreaming(false);
        emitNotification('ai.response.complete', 'AI Chat', `${provider!.name} response complete`);
        unlisteners.forEach(u => u());
      });
      unlisteners.push(unlisten2);

      const unlisten3 = await listen<{ error: string }>(`ai-stream-error-${requestId}`, (event) => {
        setError(event.payload.error);
        setStreaming(false);
        unlisteners.forEach(u => u());
      });
      unlisteners.push(unlisten3);

      await aiChatStream(
        requestId,
        provider.providerType,
        provider.apiEndpoint,
        provider.apiKeyRef,
        provider.model,
        updatedMessages,
      );
    } catch (e) {
      setError(String(e));
      setStreaming(false);
      unlisteners.forEach(u => u());
    }
  }, [provider, inputValue, messages, streaming]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // --- Render: no provider selected or no providers exist ---
  if (!provider) {
    if (enabledProviders.length === 0) {
      return (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>{'\u2726'}</span>
          <span className={styles.emptyLabel}>No providers available</span>
          <span className={styles.emptyHint}>Add a provider in Settings</span>
        </div>
      );
    }
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>{'\u2726'}</span>
        <span className={styles.emptyLabel}>Select a provider</span>
        <div className={styles.providerList}>
          {enabledProviders.map(p => (
            <button
              key={p.id}
              className={styles.providerOption}
              onClick={() => selectProvider(p.id)}
            >
              <span className={styles.providerOptionName}>{p.name}</span>
              <span className={styles.providerOptionMeta}>
                {p.mode === 'webview' ? 'Web' : 'API'} · {p.providerType}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!provider.enabled) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>{'\u2726'}</span>
        <span className={styles.emptyLabel}>Provider disabled</span>
        <span className={styles.emptyHint}>Enable {provider.name} in Settings</span>
        {enabledProviders.length > 0 && (
          <div className={styles.providerList}>
            {enabledProviders.map(p => (
              <button
                key={p.id}
                className={styles.providerOption}
                onClick={() => selectProvider(p.id)}
              >
                <span className={styles.providerOptionName}>{p.name}</span>
                <span className={styles.providerOptionMeta}>
                  {p.mode === 'webview' ? 'Web' : 'API'} · {p.providerType}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const providerSelect = (
    <select
      className={styles.providerSelect}
      value={provider.id}
      onChange={(e) => selectProvider(e.target.value)}
    >
      {enabledProviders.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );

  // --- Render: webview mode ---
  if (provider.mode === 'webview') {
    return (
      <div className={styles.container}>
        <div className={styles.statusBar}>
          <span className={`${styles.statusDot} ${styles.statusConnected}`} />
          <span className={styles.statusText}>{provider.webviewUrl}</span>
          {providerSelect}
        </div>
        <div ref={containerRef} className={styles.webviewArea} />
      </div>
    );
  }

  // --- Render: API mode ---
  return (
    <div className={styles.container}>
      <div className={styles.statusBar}>
        <span className={`${styles.statusDot} ${streaming ? styles.statusConnected : styles.statusDisconnected}`} />
        <span className={styles.statusText}>{provider.model || provider.providerType}</span>
        {providerSelect}
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.messagesArea}>
          {messages.length === 0 && !error && (
            <div className={styles.emptyState} style={{ height: 'auto', padding: '40px 20px' }}>
              <span className={styles.emptyIcon}>{'\u2726'}</span>
              <span className={styles.emptyLabel}>Start a conversation</span>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}
            >
              <div className={styles.roleLabel}>{msg.role}</div>
              <div className={styles.messageContent}>{msg.content}</div>
            </div>
          ))}
          {streaming && (
            <div className={styles.streamingIndicator}>Generating...</div>
          )}
          {error && (
            <div className={styles.errorState}>{error}</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <textarea
            className={styles.chatInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message (Ctrl+Enter to send)"
            rows={2}
            disabled={streaming}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!inputValue.trim() || streaming}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default AiChatPanel;
