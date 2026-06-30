import React, { useState, useEffect } from 'react';
import { Plus, Search, User, MapPin, ShieldAlert, BookOpen, Trash2 } from 'lucide-react';

export interface CodexEntry {
  id: number;
  project_id: number;
  name: string;
  aliases: string;
  category: 'character' | 'location' | 'item' | 'lore';
  description: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface CodexManagerProps {
  projectId: number;
  apiBase: string;
}

export const CodexManager: React.FC<CodexManagerProps> = ({ projectId, apiBase }) => {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CodexEntry | null>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [category, setCategory] = useState<'character' | 'location' | 'item' | 'lore'>('character');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex`);
      if (!res.ok) throw new Error('Failed to load codex');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [projectId]);

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setName('');
    setAliases('');
    setCategory('character');
    setDescription('');
    setNotes('');
    setIsOpen(true);
  };

  const handleOpenEdit = (entry: CodexEntry) => {
    setEditingEntry(entry);
    setName(entry.name);
    setAliases(entry.aliases || '');
    setCategory(entry.category);
    setDescription(entry.description || '');
    setNotes(entry.notes || '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = { name, aliases, category, description, notes };
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
      
      await fetchEntries();
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lore element? It will no longer be referenced by the writing assistant.')) return;

    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/codex/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete entry');
      
      setEntries(prev => prev.filter(e => e.id !== id));
      setIsOpen(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to render categories icons
  const getCategoryIcon = (cat: string, size = 16) => {
    switch (cat) {
      case 'character': return <User size={size} style={{ color: 'var(--primary)' }} />;
      case 'location': return <MapPin size={size} style={{ color: 'var(--secondary)' }} />;
      case 'item': return <ShieldAlert size={size} style={{ color: 'var(--accent)' }} />;
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
        gap: '24px' 
      }}
      className="animate-fade"
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>Story Codex</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Build your encyclopedia of characters, factions, artifacts, and world lore.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Add Codex Entry
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="glass-panel"
        style={{ 
          padding: '16px', 
          display: 'flex', 
          gap: '16px', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          border: '1px solid var(--border-light)'
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-muted)' 
            }} 
          />
          <input
            type="text"
            placeholder="Search entries by name, aliases, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'character', 'location', 'item', 'lore'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                textTransform: 'capitalize',
                background: filterCategory === cat ? 'rgba(129, 140, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: filterCategory === cat ? 'var(--primary)' : 'var(--border-light)',
                color: filterCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of entries */}
      {filteredEntries.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)'
          }}
        >
          No codex entries found matching your criteria.
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '20px' 
          }}
        >
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              onClick={() => handleOpenEdit(entry)}
              className="glass-panel"
              style={{
                padding: '20px',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '180px',
                border: '1px solid var(--border-light)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.4)';
                e.currentTarget.style.backgroundColor = 'var(--bg-panel-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.backgroundColor = 'var(--bg-panel)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getCategoryIcon(entry.category)}
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        textTransform: 'uppercase', 
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.05em' 
                      }}
                    >
                      {entry.category}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '18px', color: '#ffffff', marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
                  {entry.name}
                </h3>
                
                {entry.aliases && (
                  <p 
                    style={{ 
                      fontSize: '11px', 
                      color: 'var(--secondary)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      marginBottom: '6px'
                    }}
                  >
                    Aliases: {entry.aliases}
                  </p>
                )}

                <p 
                  style={{ 
                    fontSize: '13px', 
                    color: 'var(--text-secondary)', 
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.4'
                  }}
                >
                  {entry.description || 'No description provided.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: '#ffffff' }}>
                {editingEntry ? 'Edit Codex Entry' : 'New Codex Entry'}
              </h2>
              {editingEntry && (
                <button 
                  onClick={() => handleDelete(editingEntry.id)}
                  className="btn btn-danger"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="label">Name / Subject</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="input" 
                    placeholder="e.g. Eldrin"
                    required 
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value as any)} 
                    className="input"
                    style={{ background: 'var(--bg-input)' }}
                  >
                    <option value="character">Character</option>
                    <option value="location">Location</option>
                    <option value="item">Item / Artifact</option>
                    <option value="lore">Lore / Event / Spell</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Aliases (Comma separated)</label>
                <input 
                  type="text" 
                  value={aliases} 
                  onChange={(e) => setAliases(e.target.value)} 
                  className="input" 
                  placeholder="e.g. Eldrin the Grey, Sage of Oakhaven"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  If these names are found in your manuscript, the AI assistant will automatically load this entry.
                </span>
              </div>

              <div>
                <label className="label">AI Description (What the AI reads)</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="input" 
                  rows={3}
                  placeholder="Summarize who/what this is in 1-3 sentences. Keep it punchy so it fits cleanly in the AI's short-term context window."
                />
              </div>

              <div>
                <label className="label">Detailed Notes (For your reference)</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="input" 
                  rows={4}
                  placeholder="Background backstory, relationship graphs, magical rules, private lore notes..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
