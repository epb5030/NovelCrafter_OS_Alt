import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Cpu, 
  CheckCircle2, 
  Palette, 
  BookOpen, 
  Feather, 
  Flame, 
  Monitor,
  Cloud,
  Trash2,
  Wand2,
  Sliders,
  Play,
  Terminal
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

  // Workbench State
  const [wbTemplate, setWbTemplate] = useState<string>('Write prose in {{pov}} with {{tone}} tone.\n\nInput Context:\n{{prose}}\n\nAuthor Guidance:\n{{guidance}}');
  const [wbSampleInput, setWbSampleInput] = useState<string>('The rain pounded against the window of Highspire Citadel as Valerius examined the ancient star chart.');
  const [wbTemperature, setWbTemperature] = useState<number>(0.7);
  const [wbCompiledResult, setWbCompiledResult] = useState<{ compiledPrompt: string; simulatedOutput: string } | null>(null);
  const [wbTesting, setWbTesting] = useState<boolean>(false);
  const [personas, setPersonas] = useState<Array<{ id: string; name: string; description: string; pov: string; tone: string; rules: string }>>([]);

  useEffect(() => {
    fetchSettings();
    fetchPersonas();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonas = async () => {
    try {
      const res = await fetch(`${apiBase}/ai/personas`);
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (err) {
      console.error('Failed to fetch personas:', err);
    }
  };

  const handleTestPrompt = async () => {
    setWbTesting(true);
    try {
      const res = await fetch(`${apiBase}/ai/test-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: wbTemplate,
          sampleInput: wbSampleInput,
          temperature: wbTemperature,
          pov: settings.writing_pov || 'Third Person Limited',
          tone: settings.writing_tone || 'Balanced Narrative',
          guidance: settings.writing_custom_rules || 'Avoid clichés; use sensory prose.'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWbCompiledResult(data);
      }
    } catch (err) {
      console.error('Prompt workbench test failed:', err);
    } finally {
      setWbTesting(false);
    }
  };

  const applyPersona = (persona: { pov: string; tone: string; rules: string }) => {
    updateSetting('writing_pov', persona.pov);
    updateSetting('writing_tone', persona.tone);
    updateSetting('writing_custom_rules', persona.rules);
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
        Loading settings...
      </div>
    );
  }

  const activeProvider = settings.active_provider || 'ollama';

  const themesList = [
    {
      id: 'vintage-typewriter' as ThemeType,
      name: 'Vintage Typewriter',
      subtitle: 'Concept B (Current Active Default)',
      desc: 'Warm parchment canvas, distressed gold trimmings, brass filigree borders, and typewriter slab serif typography.',
      icon: Feather,
      badgeColor: 'var(--primary)'
    },
    {
      id: 'classic-manuscript' as ThemeType,
      name: 'Classic Manuscript',
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
                  border: activeProvider === p.id ? '1px solid var(--primary)' : '1px solid var(--border-light)'
                }}
              >
                <div style={{ fontWeight: 600, color: activeProvider === p.id ? 'var(--primary)' : '#ffffff' }}>
                  {p.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {p.desc}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClearKeys}
              className="btn btn-secondary"
              style={{ fontSize: '12px', gap: '6px', color: 'var(--secondary)' }}
            >
              <Trash2 size={12} /> Clear All Stored Keys
            </button>
          </div>
        </div>

        {/* Ollama Local / Cloud Settings */}
        {activeProvider === 'ollama_cloud' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Cloud size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Ollama Cloud / Remote GPU Host Settings</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Connect to high-memory remote GPUs running 70B+ models.
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
                  placeholder="https://my-ollama-gpu.runpod.net" 
                  required 
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
                    placeholder="e.g. llama3.3:70b, deepseek-r1:70b" 
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

        {/* 🧪 AI PROMPT TUNING & STYLE WORKBENCH */}
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wand2 size={18} style={{ color: 'var(--primary)' }} />
              <div>
                <h3 style={{ color: '#ffffff', fontSize: '16px' }}>🧪 AI Prompt Tuning & Style Workbench</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Test custom prompt templates, variable substitution, and author style presets with instant preview.
                </span>
              </div>
            </div>
          </div>

          {/* Author Style Personas */}
          <div style={{ marginBottom: '16px' }}>
            <label className="label" style={{ fontSize: '12px', marginBottom: '6px', display: 'block' }}>
              Style Persona Presets (Click to apply tone & rules):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {personas.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPersona(p)}
                  className="btn btn-secondary"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: '8px 10px',
                    fontSize: '11px',
                    textAlign: 'left',
                    height: 'auto',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: '1.2' }}>{p.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Variable Chips */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '8px' }}>Available Variable Placeholders:</span>
            {['{{prose}}', '{{pov}}', '{{tone}}', '{{guidance}}'].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => setWbTemplate(prev => prev + ' ' + chip)}
                style={{
                  padding: '2px 6px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  background: 'rgba(200, 157, 84, 0.15)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(200, 157, 84, 0.3)',
                  cursor: 'pointer',
                  marginRight: '6px'
                }}
              >
                + {chip}
              </button>
            ))}
          </div>

          {/* Template & Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label className="label" style={{ fontSize: '11px' }}>Custom System Prompt Template:</label>
              <textarea
                value={wbTemplate}
                onChange={(e) => setWbTemplate(e.target.value)}
                className="input"
                rows={4}
                style={{ width: '100%', fontSize: '12px', resize: 'vertical', fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '11px' }}>Sample Input Excerpt:</label>
              <textarea
                value={wbSampleInput}
                onChange={(e) => setWbSampleInput(e.target.value)}
                className="input"
                rows={4}
                style={{ width: '100%', fontSize: '12px', resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Temperature Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '6px' }}>
            <Sliders size={16} style={{ color: 'var(--primary)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span>Sampling Temperature: <strong style={{ color: 'var(--primary)' }}>{wbTemperature.toFixed(2)}</strong></span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>0.0 = Deterministic, 1.0 = Creative</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wbTemperature}
                onChange={(e) => setWbTemperature(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>
            <button
              type="button"
              onClick={handleTestPrompt}
              disabled={wbTesting}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
            >
              <Play size={14} /> {wbTesting ? 'Testing...' : 'Test Prompt Template'}
            </button>
          </div>

          {/* Workbench Output Results */}
          {wbCompiledResult && (
            <div className="glass-panel animate-fade" style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={14} /> Compiled Prompt & Live Output Preview:
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '4px' }}>
                <strong>[Compiled Prompt Sent to Model]</strong><br />
                {wbCompiledResult.compiledPrompt}
              </div>
              <div style={{ fontSize: '12px', color: '#ffffff', fontFamily: 'var(--font-body)', lineHeight: '1.5', whiteSpace: 'pre-wrap', background: 'rgba(200, 157, 84, 0.08)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(200, 157, 84, 0.2)' }}>
                {wbCompiledResult.simulatedOutput}
              </div>
            </div>
          )}
        </div>

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
