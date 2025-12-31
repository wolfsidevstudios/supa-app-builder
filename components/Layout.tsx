
import React from 'react';
import { Code2, Settings, Github, Plus, LayoutGrid } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNewProject: () => void;
  onGoHome: () => void;
  onImportGithub: () => void;
  onOpenSettings: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNewProject, onGoHome, onImportGithub, onOpenSettings }) => {
  return (
    <div className="flex h-screen w-full bg-background text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-16 border-r border-border flex flex-col justify-between bg-surface/50 backdrop-blur-xl flex-none">
        <div>
          <div className="h-16 flex items-center justify-center border-b border-border cursor-pointer hover:bg-white/5 transition-colors" onClick={onGoHome} title="Home">
            <div className="h-8 w-8 bg-gradient-to-tr from-white to-blue-200 rounded-lg flex items-center justify-center shadow-lg shadow-blue-400/20">
              <Code2 className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          
          <nav className="p-3 space-y-4 mt-4">
             <button 
                onClick={onNewProject}
                className="w-full aspect-square flex items-center justify-center rounded-2xl bg-white text-black hover:bg-zinc-200 transition-all group shadow-md shadow-white/5"
                title="New Project"
             >
                <Plus className="h-7 w-7 group-hover:scale-110 transition-transform" strokeWidth={3} />
             </button>

             <button 
                onClick={onGoHome}
                className="w-full flex items-center justify-center p-3 rounded-lg text-secondary hover:text-white hover:bg-white/5 transition-colors"
                title="All Projects"
             >
                <LayoutGrid className="h-5 w-5" />
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
              onClick={onOpenSettings}
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
