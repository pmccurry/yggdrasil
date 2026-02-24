import { useEffect, useState, useRef, useCallback } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { PanelProps } from '../../types/panels';
import { readFile } from '../../shell/filesystem';
import styles from './editor.module.css';

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.json': 'json',
  '.md': 'markdown',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.css': 'css',
  '.html': 'html',
  '.htm': 'html',
  '.toml': 'ini',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.xml': 'xml',
  '.svg': 'xml',
};

function getLanguageFromPath(filePath: string): string {
  const dot = filePath.lastIndexOf('.');
  if (dot === -1) return 'plaintext';
  const ext = filePath.slice(dot).toLowerCase();
  return EXT_TO_LANGUAGE[ext] || 'plaintext';
}

function getFileName(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || filePath;
}

function EditorPanel({ settings, onSettingsChange }: PanelProps) {
  const openFile = (settings as { openFile?: string }).openFile || '';
  const [content, setContent] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState(openFile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const loadFile = useCallback(async (filePath: string) => {
    if (!filePath) return;
    setLoading(true);
    setError(null);
    try {
      const text = await readFile(filePath);
      setContent(text);
      setCurrentFile(filePath);
    } catch (e) {
      setError(String(e));
      setContent(null);
    }
    setLoading(false);
  }, []);

  // Load initial file from settings
  useEffect(() => {
    if (openFile) {
      loadFile(openFile);
    }
  }, [openFile, loadFile]);

  // Listen for yggdrasil:open-file events from FileTree
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (detail?.path) {
        loadFile(detail.path);
        onSettingsChange({ ...settings, openFile: detail.path });
      }
    };

    window.addEventListener('yggdrasil:open-file', handler);
    return () => {
      window.removeEventListener('yggdrasil:open-file', handler);
    };
  }, [loadFile, onSettingsChange, settings]);

  function handleEditorMount(monaco: Monaco) {
    monacoRef.current = monaco;

    monaco.editor.defineTheme('yggdrasil', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d0d14',
        'editor.foreground': '#e5e7eb',
        'editorCursor.foreground': '#00ff88',
        'editor.selectionBackground': '#1a1a2e',
        'editor.lineHighlightBackground': '#13131f',
        'editorLineNumber.foreground': '#374151',
        'editorLineNumber.activeForeground': '#6b7280',
        'editorWidget.background': '#13131f',
        'editorWidget.border': '#1a1a2e',
        'input.background': '#0a0a0f',
        'input.border': '#1e1e30',
        'focusBorder': '#00ff88',
      },
    });
    monaco.editor.setTheme('yggdrasil');
  }

  if (!currentFile && !openFile) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>&lt;/&gt;</span>
        <span className={styles.emptyLabel}>No file open</span>
        <span className={styles.emptyHint}>Click a file in the File Tree to open it</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingState}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyLabel}>Failed to load file</span>
        <span className={styles.emptyHint}>{error}</span>
      </div>
    );
  }

  const language = getLanguageFromPath(currentFile);

  return (
    <div className={styles.container}>
      <div className={styles.fileBar}>
        <span className={styles.fileName}>{getFileName(currentFile)}</span>
        <span className={styles.filePath}>{currentFile}</span>
      </div>
      <div className={styles.editorArea}>
        <Editor
          height="100%"
          language={language}
          value={content ?? ''}
          theme="yggdrasil"
          beforeMount={handleEditorMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
            fontSize: 12,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            wordWrap: 'off',
            automaticLayout: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}

export default EditorPanel;
