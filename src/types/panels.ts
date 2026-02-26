import type React from 'react';

export enum PanelType {
  Terminal = 'terminal',
  Webview  = 'webview',
  FileTree = 'filetree',
  Editor   = 'editor',
  Claude   = 'claude',
  Git      = 'git',
  AiChat   = 'ai-chat',
}

export interface PanelRegistryEntry {
  type:        PanelType;
  label:       string;
  icon:        string;
  description: string;
  component:   React.LazyExoticComponent<React.ComponentType<PanelProps>>;
  defaults:    PanelSettings;
  hidden?:     boolean;
}

export interface PanelSettings {
  [key: string]: unknown;
}

export interface TerminalSettings extends PanelSettings {
  shell:           string;
  cwd:             string;
  startupCommands: string[];
}

export interface WebviewSettings extends PanelSettings {
  url:   string;
  label: string;
}

export interface FileTreeSettings extends PanelSettings {
  rootPath: string;
}

export interface EditorSettings extends PanelSettings {
  rootPath:  string;
  openFile?: string;
  language?: string;
}

export interface GitPanelSettings extends PanelSettings {
  repoPath: string;
}

export interface ClaudeSettings extends PanelSettings {
  mode:         'desktop' | 'webview';
  desktopPort?: number;
  webviewUrl?:  string;
}

// --- V3 AI Provider System ---

export type AiProviderType = 'claude' | 'openai' | 'gemini' | 'custom';
export type AiConnectionMode = 'webview' | 'api';

export interface AiProvider {
  id:              string;
  name:            string;
  providerType:    AiProviderType;
  mode:            AiConnectionMode;
  webviewUrl?:     string;
  apiEndpoint?:    string;
  apiKeyRef?:      string;
  model?:          string;
  enabled:         boolean;
}

export interface AiChatPanelSettings extends PanelSettings {
  providerId: string;
}

export interface PanelProps {
  panelId:          string;
  settings:         PanelSettings;
  projectRoot:      string;
  accentColor:      string;
  onSettingsChange: (settings: PanelSettings) => void;
}
