
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Projects } from './pages/Projects';
import { GitHubImportModal } from './components/GitHubImportModal';
import { SettingsModal } from './components/SettingsModal';
import { Project } from './types';

type ViewState = 'dashboard' | 'projects' | 'editor';

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Load projects from localStorage
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('supa_projects');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load projects", e);
      return [];
    }
  });

  // Determine initial view based on if projects exist
  const [view, setView] = useState<ViewState>(() => {
     // If we have a project loaded in state (rare on refresh unless persisted separately), use editor
     // Otherwise default to projects list if projects exist, else dashboard
     const saved = localStorage.getItem('supa_projects');
     const hasProjects = saved ? JSON.parse(saved).length > 0 : false;
     return hasProjects ? 'projects' : 'dashboard';
  });

  // Initialize API Key
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || process.env.API_KEY || '';
  });

  // Persist projects whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('supa_projects', JSON.stringify(projects));
    } catch (e) {
      console.error("Failed to save projects to localStorage (Quota exceeded?)", e);
    }
  }, [projects]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    setCurrentProject(project);
    setView('editor');
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    setCurrentProject(updatedProject);
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setView('projects');
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setView('editor');
  };

  const handleNewProject = () => {
    setCurrentProject(null);
    setView('dashboard');
  };

  const handleGoHome = () => {
    setCurrentProject(null);
    setView('projects');
  };

  // Helper to render the active view
  const renderView = () => {
    if (view === 'editor' && currentProject) {
      return (
        <Editor 
          project={currentProject} 
          onUpdateProject={handleProjectUpdate} 
          apiKey={apiKey}
        />
      );
    }

    if (view === 'projects') {
      return (
        <Projects 
          projects={projects}
          onSelectProject={handleSelectProject}
          onDeleteProject={handleDeleteProject}
          onNewProject={handleNewProject}
        />
      );
    }

    // Default to Dashboard
    return (
      <Dashboard 
        onProjectCreated={handleProjectCreated} 
        apiKey={apiKey}
      />
    );
  };

  return (
    <>
      <Layout 
        onNewProject={handleNewProject} 
        onGoHome={handleGoHome}
        onImportGithub={() => setIsGithubModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      >
        {renderView()}
      </Layout>
      
      <GitHubImportModal 
        isOpen={isGithubModalOpen} 
        onClose={() => setIsGithubModalOpen(false)} 
        onImport={(project) => {
          handleProjectCreated(project);
          setIsGithubModalOpen(false);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        apiKey={apiKey}
        onSave={handleSaveApiKey}
      />
    </>
  );
}

export default App;
