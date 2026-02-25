import { invoke } from '@tauri-apps/api/core';

export async function pollEndpoint(url: string, timeoutSecs: number): Promise<number> {
  return invoke<number>('http_poll_endpoint', { url, timeoutSecs });
}
