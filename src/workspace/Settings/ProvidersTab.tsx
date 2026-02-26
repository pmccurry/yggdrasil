import { useState, useEffect } from 'react';
import { useWorkspaceContext } from '../../store/WorkspaceContext';
import type { AiProvider, AiProviderType, AiConnectionMode } from '../../types/panels';
import { storeApiKey, deleteApiKey, getKeyMasked } from '../../shell/credentials';

const PROVIDER_DEFAULTS: Record<AiProviderType, { webviewUrl: string; apiEndpoint: string; model: string }> = {
  claude:  { webviewUrl: 'https://claude.ai',             apiEndpoint: 'https://api.anthropic.com',                     model: 'claude-sonnet-4-20250514' },
  openai:  { webviewUrl: 'https://chatgpt.com',           apiEndpoint: 'https://api.openai.com',                        model: 'gpt-4o' },
  gemini:  { webviewUrl: 'https://gemini.google.com',     apiEndpoint: 'https://generativelanguage.googleapis.com',     model: 'gemini-2.0-flash' },
  custom:  { webviewUrl: '',                               apiEndpoint: 'http://localhost:11434',                        model: '' },
};

const TYPE_LABELS: Record<AiProviderType, string> = {
  claude: 'Claude', openai: 'OpenAI', gemini: 'Gemini', custom: 'Custom',
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)',
  fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)',
};

const badgeStyle: React.CSSProperties = {
  padding: '1px 6px', borderRadius: '3px',
  fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-mono)',
  backgroundColor: 'var(--bg-overlay)', color: 'var(--text-muted)',
};

const inputStyle: React.CSSProperties = {
  flex: 1, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
  borderRadius: '4px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
  fontSize: 'var(--font-size-sm)', padding: '4px 8px', outline: 'none',
};

const btnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '4px',
  color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)',
  padding: '4px 10px', cursor: 'pointer',
};

