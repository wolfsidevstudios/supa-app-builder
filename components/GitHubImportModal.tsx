import React, { useState } from 'react';
import { X, Github, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { fetchGithubRepo, parseRepoUrl } from '../services/githubService';
import { Project, Framework } from '../types';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (project: Project) => void;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    setError(null);
    
    const repoInfo = parseRepoUrl(url);
    if (!repoInfo) {
      setError("Invalid GitHub URL. Use format: https://github.com/owner/repo");
      return;
    }

    setIsLoading(true);

    try {
      const { name, files } = await fetchGithubRepo(repoInfo.owner, repoInfo.repo, token);
      
      if (files.length === 0) {
        throw new Error("No supported files found in this repository.");
      }

      // Force HTML framework as it's the only supported stack now
      const framework = Framework.HTML;

      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name: name,
        description: `Imported from ${url}`,
        framework: framework,
        createdAt: Date.now(),
        files: files,
        backendType: 'genbase',
        messages: [{
            id: 'init',
            role: 'system',
            content: 'Project imported from GitHub.',
            timestamp: Date.now()
        }],
        // Create a placeholder preview because imported code rarely works immediately in the iframe without bundling
        previewHtml: `
          <!DOCTYPE html>
          <html>
            <body style="background-color: #18181b; color: #e4e4e7; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 20px;">
              <h2 style="margin-bottom: 10px;">Project Imported</h2>
              <p style="max-width: 400px; line-height: 1.5; color: #a1a1aa;">
                This project was imported from GitHub.
                <br/><br/>
                <strong>Tip:</strong> Ask the AI Assistant to "Refactor this code to work in the preview environment" to generate a working single-file bundle.
              </p>
            </body>
          </html>
        `
      };

      onImport(newProject);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to import repository.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Import from GitHub</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Repository URL
            </label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/username/repo"
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Personal Access Token <span className="text-zinc-500 font-normal">(Optional for public repos)</span>
            </label>
            <input 
              type="password" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_..."
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Required for private repositories or to increase rate limits.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-none" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isLoading || !url}>
              {isLoading ? 'Importing...' : 'Import Project'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};