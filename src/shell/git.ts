import { invoke } from '@tauri-apps/api/core';

export async function getGitStatus(repoPath: string): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_git_status', { repoPath });
}
