import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  Square, 
  Sliders, 
  Check, 
  ListOrdered
} from 'lucide-react';

interface BeatExpanderModalProps {
  sceneId: number;
  sceneTitle: string;
  sceneSummary?: string;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyProse: (generatedProse: string, mode: 'append' | 'replace') => void;
}

export const BeatExpanderModal: React.FC<BeatExpanderModalProps> = ({
  sceneId,
  sceneTitle,
  sceneSummary,
  apiBase,
  isOpen,
  onClose,
  onApplyProse
}) => {
  const [beats, setBeats] = useState<string[]>([
    'Opening: Establish the atmosphere and character emotional state',
    'Inciting Moment: A sudden development or arrival forces a choice',
    'Escalation: Tension rises through dialogue or obstacle',
    'Climax: A crucial revelation or decisive action takes place',
    'Resolution: The immediate aftermath sets up the next chapter'
  ]);
  const [newBeatInput, setNewBeatInput] = useState<string>('');
  const [pacing, setPacing] = useState<'concise' | 'standard' | 'elaborate'>('standard');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [streamedProse, setStreamedProse] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleAddBeat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeatInput.trim()) return;
    setBeats(prev => [...prev, newBeatInput.trim()]);
    setNewBeatInput('');
  };

  const handleRemoveBeat = (index: number) => {
    setBeats(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateBeat = (index: number, val: string) => {
    setBeats(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  // Auto-Generate Beats from Summary
  const handleAutoGenerateBeats = async () => {
    setIsGenerating(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${apiBase}/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          action: 'generate_beats'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to auto-generate beats');
      }

      const data = await res.json();
      const text = data.text || '';
      const lines = text.split('\n')
        .map((l: string) => l.replace(/^\d+[\.\)]\s*|-\s*|\*\s*/, '').trim())
        .filter((l: string) => l.length > 5);

      if (lines.length > 0) {
        setBeats(lines);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating beats');
    } finally {
      setIsGenerating(false);
    }
  };

  // Stream Prose Expansion from Beats
  const handleExpandBeatsToProse = async () => {
    if (beats.length === 0) {
      setErrorMsg('Please add at least one scene beat to expand.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setStreamedProse('');

    try {
      const res = await fetch(`${apiBase}/ai/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          action: 'expand_beats',
          beats,
          pacing
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Expansion stream failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
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
              setStreamedProse(accumulated);
            }
          } catch (_) {}
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error expanding beats to prose');
    } finally {
      setIsGenerating(false);
    }
  };

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
            <ListOrdered size={22} style={{ color: 'var(--primary)' }} />
            <div>
              <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                Scene Beat-to-Prose Expander
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sceneTitle}</span>
                {sceneSummary && <span style={{ fontSize: '11px', color: 'var(--primary)', fontStyle: 'italic' }}>• {sceneSummary.slice(0, 50)}...</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px' }}>
            {errorMsg}
          </div>
        )}

        {/* Main 2-Column Split: Beats on Left, Generated Prose on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT: Beats List & Pacing Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Scene Outline Beats ({beats.length})
              </span>
              <button 
                type="button" 
                onClick={handleAutoGenerateBeats} 
                disabled={isGenerating}
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                title="Generate beats from scene summary"
              >
                <Sparkles size={11} /> Auto-Plan from Summary
              </button>
            </div>

            {/* Pacing Selector */}
            <div className="glass-panel" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sliders size={12} /> Expansion Pacing & Detail Level
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { id: 'concise', label: 'Concise', desc: '~100w/beat' },
                  { id: 'standard', label: 'Standard', desc: '~200w/beat' },
                  { id: 'elaborate', label: 'Elaborate', desc: '~350w/beat' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPacing(p.id as any)}
                    className="btn"
                    style={{
                      padding: '6px',
                      flexDirection: 'column',
                      fontSize: '11px',
                      background: pacing === p.id ? 'rgba(200, 157, 84, 0.2)' : 'rgba(0,0,0,0.2)',
                      borderColor: pacing === p.id ? 'var(--primary)' : 'var(--border-light)',
                      color: pacing === p.id ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Beat List Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
              {beats.map((beat, idx) => (
                <div 
                  key={idx}
                  className="glass-panel"
                  style={{ 
                    padding: '8px 10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    borderLeft: '3px solid var(--primary)'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', minWidth: '18px' }}>
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={beat}
                    onChange={(e) => handleUpdateBeat(idx, e.target.value)}
                    className="input"
                    style={{ padding: '4px 8px', fontSize: '12px', flex: 1, background: 'transparent', border: 'none' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveBeat(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                    title="Remove beat"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Beat Input */}
            <form onSubmit={handleAddBeat} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={newBeatInput}
                onChange={(e) => setNewBeatInput(e.target.value)}
                placeholder="+ Add next plot beat..."
                className="input"
                style={{ fontSize: '12px', padding: '6px 10px' }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '6px 10px' }}>
                <Plus size={14} />
              </button>
            </form>
          </div>

          {/* RIGHT: Generated Prose Expansion Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Expanded Prose Draft ({streamedProse.trim() ? streamedProse.trim().split(/\s+/).length : 0} words)
              </span>
              {isGenerating ? (
                <button onClick={() => setIsGenerating(false)} className="btn" style={{ padding: '4px 10px', fontSize: '11px', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <Square size={11} style={{ fill: '#f87171' }} /> Stop
                </button>
              ) : (
                <button 
                  onClick={handleExpandBeatsToProse} 
                  className="btn btn-primary" 
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  <Sparkles size={13} /> {streamedProse ? 'Regenerate Prose' : 'Expand Beats into Prose'}
                </button>
              )}
            </div>

            {/* Prose Canvas Box */}
            <div 
              style={{ 
                flex: 1, 
                backgroundColor: 'var(--bg-editor-canvas)', 
                color: 'var(--text-editor-canvas)', 
                border: '1px solid var(--border-light)', 
                borderRadius: 'var(--radius-md)', 
                padding: '16px 20px',
                overflowY: 'auto',
                fontFamily: 'var(--font-editor)',
                fontSize: '14px',
                lineHeight: '1.8',
                whiteSpace: 'pre-wrap',
                boxShadow: 'var(--shadow-paper)'
              }}
            >
              {streamedProse || (
                <span style={{ color: '#8c8374', fontStyle: 'italic' }}>
                  {isGenerating ? 'Expanding scene beats into continuous prose...' : 'Click "Expand Beats into Prose" to generate a complete narrative draft following your structured steps.'}
                </span>
              )}
            </div>

            {/* Apply Options */}
            {streamedProse && !isGenerating && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    onApplyProse(streamedProse, 'append');
                    onClose();
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  Append to Existing Scene Draft
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Replace current manuscript text with this expanded beat draft? (A safety backup snapshot will be recorded)')) {
                      onApplyProse(streamedProse, 'replace');
                      onClose();
                    }
                  }}
                  className="btn btn-primary"
                  style={{ fontSize: '12px' }}
                >
                  <Check size={14} /> Replace Scene Draft
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
