import { useState, useEffect } from 'react';
import WorkspacesTab from './WorkspacesTab';
import ShortcutsTab from './ShortcutsTab';
import ProvidersTab from './ProvidersTab';
import AppearanceTab from './AppearanceTab';
import AboutTab from './AboutTab';
import styles from './SettingsModal.module.css';

type SettingsTab = 'workspaces' | 'shortcuts' | 'providers' | 'appearance' | 'about';

const TAB_LABELS: { key: SettingsTab; label: string }[] = [
  { key: 'workspaces', label: 'Workspaces' },
  { key: 'shortcuts',  label: 'Shortcuts' },
  { key: 'providers',  label: 'Providers' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'about',      label: 'About' },
];

interface SettingsModalProps {
  onClose: () => void;
}

function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('workspaces');

  // Move native webviews off-screen while modal is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('yggdrasil:modal-open'));
    return () => {
      window.dispatchEvent(new CustomEvent('yggdrasil:modal-close'));
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function renderTab() {
    switch (activeTab) {
      case 'workspaces':  return <WorkspacesTab />;
      case 'shortcuts':   return <ShortcutsTab />;
      case 'providers':   return <ProvidersTab />;
      case 'appearance':  return <AppearanceTab />;
      case 'about':       return <AboutTab />;
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.panel}>
        <div className={styles.tabList}>
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.content}>
          <div className={styles.contentHeader}>
            <span className={styles.contentTitle}>
              {TAB_LABELS.find(t => t.key === activeTab)?.label}
            </span>
            <button className={styles.closeButton} onClick={onClose}>
              {'\u2715'}
            </button>
          </div>
          <div className={styles.contentBody}>
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
