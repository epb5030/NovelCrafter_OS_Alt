import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Replace, 
  X, 
  FileText, 
  Map, 
  Database, 
  ArrowRight, 
  Check, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface GlobalSearchModalProps {
  projectId: number;
  apiBase: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToScene?: (sceneId: number) => void;
  onNavigateToCodex?: () => void;
  onNavigateToOutline?: () => void;
}

interface SearchResults {
  scenes: Array<{
    id: number;
    title: string;
    occurrences: number;
    snippets: string[];
  }>;
  outline: Array<{
    id: number;
    title: string;
    type: string;
    summary: string;
    status: string;
  }>;
  codex: Array<{
    id: number;
    name: string;
    aliases: string;
    category: string;
    description: string;
    notes: string;
  }>;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  projectId,
  apiBase,
  isOpen,
  onClose,
  onNavigateToScene,
  onNavigateToCodex,
  onNavigateToOutline
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'scenes' | 'outline' | 'codex'>('all');
  const [results, setResults] = useState<SearchResults>({ scenes: [], outline: [], codex: [] });
  const [loading, setLoading] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [replaceSuccessMsg, setReplaceSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Search Fetch with debounce
  useEffect(() => {
    if (!isOpen) return;
    if (!searchTerm.trim()) {
      setResults({ scenes: [], outline: [], codex: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const res = await fetch(`${apiBase}/projects/${projectId}/search?q=${encodeURIComponent(searchTerm.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error('Search failed:', err);
        setErrorMsg('Failed to perform search query.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, projectId, isOpen]);

  // Handle Global Replace
  const handleReplaceAll = async () => {
    if (!searchTerm.trim()) return;
    const totalOccurrences = results.scenes.reduce((sum, sc) => sum + sc.occurrences, 0);
    
    if (totalOccurrences === 0) {
      alert('No occurrences found across scenes to replace.');
      return;
    }

    if (!confirm(`Replace all ${totalOccurrences} occurrences of "${searchTerm}" with "${replaceTerm}" across ${results.scenes.length} scenes? Automated safety backups will be recorded for each scene.`)) {
      return;
    }

    try {
      setIsReplacing(true);
      setErrorMsg('');
      const res = await fetch(`${apiBase}/projects/${projectId}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm: searchTerm.trim(),
          replaceTerm: replaceTerm,
          sceneIds: results.scenes.map(s => s.id)
        })
      });

      if (!res.ok) throw new Error('Replace request failed');
      const data = await res.json();

      setReplaceSuccessMsg(`Successfully replaced ${data.totalOccurrencesReplaced} occurrences across ${data.updatedScenesCount} scenes.`);
      
      // Refresh search results
      const searchRes = await fetch(`${apiBase}/projects/${projectId}/search?q=${encodeURIComponent(searchTerm.trim())}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        setResults(searchData);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete replace operation.');
    } finally {
      setIsReplacing(false);
    }
  };

  const highlightSnippet = (snippet: string, query: string) => {
    if (!query) return snippet;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = snippet.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} style={{ backgroundColor: 'rgba(129, 140, 248, 0.4)', color: '#ffffff', padding: '1px 3px', borderRadius: '3px' }}>
          {part}
        </mark>
      ) : part
    );
  };

  if (!isOpen) return null;

  const totalResultsCount = results.scenes.length + results.outline.length + results.codex.length;

  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div 
        className="modal-content animate-scale" 
        style={{ 
          maxWidth: '750px', 
          maxHeight: '85vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: '24px',
          background: 'rgba(15, 15, 23, 0.98)',
          border: '1px solid rgba(129, 140, 248, 0.3)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={20} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
              Project Global Search & Replace
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Replace Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search across manuscript scenes, outline, & codex (Press Esc to exit)..."
                className="input"
                style={{ paddingLeft: '34px', fontSize: '13px' }}
                autoFocus
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="btn btn-secondary" 
                style={{ padding: '8px' }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Replace with in manuscript scenes..."
                className="input"
                style={{ paddingLeft: '34px', fontSize: '13px' }}
              />
              <Replace size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            <button
              onClick={handleReplaceAll}
              disabled={!searchTerm.trim() || isReplacing || results.scenes.length === 0}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
              title="Replace all matches across scenes with safety snapshots"
            >
              {isReplacing ? <RefreshCw size={13} className="spin" /> : <Replace size={13} />} Replace All
            </button>
          </div>
        </div>

        {/* Notifications & Status */}
        {replaceSuccessMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={14} /> {replaceSuccessMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}

        {/* Category Filters Header */}
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setActiveFilter('all')}
            className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            All Results ({totalResultsCount})
          </button>
          <button
            onClick={() => setActiveFilter('scenes')}
            className={`btn ${activeFilter === 'scenes' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            <FileText size={11} /> Scenes ({results.scenes.length})
          </button>
          <button
            onClick={() => setActiveFilter('outline')}
            className={`btn ${activeFilter === 'outline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            <Map size={11} /> Outline ({results.outline.length})
          </button>
          <button
            onClick={() => setActiveFilter('codex')}
            className={`btn ${activeFilter === 'codex' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            <Database size={11} /> Codex Lore ({results.codex.length})
          </button>
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Searching project files...
            </div>
          ) : !searchTerm.trim() ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Type a word or character name above to search across your whole novel.
            </div>
          ) : totalResultsCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matches found for "{searchTerm}".
            </div>
          ) : (
            <>
              {/* 1. SCENES */}
              {(activeFilter === 'all' || activeFilter === 'scenes') && results.scenes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Manuscript Scenes ({results.scenes.length})
                  </div>

                  {results.scenes.map(scene => (
                    <div 
                      key={scene.id} 
                      className="glass-panel hover-card"
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(129, 140, 248, 0.2)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#ffffff', fontSize: '13px' }}>
                          <FileText size={13} style={{ color: 'var(--primary)' }} />
                          <span>{scene.title}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--primary)', backgroundColor: 'rgba(129, 140, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          {scene.occurrences} {scene.occurrences === 1 ? 'match' : 'matches'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '6px 0' }}>
                        {scene.snippets.map((snip, sIdx) => (
                          <div key={sIdx} style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', fontStyle: 'italic' }}>
                            {highlightSnippet(snip, searchTerm)}
                          </div>
                        ))}
                      </div>

                      {onNavigateToScene && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            onClick={() => {
                              onNavigateToScene(scene.id);
                              onClose();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            Open in Editor <ArrowRight size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 2. OUTLINE ELEMENTS */}
              {(activeFilter === 'all' || activeFilter === 'outline') && results.outline.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Outline & Plot Summaries ({results.outline.length})
                  </div>

                  {results.outline.map(item => (
                    <div 
                      key={item.id} 
                      className="glass-panel hover-card"
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(167, 139, 250, 0.2)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#ffffff', fontSize: '13px' }}>
                          <Map size={13} style={{ color: 'var(--secondary)' }} />
                          <span>{highlightSnippet(item.title, searchTerm)}</span>
                        </div>
                        <span className={`badge badge-${item.status}`}>{item.type}</span>
                      </div>

                      {item.summary && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          {highlightSnippet(item.summary, searchTerm)}
                        </div>
                      )}

                      {onNavigateToOutline && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            onClick={() => {
                              onNavigateToOutline();
                              onClose();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            View Outline <ArrowRight size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 3. CODEX LORE */}
              {(activeFilter === 'all' || activeFilter === 'codex') && results.codex.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 600, letterSpacing: '0.05em' }}>
                    Codex World Bible ({results.codex.length})
                  </div>

                  {results.codex.map(entry => (
                    <div 
                      key={entry.id} 
                      className="glass-panel hover-card"
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid rgba(251, 191, 36, 0.2)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#ffffff', fontSize: '13px' }}>
                          <Database size={13} style={{ color: '#fbbf24' }} />
                          <span>{highlightSnippet(entry.name, searchTerm)}</span>
                        </div>
                        <span className="badge badge-primary">{entry.category}</span>
                      </div>

                      {entry.aliases && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          Aliases: {highlightSnippet(entry.aliases, searchTerm)}
                        </div>
                      )}

                      {entry.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {highlightSnippet(entry.description, searchTerm)}
                        </div>
                      )}

                      {onNavigateToCodex && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            onClick={() => {
                              onNavigateToCodex();
                              onClose();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '11px' }}
                          >
                            Open in Codex <ArrowRight size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
