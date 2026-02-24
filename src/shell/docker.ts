import { invoke } from '@tauri-apps/api/core';

export async function dockerInspect(containerName: string): Promise<string> {
  return invoke<string>('docker_inspect', { containerName });
}
