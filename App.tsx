import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { GitHubImportModal } from './components/GitHubImportModal';
import { SettingsModal } from './components/SettingsModal';
import { Project } from './types';

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Initialize from localStorage or env
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('gemini_api_key') || process.env.API_KEY || '';
  });

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleProjectCreated = (project: Project) => {
    setCurrentProject(project);
  };

  const handleProjectUpdate = (project: Project) => {
    setCurrentProject(project);
  };

  const handleGoHome = () => {
    setCurrentProject(null);
  };

  return (
    <>
      <Layout 
        onNewProject={() => setCurrentProject(null)} 
        onGoHome={handleGoHome}
        onImportGithub={() => setIsGithubModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      >
        {currentProject ? (
          <Editor 
            project={currentProject} 
            onUpdateProject={handleProjectUpdate} 
            apiKey={apiKey}
          />
        ) : (
          <Dashboard 
            onProjectCreated={handleProjectCreated} 
            apiKey={apiKey}
          />
        )}
      </Layout>
      
      <GitHubImportModal 
        isOpen={isGithubModalOpen} 
        onClose={() => setIsGithubModalOpen(false)} 
        onImport={(project) => {
          setCurrentProject(project);
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