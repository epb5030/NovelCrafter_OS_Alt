import React, { useState, useEffect } from 'react';
import { Save, ShieldAlert, Sparkles, Cpu, Key, CheckCircle2 } from 'lucide-react';

interface SettingsProps {
  apiBase: string;
  onSettingsSaved: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ apiBase, onSettingsSaved }) => {
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
        Loading AI preferences...
      </div>
    );
  }

  const activeProvider = settings.active_provider || 'ollama';

  return (
    <div 
      style={{ 
        padding: '30px', 
        height: '100%', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        maxWidth: '800px'
      }}
      className="animate-fade"
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>AI & Model Integration</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Configure your proprietary API keys or integrate a local model running on your server.
        </p>
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
                  background: activeProvider === p.id ? 'rgba(129, 140, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
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
                  backgroundColor: 'rgba(255,255,255,0.02)',
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
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>OpenAI Credentials</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">API Key</label>
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
                <select
                  value={settings.openai_model || 'gpt-4o-mini'}
                  onChange={(e) => updateSetting('openai_model', e.target.value)}
                  className="input"
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recommended - Fast & Cheap)</option>
                  <option value="gpt-4o">gpt-4o (Highly Creative & Expressive)</option>
                  <option value="o1-mini">o1-mini (Logical Plotting)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 3. Anthropic Configs */}
        {activeProvider === 'anthropic' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Key size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Anthropic Credentials</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">API Key</label>
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
                <select
                  value={settings.anthropic_model || 'claude-3-5-sonnet-20240620'}
                  onChange={(e) => updateSetting('anthropic_model', e.target.value)}
                  className="input"
                >
                  <option value="claude-3-5-sonnet-20240620">claude-3-5-sonnet (Superb Narrative Tone)</option>
                  <option value="claude-3-haiku-20240307">claude-3-haiku (Faster Execution)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 4. OpenRouter Configs */}
        {activeProvider === 'openrouter' && (
          <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Key size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ color: '#ffffff', fontSize: '16px' }}>OpenRouter Credentials</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="label">API Key</label>
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
                <label className="label">Model Tag</label>
                <input 
                  type="text" 
                  value={settings.openrouter_model || ''} 
                  onChange={(e) => updateSetting('openrouter_model', e.target.value)} 
                  className="input" 
                  placeholder="e.g. meta-llama/llama-3-8b-instruct:free, mistralai/mixtral-8x7b-instruct"
                  required 
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Writing Style & Prompt Studio */}
        <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Writing Style & Prompt Studio</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {/* Point of View */}
              <div>
                <label className="label">Default Point of View (POV)</label>
                <select
                  value={settings.writing_pov || 'third_limited'}
                  onChange={(e) => updateSetting('writing_pov', e.target.value)}
                  className="input"
                >
                  <option value="third_limited">3rd Person Limited (He/She/They - Deep POV)</option>
                  <option value="first_person">1st Person (I / Me / We)</option>
                  <option value="third_omniscient">3rd Person Omniscient (All-knowing)</option>
                  <option value="second_person">2nd Person (You / Your)</option>
                </select>
              </div>

              {/* Tense */}
              <div>
                <label className="label">Default Tense</label>
                <select
                  value={settings.writing_tense || 'past'}
                  onChange={(e) => updateSetting('writing_tense', e.target.value)}
                  className="input"
                >
                  <option value="past">Past Tense (walked, said, stared)</option>
                  <option value="present">Present Tense (walks, says, stares)</option>
                </select>
              </div>
            </div>

            {/* Tone & Atmosphere */}
            <div>
              <label className="label">Tone & Atmosphere Preset</label>
              <select
                value={settings.writing_tone || 'Balanced Narrative'}
                onChange={(e) => updateSetting('writing_tone', e.target.value)}
                className="input"
              >
                <option value="Balanced Narrative">Balanced Narrative (Polished, standard contemporary prose)</option>
                <option value="Grimdark & Gritty">Grimdark & Gritty (Visceral, cynical, atmospheric)</option>
                <option value="Lyrical & Atmospheric">Lyrical & Atmospheric (Poetic imagery, slow sensory build)</option>
                <option value="Fast-Paced Action">Fast-Paced Action (Short punchy sentences, high tension)</option>
                <option value="Humorous & Witty">Humorous & Witty (Snarky dialogue, comedic timing)</option>
                <option value="Cozy & Whimsical">Cozy & Whimsical (Warm, gentle, charming world details)</option>
              </select>
            </div>

            {/* Custom Guidelines */}
            <div>
              <label className="label">Custom Author Guidelines & Negative Rules</label>
              <textarea
                value={settings.writing_custom_rules || ''}
                onChange={(e) => updateSetting('writing_custom_rules', e.target.value)}
                className="input"
                rows={3}
                placeholder="e.g. Avoid clichés, prioritize sensory smell/sound details, keep dialogue subtext-heavy without excessive adverbs."
                style={{ resize: 'vertical' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Injected into all Co-Writer prompts and chat instructions automatically.
              </span>
            </div>

            {/* Custom Continue Template */}
            <div>
              <label className="label">Custom "Continue Writing" Instruction (Optional)</label>
              <input
                type="text"
                value={settings.prompt_template_continue || ''}
                onChange={(e) => updateSetting('prompt_template_continue', e.target.value)}
                className="input"
                placeholder="Leave blank for standard default continue prompt"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={saving}
            style={{ padding: '10px 24px' }}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          
          {savedMessage && (
            <div 
              style={{ 
                color: 'var(--status-done)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '13px',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <CheckCircle2 size={16} /> Configuration saved and applied!
            </div>
          )}
        </div>

      </form>
    </div>
  );
};
