import { useState, useEffect } from 'react';
import { ProjectDashboard } from './components/ProjectDashboard';
import type { Project } from './components/ProjectDashboard';
import { Layout } from './components/Layout';
import { WriteEditor } from './components/WriteEditor';
import { OutlinePlanner } from './components/OutlinePlanner';
import { CodexManager } from './components/CodexManager';
import { Settings } from './components/Settings';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ExportModal } from './components/ExportModal';

const API_BASE = import.meta.env.DEV ? 'http://localhost:3005/api' : '/api';

function App() {
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>('write');
  const [activeProvider, setActiveProvider] = useState<string>('ollama');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Fetch active provider on load & settings changes
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

  useEffect(() => {
    fetchActiveProvider();
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
      <ProjectDashboard 
        onSelectProject={setActiveProjectId} 
        apiBase={API_BASE} 
      />
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
    </>
  );
}

export default App;
