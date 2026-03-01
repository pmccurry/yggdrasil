import type { NotificationEvent } from '../types/widgets';

export interface NotifyDetail {
  event: NotificationEvent;
  title: string;
  body:  string;
}

export function emitNotification(event: NotificationEvent, title: string, body: string): void {
  window.dispatchEvent(
    new CustomEvent<NotifyDetail>('yggdrasil:notify', {
      detail: { event, title, body },
    }),
  );
}
