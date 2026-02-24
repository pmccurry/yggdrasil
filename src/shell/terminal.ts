import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export async function spawnShell(cwd: string, shell: string): Promise<string> {
  return invoke<string>('spawn_shell', { cwd, shell });
}

export async function writeToShell(ptyId: string, data: string): Promise<void> {
  return invoke('write_to_shell', { ptyId, data });
}

export async function resizeShell(ptyId: string, cols: number, rows: number): Promise<void> {
  return invoke('resize_shell', { ptyId, cols, rows });
}

export async function killShell(ptyId: string): Promise<void> {
  return invoke('kill_shell', { ptyId });
}

export async function onShellOutput(
  ptyId: string,
  callback: (data: string) => void,
): Promise<UnlistenFn> {
  return listen<string>(`shell-output-${ptyId}`, (event) => {
    callback(event.payload);
  });
}
