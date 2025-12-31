import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { GitHubImportModal } from './components/GitHubImportModal';
import { Project } from './types';

function App() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);

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
      >
        {currentProject ? (
          <Editor project={currentProject} onUpdateProject={handleProjectUpdate} />
        ) : (
          <Dashboard onProjectCreated={handleProjectCreated} />
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
    </>
  );
}

export default App;