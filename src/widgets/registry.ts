import { WidgetType } from '../types/widgets';
import type { WidgetConfig, WidgetState } from '../types/widgets';
import { pollDocker } from './docker/DockerWidget';
import { pollGit } from './git/GitWidget';
import { pollHttpEndpoint } from './http-endpoint/HttpEndpointWidget';
import { pollGeneric } from './generic/GenericWidget';

export type WidgetPollFn = (config: WidgetConfig) => Promise<WidgetState>;

export const WIDGET_REGISTRY: Record<WidgetType, WidgetPollFn> = {
  [WidgetType.Docker]:       pollDocker,
  [WidgetType.Git]:          pollGit,
  [WidgetType.HttpEndpoint]: pollHttpEndpoint,
  [WidgetType.Generic]:      pollGeneric,
};
