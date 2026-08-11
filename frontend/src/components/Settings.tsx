import React, { useState, useEffect } from 'react';
import { 
  Save, 
  ShieldAlert, 
  Sparkles, 
  Cpu, 
  Key, 
  CheckCircle2, 
  Palette, 
  BookOpen, 
  Feather, 
  Flame, 
  Monitor,
  Cloud,
  Trash2,
  Lock
} from 'lucide-react';
import type { ThemeType } from '../App';

interface SettingsProps {
  apiBase: string;
  onSettingsSaved: () => void;
  activeTheme?: ThemeType;
  onThemeChange?: (theme: ThemeType) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  apiBase, 
  onSettingsSaved,
  activeTheme = 'vintage-typewriter',
  onThemeChange
}) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [envOverrides, setEnvOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || data);
        setEnvOverrides(data.envOverrides || {});
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearKeys = async () => {
    if (!confirm('Are you sure you want to strip all API keys from the local database? (Keys defined in .env will remain active).')) return;
    try {
      const res = await fetch(`${apiBase}/settings/clear-keys`, { method: 'POST' });
      if (res.ok) {
        alert('All stored API keys have been stripped from the database!');
        fetchSettings();
      }
    } catch (err) {
      console.error('Failed to clear keys:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSavedMessage(true);
        onSettingsSaved();
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        Loading studio preferences...
      </div>
    );
  }

  const activeProvider = settings.active_provider || 'ollama';

  const themesList = [
    {
      id: 'vintage-typewriter' as ThemeType,
      name: 'Vintage Typewriter & Editorial',
      subtitle: 'Concept B (Active)',
      desc: 'Warm cream linen, authentic monospace Courier typewriter typography, deep forest green, and tobacco leather accents.',
      icon: Feather,
      badgeColor: '#c89d54'
    },
    {
      id: 'antique-library' as ThemeType,
      name: 'The Grand Antique Library',
      subtitle: 'Concept A (Saved Theme)',
      desc: 'Rich dark mahogany cabinetry, aged ivory parchment canvas, brass metal trims, and classic Crimson Pro book typography.',
      icon: BookOpen,
      badgeColor: '#d4af37'
    },
    {
      id: 'dark-academia' as ThemeType,
      name: 'Dark Academia Leatherbound',
      subtitle: 'Concept C (Saved Theme)',
      desc: 'Deep oxblood leather bindings, gold-foil filigree embossing, candlelit walnut study, and Roman Cinzel titling.',
      icon: Flame,
      badgeColor: '#eab308'
    },
    {
      id: 'modern-studio' as ThemeType,
      name: 'Modern Studio (Dark)',
      subtitle: 'Glassmorphism',
      desc: 'Sleek dark indigo workspace with modern sans-serif typography.',
      icon: Monitor,
      badgeColor: '#818cf8'
    }
  ];

  return (
    <div 
      style={{ 
        padding: '30px', 
        height: '100%', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        maxWidth: '850px'
      }}
      className="animate-fade"
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Studio Settings & Atmosphere</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Customize your author aesthetic, narrative guidelines, and AI co-writer integrations.
        </p>
      </div>

      {/* 1. VISUAL THEME & AESTHETIC SELECTOR */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Palette size={18} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Visual Theme & Aesthetic</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Choose your preferred author study atmosphere.</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {themesList.map(t => {
            const Icon = t.icon;
            const isSelected = activeTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onThemeChange && onThemeChange(t.id)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-light)',
                  background: isSelected ? 'rgba(200, 157, 84, 0.12)' : 'rgba(0, 0, 0, 0.2)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={16} style={{ color: t.badgeColor }} />
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>{t.name}</span>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Active
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '10px', color: t.badgeColor, fontWeight: 600 }}>
                  {t.subtitle}
                </div>

                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {t.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Active Provider Selector */}
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Cpu size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Active LLM Provider</h3>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {[
              { id: 'ollama', label: 'Ollama (Local)', desc: 'Local localhost:11434' },
              { id: 'ollama_cloud', label: 'Ollama Cloud', desc: 'Remote GPU / RunPod / Tunnel' },
              { id: 'gemini', label: 'Google Gemini', desc: '1M+ Context / Gemini 2.0' },
              { id: 'openai', label: 'OpenAI', desc: 'GPT-4o / GPT-4o-mini' },
              { id: 'anthropic', label: 'Anthropic', desc: 'Claude 3.5 Sonnet' },
              { id: 'openrouter', label: 'OpenRouter', desc: 'Any open-source model' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => updateSetting('active_provider', p.id)}
                className="btn"
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px',
                  height: 'auto',
                  gap: '4px',
                  background: activeProvider === p.id ? 'rgba(200, 157, 84, 0.15)' : 'rgba(0, 0, 0, 0.2)',
                  borderColor: activeProvider === p.id ? 'var(--primary)' : 'var(--border-light)',
                  color: activeProvider === p.id ? '#ffffff' : 'var(--text-secondary)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</span>
              </button>
            ))}
          </div>

          {/* Security & Key Encryption Notice */}
          <div style={{ marginTop: '14px', padding: '12px 14px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={14} style={{ color: 'var(--primary)' }} />
              <span>
                <strong>Key Security & Privacy:</strong> Environment variables (e.g. <code>OPENAI_API_KEY</code>) take priority. API keys saved below are encrypted server-side with AES-256-GCM.
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearKeys}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 10px', gap: '4px', color: '#f87171' }}
              title="Strip all API keys from SQLite database"
            >
              <Trash2 size={12} /> Clear All Stored Keys
            </button>
          </div>
        </div>

        {/* 1A. Ollama Cloud / Remote Host Settings */}
        {activeProvider === 'ollama_cloud' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Cloud size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Ollama Cloud / Remote GPU Host Settings</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Connect to high-memory remote GPUs (RunPod, Vast.ai, Modal, Cloudflare tunnel, or private VPS) running 70B+ models.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Ollama Cloud / Remote Server URL</label>
                <input 
                  type="url" 
                  value={settings.ollama_cloud_url || ''} 
                  onChange={(e) => updateSetting('ollama_cloud_url', e.target.value)} 
                  className="input" 
                  placeholder="https://my-ollama-gpu.runpod.net or https://ollama.yourdomain.com" 
                  required 
                />
              </div>

              <div>
                <label className="label">Remote Auth Token / Bearer Key (Optional)</label>
                <input 
                  type="password" 
                  value={settings.ollama_cloud_api_key || ''} 
                  onChange={(e) => updateSetting('ollama_cloud_api_key', e.target.value)} 
                  className="input" 
                  placeholder="Bearer token or password (leave blank if public tunnel)" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="label">Remote Model Tag</label>
                  <input 
                    type="text" 
                    value={settings.ollama_cloud_model || ''} 
                    onChange={(e) => updateSetting('ollama_cloud_model', e.target.value)} 
                    className="input" 
                    placeholder="e.g. llama3.3:70b, deepseek-r1:70b, qwen2.5:72b" 
                    required 
                  />
                </div>

                <div>
                  <label className="label">GPU Context Window (num_ctx)</label>
                  <input 
                    type="number" 
                    value={settings.ollama_cloud_num_ctx || '32768'} 
                    onChange={(e) => updateSetting('ollama_cloud_num_ctx', e.target.value)} 
                    className="input" 
                    placeholder="e.g. 16384, 32768, 65536" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1B. Google Gemini Configs */}
        {activeProvider === 'gemini' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Sparkles size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Google Gemini (Google AI Studio)</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Massive 1M+ context window for full-book consistency.</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="label" style={{ margin: 0 }}>Google AI Studio API Key</label>
                  {envOverrides['gemini_api_key'] && (
                    <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={10} /> Loaded from .env
                    </span>
                  )}
                </div>
                <input 
                  type="password" 
                  value={settings.gemini_api_key || ''} 
                  onChange={(e) => updateSetting('gemini_api_key', e.target.value)} 
                  className="input" 
                  placeholder="AIzaSy..."
                  required 
                />
              </div>

              <div>
                <label className="label">Model Tag</label>
                <input 
                  type="text" 
                  value={settings.gemini_model || ''} 
                  onChange={(e) => updateSetting('gemini_model', e.target.value)} 
                  className="input" 
                  placeholder="e.g. gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash"
                  required 
                />
              </div>
            </div>
          </div>
        )}

        {/* 1. Ollama Configs */}
        {activeProvider === 'ollama' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Sparkles size={18} style={{ color: 'var(--secondary)' }} />
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Ollama Local Host Settings</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">Ollama API URL</label>
                <input 
                  type="text" 
                  value={settings.ollama_url || ''} 
                  onChange={(e) => updateSetting('ollama_url', e.target.value)} 
                  className="input" 
                  placeholder="e.g. http://localhost:11434"
                  required 
                />
              </div>

              <div>
                <label className="label">Model Tag</label>
                <input 
                  type="text" 
                  value={settings.ollama_model || ''} 
                  onChange={(e) => updateSetting('ollama_model', e.target.value)} 
                  className="input" 
                  placeholder="e.g. llama3, mistral, qwen2"
                  required 
                />
              </div>
              <div 
                style={{ 
                  fontSize: '12px', 
                  color: 'var(--text-secondary)', 
                  display: 'flex', 
                  gap: '8px', 
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)'
                }}
              >
                <ShieldAlert size={14} style={{ flexShrink: 0, color: 'var(--secondary)' }} />
                <span>
                  Make sure Ollama is running on your host system and the model tag matches your pulled local image (e.g. run `ollama pull llama3` inside terminal).
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. OpenAI Configs */}
        {activeProvider === 'openai' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Key size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>OpenAI Configuration</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="label" style={{ margin: 0 }}>OpenAI API Key</label>
                  {envOverrides['openai_api_key'] && (
                    <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={10} /> Loaded from .env
                    </span>
                  )}
                </div>
                <input 
                  type="password" 
                  value={settings.openai_api_key || ''} 
                  onChange={(e) => updateSetting('openai_api_key', e.target.value)} 
                  className="input" 
                  placeholder="sk-..."
                  required 
                />
              </div>

              <div>
                <label className="label">Model</label>
                <input 
                  type="text" 
                  value={settings.openai_model || ''} 
                  onChange={(e) => updateSetting('openai_model', e.target.value)} 
                  className="input" 
                  placeholder="e.g. gpt-4o, gpt-4o-mini"
                  required 
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Anthropic Configs */}
        {activeProvider === 'anthropic' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Key size={18} style={{ color: 'var(--secondary)' }} />
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Anthropic Configuration</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="label" style={{ margin: 0 }}>Anthropic API Key</label>
                  {envOverrides['anthropic_api_key'] && (
                    <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={10} /> Loaded from .env
                    </span>
                  )}
                </div>
                <input 
                  type="password" 
                  value={settings.anthropic_api_key || ''} 
                  onChange={(e) => updateSetting('anthropic_api_key', e.target.value)} 
                  className="input" 
                  placeholder="sk-ant-..."
                  required 
                />
              </div>

              <div>
                <label className="label">Model</label>
                <input 
                  type="text" 
                  value={settings.anthropic_model || ''} 
                  onChange={(e) => updateSetting('anthropic_model', e.target.value)} 
                  className="input" 
                  placeholder="e.g. claude-3-5-sonnet-20240620"
                  required 
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. OpenRouter Configs */}
        {activeProvider === 'openrouter' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Key size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>OpenRouter Configuration</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="label" style={{ margin: 0 }}>OpenRouter API Key</label>
                  {envOverrides['openrouter_api_key'] && (
                    <span style={{ fontSize: '10px', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={10} /> Loaded from .env
                    </span>
                  )}
                </div>
                <input 
                  type="password" 
                  value={settings.openrouter_api_key || ''} 
                  onChange={(e) => updateSetting('openrouter_api_key', e.target.value)} 
                  className="input" 
                  placeholder="sk-or-..."
                  required 
                />
              </div>

              <div>
                <label className="label">Model Path</label>
                <input 
                  type="text" 
                  value={settings.openrouter_model || ''} 
                  onChange={(e) => updateSetting('openrouter_model', e.target.value)} 
                  className="input" 
                  placeholder="e.g. meta-llama/llama-3-8b-instruct:free"
                  required 
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {savedMessage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-done)', fontSize: '13px' }}>
              <CheckCircle2 size={16} /> Preferences saved successfully!
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
