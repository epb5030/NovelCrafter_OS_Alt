import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Trash2, Download, Upload, Book, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import type { AuthorProfile } from './AccountModal';

export interface Project {
  id: number;
  title: string;
  summary: string;
  genre: string;
  created_at: string;
  updated_at: string;
}

interface ProjectDashboardProps {
  onSelectProject: (projectId: number) => void;
  apiBase: string;
  authorProfile?: AuthorProfile | null;
  onOpenAccount?: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ 
  onSelectProject, 
  apiBase,
  authorProfile,
  onOpenAccount 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/projects`);
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Error loading projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleTemplate = async () => {
    try {
      setCreatingTemplate(true);
      const res = await fetch(`${apiBase}/projects/sample-template`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to create sample template');
      const newProj = await res.json();
      setProjects(prev => [newProj, ...prev]);
      onSelectProject(newProj.id);
    } catch (err: any) {
      setError(err.message || 'Error initializing sample project');
    } finally {
      setCreatingTemplate(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch(`${apiBase}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, summary, genre })
      });
      if (!res.ok) throw new Error('Failed to create project');
      
      const newProj = await res.json();
      setProjects(prev => [newProj, ...prev]);
      setIsCreateModalOpen(false);
      setTitle('');
      setSummary('');
      setGenre('');
      
      // Auto open newly created project
      onSelectProject(newProj.id);
    } catch (err: any) {
      setError(err.message || 'Error creating project');
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you absolutely sure you want to delete this project? This will permanently delete all manuscript, outline scenes, and codex entries.')) {
      return;
    }

    try {
      const res = await fetch(`${apiBase}/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting project');
    }
  };

  const handleExport = async (id: number, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${apiBase}/projects/${id}/export`);
      if (!res.ok) throw new Error('Failed to export project');
      
      const data = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${title.replace(/\s+/g, '_')}_backup.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert(err.message || 'Error exporting project');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = JSON.parse(event.target?.result as string);
        const res = await fetch(`${apiBase}/projects/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fileContent)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to import project');
        }

        const importedProj = await res.json();
        setProjects(prev => [importedProj, ...prev]);
        alert(`Project "${importedProj.title}" successfully imported!`);
      } catch (err: any) {
        alert(`Error importing: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      style={{ 
        padding: '40px 60px', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%', 
        overflowY: 'auto',
        height: '100vh'
      }}
      className="animate-fade"
    >
      {/* Top Banner Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '40px',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '20px'
        }}
      >
        <div>
          <h1 
            style={{ 
              fontSize: '32px', 
              fontFamily: 'var(--font-display)', 
              fontWeight: 800,
              background: 'linear-gradient(to right, #ffffff, var(--primary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px'
            }}
          >
            OpenCrafter
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Write and plan your novels offline with dynamic AI context references.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Author Profile / Account Trigger */}
          {onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid var(--border-light)',
                background: 'rgba(0,0,0,0.25)'
              }}
              title="Manage Author Account, Pen Names & Global Studio Preferences"
            >
              <div 
                style={{ 
                  width: '22px', 
                  height: '22px', 
                  borderRadius: '50%', 
                  backgroundColor: authorProfile?.avatar_color || 'var(--primary)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#ffffff', 
                  fontWeight: 800,
                  fontSize: '10px'
                }}
              >
                {authorProfile?.pen_name ? authorProfile.pen_name[0].toUpperCase() : 'A'}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
                {authorProfile?.pen_name || 'Author Account'}
              </span>
              <SettingsIcon size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}

          {/* Quickstart Demo Template Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCreateSampleTemplate}
            disabled={creatingTemplate}
            style={{ 
              padding: '10px 16px', 
              border: '1px solid var(--primary)', 
              color: 'var(--primary)',
              background: 'rgba(200, 157, 84, 0.1)' 
            }}
            title="Instantly generate pre-populated Fantasy Novel (Codex, Cartography, Plot Matrix, Manuscript)"
          >
            <Sparkles size={16} /> {creatingTemplate ? 'Initializing Demo...' : '⚡ Quickstart Demo Project'}
          </button>

          {/* Import Button */}
          <label 
            className="btn btn-secondary" 
            style={{ cursor: 'pointer', padding: '10px 16px' }}
          >
            <Upload size={16} /> Import Project
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              style={{ display: 'none' }} 
            />
          </label>
          
          <button 
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ padding: '10px 20px' }}
          >
            <Plus size={16} /> Create Project
          </button>
        </div>
      </div>

      {error && (
        <div 
          style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            color: '#f87171',
            marginBottom: '24px'
          }}
        >
          {error}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          Loading your stories...
        </div>
      ) : projects.length === 0 ? (
        <div 
          className="glass-panel"
          style={{ 
            textAlign: 'center', 
            padding: '80px 40px',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <Book size={48} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ color: '#ffffff', fontSize: '20px', fontFamily: 'var(--font-display)' }}>No novels found</h3>
          <p style={{ maxWidth: '400px', fontSize: '14px' }}>
            Get started by creating a new story project, or import an existing OpenCrafter backup file.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ marginTop: '8px' }}
          >
            <Plus size={16} /> Write Your First Novel
          </button>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '24px'
          }}
        >
          {projects.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="glass-panel"
              style={{
                padding: '24px',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '240px',
                border: '1px solid var(--border-light)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span 
                    className="badge" 
                    style={{ 
                      backgroundColor: 'rgba(129, 140, 248, 0.1)', 
                      color: 'var(--primary)',
                      border: '1px solid rgba(129, 140, 248, 0.2)' 
                    }}
                  >
                    {project.genre || 'General Fiction'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={(e) => handleExport(project.id, project.title, e)}
                      className="btn btn-secondary"
                      style={{ padding: '6px', borderRadius: '6px' }}
                      title="Export Backup"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="btn btn-danger"
                      style={{ padding: '6px', borderRadius: '6px' }}
                      title="Delete Story"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 
                  style={{ 
                    fontSize: '20px', 
                    color: '#ffffff', 
                    marginBottom: '8px', 
                    fontFamily: 'var(--font-display)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {project.title}
                </h3>
                <p 
                  style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '13px',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    height: '58px'
                  }}
                >
                  {project.summary || 'No summary written yet.'}
                </p>
              </div>

              <div 
                style={{ 
                  borderTop: '1px solid var(--border-light)', 
                  paddingTop: '12px', 
                  fontSize: '11px', 
                  color: 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Updated: {new Date(project.updated_at).toLocaleDateString()}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                  Open Manuscript <FolderOpen size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '20px', color: '#ffffff' }}>
              Create New Novel Project
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Story Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="input" 
                  placeholder="e.g. The Winds of Fate"
                  required 
                />
              </div>

              <div>
                <label className="label">Genre</label>
                <input 
                  type="text" 
                  value={genre} 
                  onChange={(e) => setGenre(e.target.value)} 
                  className="input" 
                  placeholder="e.g. Fantasy, Sci-Fi, Thriller"
                />
              </div>

              <div>
                <label className="label">Story Concept / Logline</label>
                <textarea 
                  value={summary} 
                  onChange={(e) => setSummary(e.target.value)} 
                  className="input" 
                  rows={4}
                  placeholder="Brief synopsis of the overall story (will be referenced by the AI to maintain general context)."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Start Writing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
