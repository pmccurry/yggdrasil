import type { WidgetConfig, WidgetState, WidgetStatus } from '../../types/widgets';

export async function pollGeneric(config: WidgetConfig): Promise<WidgetState> {
  const value = (config.settings.value as string) ?? config.label;
  const status = (config.settings.status as WidgetStatus) ?? 'idle';
  return { status, value };
}
