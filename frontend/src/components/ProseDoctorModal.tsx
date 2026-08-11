import React, { useState, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  MessageSquare, 
  Eye, 
  Ear, 
  Hand, 
  Flame, 
  Activity, 
  Zap, 
  CheckCircle, 
  Square, 
  Copy, 
  Check, 
  Stethoscope, 
  BarChart2
} from 'lucide-react';

interface ProseDoctorModalProps {
  sceneTitle: string;
  sceneText: string;
  sceneId: number;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
}

// Curated sensory word dictionaries for literary analysis
const SENSORY_DICTIONARIES = {
  sight: [
    'glow', 'glimmer', 'shadow', 'darkness', 'shimmer', 'gleam', 'radiance', 'silhouette', 'dim', 'brilliant', 
    'flicker', 'crimson', 'azure', 'emerald', 'golden', 'pale', 'scarlet', 'obsidian', 'luster', 'glare', 
    'haze', 'murky', 'vivid', 'bleak', 'dazzle', 'gleam', 'opaque', 'translucent', 'speck', 'glint'
  ],
  sound: [
    'whisper', 'roar', 'hum', 'clatter', 'chime', 'screech', 'rustle', 'snap', 'thunder', 'creak', 
    'murmur', 'echo', 'groan', 'shriek', 'rattle', 'clash', 'hiss', 'clang', 'boom', 'wail', 
    'gasp', 'giggle', 'shout', 'whistle', 'thud', 'drone', 'screaming', 'silence', 'buzz'
  ],
  touch: [
    'cold', 'warm', 'rough', 'smooth', 'sharp', 'icy', 'damp', 'velvet', 'prickle', 'burning', 
    'chill', 'coarse', 'slippery', 'scorching', 'soft', 'stiff', 'gritty', 'numb', 'tingle', 'sticky', 
    'frost', 'scalding', 'brittle', 'heavy', 'weightless', 'humid', 'breeze', 'silk'
  ],
  smell: [
    'smoke', 'scent', 'perfume', 'musk', 'sulfur', 'ozone', 'pine', 'decay', 'fragrance', 'incense', 
    'rot', 'dampness', 'aroma', 'sweetness', 'pungent', 'musty', 'char', 'stench', 'stale', 'ash', 
    'earth', 'spice', 'mint', 'acrid'
  ],
  taste: [
    'bitter', 'sweet', 'sour', 'metallic', 'copper', 'salt', 'salty', 'venom', 'tang', 'acid', 
    'honey', 'bland', 'spicy', 'tart', 'savory', 'coppery', 'sweetness', 'sharp'
  ]
};

// Filter words that pull readers out of deep POV
const FILTER_WORDS = [
  'felt', 'saw', 'heard', 'noticed', 'seemed', 'suddenly', 'realized', 'decided to', 
  'could see', 'could hear', 'could feel', 'watched as', 'wondered if', 'started to', 
  'began to', 'looked like', 'sounded like', 'felt like', 'very', 'really', 'just'
];

