import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  MapPin, 
  ShieldAlert, 
  BookOpen, 
  Trash2, 
  Network, 
  LayoutGrid, 
  Link2, 
  X,
  Save,
  Filter,
  CheckCircle2
} from 'lucide-react';

export interface CodexEntry {
  id: number;
  project_id: number;
  name: string;
  aliases: string;
  category: 'character' | 'location' | 'item' | 'lore';
  description: string;
  notes: string;
  voice_traits?: string;
  catchphrases?: string;
  formality_level?: number;
  pace_cadence?: string;
  pos_x?: number;
  pos_y?: number;
  created_at: string;
  updated_at: string;
}

export interface CodexRelationship {
  id: number;
  project_id: number;
  source_id: number;
  target_id: number;
  relationship_type: string;
  description: string;
  source_name: string;
  source_category: string;
  target_name: string;
  target_category: string;
}

interface CodexManagerProps {
  projectId: number;
  apiBase: string;
}

interface NodePosition {
  x: number;
  y: number;
}

export const CodexManager: React.FC<CodexManagerProps> = ({ projectId, apiBase }) => {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [relationships, setRelationships] = useState<CodexRelationship[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'graph'>('cards');
  
  // Modal states for Entry
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CodexEntry | null>(null);
  
  // Form states for Entry
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [category, setCategory] = useState<'character' | 'location' | 'item' | 'lore'>('character');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  
  // Voice Persona states for Character
  const [voiceTraits, setVoiceTraits] = useState('');
  const [catchphrases, setCatchphrases] = useState('');
  const [formalityLevel, setFormalityLevel] = useState(3);
  const [paceCadence, setPaceCadence] = useState('balanced');

  // Modal states for Relationship
  const [isRelModalOpen, setIsRelModalOpen] = useState(false);
  const [relSourceId, setRelSourceId] = useState<number | null>(null);
  const [relTargetId, setRelTargetId] = useState<number | null>(null);
  const [relType, setRelType] = useState<string>('ally');
  const [relDescription, setRelDescription] = useState<string>('');

  // Graph drag node positions
  const [nodePositions, setNodePositions] = useState<Record<number, NodePosition>>({});
  const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
  const [filterRelType, setFilterRelType] = useState<string>('all');
  const [savingGraph, setSavingGraph] = useState(false);
  const [graphSavedMessage, setGraphSavedMessage] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const fetchCodexData = async () => {
    try {
      const [codexRes, relRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/codex`),
        fetch(`${apiBase}/projects/${projectId}/codex-relationships`)
      ]);
      
      if (codexRes.ok) {
        const codexData = await codexRes.json();
        setEntries(codexData);
      }
      if (relRes.ok) {
        const relData = await relRes.json();
        setRelationships(relData);
      }
    } catch (err) {
      console.error('Failed to load codex data:', err);
    }
  };

  useEffect(() => {
    fetchCodexData();
  }, [projectId]);

  const handleSaveGraphPositions = async () => {
    setSavingGraph(true);
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex/graph-positions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: nodePositions })
      });
      if (res.ok) {
        setGraphSavedMessage(true);
        setTimeout(() => setGraphSavedMessage(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save graph layout:', err);
    } finally {
      setSavingGraph(false);
    }
  };

  // Calculate default circular layout positions for nodes
  useEffect(() => {
    if (entries.length === 0) return;
    const width = 800;
    const height = 500;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 80;

    const initialPositions: Record<number, NodePosition> = {};
    entries.forEach((entry, idx) => {
      if (entry.pos_x != null && entry.pos_y != null) {
        initialPositions[entry.id] = { x: entry.pos_x, y: entry.pos_y };
      } else if (nodePositions[entry.id]) {
        initialPositions[entry.id] = nodePositions[entry.id];
      } else {
        const angle = (idx / entries.length) * 2 * Math.PI;
        initialPositions[entry.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      }
    });
    setNodePositions(initialPositions);
  }, [entries]);

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setName('');
    setAliases('');
    setCategory('character');
    setDescription('');
    setNotes('');
    setVoiceTraits('');
    setCatchphrases('');
    setFormalityLevel(3);
    setPaceCadence('balanced');
    setIsOpen(true);
  };

  const handleOpenEdit = (entry: CodexEntry) => {
    setEditingEntry(entry);
    setName(entry.name);
    setAliases(entry.aliases || '');
    setCategory(entry.category);
    setDescription(entry.description || '');
    setNotes(entry.notes || '');
    setVoiceTraits(entry.voice_traits || '');
    setCatchphrases(entry.catchphrases || '');
    setFormalityLevel(entry.formality_level || 3);
    setPaceCadence(entry.pace_cadence || 'balanced');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = { 
      name, 
      aliases, 
      category, 
      description, 
      notes,
      voice_traits: voiceTraits,
      catchphrases,
      formality_level: formalityLevel,
      pace_cadence: paceCadence
    };
    const url = editingEntry 
      ? `${apiBase}/projects/${projectId}/codex/${editingEntry.id}`
      : `${apiBase}/projects/${projectId}/codex`;
    
    const method = editingEntry ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save codex entry');
      
      await fetchCodexData();
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lore element? Associated connections will be removed.')) return;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete entry');
      
      await fetchCodexData();
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Relationship Handlers
  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relSourceId || !relTargetId) return;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex-relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: relSourceId,
          target_id: relTargetId,
          relationship_type: relType,
          description: relDescription
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create connection');
      }

      await fetchCodexData();
      setIsRelModalOpen(false);
      setRelDescription('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRelationship = async (relId: number) => {
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex-relationships/${relId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCodexData();
      }
    } catch (err) {
      console.error('Failed to delete relationship:', err);
    }
  };

  // Graph drag handling
  const handleNodeMouseDown = (id: number) => {
    setDraggedNodeId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId === null || !graphContainerRef.current) return;
    const rect = graphContainerRef.current.getBoundingClientRect();
    const x = Math.max(40, Math.min(rect.width - 40, e.clientX - rect.left));
    const y = Math.max(40, Math.min(rect.height - 40, e.clientY - rect.top));

    setNodePositions(prev => ({
      ...prev,
      [draggedNodeId]: { x, y }
    }));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'character': return '#818cf8';
      case 'location': return '#a78bfa';
      case 'item': return '#fbbf24';
      default: return '#34d399';
    }
  };

  const getCategoryIcon = (cat: string, size = 16) => {
    switch (cat) {
      case 'character': return <User size={size} style={{ color: 'var(--primary)' }} />;
      case 'location': return <MapPin size={size} style={{ color: 'var(--secondary)' }} />;
      case 'item': return <ShieldAlert size={size} style={{ color: '#fbbf24' }} />;
      default: return <BookOpen size={size} style={{ color: '#34d399' }} />;
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      (entry.aliases && entry.aliases.toLowerCase().includes(search.toLowerCase())) ||
      (entry.description && entry.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div 
      style={{ 
        padding: '30px', 
        height: '100%', 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px' 
      }}
      className="animate-fade"
    >
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Story Codex & World Bible</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Document characters, magic, factions, items, and map relationship networks.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <button
              onClick={() => setViewMode('cards')}
              className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
            >
              <LayoutGrid size={13} /> Cards View
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`btn ${viewMode === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px' }}
            >
              <Network size={13} /> Relationship Graph
            </button>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              if (entries.length < 2) {
                alert('You need at least 2 Codex entries to establish a connection.');
                return;
              }
              setRelSourceId(entries[0].id);
              setRelTargetId(entries[1].id);
              setIsRelModalOpen(true);
            }}
          >
            <Link2 size={14} /> + Add Connection
          </button>

          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} /> + New Lore Entry
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <input 
            type="text" 
            placeholder="Search lore, characters, aliases..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '32px' }}
          />
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'character', 'location', 'item', 'lore'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '12px', textTransform: 'capitalize' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW MODE: 1. CARDS GRID */}
      {viewMode === 'cards' && (
        <>
          {filteredEntries.length === 0 ? (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '60px', 
                textAlign: 'center', 
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <BookOpen size={40} style={{ color: 'var(--text-muted)' }} />
              <h3>No codex entries found</h3>
              <p style={{ fontSize: '13px', maxWidth: '350px' }}>
                Create entries for your characters, factions, and landmarks to automatically inject lore into AI assistance.
              </p>
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                Create Lore Entry
              </button>
            </div>
          ) : (
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '16px' 
              }}
            >
              {filteredEntries.map(entry => {
                const entryRelationships = relationships.filter(r => r.source_id === entry.id || r.target_id === entry.id);

                return (
                  <div 
                    key={entry.id} 
                    className="glass-panel hover-card"
                    style={{ 
                      padding: '18px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      minHeight: '180px'
                    }}
                    onClick={() => handleOpenEdit(entry)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getCategoryIcon(entry.category, 16)}
                          <h3 style={{ fontSize: '16px', color: '#ffffff' }}>{entry.name}</h3>
                        </div>
                        <span 
                          style={{ 
                            fontSize: '10px', 
                            textTransform: 'uppercase', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: getCategoryColor(entry.category),
                            fontWeight: 600
                          }}
                        >
                          {entry.category}
                        </span>
                      </div>

                      {entry.aliases && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                          Aliases: {entry.aliases}
                        </div>
                      )}

                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.5', margin: '6px 0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {entry.description || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No description provided.</span>}
                      </p>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--primary)' }}>
                        {entryRelationships.length} {entryRelationships.length === 1 ? 'connection' : 'connections'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Updated {new Date(entry.updated_at || entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW MODE: 2. VISUAL NETWORK GRAPH */}
      {viewMode === 'graph' && (
        <div 
          ref={graphContainerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ 
            width: '100%', 
            height: '650px', 
            background: 'radial-gradient(ellipse at center, rgba(30, 27, 75, 0.3) 0%, rgba(10, 10, 15, 0.95) 100%)',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none'
          }}
        >
          {/* Graph Controls Overlay Bar */}
          <div 
            style={{ 
              position: 'absolute', 
              top: '12px', 
              left: '12px', 
              right: '12px', 
              zIndex: 20, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              background: 'rgba(15, 15, 25, 0.85)', 
              backdropFilter: 'blur(8px)',
              padding: '10px 14px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-light)' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <Filter size={14} style={{ color: 'var(--primary)' }} />
                <span>Relationship Type:</span>
              </div>
              <select
                value={filterRelType}
                onChange={(e) => setFilterRelType(e.target.value)}
                className="input"
                style={{ padding: '4px 8px', fontSize: '12px', width: '140px' }}
              >
                <option value="all">All Relationships</option>
                <option value="ally">Ally</option>
                <option value="enemy">Enemy</option>
                <option value="rival">Rival</option>
                <option value="family">Family</option>
                <option value="located_in">Located In</option>
                <option value="owns">Owns</option>
                <option value="member_of">Member Of</option>
                <option value="associated">Associated</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {graphSavedMessage && (
                <span style={{ fontSize: '12px', color: 'var(--status-done)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Layout Saved!
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveGraphPositions}
                disabled={savingGraph}
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px', gap: '6px' }}
              >
                <Save size={14} /> {savingGraph ? 'Saving Layout...' : 'Save 2D Graph Layout'}
              </button>
            </div>
          </div>

          {/* SVG Canvas for Relationship Lines */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {relationships
              .filter(rel => filterRelType === 'all' || rel.relationship_type === filterRelType)
              .map(rel => {
                const sourcePos = nodePositions[rel.source_id];
                const targetPos = nodePositions[rel.target_id];
                if (!sourcePos || !targetPos) return null;

                const midX = (sourcePos.x + targetPos.x) / 2;
                const midY = (sourcePos.y + targetPos.y) / 2;

                return (
                  <g key={rel.id}>
                    <line
                      x1={sourcePos.x}
                      y1={sourcePos.y}
                      x2={targetPos.x}
                      y2={targetPos.y}
                      stroke="url(#edgeGradient)"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                    {/* Connection Label Pill */}
                    <rect
                      x={midX - 35}
                      y={midY - 10}
                      width="70"
                      height="20"
                      rx="10"
                      fill="rgba(15, 15, 25, 0.9)"
                      stroke="rgba(129, 140, 248, 0.3)"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      fill="#c7d2fe"
                      fontSize="10"
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {rel.relationship_type.replace('_', ' ')}
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Interactive Entity Nodes */}
          {filteredEntries.map(entry => {
            const pos = nodePositions[entry.id] || { x: 100, y: 100 };
            const isDragging = draggedNodeId === entry.id;
            const isHighlighted = search.trim() !== '' && (
              entry.name.toLowerCase().includes(search.toLowerCase()) ||
              (entry.aliases && entry.aliases.toLowerCase().includes(search.toLowerCase()))
            );

            return (
              <div
                key={entry.id}
                onMouseDown={() => handleNodeMouseDown(entry.id)}
                onClick={() => handleOpenEdit(entry)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -50%)',
                  padding: '8px 14px',
                  borderRadius: '20px',
                  background: isDragging ? 'rgba(30, 27, 75, 0.95)' : 'rgba(20, 20, 32, 0.95)',
                  border: isHighlighted
                    ? '2px solid #38bdf8'
                    : `2px solid ${getCategoryColor(entry.category)}`,
                  boxShadow: isHighlighted
                    ? '0 0 16px rgba(56, 189, 248, 0.8)'
                    : isDragging
                    ? '0 0 20px rgba(129, 140, 248, 0.6)'
                    : '0 4px 15px rgba(0,0,0,0.5)',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  zIndex: isDragging ? 30 : 10,
                  transition: isDragging ? 'none' : 'border 0.2s, box-shadow 0.2s'
                }}
              >
                {getCategoryIcon(entry.category, 14)}
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap' }}>
                  {entry.name}
                </span>
              </div>
            );
          })}

          <div style={{ position: 'absolute', bottom: '16px', left: '16px', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.5)', padding: '6px 12px', borderRadius: '6px' }}>
            💡 Click & drag nodes to organize • Click any node to view lore details
          </div>
        </div>
      )}

      {/* CREATE / EDIT LORE ENTRY MODAL */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#ffffff' }}>
                {editingEntry ? `Edit: ${editingEntry.name}` : 'New Codex Entry'}
              </h2>
              <button onClick={() => setIsOpen(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Entry Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g. Eldrin Vance, Silver Citadel, Amulet of Dawn..."
                  className="input" 
                  required 
                  autoFocus 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="input"
                  >
                    <option value="character">Character</option>
                    <option value="location">Location</option>
                    <option value="item">Item / Artifact</option>
                    <option value="lore">Magic & Lore</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label className="label">Aliases / Keywords</label>
                  <input 
                    type="text" 
                    value={aliases} 
                    onChange={(e) => setAliases(e.target.value)} 
                    placeholder="e.g. The Shadowblade, Eldrin"
                    className="input" 
                  />
                </div>
              </div>

              <div>
                <label className="label">Story Context & Description (AI Reference)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Describe appearance, motives, backstory, and world significance..."
                  className="input"
                  rows={4}
                />
              </div>

              <div>
                <label className="label">Private Author Notes</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Notes for yourself regarding twists, future arcs, or secrets..."
                  className="input"
                  rows={2}
                />
              </div>

              {category === 'character' && (
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span className="label" style={{ color: 'var(--primary)', margin: 0, fontWeight: 700 }}>
                    🎭 Character Speech Persona & Voice Profile
                  </span>

                  <div>
                    <label className="label" style={{ fontSize: '11px' }}>Explicit Voice Traits & Speech Habits</label>
                    <input
                      type="text"
                      value={voiceTraits}
                      onChange={(e) => setVoiceTraits(e.target.value)}
                      placeholder="e.g. Speaks in short clipped military sentences, avoids contractions, sarcastic"
                      className="input"
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Catchphrases / Recurring Idioms</label>
                      <input
                        type="text"
                        value={catchphrases}
                        onChange={(e) => setCatchphrases(e.target.value)}
                        placeholder="e.g. 'By the iron crown'"
                        className="input"
                        style={{ fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label className="label" style={{ fontSize: '11px' }}>Speech Cadence</label>
                      <select
                        value={paceCadence}
                        onChange={(e) => setPaceCadence(e.target.value)}
                        className="input"
                        style={{ fontSize: '12px' }}
                      >
                        <option value="punchy">Punchy & Staccato</option>
                        <option value="balanced">Balanced Narrative</option>
                        <option value="eloquent">Eloquent & Lyrical</option>
                        <option value="rambling">Nervous & Rambling</option>
                        <option value="cryptic">Cryptic & Whispered</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Display existing relationships for this entry */}
              {editingEntry && (
                <div>
                  <label className="label">Established Connections</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {relationships.filter(r => r.source_id === editingEntry.id || r.target_id === editingEntry.id).length === 0 ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No connections linked to this entity.</span>
                    ) : (
                      relationships.filter(r => r.source_id === editingEntry.id || r.target_id === editingEntry.id).map(rel => {
                        const isSource = rel.source_id === editingEntry.id;
                        const otherName = isSource ? rel.target_name : rel.source_name;
                        return (
                          <div key={rel.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '12px' }}>
                            <span><strong>{rel.relationship_type.replace('_', ' ')}:</strong> {otherName} {rel.description ? `(${rel.description})` : ''}</span>
                            <button type="button" onClick={() => handleDeleteRelationship(rel.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                {editingEntry ? (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ color: '#f87171' }}
                    onClick={() => handleDelete(editingEntry.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Lore
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE RELATIONSHIP CONNECTION MODAL */}
      {isRelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={18} style={{ color: 'var(--primary)' }} />
                <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                  Connect Story Entities
                </h2>
              </div>
              <button onClick={() => setIsRelModalOpen(false)} className="btn btn-secondary" style={{ padding: '6px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRelationship} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="label">Source Entity</label>
                <select
                  value={relSourceId || ''}
                  onChange={(e) => setRelSourceId(Number(e.target.value))}
                  className="input"
                  required
                >
                  {entries.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Relationship Type</label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                  className="input"
                >
                  <option value="ally">Ally / Friend</option>
                  <option value="enemy">Enemy / Adversary</option>
                  <option value="rival">Rival</option>
                  <option value="family">Family / Kin</option>
                  <option value="member_of">Member of (Faction/Guild)</option>
                  <option value="located_in">Located in</option>
                  <option value="owns">Owns / Possesses</option>
                  <option value="associated">Associated With</option>
                </select>
              </div>

              <div>
                <label className="label">Target Entity</label>
                <select
                  value={relTargetId || ''}
                  onChange={(e) => setRelTargetId(Number(e.target.value))}
                  className="input"
                  required
                >
                  {entries.filter(e => e.id !== relSourceId).map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Connection Details / Context (Optional)</label>
                <input
                  type="text"
                  value={relDescription}
                  onChange={(e) => setRelDescription(e.target.value)}
                  placeholder="e.g. Sworn blood oaths after the siege"
                  className="input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsRelModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Establish Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
