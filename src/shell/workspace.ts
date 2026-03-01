import { Store } from '@tauri-apps/plugin-store';
import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { PanelType } from '../types/panels';
import type { AiProvider } from '../types/panels';
import { WidgetType } from '../types/widgets';
import type { WidgetConfig } from '../types/widgets';
import type { NotificationConfig } from '../types/widgets';
import type { AppConfig, Workspace, WorkspaceActivationHook, PlanningDrawerContent, PanelSlot, AppearanceSettings, WorkspaceExport } from '../types/workspace';
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

function defaultProviders(): AiProvider[] {
  const ts = Date.now();
  return [
    { id: `provider-${ts}-claude`, name: 'Claude', providerType: 'claude', mode: 'webview', webviewUrl: 'https://claude.ai', enabled: true },
    { id: `provider-${ts + 1}-chatgpt`, name: 'ChatGPT', providerType: 'openai', mode: 'webview', webviewUrl: 'https://chatgpt.com', enabled: true },
    { id: `provider-${ts + 2}-gemini`, name: 'Gemini', providerType: 'gemini', mode: 'webview', webviewUrl: 'https://gemini.google.com', enabled: true },
  ];
}

export function defaultNotifications(): NotificationConfig {
  return {
    enabled: true,
    audioEnabled: true,
    audioVolume: 0.5,
    events: [
      { event: 'terminal.command.complete', label: 'Terminal command complete', enabled: true, audio: true },
      { event: 'ai.response.complete',     label: 'AI response complete',     enabled: true, audio: true },
      { event: 'git.operation.complete',    label: 'Git operation complete',   enabled: true, audio: true },
      { event: 'http.status.change',        label: 'HTTP status change',       enabled: true, audio: true },
      { event: 'update.available',          label: 'Update available',         enabled: true, audio: true },
    ],
  };
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
  const providers = defaultProviders();
  const claudeProviderId = providers[0].id;
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
        { id: 'slot-2', type: PanelType.AiChat, settings: { providerId: claudeProviderId }, sizeWeight: 1, row: 0 },
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
    appearance: { terminalFontSize: 14, editorFontSize: 14 },
    providers,
    notifications: defaultNotifications(),
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
        { id: 'slot-2', type: PanelType.AiChat, settings: { providerId: '' }, sizeWeight: 1, row: 0 },
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

    // Migrate: remove auto-populated default workspace from v0.1.0
    // The first-run screen requires workspaces.length === 0, but v0.1.0
    // pre-populated a "My Workspace" with empty projectRoot on first launch.
    if (config.workspaces.length === 1
        && config.workspaces[0].name === 'My Workspace'
        && config.workspaces[0].projectRoot === '') {
      config.workspaces = [];
      config.activeWorkspaceId = '';
      migrated = true;
    }

    // Migrate: add shortcuts to AppConfig if missing
    if (!config.shortcuts) {
      config.shortcuts = DEFAULT_SHORTCUTS;
      migrated = true;
    }

    // Migrate: add appearance to AppConfig if missing
    if (!config.appearance) {
      (config as { appearance: AppearanceSettings }).appearance = { terminalFontSize: 14, editorFontSize: 14 };
      migrated = true;
    }

    // Migrate: add settings.open shortcut if missing
    if (!config.shortcuts.some(s => s.action === 'settings.open')) {
      config.shortcuts.push({ action: 'settings.open', keys: 'ctrl+,', enabled: true });
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
    // Migrate: add notifications config if missing
    if (!config.notifications) {
      (config as { notifications: NotificationConfig }).notifications = defaultNotifications();
      migrated = true;
    }

    // Migrate V3: add providers if missing, remap Claude panels to AiChat
    if (!config.providers || config.providers.length === 0) {
      const seeded = defaultProviders();
      (config as { providers: AiProvider[] }).providers = seeded;
      const claudeId = seeded[0].id;

      for (const ws of config.workspaces) {
        for (const panel of ws.layout.panels) {
          if (panel.type === PanelType.Claude || (panel.type as string) === 'claude') {
            panel.type = PanelType.AiChat;
            panel.settings = { providerId: claudeId };
          }
        }
      }
      migrated = true;
    }

    if (migrated) {
      await store.set(CONFIG_KEY, config);
      await store.save();
    }
    return config;
  }

  const firstRunConfig: AppConfig = {
    version: '1.0.0',
    activeWorkspaceId: '',
    workspaces: [],
    shortcuts: DEFAULT_SHORTCUTS,
    appearance: { terminalFontSize: 14, editorFontSize: 14 },
    providers: defaultProviders(),
    notifications: defaultNotifications(),
  };
  await store.set(CONFIG_KEY, firstRunConfig);
  await store.save();
  return firstRunConfig;
}

