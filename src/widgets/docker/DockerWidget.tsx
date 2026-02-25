import { dockerPs } from '../../shell/docker';
import type { WidgetConfig, WidgetState } from '../../types/widgets';

export async function pollDocker(config: WidgetConfig): Promise<WidgetState> {
  const projectDir = (config.settings.projectDir as string) || '';

  try {
    const all = await dockerPs();

    // Filter to containers belonging to this workspace's project
    const containers = projectDir
      ? all.filter(c => c.name.toLowerCase().startsWith(projectDir.toLowerCase() + '-'))
      : all;

    if (containers.length === 0) {
      return { status: 'idle', value: 'No containers' };
    }

    const running = containers.filter(c => c.state === 'running');
    const stopped = containers.filter(c => c.state !== 'running');
    const tooltip = containers
      .map(c => `${c.name}: ${c.state}`)
      .join('\n');

    if (stopped.length === 0) {
      return { status: 'ok', value: `${running.length} running`, tooltip };
    }
    if (running.length === 0) {
      return { status: 'warn', value: `${stopped.length} stopped`, tooltip };
    }
    return { status: 'ok', value: `${running.length}/${containers.length} up`, tooltip };
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.startsWith('docker_not_installed:')) {
      return { status: 'idle', value: 'No Docker' };
    }
    return { status: 'error', value: 'Error' };
  }
}