function ProvidersTab() {
  const { state, dispatch } = useWorkspaceContext();
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Add form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AiProviderType>('openai');
  const [formMode, setFormMode] = useState<AiConnectionMode>('webview');
  const [formUrl, setFormUrl] = useState('');
  const [formEndpoint, setFormEndpoint] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formKey, setFormKey] = useState('');
  const [saving, setSaving] = useState(false);

  // Load masked keys for API providers
  useEffect(() => {
    const loadMasks = async () => {
      const masks: Record<string, string> = {};
      for (const p of state.providers) {
        if (p.mode === 'api' && p.apiKeyRef) {
          try {
            masks[p.id] = await getKeyMasked(p.apiKeyRef);
          } catch {
            masks[p.id] = 'No key';
          }
        }
      }
      setMaskedKeys(masks);
    };
    loadMasks();
  }, [state.providers]);

  // Reset form when type/mode changes
  useEffect(() => {
    const defaults = PROVIDER_DEFAULTS[formType];
    if (formMode === 'webview') {
      setFormUrl(defaults.webviewUrl);
    } else {
      setFormEndpoint(defaults.apiEndpoint);
      setFormModel(defaults.model);
    }
  }, [formType, formMode]);

  const openForm = () => {
    setFormName('');
    setFormType('openai');
    setFormMode('webview');
    setFormUrl(PROVIDER_DEFAULTS.openai.webviewUrl);
    setFormEndpoint(PROVIDER_DEFAULTS.openai.apiEndpoint);
    setFormModel(PROVIDER_DEFAULTS.openai.model);
    setFormKey('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);

    const id = `provider-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const refName = `yggdrasil/${formType}/${id}`;

    const provider: AiProvider = {
      id,
      name: formName.trim(),
      providerType: formType,
      mode: formMode,
      enabled: true,
    };

    if (formMode === 'webview') {
      provider.webviewUrl = formUrl;
    } else {
      provider.apiEndpoint = formEndpoint;
      provider.model = formModel;
      provider.apiKeyRef = refName;

      if (formKey) {
        try {
          await storeApiKey(refName, formKey);
        } catch (e) {
          console.error('Failed to store key:', e);
        }
        setFormKey(''); // Clear key immediately
      }
    }

    dispatch({ type: 'ADD_PROVIDER', provider });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (provider: AiProvider) => {
    if (provider.apiKeyRef) {
      try {
        await deleteApiKey(provider.apiKeyRef);
      } catch {
        // Key may not exist
      }
    }
    dispatch({ type: 'DELETE_PROVIDER', providerId: provider.id });
    setConfirmDelete(null);
  };

  const handleToggle = (provider: AiProvider) => {
    dispatch({ type: 'UPDATE_PROVIDER', provider: { ...provider, enabled: !provider.enabled } });
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* Provider list */}
      {state.providers.map((p) => (
        <div key={p.id} style={rowStyle}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
            backgroundColor: p.enabled ? 'var(--status-ok)' : 'var(--status-idle)',
          }} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, minWidth: '80px' }}>
            {p.name}
          </span>
          <span style={badgeStyle}>{TYPE_LABELS[p.providerType]}</span>
          <span style={badgeStyle}>{p.mode === 'webview' ? 'Web' : 'API'}</span>
          {p.mode === 'api' && (
            <span style={{ color: 'var(--text-faint)', fontSize: 'var(--font-size-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {maskedKeys[p.id] || '...'}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
            <button
              style={btnStyle}
              onClick={() => handleToggle(p)}
            >
              {p.enabled ? 'Disable' : 'Enable'}
            </button>
            {confirmDelete === p.id ? (
              <>
                <button
                  style={{ ...btnStyle, color: 'var(--status-error)', borderColor: 'var(--status-error)' }}
                  onClick={() => handleDelete(p)}
                >
                  Confirm
                </button>
                <button style={btnStyle} onClick={() => setConfirmDelete(null)}>Cancel</button>
              </>
            ) : (
              <button
                style={{ ...btnStyle, color: 'var(--status-error)' }}
                onClick={() => setConfirmDelete(p.id)}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}

      {state.providers.length === 0 && !showForm && (
        <div style={{
          padding: '20px', textAlign: 'center',
          color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)',
        }}>
          No providers configured
        </div>
      )}

      {/* Add provider form */}
      {showForm ? (
        <div style={{
          padding: '12px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column', gap: '8px',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-sm)',
        }}>
          <div style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '4px' }}>
            Add Provider
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>Name</label>
            <input style={inputStyle} value={formName} onChange={e => setFormName(e.target.value)} placeholder="My Provider" />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>Type</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={formType}
              onChange={e => setFormType(e.target.value as AiProviderType)}
            >
              <option value="claude">Claude</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>Mode</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={formMode}
              onChange={e => setFormMode(e.target.value as AiConnectionMode)}
            >
              <option value="webview">Webview</option>
              <option value="api">API</option>
            </select>
          </div>

          {formMode === 'webview' ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>URL</label>
              <input style={inputStyle} value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="https://..." />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>Endpoint</label>
                <input style={inputStyle} value={formEndpoint} onChange={e => setFormEndpoint(e.target.value)} placeholder="https://api.openai.com" />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>Model</label>
                <input style={inputStyle} value={formModel} onChange={e => setFormModel(e.target.value)} placeholder="gpt-4o" />
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0, fontSize: 'var(--font-size-xs)' }}>API Key</label>
                <input
                  style={inputStyle}
                  type="password"
                  value={formKey}
                  onChange={e => setFormKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button style={btnStyle} onClick={() => setShowForm(false)}>Cancel</button>
            <button
              style={{
                ...btnStyle,
                backgroundColor: 'var(--accent-dim)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              }}
              onClick={handleSave}
              disabled={!formName.trim() || saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            style={{
              ...btnStyle, width: '100%', textAlign: 'center',
              color: 'var(--accent)', borderColor: 'var(--accent-border)',
            }}
            onClick={openForm}
          >
            + Add Provider
          </button>
        </div>
      )}
    </div>
  );
}

export default ProvidersTab;
