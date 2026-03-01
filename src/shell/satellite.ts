import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';

export async function openSatelliteWindow(
  windowLabel: string,
  url: string,
  panelLabel: string,
): Promise<void> {
  return invoke('open_satellite_window', { windowLabel, url, panelLabel });
}

export async function closeSatelliteWindow(
  windowLabel: string,
): Promise<void> {
  return invoke('close_satellite_window', { windowLabel });
}

export async function getSatelliteWindows(): Promise<string[]> {
  return invoke<string[]>('get_open_satellite_windows');
}

export async function emitRecallRequested(panelId: string): Promise<void> {
  await emit(`panel:recall-requested:${panelId}`);
}

export function onRecallRequested(
  panelId: string,
  cb: () => void,
): Promise<UnlistenFn> {
  return listen(`panel:recall-requested:${panelId}`, () => cb());
}
