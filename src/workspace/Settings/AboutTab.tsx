import { useState, useEffect, useCallback } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { useAppContext } from '../../store/AppContext';
import { checkForUpdate, downloadAndInstall, type DownloadProgress } from '../../shell/updater';

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  backgroundColor: 'var(--bg-overlay)',
  border: '1px solid var(--border-default)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-sm)',
  cursor: 'pointer',
};

function AboutTab() {
  const { state: appState, dispatch } = useAppContext();
  const [version, setVersion] = useState('...');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<'up-to-date' | 'error' | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('unknown'));
  }, []);

  // Auto-clear "up to date" message after 5 seconds
  useEffect(() => {
    if (checkResult === 'up-to-date') {
      const timer = setTimeout(() => setCheckResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [checkResult]);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setCheckResult(null);
    const result = await checkForUpdate();
    setChecking(false);

    if (result === null) {
      setCheckResult('error');
    } else if (result.available) {
      dispatch({
        type: 'SET_UPDATE_AVAILABLE',
        version: result.version,
        notes: result.notes,
        update: result.update,
      });
    } else {
      setCheckResult('up-to-date');
    }
  }, [dispatch]);

  const handleInstall = useCallback(async () => {
    if (!appState.updateAvailable) return;
    setInstalling(true);
    setProgress(null);
    try {
      await downloadAndInstall(appState.updateAvailable.update, (p) => {
        setProgress(p);
      });
      // relaunch() is called inside downloadAndInstall — we won't reach here
    } catch (e) {
      console.error('Install failed:', e);
      setInstalling(false);
    }
  }, [appState.updateAvailable]);

  const updateInfo = appState.updateAvailable;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      fontFamily: 'var(--font-mono)',
    }}>
      {/* Version */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Version
        </span>
        <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', fontWeight: 600 }}>
          Yggdrasil v{version}
        </span>
      </div>

      {/* Update section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Updates
        </span>

        {updateInfo && !installing && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-overlay)',
            border: '1px solid var(--status-warning)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <span style={{ color: 'var(--status-warning)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
              v{updateInfo.version} available
            </span>
            {updateInfo.notes && (
              <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)', lineHeight: 1.4 }}>
                {updateInfo.notes}
              </span>
            )}
            <button
              style={{ ...btnStyle, borderColor: 'var(--status-warning)', color: 'var(--status-warning)', alignSelf: 'flex-start', marginTop: '4px' }}
              onClick={handleInstall}
            >
              Install Update
            </button>
          </div>
        )}

        {installing && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-overlay)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {progress && progress.total > 0
                ? `Downloading... ${Math.round((progress.downloaded / progress.total) * 100)}%`
                : 'Installing...'}
            </span>
            {progress && progress.total > 0 && (
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.round((progress.downloaded / progress.total) * 100)}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent)',
                  transition: 'width 0.2s',
                }} />
              </div>
            )}
          </div>
        )}

        {!updateInfo && !installing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{ ...btnStyle, opacity: checking ? 0.6 : 1, cursor: checking ? 'default' : 'pointer' }}
              onClick={handleCheck}
              disabled={checking}
            >
              {checking ? 'Checking...' : 'Check for Updates'}
            </button>
            {checkResult === 'up-to-date' && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--status-ok)' }}>
                You're on the latest version
              </span>
            )}
            {checkResult === 'error' && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                Could not check for updates
              </span>
            )}
          </div>
        )}
      </div>

      {/* Privacy */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
          Privacy
        </span>
        <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Yggdrasil collects no telemetry. Your data never leaves your machine.
        </span>
      </div>
    </div>
  );
}

export default AboutTab;
