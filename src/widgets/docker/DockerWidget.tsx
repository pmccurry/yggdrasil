import { dockerInspect } from '../../shell/docker';
import type { WidgetConfig, WidgetState, DockerWidgetSettings } from '../../types/widgets';

export async function pollDocker(config: WidgetConfig): Promise<WidgetState> {
  const settings = config.settings as DockerWidgetSettings;
  try {
    const status = await dockerInspect(settings.containerName);
    if (status === 'running') {
      return { status: 'ok', value: 'Running' };
    }
    // exited, paused, restarting, etc.
    const capitalized = status.charAt(0).toUpperCase() + status.slice(1);
    return { status: 'warn', value: capitalized };
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.startsWith('docker_not_installed:')) {
      return { status: 'idle', value: 'No Docker' };
    }
    return { status: 'error', value: 'Error' };
  }
}
