
import React from 'react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { Plus, Trash2, ExternalLink, Code2, Clock, Calendar } from 'lucide-react';

interface ProjectsProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProject: () => void;
}

export const Projects: React.FC<ProjectsProps> = ({ projects, onSelectProject, onDeleteProject, onNewProject }) => {
  
  if (projects.length === 0) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Code2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">No projects yet</h2>
        <p className="text-zinc-400 max-w-md mb-8">
          Start building your first AI-powered application today. It only takes a few seconds.
        </p>
        <Button onClick={onNewProject} icon={<Plus className="h-4 w-4" />}>
          Create New Project
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Your Projects</h1>
            <p className="text-zinc-400 mt-1">Manage and edit your AI-generated applications.</p>
          </div>
          <Button onClick={onNewProject} icon={<Plus className="h-4 w-4" />}>
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col h-64"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Code2 className="h-6 w-6 text-primary" />
                  </div>
                  {project.netlifySiteId && (
                     <span className="text-[10px] uppercase tracking-wider font-semibold text-[#00C7B7] bg-[#00C7B7]/10 px-2 py-1 rounded-full border border-[#00C7B7]/20">
                        Deployed
                     </span>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2 line-clamp-1" title={project.name}>
                  {project.name}
                </h3>
                <p className="text-zinc-400 text-sm line-clamp-2 mb-4 flex-1">
                  {project.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-auto">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                     <span className={`w-2 h-2 rounded-full ${project.backendType === 'genbase' ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                     {project.framework}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-black/20 border-t border-border flex items-center gap-3">
                <Button 
                  onClick={() => onSelectProject(project)} 
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/5"
                  icon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                  Open
                </Button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm('Are you sure you want to delete this project?')) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
