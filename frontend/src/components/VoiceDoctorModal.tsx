import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  X, 
  Sparkles, 
  User, 
  Sliders, 
  RefreshCw, 
  Check, 
  MessageSquare, 
  Save
} from 'lucide-react';

interface CharacterVoiceReport {
  character: {
    id: number;
    name: string;
    description?: string;
    voice_traits?: string;
    catchphrases?: string;
    formality_level?: number;
    pace_cadence?: string;
  };
  totalLines: number;
  totalWords: number;
  avgWordsPerLine: number;
  contractionCount: number;
  contractionPct: number;
  formalityScore: number;
  uniqueWords: string[];
  quotes: Array<{
    sceneId: number;
    sceneTitle: string;
    quote: string;
    contextSnippet: string;
  }>;
}

interface VoiceDoctorModalProps {
  projectId: number;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceDoctorModal: React.FC<VoiceDoctorModalProps> = ({
  projectId,
  apiBase,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'personas' | 'tuner'>('matrix');
  const [loading, setLoading] = useState<boolean>(true);
  const [characterReports, setCharacterReports] = useState<CharacterVoiceReport[]>([]);
  const [globalDistinctiveness, setGlobalDistinctiveness] = useState<number>(75);

  // Selected Character for Voice Persona Editor
  const [selectedCharId, setSelectedCharId] = useState<number | null>(null);
  const [editTraits, setEditTraits] = useState<string>('');
  const [editCatchphrases, setEditCatchphrases] = useState<string>('');
  const [editFormality, setEditFormality] = useState<number>(3);
  const [editCadence, setEditCadence] = useState<string>('balanced');
  const [saveStatus, setSaveStatus] = useState<string>('');

  // AI Dialogue Tuner Form States
  const [tunerCharId, setTunerCharId] = useState<number | null>(null);
  const [tunerLine, setTunerLine] = useState<string>('');
  const [tunerContext, setTunerContext] = useState<string>('');
  const [tunerGuidance, setTunerGuidance] = useState<string>('');
  const [tunedResult, setTunedResult] = useState<string>('');
  const [isTuning, setIsTuning] = useState<boolean>(false);

  // Fetch Dialogue Analysis
  const fetchAnalysis = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/dialogue/analysis`);
      if (!res.ok) throw new Error('Failed to fetch dialogue analysis');
      const data = await res.json();
      setCharacterReports(data.characters || []);
      setGlobalDistinctiveness(data.globalDistinctiveness || 75);

      if (data.characters && data.characters.length > 0 && selectedCharId === null) {
        const first = data.characters[0];
        setSelectedCharId(first.character.id);
        setEditTraits(first.character.voice_traits || '');
        setEditCatchphrases(first.character.catchphrases || '');
        setEditFormality(first.character.formality_level || 3);
        setEditCadence(first.character.pace_cadence || 'balanced');
        setTunerCharId(first.character.id);
      }
    } catch (err) {
      console.error('Error loading voice analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [isOpen, projectId]);

  // Handle Character selection in Persona Editor
  const handleSelectCharForEdit = (rep: CharacterVoiceReport) => {
    setSelectedCharId(rep.character.id);
    setEditTraits(rep.character.voice_traits || '');
    setEditCatchphrases(rep.character.catchphrases || '');
    setEditFormality(rep.character.formality_level || 3);
    setEditCadence(rep.character.pace_cadence || 'balanced');
    setSaveStatus('');
  };

  // Save Persona to Codex
  const handleSavePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharId) return;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex/${selectedCharId}/voice`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceTraits: editTraits,
          catchphrases: editCatchphrases,
          formalityLevel: editFormality,
          paceCadence: editCadence
        })
      });

      if (res.ok) {
        setSaveStatus('Voice Persona Saved to Codex!');
        setTimeout(() => setSaveStatus(''), 3000);
        await fetchAnalysis();
      }
    } catch (err) {
      console.error('Error saving voice persona:', err);
    }
  };

  // Run AI Dialogue Voice Tuner
  const handleRunVoiceTuner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tunerCharId || !tunerLine.trim()) return;
    setIsTuning(true);
    setTunedResult('');

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/dialogue/tune-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: tunerCharId,
          line: tunerLine.trim(),
          context: tunerContext.trim(),
          customGuidance: tunerGuidance.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTunedResult(data.tunedText || 'Tuning complete.');
      } else {
        const errData = await res.json();
        setTunedResult(`Error: ${errData.error || 'Failed to tune dialogue'}`);
      }
    } catch (err: any) {
      setTunedResult(`Error: ${err.message}`);
    } finally {
      setIsTuning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div 
        className="modal-content animate-scale" 
        style={{ 
          maxWidth: '920px', 
          maxHeight: '92vh', 
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
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(200, 157, 84, 0.15)', border: '1px solid rgba(200, 157, 84, 0.3)' }}>
              <Mic size={20} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                AI Character Voice Tuner & Dialogue Doctor
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Analyze speech patterns, prevent voice homogenization, and tune character dialogue.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Global Distinctiveness Health Gauge */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: 'rgba(0,0,0,0.3)', 
                padding: '6px 12px', 
                borderRadius: '20px', 
                border: '1px solid var(--border-light)' 
              }}
              title="Calculated vocabulary diversity and cadence variance across all speakers"
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Voice Distinctiveness:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: globalDistinctiveness >= 70 ? 'var(--status-done)' : '#fbbf24' }}>
                {globalDistinctiveness}%
              </span>
            </div>

            <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', gap: '6px', padding: '6px 14px' }}
          >
            <Sliders size={14} /> Voice Distinctiveness Matrix
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personas')}
            className={`btn ${activeTab === 'personas' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', gap: '6px', padding: '6px 14px' }}
          >
            <User size={14} /> Character Speech Personas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tuner')}
            className={`btn ${activeTab === 'tuner' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', gap: '6px', padding: '6px 14px' }}
          >
            <Sparkles size={14} style={{ color: '#fbbf24' }} /> AI Dialogue Voice Tuner
          </button>
        </div>

        {/* TAB 1: VOICE DISTINCTIVENESS MATRIX */}
        {activeTab === 'matrix' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 8px auto' }} />
                <span>Extracting dialogue quotes and analyzing character vocal signatures...</span>
              </div>
            ) : characterReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <MessageSquare size={32} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                <h4 style={{ color: '#ffffff', marginBottom: '4px' }}>No Spoken Dialogue Extracted Yet</h4>
                <p style={{ fontSize: '12px', maxWidth: '400px', margin: '0 auto' }}>
                  Write scene prose with quoted dialogue (e.g. <code>"Hello," Jan said.</code>) to analyze vocal distinctiveness.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {characterReports.map(rep => (
                  <div 
                    key={rep.character.id}
                    className="glass-panel"
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--primary)',
                      background: 'rgba(0,0,0,0.25)'
                    }}
                  >
                    {/* Character Title Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                          {rep.character.name}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {rep.totalLines} lines • {rep.totalWords} words spoken
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          handleSelectCharForEdit(rep);
                          setActiveTab('personas');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '10px' }}
                      >
                        Edit Persona
                      </button>
                    </div>

                    {/* Vocal Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                      
                      {/* Contractions */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Contraction Ratio</div>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>
                          {rep.contractionPct}% ({rep.contractionCount} uses)
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, rep.contractionPct * 3)}%`, height: '100%', background: '#38bdf8' }} />
                        </div>
                      </div>

                      {/* Average Sentence Length */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Avg Line Length</div>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>
                          {rep.avgWordsPerLine} words / line
                        </div>
                        <span style={{ fontSize: '10px', color: rep.avgWordsPerLine > 18 ? '#f59e0b' : '#34d399' }}>
                          {rep.avgWordsPerLine > 20 ? 'Rambling / Eloquent' : rep.avgWordsPerLine < 8 ? 'Clipped / Punchy' : 'Balanced'}
                        </span>
                      </div>
                    </div>

                    {/* Explicit Voice Traits from Codex */}
                    {rep.character.voice_traits && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(200, 157, 84, 0.08)', padding: '8px 10px', borderRadius: '4px', border: '1px solid rgba(200, 157, 84, 0.2)' }}>
                        <strong style={{ color: 'var(--primary)' }}>Voice Persona:</strong> {rep.character.voice_traits}
                      </div>
                    )}

                    {/* Signature Unique Vocabulary */}
                    {rep.uniqueWords.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Signature Vocabulary (Unique to this speaker):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {rep.uniqueWords.map(word => (
                            <span 
                              key={word}
                              style={{ 
                                fontSize: '10px', 
                                padding: '1px 6px', 
                                borderRadius: '3px', 
                                background: 'rgba(167, 139, 250, 0.15)', 
                                color: '#a78bfa',
                                border: '1px solid rgba(167, 139, 250, 0.3)'
                              }}
                            >
                              {word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sample Extracted Quote */}
                    {rep.quotes.length > 0 && (
                      <div style={{ fontSize: '11px', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Sample line ({rep.quotes[0].sceneTitle}):</span>
                        <div style={{ fontStyle: 'italic', color: '#ffffff', marginTop: '2px' }}>
                          "{rep.quotes[0].quote}"
                        </div>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHARACTER SPEECH PERSONAS (CODEX EDITOR) */}
        {activeTab === 'personas' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: '20px', paddingRight: '4px' }}>
            
            {/* Left Character Selector */}
            <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '6px', borderRight: '1px solid var(--border-light)', paddingRight: '12px' }}>
              <span className="label">Select Character:</span>
              {characterReports.map(rep => (
                <button
                  key={rep.character.id}
                  type="button"
                  onClick={() => handleSelectCharForEdit(rep)}
                  className="btn"
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    justifyContent: 'flex-start',
                    background: selectedCharId === rep.character.id ? 'rgba(200, 157, 84, 0.2)' : 'rgba(0,0,0,0.2)',
                    borderColor: selectedCharId === rep.character.id ? 'var(--primary)' : 'var(--border-light)',
                    color: selectedCharId === rep.character.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <User size={13} style={{ color: selectedCharId === rep.character.id ? 'var(--primary)' : 'var(--text-muted)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rep.character.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Right Persona Form */}
            <form onSubmit={handleSavePersona} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div>
                <label className="label">Explicit Voice Traits & Speech Habits</label>
                <textarea
                  value={editTraits}
                  onChange={(e) => setEditTraits(e.target.value)}
                  placeholder="e.g. Uses dry sarcasm, avoids contractions, speaks in short clipped military sentences, frequently uses nautical idioms..."
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="label">Catchphrases / Recurring Idioms</label>
                <input
                  type="text"
                  value={editCatchphrases}
                  onChange={(e) => setEditCatchphrases(e.target.value)}
                  placeholder="e.g. 'By the iron crown', 'mark my words', 'as the tide turns'"
                  className="input"
                />
              </div>

              {/* Formality Level Slider */}
              <div>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Formality & Register</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                    {editFormality === 1 ? '1 - Street Slang / Colloquial' :
                     editFormality === 2 ? '2 - Casual / Familiar' :
                     editFormality === 3 ? '3 - Neutral / Balanced' :
                     editFormality === 4 ? '4 - Refined / Formal' : '5 - Archaic / Ultra-Formal'}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={editFormality}
                  onChange={(e) => setEditFormality(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Cadence */}
              <div>
                <label className="label">Speech Pace & Cadence</label>
                <select
                  value={editCadence}
                  onChange={(e) => setEditCadence(e.target.value)}
                  className="input"
                >
                  <option value="punchy">Punchy & Staccato (Rapid, brief sentences)</option>
                  <option value="balanced">Balanced Narrative</option>
                  <option value="eloquent">Eloquent & Lyrical (Flowing, multi-clause sentences)</option>
                  <option value="rambling">Nervous & Rambling (Parenthetical thoughts, self-interruptions)</option>
                  <option value="cryptic">Cryptic & Whispered (Minimalist, riddles, pauses)</option>
                </select>
              </div>

              {saveStatus && (
                <div style={{ color: 'var(--status-done)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={14} /> {saveStatus}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  <Save size={14} /> Save Speech Persona to Codex
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: AI DIALOGUE VOICE TUNER */}
        {activeTab === 'tuner' && (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
            
            <form onSubmit={handleRunVoiceTuner} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                {/* Speaker Selector */}
                <div>
                  <label className="label">Target Character Voice</label>
                  <select
                    value={tunerCharId || ''}
                    onChange={(e) => setTunerCharId(parseInt(e.target.value, 10))}
                    className="input"
                    required
                  >
                    {characterReports.map(rep => (
                      <option key={rep.character.id} value={rep.character.id}>
                        {rep.character.name} {rep.character.voice_traits ? `(${rep.character.voice_traits.slice(0, 30)}...)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Specific Direction */}
                <div>
                  <label className="label">Emotional / Tuning Note (Optional)</label>
                  <input
                    type="text"
                    value={tunerGuidance}
                    onChange={(e) => setTunerGuidance(e.target.value)}
                    placeholder="e.g. Make him sound menacing, emphasize suspicion..."
                    className="input"
                  />
                </div>
              </div>

              {/* Original Line */}
              <div>
                <label className="label">Original Dialogue Line to Rewrite</label>
                <textarea
                  value={tunerLine}
                  onChange={(e) => setTunerLine(e.target.value)}
                  placeholder="e.g. I do not think we should proceed into the forest tonight because the guards are watching."
                  className="input"
                  rows={2}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isTuning}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '13px', gap: '6px' }}
                >
                  {isTuning ? (
                    <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {isTuning ? 'Tuning Character Voice...' : 'Tune with AI Voice'}
                </button>
              </div>
            </form>

            {/* Tuned Result Display */}
            {tunedResult && (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-light)', 
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <span className="label" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} /> AI Voice Tuning Output
                </span>
                
                <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {tunedResult}
                </div>
              </div>
            )}

            {/* Quick-Pick Extracted Quotes from Current Manuscript */}
            {characterReports.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <span className="label" style={{ marginBottom: '8px', display: 'block' }}>
                  Or click an extracted quote from your manuscript to populate:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                  {characterReports.flatMap(r => r.quotes.map(q => ({ ...q, charName: r.character.name, charId: r.character.id }))).slice(0, 8).map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setTunerLine(q.quote);
                        setTunerCharId(q.charId);
                        setTunerContext(q.contextSnippet);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      title="Click to load into Voice Tuner"
                    >
                      <span style={{ fontStyle: 'italic', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                        "{q.quote}"
                      </span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>
                        {q.charName} ({q.sceneTitle})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

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
