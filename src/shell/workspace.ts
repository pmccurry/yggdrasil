import { Store } from '@tauri-apps/plugin-store';
import { open } from '@tauri-apps/plugin-dialog';
import { PanelType } from '../types/panels';
import { WidgetType } from '../types/widgets';
import type { WidgetConfig } from '../types/widgets';
import type { AppConfig, Workspace, WorkspaceActivationHook, PlanningDrawerContent, PanelSlot } from '../types/workspace';
import { DEFAULT_SHORTCUTS } from '../types/shortcuts';

const STORE_FILE = 'config.json';
const CONFIG_KEY = 'config';

function defaultOnActivate(projectRoot: string): WorkspaceActivationHook {
  return {
    terminalStartupCommands: projectRoot ? [`cd ${projectRoot}`] : [],
    environmentVariables: {},
    claudeDesktopProjectPath: projectRoot,
  };
}

function defaultPlanning(): PlanningDrawerContent {
  return {
    scratchpad: '',
    scratchpadVisible: true,
    milestoneVisible: true,
    drawerOpen: false,
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
  const dirName = projectRoot ? projectRoot.replace(/\\/g, '/').split('/').filter(Boolean).pop() || '' : '';
  widgets.push({
    id: 'widget-docker',
    type: WidgetType.Docker,
    label: 'Docker',
    pollInterval: 10000,
    settings: { containerName: '', projectDir: dirName },
  });
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
      preset: 'large-medium',
      rowWeight: 1,
      panels: [
        { id: 'slot-0', type: PanelType.Terminal, settings: { shell: 'powershell.exe', cwd: '', startupCommands: [] }, sizeWeight: 2, row: 0 },
        { id: 'slot-1', type: PanelType.Webview, settings: { url: '', label: 'Webview' }, sizeWeight: 1, row: 0 },
        { id: 'slot-2', type: PanelType.Claude, settings: { mode: 'desktop', desktopPort: 5173, webviewUrl: 'https://claude.ai' }, sizeWeight: 1, row: 0 },
      ],
    },
    widgets: defaultWidgets(''),
    onActivate: defaultOnActivate(''),
    planning: defaultPlanning(),
    createdAt: now,
    updatedAt: now,
  };

  return {
    version: '1.0.0',
    activeWorkspaceId: id,
    workspaces: [defaultWorkspace],
    shortcuts: DEFAULT_SHORTCUTS,
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
      preset: 'large-medium',
      rowWeight: 1,
      panels: [
        { id: 'slot-0', type: PanelType.Terminal, settings: { shell: 'powershell.exe', cwd: projectRoot, startupCommands: projectRoot ? [`cd ${projectRoot}`] : [] }, sizeWeight: 2, row: 0 },
        { id: 'slot-1', type: PanelType.Webview, settings: { url: '', label: 'Webview' }, sizeWeight: 1, row: 0 },
        { id: 'slot-2', type: PanelType.Claude, settings: { mode: 'desktop', desktopPort: 5173, webviewUrl: 'https://claude.ai' }, sizeWeight: 1, row: 0 },
      ],
    },
    widgets: defaultWidgets(projectRoot),
    onActivate: defaultOnActivate(projectRoot),
    planning: defaultPlanning(),
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadConfig(): Promise<AppConfig> {
  const store = await Store.load(STORE_FILE);
  const config = await store.get<AppConfig>(CONFIG_KEY);
  if (config) {
    let migrated = false;

    // Migrate: add shortcuts to AppConfig if missing
    if (!config.shortcuts) {
      config.shortcuts = DEFAULT_SHORTCUTS;
      migrated = true;
    }

    // Migrate: seed missing default widgets and planning into existing workspaces
    for (const ws of config.workspaces) {
      if (ws.widgets.length === 0 && ws.projectRoot) {
        ws.widgets = defaultWidgets(ws.projectRoot);
        migrated = true;
      } else {
        const dirName = ws.projectRoot ? ws.projectRoot.replace(/\\/g, '/').split('/').filter(Boolean).pop() || '' : '';
        // Add Docker widget if missing
        if (!ws.widgets.some(w => w.type === WidgetType.Docker)) {
          ws.widgets.push({
            id: 'widget-docker',
            type: WidgetType.Docker,
            label: 'Docker',
            pollInterval: 10000,
            settings: { containerName: '', projectDir: dirName },
          });
          migrated = true;
        }
        // Migrate existing Docker widget: add projectDir if missing
        for (const w of ws.widgets) {
          if (w.type === WidgetType.Docker && !w.settings.projectDir) {
            w.settings.projectDir = dirName;
            migrated = true;
          }
        }
      }
      // Migrate: add planning to workspace if missing
      if (!ws.planning) {
        ws.planning = defaultPlanning();
        migrated = true;
      }

      // Migrate V1→V2: add sizeWeight/row to panel slots, preset/rowWeight to layout
      if (!ws.layout.preset) {
        (ws.layout as { preset: string }).preset = 'large-medium';
        (ws.layout as { rowWeight: number }).rowWeight = 1;
        migrated = true;
      }
      for (const panel of ws.layout.panels) {
        const p = panel as PanelSlot;
        if (p.sizeWeight === undefined) {
          p.sizeWeight = 1;
          migrated = true;
        }
        if (p.row === undefined) {
          p.row = 0;
          migrated = true;
        }
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
