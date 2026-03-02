import { invoke } from '@tauri-apps/api/core';
import type { GitBranchInfo } from '../panels/git/git.types';

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

export async function gitDiff(repoPath: string, filePath: string): Promise<string> {
  return invoke<string>('git_diff', { repoPath, filePath });
}

export async function gitListBranches(repoPath: string): Promise<GitBranchInfo[]> {
  return invoke<GitBranchInfo[]>('git_list_branches', { repoPath });
}

export async function gitCreateBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>('git_create_branch', { repoPath, name });
}

export async function gitSwitchBranch(repoPath: string, name: string): Promise<void> {
  return invoke<void>('git_switch_branch', { repoPath, name });
}
