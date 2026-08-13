import { useState, useEffect } from 'react';
import { ProjectDashboard } from './components/ProjectDashboard';
import type { Project } from './components/ProjectDashboard';
import { Layout } from './components/Layout';
import { WriteEditor } from './components/WriteEditor';
import { OutlinePlanner } from './components/OutlinePlanner';
import { CorkboardStudio } from './components/CorkboardStudio';
import { CodexManager } from './components/CodexManager';
import { PlotMatrix } from './components/PlotMatrix';
import { TimelineStudio } from './components/TimelineStudio';
import { WorldMapStudio } from './components/WorldMapStudio';
import { Settings } from './components/Settings';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ExportModal } from './components/ExportModal';
import { AccountModal } from './components/AccountModal';
import type { AuthorProfile } from './components/AccountModal';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3005/api' : '/api';

export type ThemeType = 'vintage-typewriter' | 'antique-library' | 'dark-academia' | 'modern-studio';

function App() {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>('write');
  const [activeProvider, setActiveProvider] = useState<string>('ollama');
  const [activeTheme, setActiveTheme] = useState<ThemeType>('vintage-typewriter');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);

  // Load saved theme from localStorage or settings
  useEffect(() => {
    const savedTheme = (localStorage.getItem('opencrafter_theme') as ThemeType) || 'vintage-typewriter';
    setActiveTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    setActiveTheme(newTheme);
    localStorage.setItem('opencrafter_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Fetch active provider & author profile on load
  const fetchActiveProvider = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const settings = await res.json();
        setActiveProvider(settings.active_provider || 'ollama');
      }
    } catch (err) {
      console.error('Error fetching configuration:', err);
    }
  };

  const fetchActiveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/account/profile`);
      if (res.ok) {
        const profile = await res.json();
        setAuthorProfile(profile);
      }
    } catch (err) {
      console.error('Error fetching author profile:', err);
    }
  };

  useEffect(() => {
    fetchActiveProvider();
    fetchActiveProfile();
  }, []);

  // Global Ctrl+K / Cmd+K search shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (activeProjectId) {
          setIsSearchOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProjectId]);

  // Fetch project details when opened
  useEffect(() => {
    if (activeProjectId === null) {
      setActiveProject(null);
      return;
    }

    const fetchProjectDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/projects/${activeProjectId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveProject(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchProjectDetails();
  }, [activeProjectId]);

  const handleBackToDashboard = () => {
    setActiveProjectId(null);
  };

  // Render correct content pane
  const renderTabContent = () => {
    if (!activeProjectId) return null;

    switch (activeTab) {
      case 'write':
        return (
          <WriteEditor 
            projectId={activeProjectId} 
            apiBase={API_BASE} 
            activeProvider={activeProvider} 
          />
        );
      case 'outline':
        return (
          <OutlinePlanner 
            projectId={activeProjectId} 
            apiBase={API_BASE} 
          />
        );
      case 'corkboard':
        return (
          <CorkboardStudio
            projectId={activeProjectId}
            apiBase={API_BASE}
            onOpenSceneInEditor={() => setActiveTab('write')}
          />
        );
      case 'matrix':
        return (
          <PlotMatrix 
            projectId={activeProjectId} 
            apiBase={API_BASE} 
            onNavigateToScene={() => setActiveTab('write')}
          />
        );
      case 'timeline':
        return (
          <TimelineStudio 
            projectId={activeProjectId} 
            apiBase={API_BASE} 
            onNavigateToScene={() => setActiveTab('write')}
          />
        );
      case 'map':
        return (
          <WorldMapStudio 
            projectId={activeProjectId} 
            apiBase={API_BASE} 
          />
        );
      case 'codex':
        return (
          <CodexManager 
            projectId={activeProjectId} 
            apiBase={API_BASE} 
          />
        );
      case 'settings':
        return (
          <Settings 
            apiBase={API_BASE} 
            onSettingsSaved={fetchActiveProvider} 
            activeTheme={activeTheme}
            onThemeChange={handleThemeChange}
          />
        );
      default:
        return (
          <div style={{ padding: '20px' }}>
            Work In Progress View
          </div>
        );
    }
  };

  if (activeProjectId === null || !activeProject) {
    return (
      <>
        <ProjectDashboard 
          onSelectProject={setActiveProjectId} 
          apiBase={API_BASE}
          authorProfile={authorProfile}
          onOpenAccount={() => setIsAccountModalOpen(true)}
        />
        <AccountModal
          apiBase={API_BASE}
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          activeTheme={activeTheme}
          onThemeChange={handleThemeChange}
          onProfileUpdated={(updated) => setAuthorProfile(updated)}
        />
      </>
    );
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectName={activeProject.title}
        onBackToDashboard={handleBackToDashboard}
        activeProvider={activeProvider}
        authorProfile={authorProfile}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      >
        {renderTabContent()}
      </Layout>

      {/* Global Search & Replace Modal */}
      <GlobalSearchModal
        projectId={activeProjectId}
        apiBase={API_BASE}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigateToScene={() => {
          setActiveTab('write');
          setIsSearchOpen(false);
        }}
        onNavigateToCodex={() => {
          setActiveTab('codex');
          setIsSearchOpen(false);
        }}
        onNavigateToOutline={() => {
          setActiveTab('outline');
          setIsSearchOpen(false);
        }}
      />

      {/* Export Studio Modal */}
      <ExportModal
        projectId={activeProjectId}
        projectName={activeProject.title}
        apiBase={API_BASE}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Author Account & Global Preferences Modal */}
      <AccountModal
        apiBase={API_BASE}
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        activeTheme={activeTheme}
        onThemeChange={handleThemeChange}
        onProfileUpdated={(updated) => setAuthorProfile(updated)}
      />
    </>
  );
}

export default App;
