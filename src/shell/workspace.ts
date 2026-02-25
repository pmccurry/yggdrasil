import { Store } from '@tauri-apps/plugin-store';
import { open } from '@tauri-apps/plugin-dialog';
import { PanelType } from '../types/panels';
import { WidgetType } from '../types/widgets';
import type { WidgetConfig } from '../types/widgets';
import type { AppConfig, Workspace, WorkspaceActivationHook } from '../types/workspace';

const STORE_FILE = 'config.json';
const CONFIG_KEY = 'config';

function defaultOnActivate(projectRoot: string): WorkspaceActivationHook {
  return {
    terminalStartupCommands: projectRoot ? [`cd ${projectRoot}`] : [],
    environmentVariables: {},
    claudeDesktopProjectPath: projectRoot,
  };
}

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultWidgets(projectRoot: string): WidgetConfig[] {
  const widgets: WidgetConfig[] = [];
  if (projectRoot) {
    widgets.push({
      id: 'widget-git',
      type: WidgetType.Git,
      label: 'Git',
      pollInterval: 15000,
      settings: { repoPath: projectRoot },
    });
  }
  return widgets;
}

export function createDefaultConfig(): AppConfig {
  const now = new Date().toISOString();
  const id = generateId();
  const defaultWorkspace: Workspace = {
    id,
    name: 'My Workspace',
    icon: '\u26A1',
    accentColor: '#00ff88',
    projectRoot: '',
    layout: {
      panels: [
        { id: 'slot-0', type: PanelType.Terminal, settings: { shell: 'powershell.exe', cwd: '', startupCommands: [] } },
        { id: 'slot-1', type: PanelType.Webview, settings: { url: '', label: 'Webview' } },
        { id: 'slot-2', type: PanelType.Claude, settings: { mode: 'desktop', desktopPort: 5173, webviewUrl: 'https://claude.ai' } },
      ],
    },
    widgets: defaultWidgets(''),
    onActivate: defaultOnActivate(''),
    createdAt: now,
    updatedAt: now,
  };

  return {
    version: '1.0.0',
    activeWorkspaceId: id,
    workspaces: [defaultWorkspace],
  };
}

export function createNewWorkspace(
  name: string,
  icon: string,
  accentColor: string,
  projectRoot: string,
): Workspace {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    icon,
    accentColor,
    projectRoot,
    layout: {
      panels: [
        { id: 'slot-0', type: PanelType.Terminal, settings: { shell: 'powershell.exe', cwd: projectRoot, startupCommands: projectRoot ? [`cd ${projectRoot}`] : [] } },
        { id: 'slot-1', type: PanelType.Webview, settings: { url: '', label: 'Webview' } },
        { id: 'slot-2', type: PanelType.Claude, settings: { mode: 'desktop', desktopPort: 5173, webviewUrl: 'https://claude.ai' } },
      ],
    },
    widgets: defaultWidgets(projectRoot),
    onActivate: defaultOnActivate(projectRoot),
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadConfig(): Promise<AppConfig> {
  const store = await Store.load(STORE_FILE);
  const config = await store.get<AppConfig>(CONFIG_KEY);
  if (config) {
    // Migrate: add default widgets to workspaces that have none
    let migrated = false;
    for (const ws of config.workspaces) {
      if (ws.widgets.length === 0 && ws.projectRoot) {
        ws.widgets = defaultWidgets(ws.projectRoot);
        migrated = true;
      }
    }
    if (migrated) {
      await store.set(CONFIG_KEY, config);
      await store.save();
    }
    return config;
  }

  const defaultConfig = createDefaultConfig();
  await store.set(CONFIG_KEY, defaultConfig);
  await store.save();
  return defaultConfig;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  const store = await Store.load(STORE_FILE);
  await store.set(CONFIG_KEY, config);
  await store.save();
}

export async function pickFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    title: 'Select Project Folder',
  });
  if (typeof selected === 'string') return selected;
  return null;
}
