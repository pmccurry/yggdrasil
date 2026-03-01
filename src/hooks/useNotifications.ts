import { useEffect, useRef } from 'react';
import type { NotificationConfig } from '../types/widgets';
import type { NotifyDetail } from '../utils/notify';
import { requestNotificationPermission, sendOsNotification } from '../shell/notification';

let audioCtx: AudioContext | null = null;

function playTone(volume: number): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  // Resume if suspended (autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 880; // A5
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

export function useNotifications({ config }: { config: NotificationConfig }): void {
  const configRef = useRef(config);
  configRef.current = config;

  const permissionRef = useRef<boolean | null>(null);

  useEffect(() => {
    function handleNotify(e: Event) {
      const { event, title, body } = (e as CustomEvent<NotifyDetail>).detail;
      const cfg = configRef.current;

      if (!cfg.enabled) return;

      const eventConfig = cfg.events.find(ec => ec.event === event);
      if (!eventConfig) return;

      // Play audio tone if globally + per-event enabled
      if (cfg.audioEnabled && eventConfig.audio) {
        playTone(cfg.audioVolume);
      }

      // Send OS notification if per-event enabled
      if (eventConfig.enabled) {
        (async () => {
          // Lazy-request permission on first attempt
          if (permissionRef.current === null) {
            permissionRef.current = await requestNotificationPermission();
          }
          if (permissionRef.current) {
            sendOsNotification(title, body).catch(() => {});
          }
        })();
      }
    }

    window.addEventListener('yggdrasil:notify', handleNotify);
    return () => window.removeEventListener('yggdrasil:notify', handleNotify);
  }, []);
}
