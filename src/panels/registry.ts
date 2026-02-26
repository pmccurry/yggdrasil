import { lazy } from 'react';
import { PanelType } from '../types/panels';
import type { PanelRegistryEntry } from '../types/panels';

const TerminalPanel = lazy(() => import('./terminal/TerminalPanel'));
const WebviewPanel  = lazy(() => import('./webview/WebviewPanel'));
const FileTreePanel = lazy(() => import('./filetree/FileTreePanel'));
const EditorPanel   = lazy(() => import('./editor/EditorPanel'));
const ClaudePanel   = lazy(() => import('./claude/ClaudePanel'));
const GitPanel      = lazy(() => import('./git/GitPanel'));
const AiChatPanel   = lazy(() => import('./ai-chat/AiChatPanel'));

export const PANEL_REGISTRY: Record<PanelType, PanelRegistryEntry> = {
  [PanelType.Terminal]: {
    type: PanelType.Terminal, label: 'Terminal', icon: '>_',
    description: 'PowerShell session', component: TerminalPanel,
    defaults: { shell: 'powershell.exe', cwd: '' },
  },
  [PanelType.Webview]: {
    type: PanelType.Webview, label: 'Webview', icon: '\u2B21',
    description: 'Embedded browser panel', component: WebviewPanel,
    defaults: { url: '', label: 'Webview' },
  },
  [PanelType.FileTree]: {
    type: PanelType.FileTree, label: 'File Tree', icon: '\u229E',
    description: 'Project file explorer', component: FileTreePanel,
    defaults: { rootPath: '' },
  },
  [PanelType.Editor]: {
    type: PanelType.Editor, label: 'Editor', icon: '</>',
    description: 'Monaco code editor', component: EditorPanel,
    defaults: { rootPath: '', openFile: undefined },
  },
  [PanelType.Claude]: {
    type: PanelType.Claude, label: 'Claude', icon: '\u2726',
    description: 'Claude Desktop integration', component: ClaudePanel,
    defaults: { mode: 'desktop', desktopPort: 5173 },
    hidden: true, // Legacy — migrated to AiChat in V3
  },
  [PanelType.Git]: {
    type: PanelType.Git, label: 'Git', icon: '\u2387',
    description: 'Git source control', component: GitPanel,
    defaults: { repoPath: '' },
  },
  [PanelType.AiChat]: {
    type: PanelType.AiChat, label: 'AI Chat', icon: '\u2726',
    description: 'AI chat provider', component: AiChatPanel,
    defaults: { providerId: '' },
  },
};
