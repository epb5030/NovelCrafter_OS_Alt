import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Heart, 
  Compass, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  BookOpen, 
  Filter
} from 'lucide-react';

export type SubplotCategory = 'main_quest' | 'romance' | 'mystery' | 'political' | 'personal';
export type SubplotStatus = 'introduced' | 'developing' | 'climax' | 'resolved';

export interface Subplot {
  id: number;
  project_id: number;
  title: string;
  category: SubplotCategory;
  status: SubplotStatus;
  summary?: string;
  unresolved_hook: number; // 1 or 0
  target_scene_id?: number;
  target_scene_title?: string;
  created_at: string;
}

interface OutlineSceneOption {
  id: number;
  title: string;
}

interface SubplotTrackerProps {
  projectId: number;
  apiBase: string;
  onNavigateToScene?: (sceneId: number) => void;
}

const CATEGORY_CONFIG: Record<SubplotCategory, { label: string; icon: any; color: string; bg: string }> = {
  main_quest: { label: 'Main Quest', icon: Flame, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
  romance: { label: 'Romantic Arc', icon: Heart, color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)' },
  mystery: { label: 'Mystery & Clues', icon: Compass, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  political: { label: 'Political Intrigue', icon: GitMerge, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)' },
  personal: { label: 'Personal Dilemma', icon: Clock, color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)' }
};

export const SubplotTracker: React.FC<SubplotTrackerProps> = ({
  projectId,
  apiBase,
  onNavigateToScene
}) => {
  const [subplots, setSubplots] = useState<Subplot[]>([]);
  const [scenes, setScenes] = useState<OutlineSceneOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSubplot, setEditingSubplot] = useState<Subplot | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<SubplotCategory>('main_quest');
  const [formStatus, setFormStatus] = useState<SubplotStatus>('introduced');
  const [formSummary, setFormSummary] = useState('');
  const [formUnresolvedHook, setFormUnresolvedHook] = useState(true);
  const [formTargetSceneId, setFormTargetSceneId] = useState<number | ''>('');

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, outlineRes] = await Promise.all([
        fetch(`${apiBase}/projects/${projectId}/subplots`),
        fetch(`${apiBase}/projects/${projectId}/outline`)
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubplots(data);
      }

      if (outlineRes.ok) {
        const outlineData = await outlineRes.json();
        setScenes(outlineData.filter((e: any) => e.type === 'scene'));
      }
    } catch (err) {
      console.error('Failed to fetch subplot data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSubplot(null);
    setFormTitle('');
    setFormCategory('main_quest');
    setFormStatus('introduced');
    setFormSummary('');
    setFormUnresolvedHook(true);
    setFormTargetSceneId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sp: Subplot) => {
    setEditingSubplot(sp);
    setFormTitle(sp.title);
    setFormCategory(sp.category);
    setFormStatus(sp.status);
    setFormSummary(sp.summary || '');
    setFormUnresolvedHook(sp.unresolved_hook === 1);
    setFormTargetSceneId(sp.target_scene_id || '');
    setIsModalOpen(true);
  };

  const handleSaveSubplot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const payload = {
      title: formTitle.trim(),
      category: formCategory,
      status: formStatus,
      summary: formSummary.trim(),
      unresolvedHook: formUnresolvedHook,
      targetSceneId: formTargetSceneId || null
    };

    try {
      if (editingSubplot) {
        const res = await fetch(`${apiBase}/projects/${projectId}/subplots/${editingSubplot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchData();
          setIsModalOpen(false);
        }
      } else {
        const res = await fetch(`${apiBase}/projects/${projectId}/subplots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchData();
          setIsModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to save subplot:', err);
    }
  };

  const handleDeleteSubplot = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subplot thread?')) return;
    try {
      const res = await fetch(`${apiBase}/projects/${projectId}/subplots/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSubplots(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete subplot:', err);
    }
  };

  // Identify unresolved plot hooks (status != resolved && unresolved_hook == 1)
  const unresolvedHooks = subplots.filter(s => s.unresolved_hook === 1 && s.status !== 'resolved');

  const filteredSubplots = subplots.filter(s => {
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        Loading subplot & story threading tracker...
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
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-display)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitMerge size={26} style={{ color: 'var(--primary)' }} /> Subplot & Plot Hole Tracker
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Monitor narrative threads, unresolved plot hooks, and story progression across your manuscript.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', gap: '6px' }}
        >
          <Plus size={16} /> Create Subplot Thread
        </button>
      </div>

      {/* Unresolved Plot Hole Warnings Banner */}
      {unresolvedHooks.length > 0 ? (
        <div 
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.25) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                ⚠️ {unresolvedHooks.length} Unresolved Plot Hooks Detected!
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Active subplots require narrative resolution before book completion: {unresolvedHooks.map(h => `"${h.title}"`).join(', ')}.
              </div>
            </div>
          </div>
        </div>
      ) : subplots.length > 0 ? (
        <div 
          style={{
            background: 'rgba(52, 211, 153, 0.12)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '10px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#34d399',
            fontSize: '13px'
          }}
        >
          <CheckCircle2 size={20} /> All tracked story subplots have clean narrative resolution! Zero plot holes detected.
        </div>
      ) : null}

      {/* Filter Controls Bar */}
      <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Filter size={14} style={{ color: 'var(--primary)' }} />
            <span>Filter Category:</span>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', width: '150px' }}
          >
            <option value="all">All Categories</option>
            <option value="main_quest">Main Quest</option>
            <option value="romance">Romantic Arc</option>
            <option value="mystery">Mystery & Clues</option>
            <option value="political">Political Intrigue</option>
            <option value="personal">Personal Dilemma</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
            style={{ padding: '4px 8px', fontSize: '12px', width: '140px' }}
          >
            <option value="all">All Statuses</option>
            <option value="introduced">Introduced</option>
            <option value="developing">Developing</option>
            <option value="climax">Climax / Peak</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Subplots Cards List Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
        {filteredSubplots.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <GitMerge size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
            <h3 style={{ color: '#ffffff', fontSize: '16px', marginBottom: '6px' }}>No Subplots Found</h3>
            <p style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Track story arcs like romantic subplots, secret clues, or rival political intrigue across acts and chapters.
            </p>
            <button onClick={handleOpenCreate} className="btn btn-primary" style={{ fontSize: '12px' }}>
              <Plus size={14} /> Add First Subplot Thread
            </button>
          </div>
        ) : (
          filteredSubplots.map(sp => {
            const catCfg = CATEGORY_CONFIG[sp.category] || CATEGORY_CONFIG.main_quest;
            const CatIcon = catCfg.icon;
            const isUnresolvedWarning = sp.unresolved_hook === 1 && sp.status !== 'resolved';

            return (
              <div
                key={sp.id}
                className="glass-panel"
                style={{
                  padding: '18px',
                  borderRadius: '12px',
                  border: isUnresolvedWarning ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-light)',
                  background: isUnresolvedWarning
                    ? 'linear-gradient(135deg, rgba(25, 15, 20, 0.95) 0%, rgba(15, 12, 18, 0.95) 100%)'
                    : 'rgba(20, 20, 30, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: 'var(--shadow-medium)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CatIcon size={16} style={{ color: catCfg.color }} />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        {sp.title}
                      </span>
                    </div>

                    <span 
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        background: sp.status === 'resolved' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                        color: sp.status === 'resolved' ? '#34d399' : '#fbbf24',
                        border: sp.status === 'resolved' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)'
                      }}
                    >
                      {sp.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: catCfg.color, marginBottom: '8px' }}>
                    {catCfg.label}
                  </div>

                  {sp.summary && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 10px 0' }}>
                      {sp.summary}
                    </p>
                  )}

                  {sp.target_scene_title && (
                    <div 
                      onClick={() => sp.target_scene_id && onNavigateToScene?.(sp.target_scene_id)}
                      style={{ 
                        fontSize: '11px', 
                        color: '#60a5fa', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        cursor: onNavigateToScene ? 'pointer' : 'default'
                      }}
                      title="Open scene in manuscript editor"
                    >
                      <BookOpen size={11} /> Targeted Scene: <span style={{ fontWeight: 600 }}>{sp.target_scene_title}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isUnresolvedWarning && (
                      <span style={{ fontSize: '10px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={12} /> Hook Alert
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sp)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                    >
                      <Edit3 size={12} /> Edit Thread
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubplot(sp.id)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#f87171' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Subplot Create / Edit Modal */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid var(--primary)',
              background: 'rgba(15, 12, 22, 0.98)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontFamily: 'var(--font-display)', color: '#ffffff' }}>
                {editingSubplot ? 'Edit Subplot Thread' : 'Create New Subplot Thread'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubplot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Subplot Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., The Stolen Amulet Secret"
                  className="input"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as SubplotCategory)}
                    className="input"
                  >
                    <option value="main_quest">Main Quest</option>
                    <option value="romance">Romantic Arc</option>
                    <option value="mystery">Mystery & Clues</option>
                    <option value="political">Political Intrigue</option>
                    <option value="personal">Personal Dilemma</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Story Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as SubplotStatus)}
                    className="input"
                  >
                    <option value="introduced">Introduced</option>
                    <option value="developing">Developing</option>
                    <option value="climax">Climax / Peak</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Summary / Plot Hook Notes
                </label>
                <textarea
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  rows={3}
                  placeholder="Describe the stakes and key scene beats of this story thread..."
                  className="input"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Target Resolution Scene
                </label>
                <select
                  value={formTargetSceneId}
                  onChange={(e) => setFormTargetSceneId(e.target.value ? Number(e.target.value) : '')}
                  className="input"
                >
                  <option value="">(Unlinked / Flexible Resolution)</option>
                  {scenes.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="unresolved_hook"
                  checked={formUnresolvedHook}
                  onChange={(e) => setFormUnresolvedHook(e.target.checked)}
                />
                <label htmlFor="unresolved_hook" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Alert as Plot Hole if left unresolved before climax
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '12px', gap: '6px' }}
                >
                  <Save size={14} /> Save Subplot Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
