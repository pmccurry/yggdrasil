import { invoke } from '@tauri-apps/api/core';

export async function dockerInspect(containerName: string): Promise<string> {
  return invoke<string>('docker_inspect', { containerName });
}

export interface DockerContainer {
  name: string;
  state: string;
}

export async function dockerPs(): Promise<DockerContainer[]> {
  const raw = await invoke<string>('docker_ps');
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map(line => {
    const [name, state] = line.split('\t');
    return { name: name || '', state: state || '' };
  });
}
