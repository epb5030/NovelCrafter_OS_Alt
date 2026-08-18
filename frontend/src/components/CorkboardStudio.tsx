import React, { useState, useEffect } from 'react';
import { 
  RotateCw, 
  FileText, 
  User, 
  ChevronUp, 
  ChevronDown, 
  Edit3, 
  Save, 
  X,
  Layers
} from 'lucide-react';
import type { OutlineElement } from './OutlinePlanner';
import type { CodexEntry } from './CodexManager';

interface CorkboardStudioProps {
  projectId: number;
  apiBase: string;
  onOpenSceneInEditor?: (sceneId: number) => void;
}

export const CorkboardStudio: React.FC<CorkboardStudioProps> = ({
  projectId,
  apiBase,
  onOpenSceneInEditor
}) => {
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [codexCharacters, setCodexCharacters] = useState<CodexEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [flippedCardIds, setFlippedCardIds] = useState<Record<number, boolean>>({});
  const [editingNotes, setEditingNotes] = useState<Record<number, { title: string; summary: string; status: string; pov: string; targetWords: number }>>({});
  const [filterActId, setFilterActId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [outlineRes, codexRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/outline`),
        fetch(`${apiBase}/projects/${projectId}/codex`)
      ]);

      if (outlineRes.ok) {
        const data = await outlineRes.json();
        setElements(data);

        // Initialize card back edit state
        const notesMap: Record<number, { title: string; summary: string; status: string; pov: string; targetWords: number }> = {};
        data.filter((e: OutlineElement) => e.type === 'scene').forEach((scene: OutlineElement) => {
          let pov = '';
          let targetWords = 1500;
          if (scene.metadata) {
            try {
              const meta = typeof scene.metadata === 'string' ? JSON.parse(scene.metadata) : scene.metadata;
              if (meta.pov) pov = meta.pov;
              if (meta.targetWords) targetWords = meta.targetWords;
            } catch (_) {}
          }
          notesMap[scene.id] = {
            title: scene.title,
            summary: scene.summary || '',
            status: scene.status || 'todo',
            pov,
            targetWords
          };
        });
        setEditingNotes(notesMap);
      }

      if (codexRes.ok) {
        const codexData = await codexRes.json();
        setCodexCharacters(codexData.filter((c: CodexEntry) => c.category === 'character'));
      }
    } catch (err) {
      console.error('Failed to load corkboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const acts = elements.filter(e => e.type === 'act').sort((a, b) => a.position - b.position);
  const chapters = elements.filter(e => e.type === 'chapter').sort((a, b) => a.position - b.position);
  const scenes = elements.filter(e => e.type === 'scene').sort((a, b) => a.position - b.position);

  const toggleFlip = (sceneId: number) => {
    setFlippedCardIds(prev => ({ ...prev, [sceneId]: !prev[sceneId] }));
  };

  const handleUpdateSceneCard = async (sceneId: number) => {
    const cardData = editingNotes[sceneId];
    if (!cardData) return;

    const scene = scenes.find(s => s.id === sceneId);

    try {
      const metadataStr = JSON.stringify({ pov: cardData.pov, targetWords: cardData.targetWords });
      const res = await fetch(`${apiBase}/projects/${projectId}/outline/${sceneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: scene?.parent_id,
          position: scene?.position,
          title: cardData.title,
          summary: cardData.summary,
          status: cardData.status,
          metadata: metadataStr
        })
      });

      if (res.ok) {
        fetchData();
        toggleFlip(sceneId);
      }
    } catch (err) {
      console.error('Failed to update scene card:', err);
    }
  };

  const handleStatusChangeDirect = async (sceneId: number, newStatus: string) => {
    setEditingNotes(prev => ({
      ...prev,
      [sceneId]: { ...prev[sceneId], status: newStatus }
    }));

    try {
      const scene = scenes.find(s => s.id === sceneId);
      if (!scene) return;

      await fetch(`${apiBase}/projects/${projectId}/outline/${sceneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: scene.parent_id,
          position: scene.position,
          title: scene.title,
          summary: scene.summary,
          status: newStatus,
          metadata: scene.metadata
        })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleMoveScenePosition = async (sceneId: number, direction: 'up' | 'down') => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const chapterScenes = scenes.filter(s => s.parent_id === scene.parent_id);
    const idx = chapterScenes.findIndex(s => s.id === sceneId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= chapterScenes.length) return;

    const otherScene = chapterScenes[targetIdx];
    const newPositions = [
      { id: scene.id, position: otherScene.position, parent_id: scene.parent_id },
      { id: otherScene.id, position: scene.position, parent_id: otherScene.parent_id }
    ];

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/outline/positions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: newPositions })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to reorder scene cards:', err);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'done': return { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' };
      case 'review': return { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' };
      case 'drafting': return { bg: 'rgba(96, 165, 250, 0.15)', text: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)' };
      default: return { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: '1px solid rgba(156, 163, 175, 0.3)' };
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        Loading corkboard studio...
      </div>
    );
  }

  return (
    <div 
      style={{ 
        padding: '30px', 
        height: '100%', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px' 
      }}
      className="animate-fade"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
            Interactive Corkboard & Storyboard Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Visual scene index cards, POV assignments, word count goals, and manuscript reordering.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} style={{ color: 'var(--primary)' }} />
            <select
              value={filterActId}
              onChange={(e) => setFilterActId(e.target.value)}
              className="input"
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <option value="all">All Acts & Sections</option>
              {acts.map(act => (
                <option key={act.id} value={act.id}>{act.title}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
              style={{ padding: '6px 10px', fontSize: '12px' }}
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="drafting">Drafting</option>
              <option value="review">In Review</option>
              <option value="done">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Storyboard Corkboard Canvas Grid */}
      <div 
        style={{
          background: 'radial-gradient(ellipse at center, rgba(35, 25, 20, 0.4) 0%, rgba(12, 10, 15, 0.95) 100%)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '24px',
          minHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          gap: '30px'
        }}
      >
        {acts.filter(act => filterActId === 'all' || String(act.id) === filterActId).map(act => {
          const actChapters = chapters.filter(c => c.parent_id === act.id);

          return (
            <div key={act.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(200, 157, 84, 0.2)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                  {act.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  ({actChapters.length} {actChapters.length === 1 ? 'Chapter' : 'Chapters'})
                </span>
              </div>

              {actChapters.map(chap => {
                const chapScenes = scenes
                  .filter(s => s.parent_id === chap.id)
                  .filter(s => filterStatus === 'all' || (editingNotes[s.id]?.status || s.status) === filterStatus);

                return (
                  <div key={chap.id} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={14} style={{ color: 'var(--secondary)' }} />
                      <span>{chap.title}</span>
                    </div>

                    {/* Scene Index Cards Grid */}
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                        gap: '16px' 
                      }}
                    >
                      {chapScenes.map(scene => {
                        const isFlipped = flippedCardIds[scene.id] || false;
                        const cardData = editingNotes[scene.id] || { title: scene.title, summary: scene.summary || '', status: scene.status || 'todo', pov: '', targetWords: 1500 };
                        const badge = getStatusBadgeColor(cardData.status);

                        return (
                          <div 
                            key={scene.id}
                            style={{
                              perspective: '1000px',
                              height: '240px'
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                transformStyle: 'preserve-3d',
                                transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
                                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                              }}
                            >
                              {/* FRONT OF CARD */}
                              <div
                                className="glass-panel"
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  backfaceVisibility: 'hidden',
                                  padding: '16px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(200, 157, 84, 0.25)',
                                  background: 'linear-gradient(135deg, rgba(30, 24, 20, 0.9) 0%, rgba(15, 12, 18, 0.95) 100%)',
                                  boxShadow: 'var(--shadow-premium)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff', wordBreak: 'break-word' }}>
                                      {scene.title}
                                    </span>
                                    <select
                                      value={cardData.status}
                                      onChange={(e) => handleStatusChangeDirect(scene.id, e.target.value)}
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: badge.bg,
                                        color: badge.text,
                                        border: badge.border,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      <option value="todo">TO DO</option>
                                      <option value="drafting">DRAFTING</option>
                                      <option value="review">REVIEW</option>
                                      <option value="done">COMPLETED</option>
                                    </select>
                                  </div>

                                  {cardData.pov && (
                                    <div style={{ fontSize: '10px', color: 'var(--primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <User size={10} /> POV: {cardData.pov}
                                    </div>
                                  )}

                                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' }}>
                                    {scene.summary || <em style={{ color: 'var(--text-muted)' }}>No synopsis written yet. Click flip to add card notes.</em>}
                                  </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveScenePosition(scene.id, 'up')}
                                      title="Move Scene Left/Up"
                                      className="btn btn-secondary"
                                      style={{ padding: '2px 6px', fontSize: '10px' }}
                                    >
                                      <ChevronUp size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveScenePosition(scene.id, 'down')}
                                      title="Move Scene Right/Down"
                                      className="btn btn-secondary"
                                      style={{ padding: '2px 6px', fontSize: '10px' }}
                                    >
                                      <ChevronDown size={12} />
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {onOpenSceneInEditor && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenSceneInEditor(scene.id)}
                                        className="btn btn-secondary"
                                        style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                                      >
                                        <Edit3 size={11} /> Write
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleFlip(scene.id)}
                                      className="btn btn-primary"
                                      style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                                    >
                                      <RotateCw size={11} /> Flip Card
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* BACK OF CARD (EDITING MODE) */}
                              <div
                                className="glass-panel"
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  height: '100%',
                                  backfaceVisibility: 'hidden',
                                  transform: 'rotateY(180deg)',
                                  padding: '14px',
                                  borderRadius: '10px',
                                  border: '1px solid var(--primary)',
                                  background: 'rgba(15, 12, 22, 0.98)',
                                  boxShadow: 'var(--shadow-premium)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>Card Details & POV</span>
                                    <button onClick={() => toggleFlip(scene.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                      <X size={14} />
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    value={cardData.title}
                                    onChange={(e) => setEditingNotes(prev => ({
                                      ...prev,
                                      [scene.id]: { ...prev[scene.id], title: e.target.value }
                                    }))}
                                    className="input"
                                    placeholder="Scene Title"
                                    style={{ fontSize: '12px', padding: '4px 8px' }}
                                  />

                                  <textarea
                                    value={cardData.summary}
                                    onChange={(e) => setEditingNotes(prev => ({
                                      ...prev,
                                      [scene.id]: { ...prev[scene.id], summary: e.target.value }
                                    }))}
                                    className="input"
                                    rows={2}
                                    placeholder="Scene synopsis / card notes..."
                                    style={{ fontSize: '11px', padding: '4px 8px', resize: 'none' }}
                                  />

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                    <div>
                                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>POV Character:</label>
                                      <select
                                        value={cardData.pov}
                                        onChange={(e) => setEditingNotes(prev => ({
                                          ...prev,
                                          [scene.id]: { ...prev[scene.id], pov: e.target.value }
                                        }))}
                                        className="input"
                                        style={{ fontSize: '10px', padding: '2px 4px' }}
                                      >
                                        <option value="">(None / General)</option>
                                        {codexCharacters.map(char => (
                                          <option key={char.id} value={char.name}>{char.name}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Target Words:</label>
                                      <input
                                        type="number"
                                        value={cardData.targetWords}
                                        onChange={(e) => setEditingNotes(prev => ({
                                          ...prev,
                                          [scene.id]: { ...prev[scene.id], targetWords: parseInt(e.target.value) || 1500 }
                                        }))}
                                        className="input"
                                        style={{ fontSize: '10px', padding: '2px 4px' }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSceneCard(scene.id)}
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '11px', gap: '4px' }}
                                  >
                                    <Save size={11} /> Save Card
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
