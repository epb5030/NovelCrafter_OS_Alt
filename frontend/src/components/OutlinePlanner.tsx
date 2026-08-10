import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Settings, 
  Layers, 
  GripVertical, 
  Folder, 
  BarChart2
} from 'lucide-react';
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
  const [sceneWordCounts, setSceneWordCounts] = useState<Record<number, number>>({});
  const [totalManuscriptWords, setTotalManuscriptWords] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Drag and drop states
  const [draggedElement, setDraggedElement] = useState<OutlineElement | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<number | null>(null);

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
      const [outRes, codexRes, statsRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/outline`),
        fetch(`${apiBase}/projects/${projectId}/codex`),
        fetch(`${apiBase}/projects/${projectId}/outline-stats`)
      ]);
      
      if (outRes.ok && codexRes.ok) {
        const outData = await outRes.json();
        const codexData = await codexRes.json();
        setElements(outData);
        setCodex(codexData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSceneWordCounts(statsData.sceneWordCounts || {});
        setTotalManuscriptWords(statsData.totalWords || 0);
      }
    } catch (err) {
      console.error('Failed to load outline planner data:', err);
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

    try {
      await fetch(`${apiBase}/projects/${projectId}/outline/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: current.id, parent_id: current.parent_id, position: target.position },
            { id: target.id, parent_id: target.parent_id, position: current.position }
          ]
        })
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, item: OutlineElement) => {
    setDraggedElement(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetItem: OutlineElement) => {
    e.preventDefault();
    if (draggedElement && draggedElement.id !== targetItem.id) {
      setDragOverTargetId(targetItem.id);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetItem: OutlineElement) => {
    e.preventDefault();
    setDragOverTargetId(null);
    if (!draggedElement || draggedElement.id === targetItem.id) return;

    const source = draggedElement;
    let updatedItems: Array<{ id: number; parent_id: number | null; position: number }> = [];

    // Case A: Dropping Scene onto another Scene
    if (source.type === 'scene' && targetItem.type === 'scene') {
      const targetParentId = targetItem.parent_id;
      const siblingScenes = elements
        .filter(el => el.type === 'scene' && el.parent_id === targetParentId && el.id !== source.id)
        .sort((a, b) => a.position - b.position);

      const targetIdx = siblingScenes.findIndex(el => el.id === targetItem.id);
      siblingScenes.splice(targetIdx + 1, 0, { ...source, parent_id: targetParentId });

      updatedItems = siblingScenes.map((el, idx) => ({
        id: el.id,
        parent_id: targetParentId,
        position: idx + 1
      }));
    }
    // Case B: Dropping Scene onto Chapter
    else if (source.type === 'scene' && targetItem.type === 'chapter') {
      const siblingScenes = elements
        .filter(el => el.type === 'scene' && el.parent_id === targetItem.id && el.id !== source.id)
        .sort((a, b) => a.position - b.position);

      siblingScenes.push({ ...source, parent_id: targetItem.id });
      updatedItems = siblingScenes.map((el, idx) => ({
        id: el.id,
        parent_id: targetItem.id,
        position: idx + 1
      }));
    }
    // Case C: Dropping Chapter onto Chapter
    else if (source.type === 'chapter' && targetItem.type === 'chapter') {
      const targetParentId = targetItem.parent_id;
      const siblingChapters = elements
        .filter(el => el.type === 'chapter' && el.parent_id === targetParentId && el.id !== source.id)
        .sort((a, b) => a.position - b.position);

      const targetIdx = siblingChapters.findIndex(el => el.id === targetItem.id);
      siblingChapters.splice(targetIdx + 1, 0, { ...source, parent_id: targetParentId });

      updatedItems = siblingChapters.map((el, idx) => ({
        id: el.id,
        parent_id: targetParentId,
        position: idx + 1
      }));
    }
    // Case D: Dropping Act onto Act
    else if (source.type === 'act' && targetItem.type === 'act') {
      const actsList = elements
        .filter(el => el.type === 'act' && el.id !== source.id)
        .sort((a, b) => a.position - b.position);

      const targetIdx = actsList.findIndex(el => el.id === targetItem.id);
      actsList.splice(targetIdx + 1, 0, source);

      updatedItems = actsList.map((el, idx) => ({
        id: el.id,
        parent_id: null,
        position: idx + 1
      }));
    }

    if (updatedItems.length > 0) {
      try {
        await fetch(`${apiBase}/projects/${projectId}/outline/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: updatedItems })
        });
        await fetchData();
      } catch (err: any) {
        alert('Failed to reorder outline: ' + err.message);
      }
    }

    setDraggedElement(null);
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

  const getChapterWordCount = (chapterId: number) => {
    const scenes = getScenesForChapter(chapterId);
    return scenes.reduce((sum, sc) => sum + (sceneWordCounts[sc.id] || 0), 0);
  };

  const getActWordCount = (actId: number) => {
    const chapters = getChaptersForAct(actId);
    return chapters.reduce((sum, ch) => sum + getChapterWordCount(ch.id), 0);
  };

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
      {/* Header & Manuscript Progress Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Story Outline & Hierarchy</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Drag and drop to sequence acts, reorder chapters, track word count goals, and link Codex lore.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '8px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              border: '1px solid rgba(129, 140, 248, 0.3)',
              borderRadius: '8px'
            }}
          >
            <BarChart2 size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Manuscript
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                {totalManuscriptWords.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-secondary)' }}>words</span>
              </div>
            </div>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={() => {
              setCreateType('act');
              setCreateParentId(null);
              setIsCreateOpen(true);
            }}
          >
            <Layers size={14} /> + Act
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setCreateType('scene');
              setCreateParentId(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus size={14} /> + Scene
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
            Build your story structure! Start by creating an Act, then add Chapters, and finally write Scenes.
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
          {acts.map((act, actIdx) => {
            const actWords = getActWordCount(act.id);
            const isDragOver = dragOverTargetId === act.id;

            return (
              <div 
                key={act.id} 
                className="glass-panel"
                draggable={true}
                onDragStart={(e) => handleDragStart(e, act)}
                onDragOver={(e) => handleDragOver(e, act)}
                onDrop={(e) => handleDrop(e, act)}
                style={{ 
                  padding: '24px', 
                  border: isDragOver ? '2px dashed var(--primary)' : '1px solid var(--border-light)',
                  borderRadius: '10px',
                  transition: 'var(--transition-smooth)'
                }}
              >
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
                    <div style={{ cursor: 'grab', color: 'var(--text-muted)' }} title="Drag to reorder act">
                      <GripVertical size={16} />
                    </div>
                    <span className="badge" style={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: 'var(--secondary)' }}>
                      Act {actIdx + 1}
                    </span>
                    <h2 style={{ fontSize: '20px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>{act.title}</h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ({actWords.toLocaleString()} words)
                    </span>
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
                  {getChaptersForAct(act.id).map((chap, chapIdx, chapArr) => {
                    const chapWords = getChapterWordCount(chap.id);
                    const isChapDragOver = dragOverTargetId === chap.id;

                    return (
                      <div 
                        key={chap.id} 
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, chap)}
                        onDragOver={(e) => handleDragOver(e, chap)}
                        onDrop={(e) => handleDrop(e, chap)}
                        style={{ 
                          padding: '16px 20px', 
                          background: 'rgba(255,255,255,0.02)', 
                          borderRadius: '8px', 
                          border: isChapDragOver ? '2px dashed var(--secondary)' : '1px solid rgba(255,255,255,0.04)',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ cursor: 'grab', color: 'var(--text-muted)' }} title="Drag chapter">
                              <GripVertical size={14} />
                            </div>
                            <Folder size={15} style={{ color: 'var(--secondary)' }} />
                            <h3 style={{ fontSize: '16px', color: '#ffffff' }}>{chap.title}</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ({chapWords.toLocaleString()} words)
                            </span>
                          </div>

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
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                            gap: '12px',
                            marginTop: '8px' 
                          }}
                        >
                          {getScenesForChapter(chap.id).map((scene) => {
                            let sceneCodexIds: number[] = [];
                            try { sceneCodexIds = JSON.parse(scene.metadata || '[]'); } catch (_) {}
                            const words = sceneWordCounts[scene.id] || 0;
                            const isSceneDragOver = dragOverTargetId === scene.id;
                            
                            return (
                              <div
                                key={scene.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, scene)}
                                onDragOver={(e) => handleDragOver(e, scene)}
                                onDrop={(e) => handleDrop(e, scene)}
                                onClick={() => handleOpenEdit(scene)}
                                className="glass-panel hover-card"
                                style={{
                                  padding: '14px',
                                  cursor: 'grab',
                                  border: isSceneDragOver ? '2px dashed var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                                  background: 'var(--bg-card)',
                                  borderRadius: '8px',
                                  transition: 'var(--transition-smooth)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  minHeight: '140px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                      <GripVertical size={13} style={{ color: 'var(--text-muted)' }} />
                                      <span className={`status-dot ${scene.status}`} />
                                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {scene.title}
                                      </span>
                                    </div>
                                    <span className={`badge badge-${scene.status}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                                      {scene.status}
                                    </span>
                                  </div>

                                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4', margin: '4px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {scene.summary || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No scene summary outline</span>}
                                  </p>
                                </div>

                                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {words} words
                                  </span>

                                  {sceneCodexIds.length > 0 && (
                                    <span style={{ fontSize: '10px', color: 'var(--primary)', backgroundColor: 'rgba(129, 140, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                      {sceneCodexIds.length} Linked Lore
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 2. Orphan Chapters & Scenes */}
          {(orphanChapters.length > 0 || orphanScenes.length > 0) && (
            <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--border-light)', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--secondary)', marginBottom: '12px' }}>
                Unassigned Scenes & Chapters
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {orphanScenes.map(scene => (
                  <div
                    key={scene.id}
                    onClick={() => handleOpenEdit(scene)}
                    className="glass-panel hover-card"
                    style={{ padding: '12px', cursor: 'pointer', borderRadius: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#ffffff', fontSize: '13px' }}>{scene.title}</span>
                      <span className={`badge badge-${scene.status}`}>{scene.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* CREATE ELEMENT MODAL */}
      {isCreateOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#ffffff', marginBottom: '14px' }}>
              Create Outline Element ({createType.toUpperCase()})
            </h2>

            <form onSubmit={handleCreateElement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder={`e.g. ${createType === 'act' ? 'Act I: The Call' : createType === 'chapter' ? 'Chapter 1: The Departure' : 'Scene 1: Tavern Confrontation'}`}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create {createType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ELEMENT INSPECTOR MODAL */}
      {isModalOpen && selectedElement && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#ffffff' }}>
                Edit {selectedElement.type.toUpperCase()}: {selectedElement.title}
              </h2>
              <span className={`badge badge-${editStatus}`}>{editStatus}</span>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

              <div>
                <label className="label">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="input"
                >
                  <option value="todo">To Do (Planned)</option>
                  <option value="drafting">Drafting (In Progress)</option>
                  <option value="review">Review / Revision</option>
                  <option value="done">Done (Completed)</option>
                </select>
              </div>

              <div>
                <label className="label">Plot Summary & Beats</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Outline key events, character motives, and turning points..."
                />
              </div>

              {/* Linked Codex Story Bible Elements */}
              {selectedElement.type === 'scene' && (
                <div>
                  <label className="label">Attached Codex Lore & Characters ({editAttachedCodex.length})</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto', padding: '8px', border: '1px solid var(--border-light)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                    {codex.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No Codex entries found in project.</span>
                    ) : (
                      codex.map(item => {
                        const isAttached = editAttachedCodex.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleCodexAttachment(item.id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: isAttached ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                              background: isAttached ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
                              color: isAttached ? '#ffffff' : 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            {item.name} ({item.category})
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: '#f87171' }}
                  onClick={() => handleDeleteElement(selectedElement.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
