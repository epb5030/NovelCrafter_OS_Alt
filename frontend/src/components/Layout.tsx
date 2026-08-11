import React from 'react';
import { 
  BookOpen, 
  Map, 
  Database, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  Sparkles,
  Search,
  Download,
  LayoutGrid,
  Clock,
  Compass
} from 'lucide-react';
import type { AuthorProfile } from './AccountModal';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  projectName: string;
  onBackToDashboard: () => void;
  activeProvider: string;
  authorProfile?: AuthorProfile | null;
  onOpenAccount?: () => void;
  onOpenSearch?: () => void;
  onOpenExport?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  projectName,
  onBackToDashboard,
  activeProvider,
  authorProfile,
  onOpenAccount,
  onOpenSearch,
  onOpenExport
}) => {
  const menuItems = [
    { id: 'write', label: 'Write', icon: BookOpen },
    { id: 'outline', label: 'Outline', icon: Map },
    { id: 'matrix', label: 'Plot Matrix', icon: LayoutGrid },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'map', label: 'World Map', icon: Compass },
    { id: 'codex', label: 'Codex', icon: Database },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside 
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-light)',
          background: 'rgba(12, 12, 18, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          flexShrink: 0
        }}
      >
        {/* Project Header */}
        <div 
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <button
            onClick={onBackToDashboard}
            className="btn btn-secondary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              justifyContent: 'flex-start',
              width: '100%'
            }}
          >
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          
          <div style={{ marginTop: '8px' }}>
            <h2 
              style={{ 
                fontSize: '18px', 
                color: '#ffffff', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontFamily: 'var(--font-display)'
              }}
              title={projectName}
            >
              {projectName}
            </h2>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '11px', 
                color: 'var(--text-secondary)',
                marginTop: '4px'
              }}
            >
              <Sparkles size={12} color="var(--primary)" />
              <span>AI Mode: <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{activeProvider}</strong></span>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ padding: '12px 16px 4px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="btn btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'space-between',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={14} style={{ color: 'var(--primary)' }} /> Search Project...
              </span>
              <kbd style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                Ctrl+K
              </kbd>
            </button>
          )}

          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="btn btn-secondary"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '8px 12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={14} style={{ color: 'var(--secondary)' }} /> Export Studio...
              </span>
            </button>
          )}
        </div>

        {/* Menu Items */}
        <nav style={{ padding: '12px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, rgba(129,140,248,0.15), rgba(167,139,250,0.15))' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '14px',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Author Account & Global Preferences Footer */}
        {onOpenAccount && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              onClick={onOpenAccount}
              className="btn btn-secondary"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)'
              }}
              title="Author Account, Pen Names & Global Studio Preferences"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%', 
                    backgroundColor: authorProfile?.avatar_color || 'var(--primary)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#ffffff', 
                    fontWeight: 800,
                    fontSize: '11px',
                    flexShrink: 0
                  }}
                >
                  {authorProfile?.pen_name ? authorProfile.pen_name[0].toUpperCase() : 'A'}
                </div>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {authorProfile?.pen_name || 'Author Account'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Global Preferences
                  </div>
                </div>
              </div>
              <SettingsIcon size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          </div>
        )}

        {/* Footer info */}
        <div 
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-light)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>OpenCrafter Studio</span>
          <span>Offline First</span>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};
