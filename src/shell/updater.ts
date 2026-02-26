import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export interface UpdateInfo {
  available: true;
  version: string;
  notes: string;
  update: Update;
}

export interface NoUpdate {
  available: false;
}

export type UpdateCheckResult = UpdateInfo | NoUpdate;

export type DownloadProgress = {
  total: number;
  downloaded: number;
};

export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  try {
    const update = await check();
    if (!update?.available) {
      return { available: false };
    }
    return {
      available: true,
      version: update.version,
      notes: update.body ?? '',
      update,
    };
  } catch (e) {
    console.error('Update check failed:', e);
    return null;
  }
}

export async function downloadAndInstall(
  update: Update,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started' && event.data.contentLength) {
      total = event.data.contentLength;
    } else if (event.event === 'Progress') {
      downloaded += event.data.chunkLength;
      onProgress?.({ total, downloaded });
    }
  });

  await relaunch();
}