export const ProseDoctorModal: React.FC<ProseDoctorModalProps> = ({
  sceneTitle,
  sceneText,
  sceneId,
  apiBase,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'sensory' | 'filters' | 'critique'>('metrics');
  const [critiqueText, setCritiqueText] = useState<string>('');
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [critiqueError, setCritiqueError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Text Analytics Computation
  const diagnostics = useMemo(() => {
    const trimmed = sceneText.trim();
    if (!trimmed) {
      return {
        wordCount: 0,
        charCount: 0,
        readingTimeMinutes: 0,
        dialogueRatio: 0,
        expositionRatio: 100,
        dialogueChars: 0,
        sentenceCount: 0,
        avgSentenceLength: 0,
        sentences: [] as { text: string; wordCount: number; category: string }[],
        sensoryCounts: { sight: 0, sound: 0, touch: 0, smell: 0, taste: 0, total: 0 },
        detectedFilterWords: [] as { word: string; count: number }[]
      };
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = trimmed.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 225)); // ~225 wpm reading speed

    // Dialogue Analysis (Quotes)
    const quoteMatches: string[] = trimmed.match(/"([^"]*)"|“([^”]*)”|'([^']*)'|‘([^’]*)’/g) || [];
    const dialogueChars = quoteMatches.reduce((acc: number, q: string) => acc + q.length, 0);
    const dialogueRatio = Math.min(100, Math.round((dialogueChars / Math.max(1, charCount)) * 100));
    const expositionRatio = 100 - dialogueRatio;

    // Sentence Length & Rhythm Variance
    const rawSentences = trimmed.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 0);
    const sentences = rawSentences.map(s => {
      const sWords = s.trim().split(/\s+/).filter(Boolean).length;
      let category = 'balanced';
      if (sWords <= 8) category = 'punchy';
      else if (sWords >= 30) category = 'runon';
      else if (sWords >= 20) category = 'complex';
      return { text: s.trim(), wordCount: sWords, category };
    });

    const sentenceCount = sentences.length;
    const avgSentenceLength = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

    // Sensory Words Computation
    const textLower = trimmed.toLowerCase();
    const sensoryCounts = {
      sight: 0,
      sound: 0,
      touch: 0,
      smell: 0,
      taste: 0,
      total: 0
    };

    Object.entries(SENSORY_DICTIONARIES).forEach(([sense, dict]) => {
      dict.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = textLower.match(regex);
        if (matches) {
          sensoryCounts[sense as keyof typeof SENSORY_DICTIONARIES] += matches.length;
          sensoryCounts.total += matches.length;
        }
      });
    });

    // Filter Words Computation
    const detectedFilterWords: { word: string; count: number }[] = [];
    FILTER_WORDS.forEach(fw => {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = textLower.match(regex);
      if (matches && matches.length > 0) {
        detectedFilterWords.push({ word: fw, count: matches.length });
      }
    });
    detectedFilterWords.sort((a, b) => b.count - a.count);

    return {
      wordCount,
      charCount,
      readingTimeMinutes,
      dialogueRatio,
      expositionRatio,
      dialogueChars,
      sentenceCount,
      avgSentenceLength,
      sentences,
      sensoryCounts,
      detectedFilterWords
    };
  }, [sceneText]);

  // AI Critique Trigger (Streaming)
  const handleStartCritique = async () => {
    setIsCritiquing(true);
    setCritiqueError('');
    setCritiqueText('');

    try {
      const res = await fetch(`${apiBase}/ai/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          action: 'critique',
          selection: sceneText
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Critique request failed' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('No response stream available');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulated += parsed.text;
              setCritiqueText(accumulated);
            }
          } catch (_) {}
        }
      }
    } catch (err: any) {
      setCritiqueError(err.message || 'Failed to generate critique');
    } finally {
      setIsCritiquing(false);
    }
  };

  const handleCopyCritique = () => {
    navigator.clipboard.writeText(critiqueText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div 
        className="modal-content animate-scale" 
        style={{ 
          maxWidth: '900px', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '24px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-premium)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Stethoscope size={22} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                AI Prose Doctor & Stylistic Diagnostics
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sceneTitle}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: '16px', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('metrics')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'metrics' ? '2px solid var(--primary)' : '2px solid transparent',
              background: activeTab === 'metrics' ? 'rgba(200, 157, 84, 0.12)' : 'transparent',
              color: activeTab === 'metrics' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12px'
            }}
          >
            <Activity size={14} /> Pacing & Dialogue Balance
          </button>

          <button
            onClick={() => setActiveTab('sensory')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'sensory' ? '2px solid var(--secondary)' : '2px solid transparent',
              background: activeTab === 'sensory' ? 'rgba(150, 96, 61, 0.15)' : 'transparent',
              color: activeTab === 'sensory' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12px'
            }}
          >
            <Eye size={14} /> 5-Senses Imagery ({diagnostics.sensoryCounts.total})
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'filters' ? '2px solid #fbbf24' : '2px solid transparent',
              background: activeTab === 'filters' ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
              color: activeTab === 'filters' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12px'
            }}
          >
            <Zap size={14} /> Filter Words ({diagnostics.detectedFilterWords.reduce((acc, f) => acc + f.count, 0)})
          </button>

          <button
            onClick={() => setActiveTab('critique')}
            className="btn"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
              borderBottom: activeTab === 'critique' ? '2px solid #34d399' : '2px solid transparent',
              background: activeTab === 'critique' ? 'rgba(52, 211, 153, 0.12)' : 'transparent',
              color: activeTab === 'critique' ? '#ffffff' : 'var(--text-secondary)',
              fontSize: '12px'
            }}
          >
            <Sparkles size={14} /> AI Editorial Critique
          </button>
        </div>

        {/* TAB 1: PACING & DIALOGUE BALANCE */}
        {activeTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {/* Top Stat Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>{diagnostics.wordCount.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Words</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>~{diagnostics.readingTimeMinutes} min</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reading Time</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>{diagnostics.sentenceCount}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sentences</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#34d399' }}>{diagnostics.avgSentenceLength} w/s</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Sentence Length</div>
              </div>
            </div>

            {/* Dialogue vs Exposition Ratio */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} style={{ color: 'var(--primary)' }} /> Dialogue vs. Exposition Ratio
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>{diagnostics.dialogueRatio}% Dialogue</strong> • <strong>{diagnostics.expositionRatio}% Exposition</strong>
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: '14px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-light)' }}>
                <div style={{ width: `${diagnostics.dialogueRatio}%`, background: 'linear-gradient(90deg, #c89d54, #dfb36b)', transition: 'width 0.4s ease' }} title={`Dialogue: ${diagnostics.dialogueRatio}%`} />
                <div style={{ width: `${diagnostics.expositionRatio}%`, background: 'rgba(255,255,255,0.08)', transition: 'width 0.4s ease' }} title={`Exposition: ${diagnostics.expositionRatio}%`} />
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                💡 <em>Genre Reference: Action/Thriller (40-50% dialogue) • Fantasy/Sci-Fi (30-40% dialogue) • Literary/Atmospheric (20-30% dialogue).</em>
              </div>
            </div>

            {/* Sentence Rhythm Heatmap */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={14} style={{ color: '#34d399' }} /> Sentence Rhythm & Cadence Heatmap
                </span>
                <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                  <span style={{ color: '#34d399' }}>● Punchy (&lt;9w)</span>
                  <span style={{ color: '#60a5fa' }}>● Balanced (9-19w)</span>
                  <span style={{ color: '#fbbf24' }}>● Complex (20-29w)</span>
                  <span style={{ color: '#f87171' }}>● Long/Run-on (30w+)</span>
                </div>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '12px', lineHeight: '1.8' }}>
                {diagnostics.sentences.map((s, idx) => {
                  let color = '#60a5fa';
                  if (s.category === 'punchy') color = '#34d399';
                  else if (s.category === 'complex') color = '#fbbf24';
                  else if (s.category === 'runon') color = '#f87171';

                  return (
                    <span 
                      key={idx}
                      style={{ 
                        color, 
                        marginRight: '6px',
                        padding: '1px 3px',
                        borderRadius: '3px',
                        backgroundColor: s.category === 'runon' ? 'rgba(239, 68, 68, 0.15)' : 'transparent'
                      }}
                      title={`${s.wordCount} words (${s.category})`}
                    >
                      {s.text}{' '}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 5-SENSES SENSORY ANCHORS */}
        {activeTab === 'sensory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Sensory details ground your reader in visceral scene reality. Here is the sensory footprint detected in this scene:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              <div className="glass-panel" style={{ padding: '14px', textAlign: 'center', borderTop: '3px solid #60a5fa' }}>
                <Eye size={20} style={{ color: '#60a5fa', margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{diagnostics.sensoryCounts.sight}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sight (Visuals)</div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', textAlign: 'center', borderTop: '3px solid #c89d54' }}>
                <Ear size={20} style={{ color: '#c89d54', margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{diagnostics.sensoryCounts.sound}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sound (Auditory)</div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', textAlign: 'center', borderTop: '3px solid #34d399' }}>
                <Hand size={20} style={{ color: '#34d399', margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{diagnostics.sensoryCounts.touch}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Touch (Tactile)</div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', textAlign: 'center', borderTop: '3px solid #fbbf24' }}>
                <Flame size={20} style={{ color: '#fbbf24', margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{diagnostics.sensoryCounts.smell}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Smell (Olfactory)</div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', textAlign: 'center', borderTop: '3px solid #f472b6' }}>
                <Activity size={20} style={{ color: '#f472b6', margin: '0 auto 6px auto' }} />
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{diagnostics.sensoryCounts.taste}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Taste (Gustatory)</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px' }}>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Prose Sensory Balance Recommendation
              </h4>
              <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {diagnostics.sensoryCounts.smell === 0 || diagnostics.sensoryCounts.taste === 0
                  ? '💡 Tip: Your scene has visual and sound cues, but adding a distinctive scent (e.g. rain, smoke, wet stone) or tactile texture (e.g. rough leather, cold steel) will immediately deepen reader immersion.'
                  : '✨ Great sensory balance across multiple physical dimensions.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: FILTER WORDS & POV WEAKNESSES */}
        {activeTab === 'filters' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Filter words (e.g. <em>"she heard the door open"</em> vs <em>"the door creaked open"</em>) create psychological distance between the reader and the POV character.
            </p>

            {diagnostics.detectedFilterWords.length === 0 ? (
              <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--status-done)' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 8px auto' }} />
                <h3>No excessive filter words detected!</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your scene prose uses direct, immediate action verbs.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {diagnostics.detectedFilterWords.map((item, idx) => (
                  <div 
                    key={idx}
                    className="glass-panel"
                    style={{ 
                      padding: '10px 14px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderLeft: '3px solid #fbbf24'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff' }}>"{item.word}"</span>
                    <span style={{ fontSize: '11px', background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {item.count}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI EDITORIAL CRITIQUE */}
        {activeTab === 'critique' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Request an instant developmental edit and constructive feedback from your AI literary editor.
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {critiqueText && (
                  <button onClick={handleCopyCritique} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                    {copied ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
                {isCritiquing ? (
                  <button onClick={() => setIsCritiquing(false)} className="btn" style={{ padding: '4px 10px', fontSize: '11px', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <Square size={11} style={{ fill: '#f87171' }} /> Stop
                  </button>
                ) : (
                  <button onClick={handleStartCritique} className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                    <Sparkles size={12} /> {critiqueText ? 'Re-Analyze Scene' : 'Run Full Editorial Critique'}
                  </button>
                )}
              </div>
            </div>

            {critiqueError && (
              <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
                {critiqueError}
              </div>
            )}

            <div 
              style={{ 
                flex: 1, 
                minHeight: '260px', 
                maxHeight: '380px', 
                overflowY: 'auto', 
                backgroundColor: 'rgba(0,0,0,0.35)', 
                border: '1px solid var(--border-light)', 
                borderRadius: '8px', 
                padding: '16px',
                whiteSpace: 'pre-wrap',
                fontSize: '13px',
                lineHeight: '1.7',
                color: 'rgba(255,255,255,0.9)'
              }}
            >
              {critiqueText || (isCritiquing ? 'Analyzing pacing, dialogue subtext, and sensory anchors...' : 'Click "Run Full Editorial Critique" to receive structural and line-level feedback for this scene.')}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
