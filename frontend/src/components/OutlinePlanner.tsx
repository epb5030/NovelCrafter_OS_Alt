import React, { useState, useEffect } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, Settings, Layers } from 'lucide-react';
import type { CodexEntry } from './CodexManager';

export interface OutlineElement {
  id: number;
  project_id: number;
  parent_id: number | null;
  type: 'act' | 'chapter' | 'scene';
  title: string;
  position: number;
  summary: string;
  status: 'todo' | 'drafting' | 'review' | 'done';
  metadata: string; // JSON array of codex entry IDs
}

interface OutlinePlannerProps {
  projectId: number;
  apiBase: string;
}

export const OutlinePlanner: React.FC<OutlinePlannerProps> = ({ projectId, apiBase }) => {
  const [elements, setElements] = useState<OutlineElement[]>([]);
  const [codex, setCodex] = useState<CodexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspector / Modal edit states
  const [selectedElement, setSelectedElement] = useState<OutlineElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editStatus, setEditStatus] = useState<'todo' | 'drafting' | 'review' | 'done'>('todo');
  const [editAttachedCodex, setEditAttachedCodex] = useState<number[]>([]);

  // Add Element states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<'act' | 'chapter' | 'scene'>('act');
  const [createTitle, setCreateTitle] = useState('');
  const [createParentId, setCreateParentId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [outRes, codexRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/outline`),
        fetch(`${apiBase}/projects/${projectId}/codex`)
      ]);
      if (!outRes.ok || !codexRes.ok) throw new Error('Failed to fetch data');
      
      const outData = await outRes.json();
      const codexData = await codexRes.json();
      
      setElements(outData);
      setCodex(codexData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleOpenEdit = (elem: OutlineElement) => {
    setSelectedElement(elem);
    setEditTitle(elem.title);
    setEditSummary(elem.summary || '');
    setEditStatus(elem.status);
    
    let parsedMetadata: number[] = [];
    try {
      parsedMetadata = JSON.parse(elem.metadata || '[]');
    } catch (_) {}
    setEditAttachedCodex(parsedMetadata);
    setIsModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedElement) return;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/outline/${selectedElement.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: selectedElement.parent_id,
          title: editTitle,
          position: selectedElement.position,
          summary: editSummary,
          status: editStatus,
          metadata: JSON.stringify(editAttachedCodex)
        })
      });
      if (!res.ok) throw new Error('Failed to update element');
      
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateElement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    // Determine position as max + 1
    const siblingElements = elements.filter(
      el => el.type === createType && el.parent_id === createParentId
    );
    const maxPosition = siblingElements.reduce((max, el) => Math.max(max, el.position), 0);

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/outline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: createType,
          title: createTitle,
          parent_id: createParentId,
          position: maxPosition + 1,
          summary: '',
          status: 'todo'
        })
      });
      if (!res.ok) throw new Error('Failed to create element');
      
      await fetchData();
      setIsCreateOpen(false);
      setCreateTitle('');
      setCreateParentId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteElement = async (id: number) => {
    if (!confirm('Are you sure you want to delete this element? Deleting an Act or Chapter will delete all nested scenes under it!')) return;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/outline/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete element');
      
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const list = [...elements].sort((a, b) => a.position - b.position);
    const current = list[index];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const target = list[targetIndex];

    if (!target || current.type !== target.type || current.parent_id !== target.parent_id) return;

    // Swap positions
    try {
      await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/outline/${current.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_id: current.parent_id,
            title: current.title,
            position: target.position,
            summary: current.summary,
            status: current.status,
            metadata: current.metadata
          })
        }),
        fetch(`${apiBase}/projects/${projectId}/outline/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_id: target.parent_id,
            title: target.title,
            position: current.position,
            summary: target.summary,
            status: target.status,
            metadata: target.metadata
          })
        })
      ]);
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleCodexAttachment = (codexId: number) => {
    setEditAttachedCodex(prev => 
      prev.includes(codexId) 
        ? prev.filter(id => id !== codexId) 
        : [...prev, codexId]
    );
  };

  // Group elements hierarchically: Acts -> Chapters -> Scenes
  const acts = elements.filter(el => el.type === 'act').sort((a, b) => a.position - b.position);
  
  const getChaptersForAct = (actId: number) => 
    elements.filter(el => el.type === 'chapter' && el.parent_id === actId).sort((a, b) => a.position - b.position);
  
  const getScenesForChapter = (chapterId: number) => 
    elements.filter(el => el.type === 'scene' && el.parent_id === chapterId).sort((a, b) => a.position - b.position);

  // Orphans: items with no valid parents
  const orphanChapters = elements.filter(el => el.type === 'chapter' && !el.parent_id).sort((a, b) => a.position - b.position);
  const orphanScenes = elements.filter(el => el.type === 'scene' && !el.parent_id).sort((a, b) => a.position - b.position);

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
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Story Outline</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Plan acts, organize scenes, summarize drafts, and associate characters or locations.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setCreateType('act');
              setCreateParentId(null);
              setIsCreateOpen(true);
            }}
          >
            <Layers size={14} /> Add Act
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setCreateType('scene');
              setCreateParentId(null); // Orphan scene by default
              setIsCreateOpen(true);
            }}
          >
            <Plus size={14} /> Add Scene
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Loading outline planner...
        </div>
      ) : elements.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '80px 40px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)', 
            border: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <Layers size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ color: '#ffffff', fontSize: '20px', fontFamily: 'var(--font-display)' }}>Outline is empty</h3>
          <p style={{ maxWidth: '400px', fontSize: '14px' }}>
            Build your structure! Start by creating an Act, then add Chapters, and finally write Scenes.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setCreateType('act');
              setCreateParentId(null);
              setIsCreateOpen(true);
            }}
          >
            Create Your First Act
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* 1. Render Hierarchy: Acts -> Chapters -> Scenes */}
          {acts.map((act, actIdx) => (
            <div key={act.id} className="glass-panel" style={{ padding: '24px', border: '1px solid var(--border-light)' }}>
              {/* Act Header */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderBottom: '1px solid var(--border-light)',
                  paddingBottom: '12px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: 'var(--secondary)' }}>
                    Act {actIdx + 1}
                  </span>
                  <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>{act.title}</h2>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => handleMove(elements.indexOf(act), 'up')}
                    disabled={actIdx === 0}
                    className="btn btn-secondary"
                    style={{ padding: '6px' }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    onClick={() => handleMove(elements.indexOf(act), 'down')}
                    disabled={actIdx === acts.length - 1}
                    className="btn btn-secondary"
                    style={{ padding: '6px' }}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button 
                    onClick={() => {
                      setCreateType('chapter');
                      setCreateParentId(act.id);
                      setIsCreateOpen(true);
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    + Add Chapter
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(act)}
                    className="btn btn-secondary"
                    style={{ padding: '6px' }}
                  >
                    <Settings size={14} />
                  </button>
                </div>
              </div>

              {act.summary && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px', fontStyle: 'italic' }}>
                  {act.summary}
                </p>
              )}

              {/* Chapters under Act */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {getChaptersForAct(act.id).map((chap, chapIdx, chapArr) => (
                  <div 
                    key={chap.id} 
                    style={{ 
                      padding: '16px 20px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255,255,255,0.04)' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ fontSize: '16px', color: '#ffffff' }}>Chapter: {chap.title}</h3>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleMove(elements.indexOf(chap), 'up')}
                          disabled={chapIdx === 0}
                          className="btn btn-secondary"
                          style={{ padding: '4px' }}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button 
                          onClick={() => handleMove(elements.indexOf(chap), 'down')}
                          disabled={chapIdx === chapArr.length - 1}
                          className="btn btn-secondary"
                          style={{ padding: '4px' }}
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button 
                          onClick={() => {
                            setCreateType('scene');
                            setCreateParentId(chap.id);
                            setIsCreateOpen(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          + Scene
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(chap)}
                          className="btn btn-secondary"
                          style={{ padding: '4px' }}
                        >
                          <Settings size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Scenes under Chapter */}
                    <div 
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                        gap: '12px',
                        marginTop: '8px' 
                      }}
                    >
                      {getScenesForChapter(chap.id).map((scene, sceneIdx, sceneArr) => {
                        let sceneCodexIds: number[] = [];
                        try { sceneCodexIds = JSON.parse(scene.metadata || '[]'); } catch (_) {}
                        
                        return (
                          <div
                            key={scene.id}
                            onClick={() => handleOpenEdit(scene)}
                            className="glass-panel"
                            style={{
                              padding: '16px',
                              cursor: 'pointer',
                              border: '1px solid rgba(255,255,255,0.06)',
                              background: 'var(--bg-card)',
                              transition: 'var(--transition-smooth)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              height: '150px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.4)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span className={`badge badge-${scene.status}`}>{scene.status}</span>
                                <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleMove(elements.indexOf(scene), 'up')}
                                    disabled={sceneIdx === 0}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleMove(elements.indexOf(scene), 'down')}
                                    disabled={sceneIdx === sceneArr.length - 1}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                </div>
                              </div>

                              <h4 style={{ color: '#ffffff', fontSize: '14px', marginBottom: '4px' }}>{scene.title}</h4>
                              <p 
                                style={{ 
                                  color: 'var(--text-secondary)', 
                                  fontSize: '12px', 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  lineHeight: '1.4'
                                }}
                              >
                                {scene.summary || 'No summary written.'}
                              </p>
                            </div>

                            {/* Codex entities tags in scene */}
                            <div style={{ display: 'flex', gap: '4px', overflow: 'hidden', marginTop: '6px' }}>
                              {sceneCodexIds.slice(0, 3).map(id => {
                                const entry = codex.find(c => c.id === id);
                                if (!entry) return null;
                                return (
                                  <span 
                                    key={id}
                                    style={{ 
                                      fontSize: '9px', 
                                      backgroundColor: 'rgba(167, 139, 250, 0.12)', 
                                      color: 'var(--secondary)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(167, 139, 250, 0.2)',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {entry.name}
                                  </span>
                                );
                              })}
                              {sceneCodexIds.length > 3 && (
                                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>+{sceneCodexIds.length - 3}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 2. Render Orphans (Unassociated Chapters or Scenes) */}
          {(orphanChapters.length > 0 || orphanScenes.length > 0) && (
            <div className="glass-panel" style={{ padding: '20px', border: '1px dashed var(--border-light)' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Unassigned Elements</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {orphanScenes.map(scene => (
                  <div 
                    key={scene.id} 
                    onClick={() => handleOpenEdit(scene)}
                    className="glass-panel"
                    style={{ padding: '16px', background: 'var(--bg-card)', cursor: 'pointer', height: '120px' }}
                  >
                    <span className={`badge badge-${scene.status}`}>{scene.status}</span>
                    <h4 style={{ color: '#ffffff', fontSize: '14px', marginTop: '6px' }}>{scene.title}</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scene.summary || 'Click to edit summary...'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Edit Element Modal */}
      {isModalOpen && selectedElement && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#ffffff' }}>
                Edit {selectedElement.type.toUpperCase()}: {selectedElement.title}
              </h2>
              <button 
                type="button" 
                onClick={() => handleDeleteElement(selectedElement.id)}
                className="btn btn-danger"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Trash2 size={14} /> Delete Element
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Title</label>
                <input 
                  type="text" 
                  value={editTitle} 
                  onChange={(e) => setEditTitle(e.target.value)} 
                  className="input" 
                  required 
                />
              </div>

              {selectedElement.type === 'scene' && (
                <div>
                  <label className="label">Writing Status</label>
                  <select 
                    value={editStatus} 
                    onChange={(e) => setEditStatus(e.target.value as any)} 
                    className="input"
                  >
                    <option value="todo">To-Do (Not Started)</option>
                    <option value="drafting">Drafting (In Progress)</option>
                    <option value="review">Under Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              )}

              <div>
                <label className="label">Summary / Plot Outline</label>
                <textarea 
                  value={editSummary} 
                  onChange={(e) => setEditSummary(e.target.value)} 
                  className="input" 
                  rows={4}
                  placeholder={`Provide a summary for this ${selectedElement.type}. The AI references this summary directly when you write/chat inside the scene.`}
                />
              </div>

              {selectedElement.type === 'scene' && (
                <div>
                  <label className="label">Attached Codex Lore (Active Characters/Settings)</label>
                  <div 
                    style={{ 
                      maxHeight: '150px', 
                      overflowY: 'auto', 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px', 
                      border: '1px solid var(--border-light)', 
                      borderRadius: '8px',
                      padding: '12px',
                      background: 'rgba(0,0,0,0.2)'
                    }}
                  >
                    {codex.length === 0 ? (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px', gridColumn: 'span 2' }}>
                        No Codex entries created yet. Add entries in the Codex tab first.
                      </span>
                    ) : (
                      codex.map(item => {
                        const isAttached = editAttachedCodex.includes(item.id);
                        return (
                          <label 
                            key={item.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              cursor: 'pointer',
                              fontSize: '13px',
                              padding: '6px',
                              borderRadius: '4px',
                              background: isAttached ? 'rgba(129, 140, 248, 0.08)' : 'transparent',
                              border: isAttached ? '1px solid rgba(129, 140, 248, 0.2)' : '1px solid transparent',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isAttached} 
                              onChange={() => toggleCodexAttachment(item.id)} 
                            />
                            <span style={{ color: isAttached ? '#ffffff' : 'var(--text-secondary)' }}>
                              {item.name} <small style={{ color: 'var(--text-muted)' }}>({item.category})</small>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Element Modal */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '20px', color: '#ffffff' }}>
              Create New {createType.toUpperCase()}
            </h2>
            <form onSubmit={handleCreateElement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label className="label">Structure Level</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['act', 'chapter', 'scene'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCreateType(t as any)}
                      className="btn"
                      style={{
                        flex: 1,
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        background: createType === t ? 'rgba(129, 140, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        borderColor: createType === t ? 'var(--primary)' : 'var(--border-light)',
                        color: createType === t ? '#ffffff' : 'var(--text-secondary)',
                        borderWidth: '1px',
                        borderStyle: 'solid'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Parent Section</label>
                <select 
                  className="input"
                  value={createParentId || ''}
                  onChange={(e) => setCreateParentId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">No Parent (Orphan / Root Act)</option>
                  {createType === 'chapter' && 
                    elements.filter(e => e.type === 'act').map(act => (
                      <option key={act.id} value={act.id}>Inside Act: {act.title}</option>
                    ))
                  }
                  {createType === 'scene' && 
                    elements.filter(e => e.type === 'chapter').map(chap => {
                      const parentAct = elements.find(a => a.id === chap.parent_id);
                      return (
                        <option key={chap.id} value={chap.id}>
                          Inside Chapter: {chap.title} {parentAct ? `(Act: ${parentAct.title})` : ''}
                        </option>
                      );
                    })
                  }
                </select>
              </div>

              <div>
                <label className="label">Title</label>
                <input 
                  type="text" 
                  value={createTitle} 
                  onChange={(e) => setCreateTitle(e.target.value)} 
                  className="input" 
                  placeholder={`e.g. ${createType === 'act' ? 'Act I: The Awakening' : createType === 'chapter' ? 'Chapter 1' : 'Scene: Meeting in the Tavern'}`}
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