export async function saveConfig(config: AppConfig): Promise<void> {
  // Strip _-prefixed runtime-only keys from panel settings before persisting (D046)
  const cleaned: AppConfig = {
    ...config,
    workspaces: config.workspaces.map(ws => ({
      ...ws,
      layout: {
        ...ws.layout,
        panels: ws.layout.panels.map(p => ({
          ...p,
          settings: Object.fromEntries(
            Object.entries(p.settings).filter(([k]) => !k.startsWith('_')),
          ),
        })),
      },
    })),
  };
  const store = await Store.load(STORE_FILE);
  await store.set(CONFIG_KEY, cleaned);
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

export async function exportWorkspace(
  workspace: Workspace,
  providers: AiProvider[],
): Promise<boolean> {
  // Find providers referenced by AiChat panels
  const referencedIds = new Set<string>();
  for (const panel of workspace.layout.panels) {
    if (panel.type === PanelType.AiChat && panel.settings.providerId) {
      referencedIds.add(panel.settings.providerId as string);
    }
  }

  // Strip apiKeyRef from each referenced provider
  const exportProviders: Omit<AiProvider, 'apiKeyRef'>[] = providers
    .filter(p => referencedIds.has(p.id))
    .map(({ apiKeyRef: _, ...rest }) => rest);

  // Build export object (workspace without id)
  const { id: _, ...workspaceWithoutId } = workspace;
  const exportData: WorkspaceExport = {
    yggdrasilExport: true,
    schemaVersion: '4.0',
    exportedAt: new Date().toISOString(),
    workspace: {
      ...workspaceWithoutId,
      providers: exportProviders.length > 0 ? exportProviders : undefined,
    },
  };

  const path = await save({
    title: 'Export Workspace',
    defaultPath: `${workspace.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.yggdrasil.json`,
    filters: [{ name: 'Yggdrasil Workspace', extensions: ['yggdrasil.json'] }],
  });
  if (!path) return false;

  await invoke('write_file', {
    path,
    contents: JSON.stringify(exportData, null, 2),
  });
  return true;
}

export async function importWorkspaceFile(): Promise<WorkspaceExport | null> {
  const selected = await open({
    title: 'Import Workspace',
    filters: [{ name: 'Yggdrasil Workspace', extensions: ['yggdrasil.json', 'json'] }],
  });
  if (typeof selected !== 'string') return null;

  const contents = await invoke<string>('read_file', { path: selected });
  const data = JSON.parse(contents);
  if (!data || data.yggdrasilExport !== true) {
    throw new Error('Not a valid Yggdrasil workspace export file');
  }
  return data as WorkspaceExport;
}

export function processImportedWorkspace(
  exportData: WorkspaceExport,
  existingNames: string[],
): Workspace {
  const now = new Date().toISOString();
  let name = exportData.workspace.name;
  if (existingNames.includes(name)) {
    name = `${name} (imported)`;
  }

  const { providers: _, ...workspaceFields } = exportData.workspace;
  return {
    ...workspaceFields,
    id: generateId(),
    name,
    projectRoot: '',
    createdAt: now,
    updatedAt: now,
  };
}
