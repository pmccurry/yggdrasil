import { invoke } from '@tauri-apps/api/core';

export async function requestNotificationPermission(): Promise<boolean> {
  return invoke<boolean>('request_notification_permission');
}

export async function sendOsNotification(title: string, body: string): Promise<void> {
  return invoke('send_os_notification', { title, body });
}
