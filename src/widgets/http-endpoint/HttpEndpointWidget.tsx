import { pollEndpoint } from '../../shell/http';
import type { WidgetConfig, WidgetState } from '../../types/widgets';

export async function pollHttpEndpoint(config: WidgetConfig): Promise<WidgetState> {
  const url = config.settings.url as string;
  const expectedStatus = (config.settings.expectedStatus as number) || 200;

  try {
    const actual = await pollEndpoint(url, 5);

    if (actual === expectedStatus) {
      return { status: 'ok', value: String(actual) };
    }

    return {
      status: 'warn',
      value: String(actual),
      tooltip: `Expected ${expectedStatus}, got ${actual}`,
    };
  } catch {
    return { status: 'error', value: 'Unreachable' };
  }
}
