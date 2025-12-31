import React, { useState } from 'react';
import { Framework, Project, BackendType } from '../types';
import { Button } from '../components/Button';
import { Sparkles, Code, Database, Server, HardDrive } from 'lucide-react';
import { generateApp } from '../services/geminiService';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface DashboardProps {
  onProjectCreated: (project: Project) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onProjectCreated }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [backendType, setBackendType] = useState<BackendType>('mock');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      let backendConfig: any = undefined;

      // 1. Setup Backend Configuration
      if (backendType === 'supabase') {
         if (!supabaseUrl || !supabaseKey) throw new Error("Please provide Supabase credentials.");
         backendConfig = { type: 'supabase', config: { url: supabaseUrl, key: supabaseKey } };
      } else if (backendType === 'genbase') {
         // Call our API to provision a new project ID (and schema in real implementation)
         try {
            const res = await fetch('/api/provision', { method: 'POST' });
            if (!res.ok) {
               // Fallback if API is not available (e.g. local dev without API running)
               console.warn("API provision failed, using fallback ID");
               backendConfig = { type: 'genbase', config: { projectId: `proj_${generateId()}` } };
            } else {
               const data = await res.json();
               backendConfig = { type: 'genbase', config: { projectId: data.projectId } };
            }
         } catch (e) {
            console.warn("API provision error", e);
            backendConfig = { type: 'genbase', config: { projectId: `proj_${generateId()}` } };
         }
      }

      // 2. Generate App Code
      const generatedData = await generateApp(prompt, Framework.HTML, backendConfig);
      
      const newProject: Project = {
        id: generateId(),
        name: prompt.slice(0, 20) + (prompt.length > 20 ? '...' : ''),
        description: prompt,
        framework: Framework.HTML,
        createdAt: Date.now(),
        files: generatedData.files,
        previewHtml: generatedData.previewHtml,
        backendType,
        supabaseConfig: backendType === 'supabase' ? backendConfig.config : undefined,
        genBaseConfig: backendType === 'genbase' ? backendConfig.config : undefined,
        messages: [
            {
                id: generateId(),
                role: 'user',
                content: prompt,
                timestamp: Date.now()
            },
            {
                id: generateId(),
                role: 'assistant',
                content: generatedData.explanation || "I've generated the initial version of your app.",
                timestamp: Date.now() + 1000
            }
        ]
      };

      onProjectCreated(newProject);
    } catch (err: any) {
      setError(err.message || "Failed to generate app. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 md:p-12 flex flex-col items-center justify-center min-h-[500px]">
      <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20 shadow-lg shadow-primary/20">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            What do you want to build?
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Describe your dream application. We'll build it with HTML, Tailwind, and JS.
          </p>
        </div>

        <div className="bg-surface/50 border border-border rounded-2xl p-2 backdrop-blur-sm shadow-2xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A minimalist task manager with drag-and-drop, dark mode, and categories..."
            className="w-full bg-transparent text-lg p-6 text-white placeholder:text-zinc-600 focus:outline-none resize-none min-h-[120px]"
          />
          
          <div className="px-6 pb-4">
             {/* Backend Selection */}
             <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                 <button 
                    onClick={() => setBackendType('mock')}
                    className={`p-3 rounded-xl border text-left transition-all ${backendType === 'mock' ? 'bg-primary/10 border-primary text-white' : 'bg-surface border-white/5 text-zinc-400 hover:bg-white/5'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                        <HardDrive className="h-4 w-4" />
                        <span className="font-medium text-sm">Mock Data</span>
                    </div>
                    <p className="text-xs opacity-70">Browser memory. Good for prototyping.</p>
                 </button>

                 <button 
                    onClick={() => setBackendType('genbase')}
                    className={`p-3 rounded-xl border text-left transition-all ${backendType === 'genbase' ? 'bg-primary/10 border-primary text-white' : 'bg-surface border-white/5 text-zinc-400 hover:bg-white/5'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                        <Server className="h-4 w-4" />
                        <span className="font-medium text-sm">GenBase (Beta)</span>
                    </div>
                    <p className="text-xs opacity-70">Managed Postgres on Neon. Real DB.</p>
                 </button>

                 <button 
                    onClick={() => setBackendType('supabase')}
                    className={`p-3 rounded-xl border text-left transition-all ${backendType === 'supabase' ? 'bg-primary/10 border-primary text-white' : 'bg-surface border-white/5 text-zinc-400 hover:bg-white/5'}`}
                 >
                    <div className="flex items-center gap-2 mb-1">
                        <Database className="h-4 w-4" />
                        <span className="font-medium text-sm">Supabase</span>
                    </div>
                    <p className="text-xs opacity-70">Bring your own keys. Full control.</p>
                 </button>
             </div>

             {/* Supabase Config Inputs */}
             {backendType === 'supabase' && (
                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-black/20 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2">
                    <input 
                        type="text" 
                        placeholder="Supabase Project URL"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input 
                        type="password" 
                        placeholder="Supabase Anon Key"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
             )}

             <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-white/5 pt-4">
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 cursor-default">
                        <Code className="h-4 w-4" />
                        HTML 5 Stack
                    </div>
                </div>

                <Button 
                    onClick={handleGenerate} 
                    disabled={!prompt.trim() || isGenerating}
                    isLoading={isGenerating}
                    className="w-full md:w-auto px-8 py-2.5 rounded-xl text-base"
                >
                    Generate App
                </Button>
            </div>
          </div>
        </div>

        {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
            </div>
        )}

      </div>
    </div>
  );
};