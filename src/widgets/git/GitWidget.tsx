import { getGitStatus } from '../../shell/git';
import type { WidgetConfig, WidgetState, GitWidgetSettings } from '../../types/widgets';

export async function pollGit(config: WidgetConfig): Promise<WidgetState> {
  const settings = config.settings as GitWidgetSettings;
  try {
    const statuses = await getGitStatus(settings.repoPath);
    const entries = Object.entries(statuses);

    if (entries.length === 0) {
      return { status: 'ok', value: 'Clean' };
    }

    let modified = 0;
    let untracked = 0;
    let other = 0;

    for (const [, code] of entries) {
      if (code === '??' || code === 'A') {
        untracked++;
      } else if (code === 'M' || code === 'MM' || code === 'AM') {
        modified++;
      } else {
        other++;
      }
    }

    const parts: string[] = [];
    if (modified > 0) parts.push(`${modified} modified`);
    if (untracked > 0) parts.push(`${untracked} untracked`);
    if (other > 0) parts.push(`${other} other`);

    return { status: 'warn', value: parts.join(', ') };
  } catch {
    return { status: 'error', value: 'Error' };
  }
}
