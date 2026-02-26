import { invoke } from '@tauri-apps/api/core';

export async function storeApiKey(refName: string, key: string): Promise<void> {
  return invoke<void>('store_api_key', { refName, key });
}

export async function deleteApiKey(refName: string): Promise<void> {
  return invoke<void>('delete_api_key', { refName });
}

export async function getKeyMasked(refName: string): Promise<string> {
  return invoke<string>('get_key_masked', { refName });
}

export async function keyExists(refName: string): Promise<boolean> {
  return invoke<boolean>('key_exists', { refName });
}
