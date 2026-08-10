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
  Monitor 
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
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { id: 'ollama', label: 'Ollama (Local)', desc: 'Run offline first' },
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
        </div>

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
                <label className="label">OpenAI API Key</label>
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
                <label className="label">Anthropic API Key</label>
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
                <label className="label">OpenRouter API Key</label>
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
