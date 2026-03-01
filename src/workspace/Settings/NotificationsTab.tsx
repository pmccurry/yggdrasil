import { useState, useCallback } from 'react';
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import type { NotificationConfig, NotificationEventConfig } from '../../types/widgets';
import { requestNotificationPermission } from '../../shell/notification';
import styles from './NotificationsTab.module.css';

function NotificationsTab() {
  const { state, dispatch } = useWorkspaceContext();
  const config = state.notifications;

  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  const update = useCallback((patch: Partial<NotificationConfig>) => {
    dispatch({
      type: 'UPDATE_NOTIFICATIONS',
      notifications: { ...config, ...patch },
    });
  }, [config, dispatch]);

  const updateEvent = useCallback((index: number, patch: Partial<NotificationEventConfig>) => {
    const events = config.events.map((e, i) =>
      i === index ? { ...e, ...patch } : e,
    );
    dispatch({
      type: 'UPDATE_NOTIFICATIONS',
      notifications: { ...config, events },
    });
  }, [config, dispatch]);

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  }, []);

  return (
    <div className={styles.section}>
      {/* Global enabled toggle */}
      <div className={styles.row}>
        <span className={styles.label}>Notifications enabled</span>
        <button
          className={`${styles.toggle} ${config.enabled ? styles.toggleOn : ''}`}
          onClick={() => update({ enabled: !config.enabled })}
          aria-label="Toggle notifications"
        />
      </div>

      {/* Audio toggle */}
      <div className={styles.row}>
        <span className={styles.label}>Audio alerts</span>
        <button
          className={`${styles.toggle} ${config.audioEnabled ? styles.toggleOn : ''}`}
          onClick={() => update({ audioEnabled: !config.audioEnabled })}
          aria-label="Toggle audio"
        />
      </div>

      {/* Volume slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className={styles.row}>
          <span className={styles.label}>Volume</span>
          <span className={styles.value}>{Math.round(config.audioVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(config.audioVolume * 100)}
          onChange={(e) => update({ audioVolume: parseInt(e.target.value, 10) / 100 })}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Permission status */}
      <div className={styles.row}>
        <span className={styles.label}>OS permission</span>
        <div className={styles.permissionRow}>
          <span className={styles.permissionStatus}>{permissionStatus}</span>
          <button className={styles.permissionBtn} onClick={handleRequestPermission}>
            Request Permission
          </button>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* Per-event settings */}
      <h4 className={styles.sectionTitle}>Per-Event Settings</h4>

      <div className={styles.eventTable}>
        <div className={styles.eventHeader}>
          <span className={styles.eventHeaderLabel}>Event</span>
          <span className={styles.eventHeaderLabel} style={{ textAlign: 'center' }}>OS</span>
          <span className={styles.eventHeaderLabel} style={{ textAlign: 'center' }}>Audio</span>
        </div>
        {config.events.map((evt, i) => (
          <div key={evt.event} className={styles.eventRow}>
            <span className={styles.eventLabel}>{evt.label}</span>
            <div className={styles.toggleCenter}>
              <button
                className={`${styles.toggle} ${evt.enabled ? styles.toggleOn : ''}`}
                onClick={() => updateEvent(i, { enabled: !evt.enabled })}
                aria-label={`Toggle OS notification for ${evt.label}`}
              />
            </div>
            <div className={styles.toggleCenter}>
              <button
                className={`${styles.toggle} ${evt.audio ? styles.toggleOn : ''}`}
                onClick={() => updateEvent(i, { audio: !evt.audio })}
                aria-label={`Toggle audio for ${evt.label}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsTab;
