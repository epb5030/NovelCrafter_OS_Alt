import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  User, 
  Eye, 
  Sparkles, 
  Flame, 
  RefreshCw, 
  Layers, 
  Sliders, 
  Check, 
  X, 
  Search
} from 'lucide-react';

interface MatrixScene {
  id: number;
  title: string;
  type: string;
  position: number;
  parent_id?: number;
  parent_title?: string;
  summary?: string;
  status?: string;
}

interface MatrixCharacter {
  id: number;
  name: string;
  category: string;
  aliases?: string;
  description?: string;
  color?: string;
  role?: string;
}

interface MatrixCell {
  id?: number;
  scene_id: number;
  character_id: number;
  role: 'pov' | 'participant' | 'mentioned' | 'absent';
  emotional_state?: string;
  arc_notes?: string;
  tension_level?: number;
}

interface PlotMatrixProps {
  projectId: number;
  apiBase: string;
  onNavigateToScene?: (sceneId: number) => void;
}

export const PlotMatrix: React.FC<PlotMatrixProps> = ({
  projectId,
  apiBase,
  onNavigateToScene
}) => {
  const [scenes, setScenes] = useState<MatrixScene[]>([]);
  const [characters, setCharacters] = useState<MatrixCharacter[]>([]);
  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected Cell for Detailed Arc Inspection Modal
  const [selectedCell, setSelectedCell] = useState<{
    scene: MatrixScene;
    character: MatrixCharacter;
    cell?: MatrixCell;
  } | null>(null);

  // Inspector form states
  const [inspectorRole, setInspectorRole] = useState<'pov' | 'participant' | 'mentioned' | 'absent'>('participant');
  const [inspectorEmotion, setInspectorEmotion] = useState<string>('');
  const [inspectorArcNotes, setInspectorArcNotes] = useState<string>('');
  const [inspectorTension, setInspectorTension] = useState<number>(3);
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);

  // Fetch Matrix Data
  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/projects/${projectId}/matrix`);
      if (!res.ok) throw new Error('Failed to load matrix');
      const data = await res.json();
      setScenes(data.scenes || []);
      setCharacters(data.characters || []);
      setCells(data.cells || []);
    } catch (err) {
      console.error('Error fetching plot matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, [projectId]);

  // Lookup map: `${scene_id}_${character_id}` -> MatrixCell
  const cellMap = useMemo(() => {
    const map = new Map<string, MatrixCell>();
    cells.forEach(c => {
      map.set(`${c.scene_id}_${c.character_id}`, c);
    });
    return map;
  }, [cells]);

  // Quick Cycle Cell Role on Click
  const handleQuickCycleCell = async (sceneId: number, characterId: number) => {
    const key = `${sceneId}_${characterId}`;
    const existing = cellMap.get(key);
    const currentRole = existing ? existing.role : 'absent';
    
    // Cycle: absent -> mentioned -> participant -> pov -> absent
    let nextRole: 'pov' | 'participant' | 'mentioned' | 'absent' = 'mentioned';
    if (currentRole === 'absent') nextRole = 'mentioned';
    else if (currentRole === 'mentioned') nextRole = 'participant';
    else if (currentRole === 'participant') nextRole = 'pov';
    else if (currentRole === 'pov') nextRole = 'absent';

    // Optimistic UI update
    setCells(prev => {
      const filtered = prev.filter(c => !(c.scene_id === sceneId && c.character_id === characterId));
      if (nextRole !== 'absent') {
        filtered.push({
          scene_id: sceneId,
          character_id: characterId,
          role: nextRole,
          emotional_state: existing?.emotional_state || '',
          arc_notes: existing?.arc_notes || '',
          tension_level: existing?.tension_level || 3
        });
      }
      return filtered;
    });

    try {
      await fetch(`${apiBase}/projects/${projectId}/matrix/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          characterId,
          role: nextRole,
          emotionalState: existing?.emotional_state || '',
          arcNotes: existing?.arc_notes || '',
          tensionLevel: existing?.tension_level || 3
        })
      });
    } catch (err) {
      console.error('Error updating cell role:', err);
    }
  };

  // Open Inspector
  const handleOpenInspector = (scene: MatrixScene, character: MatrixCharacter) => {
    const key = `${scene.id}_${character.id}`;
    const cell = cellMap.get(key);
    setSelectedCell({ scene, character, cell });
    setInspectorRole(cell?.role || 'participant');
    setInspectorEmotion(cell?.emotional_state || '');
    setInspectorArcNotes(cell?.arc_notes || '');
    setInspectorTension(cell?.tension_level || 3);
  };

  // Save Inspector Changes
  const handleSaveInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    setIsSavingCell(true);

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/matrix/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: selectedCell.scene.id,
          characterId: selectedCell.character.id,
          role: inspectorRole,
          emotionalState: inspectorEmotion,
          arcNotes: inspectorArcNotes,
          tensionLevel: inspectorTension
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setCells(prev => {
          const filtered = prev.filter(c => !(c.scene_id === selectedCell.scene.id && c.character_id === selectedCell.character.id));
          return [...filtered, updated];
        });
        setSelectedCell(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCell(false);
    }
  };

  // Auto-Scan Manuscript for Character Mentions
  const handleAutoPopulate = async () => {
    setIsScanning(true);
    setScanMessage('');
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/matrix/auto-populate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setScanMessage(data.message || 'Auto-scan complete!');
        await fetchMatrixData();
        setTimeout(() => setScanMessage(''), 4000);
      }
    } catch (err) {
      setScanMessage('Failed to scan manuscript.');
    } finally {
      setIsScanning(false);
    }
  };

  // Filtered Characters
  const filteredCharacters = useMemo(() => {
    if (!searchQuery.trim()) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.aliases && c.aliases.toLowerCase().includes(q))
    );
  }, [characters, searchQuery]);

  // POV Analytics & Distribution Breakdown
  const povAnalytics = useMemo(() => {
    const povCounts: Record<number, number> = {};
    let totalPovScenes = 0;

    cells.forEach(c => {
      if (c.role === 'pov') {
        povCounts[c.character_id] = (povCounts[c.character_id] || 0) + 1;
        totalPovScenes++;
      }
    });

    const breakdown = characters.map(char => {
      const count = povCounts[char.id] || 0;
      const pct = totalPovScenes > 0 ? Math.round((count / totalPovScenes) * 100) : 0;
      return {
        character: char,
        count,
        pct
      };
    }).filter(item => item.count > 0).sort((a, b) => b.count - a.count);

    return { breakdown, totalPovScenes };
  }, [cells, characters]);

  // Tension Curve Data across scenes in order
  const tensionCurve = useMemo(() => {
    return scenes.map((scene, idx) => {
      const sceneCells = cells.filter(c => c.scene_id === scene.id);
      const avgTension = sceneCells.length > 0 
        ? Math.round((sceneCells.reduce((acc, c) => acc + (c.tension_level || 3), 0) / sceneCells.length) * 10) / 10
        : 3.0;
      return {
        scene,
        index: idx + 1,
        tension: avgTension
      };
    });
  }, [scenes, cells]);

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="spin" style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px auto' }} />
        <p>Loading Character Arc & Plot Matrix...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
      
      {/* Top Header & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontFamily: 'var(--font-display)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={22} style={{ color: 'var(--primary)' }} /> Character Arc & Plot Beat Matrix
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Map character appearances, POV distribution, emotional arcs, and narrative tension across all chapters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search Character Filter */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter characters..."
              className="input"
              style={{ paddingLeft: '30px', fontSize: '12px', width: '180px' }}
            />
          </div>

          {/* Auto-Scan Button */}
          <button
            type="button"
            onClick={handleAutoPopulate}
            disabled={isScanning}
            className="btn btn-secondary"
            style={{ fontSize: '12px', gap: '6px' }}
            title="Scan manuscript drafts and auto-tag character appearances in each scene"
          >
            {isScanning ? (
              <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={13} style={{ color: 'var(--primary)' }} />
            )}
            {isScanning ? 'Scanning Manuscript...' : 'Auto-Scan from Text'}
          </button>
        </div>
      </div>

      {scanMessage && (
        <div style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} /> {scanMessage}
        </div>
      )}

      {/* Analytics Row: POV Distribution & Tension Sparkline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        
        {/* POV Screen Time Breakdown */}
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Crown size={14} style={{ color: '#fbbf24' }} /> POV Screen Time Distribution ({povAnalytics.totalPovScenes} POV scenes)
            </span>
          </div>

          {povAnalytics.breakdown.length === 0 ? (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>
              No POV characters assigned yet. Click a matrix cell to cycle it to POV (Gold Crown).
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Multi-segmented distribution bar */}
              <div style={{ height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-light)' }}>
                {povAnalytics.breakdown.map((item, idx) => {
                  const colors = ['#c89d54', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];
                  const color = item.character.color || colors[idx % colors.length];
                  return (
                    <div 
                      key={item.character.id}
                      style={{ width: `${item.pct}%`, backgroundColor: color }}
                      title={`${item.character.name}: ${item.count} scenes (${item.pct}%)`}
                    />
                  );
                })}
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px' }}>
                {povAnalytics.breakdown.map((item, idx) => {
                  const colors = ['#c89d54', '#38bdf8', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];
                  const color = item.character.color || colors[idx % colors.length];
                  return (
                    <span key={item.character.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                      <strong style={{ color: '#ffffff' }}>{item.character.name}</strong> ({item.pct}%)
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dramatic Tension Curve */}
        <div className="glass-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={14} style={{ color: '#f87171' }} /> Narrative Pacing & Dramatic Tension Curve
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>1 (Low) to 5 (Climactic)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px', padding: '4px 0' }}>
            {tensionCurve.map((tc) => {
              const heightPct = Math.max(15, (tc.tension / 5) * 100);
              let barColor = '#60a5fa';
              if (tc.tension >= 4.5) barColor = '#ef4444';
              else if (tc.tension >= 3.5) barColor = '#f59e0b';

              return (
                <div
                  key={tc.scene.id}
                  style={{
                    flex: 1,
                    height: `${heightPct}%`,
                    backgroundColor: barColor,
                    borderRadius: '2px',
                    opacity: 0.85,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={`${tc.scene.title} (Scene ${tc.index}) • Tension: ${tc.tension}/5`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cell Role Legend:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
            <Crown size={13} /> POV Character
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
            <User size={13} /> Active Participant
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
            <Eye size={13} /> Mentioned Only
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.2)' }}>
            ● Absent
          </span>
        </div>
        <div>
          💡 <em>Left-click cell to fast-cycle role • Right-click to edit emotional arc notes</em>
        </div>
      </div>

      {/* Main 2D Matrix Grid Canvas */}
      <div 
        style={{ 
          flex: 1, 
          overflow: 'auto', 
          backgroundColor: 'rgba(0,0,0,0.25)', 
          border: '1px solid var(--border-light)', 
          borderRadius: 'var(--radius-md)',
          position: 'relative'
        }}
      >
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: `${(scenes.length + 1) * 140}px` }}>
          <thead>
            <tr>
              {/* Sticky Top-Left Corner Header */}
              <th 
                style={{ 
                  position: 'sticky', 
                  top: 0, 
                  left: 0, 
                  zIndex: 30, 
                  backgroundColor: 'var(--bg-panel)', 
                  borderRight: '2px solid var(--border-light)', 
                  borderBottom: '2px solid var(--border-light)',
                  padding: '12px 16px',
                  textAlign: 'left',
                  width: '200px',
                  minWidth: '200px'
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>
                  Characters ({filteredCharacters.length})
                </div>
              </th>

              {/* Scene Column Headers */}
              {scenes.map((scene, idx) => (
                <th
                  key={scene.id}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    backgroundColor: 'var(--bg-panel)',
                    borderRight: '1px solid var(--border-light)',
                    borderBottom: '2px solid var(--border-light)',
                    padding: '10px 12px',
                    textAlign: 'left',
                    minWidth: '130px',
                    maxWidth: '160px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Scene {idx + 1}
                    </div>
                    <div 
                      style={{ 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        color: '#ffffff', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: onNavigateToScene ? 'pointer' : 'default'
                      }}
                      onClick={() => onNavigateToScene?.(scene.id)}
                      title={`Open "${scene.title}" in Write Editor`}
                    >
                      {scene.title}
                    </div>
                    {scene.parent_title && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {scene.parent_title}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredCharacters.map(char => (
              <tr key={char.id}>
                {/* Sticky Character Row Header */}
                <th
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 10,
                    backgroundColor: 'var(--bg-panel)',
                    borderRight: '2px solid var(--border-light)',
                    borderBottom: '1px solid var(--border-light)',
                    padding: '10px 16px',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        backgroundColor: char.color || 'var(--primary)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#ffffff', 
                        fontWeight: 700,
                        fontSize: '11px',
                        flexShrink: 0
                      }}
                    >
                      {char.name ? char.name[0].toUpperCase() : 'C'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {char.name}
                      </div>
                      {char.role && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          {char.role}
                        </div>
                      )}
                    </div>
                  </div>
                </th>

                {/* Matrix Interactive Cells */}
                {scenes.map(scene => {
                  const key = `${scene.id}_${char.id}`;
                  const cell = cellMap.get(key);
                  const role = cell?.role || 'absent';

                  return (
                    <td
                      key={scene.id}
                      onClick={() => handleQuickCycleCell(scene.id, char.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleOpenInspector(scene, char);
                      }}
                      style={{
                        borderRight: '1px solid var(--border-light)',
                        borderBottom: '1px solid var(--border-light)',
                        padding: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: role === 'pov' ? 'rgba(251, 191, 36, 0.12)' : role === 'participant' ? 'rgba(96, 165, 250, 0.08)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                      title={`Click to cycle role • Right-click to edit arc notes`}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {role === 'pov' && (
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px', 
                              backgroundColor: 'rgba(251, 191, 36, 0.25)', 
                              color: '#fbbf24', 
                              padding: '3px 7px', 
                              borderRadius: '4px', 
                              fontSize: '11px',
                              fontWeight: 700,
                              border: '1px solid rgba(251, 191, 36, 0.4)'
                            }}
                          >
                            <Crown size={12} /> POV
                          </span>
                        )}

                        {role === 'participant' && (
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px', 
                              backgroundColor: 'rgba(96, 165, 250, 0.2)', 
                              color: '#60a5fa', 
                              padding: '3px 7px', 
                              borderRadius: '4px', 
                              fontSize: '11px',
                              fontWeight: 600,
                              border: '1px solid rgba(96, 165, 250, 0.3)'
                            }}
                          >
                            <User size={12} /> Present
                          </span>
                        )}

                        {role === 'mentioned' && (
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '3px', 
                              backgroundColor: 'rgba(255, 255, 255, 0.06)', 
                              color: 'var(--text-muted)', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '10px'
                            }}
                          >
                            <Eye size={11} /> Mention
                          </span>
                        )}

                        {role === 'absent' && (
                          <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: '14px' }}>
                            •
                          </span>
                        )}

                        {/* Emotional state / revelation preview note */}
                        {cell?.emotional_state && (
                          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{cell.emotional_state}"
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CELL ARC & EMOTIONAL DELTA INSPECTOR MODAL */}
      {selectedCell && (
        <div className="modal-overlay" style={{ zIndex: 120 }}>
          <div 
            className="modal-content animate-scale" 
            style={{ 
              maxWidth: '520px', 
              padding: '24px', 
              background: 'var(--bg-panel)', 
              border: '1px solid var(--border-light)', 
              boxShadow: 'var(--shadow-premium)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '16px' }}>Character Scene Arc Inspector</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {selectedCell.character.name} in "{selectedCell.scene.title}"
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedCell(null)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSaveInspector} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Role Selector */}
              <div>
                <label className="label">Character Scene Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'pov', label: 'POV', icon: Crown, color: '#fbbf24' },
                    { id: 'participant', label: 'Present', icon: User, color: '#60a5fa' },
                    { id: 'mentioned', label: 'Mentioned', icon: Eye, color: '#a78bfa' },
                    { id: 'absent', label: 'Absent', icon: X, color: '#9ca3af' }
                  ].map(r => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setInspectorRole(r.id as any)}
                        className="btn"
                        style={{
                          padding: '8px',
                          flexDirection: 'column',
                          gap: '4px',
                          fontSize: '11px',
                          background: inspectorRole === r.id ? 'rgba(200, 157, 84, 0.2)' : 'rgba(0,0,0,0.2)',
                          borderColor: inspectorRole === r.id ? 'var(--primary)' : 'var(--border-light)',
                          color: inspectorRole === r.id ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        <Icon size={14} style={{ color: r.color }} />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emotional State Delta */}
              <div>
                <label className="label">Emotional State / Mindset in this Scene</label>
                <input
                  type="text"
                  value={inspectorEmotion}
                  onChange={(e) => setInspectorEmotion(e.target.value)}
                  placeholder="e.g. Reluctant ally, Secretly betrayed, Overconfident..."
                  className="input"
                />
              </div>

              {/* Dramatic Tension Rating */}
              <div>
                <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Dramatic Tension Score</span>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>{inspectorTension} / 5</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={inspectorTension}
                  onChange={(e) => setInspectorTension(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              {/* Key Arc Notes / Revelation */}
              <div>
                <label className="label">Key Revelation / Character Arc Beat</label>
                <textarea
                  value={inspectorArcNotes}
                  onChange={(e) => setInspectorArcNotes(e.target.value)}
                  placeholder="What changes for this character? What secret is learned or decisive action taken?"
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setSelectedCell(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingCell} className="btn btn-primary">
                  <Check size={14} /> Save Cell Beat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
