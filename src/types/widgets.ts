export type WidgetStatus = 'ok' | 'warn' | 'error' | 'idle' | 'loading';

export enum WidgetType {
  Docker       = 'docker',
  Git          = 'git',
  HttpEndpoint = 'http-endpoint',
  Generic      = 'generic',
}

export interface WidgetConfig {
  id:           string;
  type:         WidgetType;
  label:        string;
  pollInterval: number;
  settings:     WidgetSettings;
}

export interface WidgetSettings {
  [key: string]: unknown;
}

export interface DockerWidgetSettings extends WidgetSettings {
  containerName: string;
}

export interface GitWidgetSettings extends WidgetSettings {
  repoPath: string;
}

export interface HttpEndpointWidgetSettings extends WidgetSettings {
  url:            string;
  expectedStatus: number;
  label:          string;
}

export interface WidgetState {
  status:   WidgetStatus;
  value:    string;
  tooltip?: string;
}
