import { invoke } from '@tauri-apps/api/core';

export async function getGitStatus(repoPath: string): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_git_status', { repoPath });
}

export async function gitStage(repoPath: string, files: string[]): Promise<void> {
  return invoke<void>('git_stage', { repoPath, files });
}

export async function gitUnstage(repoPath: string, files: string[]): Promise<void> {
  return invoke<void>('git_unstage', { repoPath, files });
}

export async function gitCommit(repoPath: string, message: string): Promise<void> {
  return invoke<void>('git_commit', { repoPath, message });
}

export async function gitPush(repoPath: string): Promise<string> {
  return invoke<string>('git_push', { repoPath });
}

export async function gitPull(repoPath: string): Promise<string> {
  return invoke<string>('git_pull', { repoPath });
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  return invoke<string>('git_current_branch', { repoPath });
}
