import { invoke } from '@tauri-apps/api/core';

export async function detectClaudeDesktop(): Promise<boolean> {
  return invoke<boolean>('detect_claude_desktop');
}

export async function launchClaudeDesktop(): Promise<void> {
  return invoke<void>('launch_claude_desktop');
}
