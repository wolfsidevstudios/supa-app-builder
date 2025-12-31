import React from 'react';
import { Code2, Settings, Github, Plus } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNewProject: () => void;
  onGoHome: () => void;
  onImportGithub: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNewProject, onGoHome, onImportGithub }) => {
  return (
    <div className="flex h-screen w-full bg-background text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-16 border-r border-border flex flex-col justify-between bg-surface/50 backdrop-blur-xl flex-none">
        <div>
          <div className="h-16 flex items-center justify-center border-b border-border cursor-pointer hover:bg-white/5 transition-colors" onClick={onGoHome} title="Home">
            <div className="h-8 w-8 bg-gradient-to-tr from-primary to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Code2 className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <nav className="p-3 space-y-4 mt-4">
             <button 
                onClick={onNewProject}
                className="w-full flex items-center justify-center p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all group"
                title="New Project"
             >
                <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
             </button>
          </nav>
        </div>

        <div className="p-3 space-y-4 mb-4">
            <button 
              onClick={onImportGithub}
              className="w-full flex items-center justify-center p-3 rounded-lg text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Import from GitHub"
            >
                <Github className="h-5 w-5" />
            </button>
            <button 
              className="w-full flex items-center justify-center p-3 rounded-lg text-secondary hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Settings"
            >
                <Settings className="h-5 w-5" />
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background relative">
        {children}
      </main>
    </div>
  );
};