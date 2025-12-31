import React, { useState, useEffect } from 'react';
import { Framework, Project, BackendType } from '../types';
import { Button } from '../components/Button';
import { Sparkles, Code, Database, Server, HardDrive, Settings, Link, Check, RefreshCw, LogOut } from 'lucide-react';
import { generateApp } from '../services/geminiService';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface DashboardProps {
  onProjectCreated: (project: Project) => void;
  apiKey: string;
}

interface SupabaseProject {
  id: string;
  name: string;
  ref: string; // The project reference ID
}

export const Dashboard: React.FC<DashboardProps> = ({ onProjectCreated, apiKey }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Backend State
  const [backendType, setBackendType] = useState<BackendType>('mock');
  
  // Manual Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  // OAuth Supabase State
  const [supabaseAccessToken, setSupabaseAccessToken] = useState<string | null>(null);
  const [supabaseProjects, setSupabaseProjects] = useState<SupabaseProject[]>([]);
  const [selectedProjectRef, setSelectedProjectRef] = useState<string>('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [useManualSupabase, setUseManualSupabase] = useState(false);

  // Check for Supabase OAuth Token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('supabase_access_token');
    if (token) {
      setSupabaseAccessToken(token);
      setBackendType('supabase');
      // Clean URL
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // Fetch Supabase Projects when token is available
  useEffect(() => {
    if (supabaseAccessToken && backendType === 'supabase' && !useManualSupabase) {
      fetchSupabaseProjects();
    }
  }, [supabaseAccessToken, backendType, useManualSupabase]);

  // Auto-fetch keys when a project is selected
  useEffect(() => {
    if (selectedProjectRef && supabaseAccessToken) {
      fetchProjectKeys(selectedProjectRef);
    }
  }, [selectedProjectRef]);

  const fetchSupabaseProjects = async () => {
    if (!supabaseAccessToken) return;
    setIsLoadingProjects(true);
    setError(null);
    try {
      const res = await fetch(`/api/supabase/proxy?endpoint=/v1/projects`, {
        headers: { 'Authorization': `Bearer ${supabaseAccessToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setSupabaseProjects(data || []);
      if (data && data.length > 0) {
        setSelectedProjectRef(data[0].ref);
      }
    } catch (err: any) {
      console.error(err);
      setError("Could not load Supabase projects. You may need to reconnect.");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchProjectKeys = async (ref: string) => {
    try {
      const res = await fetch(`/api/supabase/proxy?endpoint=/v1/projects/${ref}/api-keys`, {
        headers: { 'Authorization': `Bearer ${supabaseAccessToken}` }
      });
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      
      const anonKey = data.find((k: any) => k.name === 'anon')?.api_key;
      // Construct URL (standard format for Supabase)
      const url = `https://${ref}.supabase.co`;

      if (anonKey) {
        setSupabaseKey(anonKey);
        setSupabaseUrl(url);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch project keys.");
    }
  };

  const handleConnectSupabase = () => {
     // Redirect to our backend auth endpoint
     window.location.href = '/api/auth/supabase/authorize';
  };

  const handleDisconnectSupabase = () => {
    setSupabaseAccessToken(null);
    setSupabaseProjects([]);
    setSelectedProjectRef('');
    setSupabaseUrl('');
    setSupabaseKey('');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!apiKey) {
      setError("Gemini API Key is missing. Please add it in Settings.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      let backendConfig: any = undefined;

      // 1. Setup Backend Configuration
      if (backendType === 'supabase') {
         if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase credentials. Connect your account or enter details manually.");
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
      const generatedData = await generateApp(apiKey, prompt, Framework.HTML, backendConfig);
      
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

        <div className="bg-surface/50 border border-border rounded-2xl p-2 backdrop-blur-sm shadow-2xl relative">
          
          {!apiKey && (
             <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <div className="bg-surface border border-border p-6 rounded-xl shadow-2xl max-w-md text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Settings className="h-6 w-6 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">API Key Required</h3>
                    <p className="text-zinc-400 text-sm">To start building apps, you need to provide your Gemini API Key.</p>
                </div>
             </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!apiKey}
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
                    <p className="text-xs opacity-70">Connect account. Full control.</p>
                 </button>
             </div>

             {/* Supabase Config UI */}
             {backendType === 'supabase' && (
                <div className="mb-4 bg-black/20 rounded-xl border border-white/5 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                    
                    {!supabaseAccessToken && !useManualSupabase ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                            <p className="text-zinc-300 text-sm max-w-sm">
                                Connect your Supabase account to automatically configure your database connection and generate projects.
                            </p>
                            <Button onClick={handleConnectSupabase} className="bg-[#3ECF8E] hover:bg-[#34b27b] text-white border-none shadow-[#3ECF8E]/20">
                                Connect Supabase
                            </Button>
                            <button 
                                onClick={() => setUseManualSupabase(true)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                            >
                                Or enter credentials manually
                            </button>
                        </div>
                    ) : !useManualSupabase ? (
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                                    <Check className="h-4 w-4" /> Connected to Supabase
                                </div>
                                <button onClick={handleDisconnectSupabase} className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1">
                                    <LogOut className="h-3 w-3" /> Disconnect
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-zinc-400">Select Project</label>
                                <div className="flex gap-2">
                                    <select 
                                        value={selectedProjectRef}
                                        onChange={(e) => setSelectedProjectRef(e.target.value)}
                                        className="flex-1 bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]"
                                        disabled={isLoadingProjects || supabaseProjects.length === 0}
                                    >
                                        {isLoadingProjects ? (
                                            <option>Loading projects...</option>
                                        ) : supabaseProjects.length === 0 ? (
                                            <option value="">No projects found</option>
                                        ) : (
                                            supabaseProjects.map(p => (
                                                <option key={p.id} value={p.ref}>{p.name}</option>
                                            ))
                                        )}
                                    </select>
                                    <button 
                                        onClick={fetchSupabaseProjects} 
                                        className="p-2 bg-surface border border-white/10 rounded-lg hover:bg-white/5 text-zinc-400"
                                        title="Refresh Projects"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isLoadingProjects ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            
                            {supabaseUrl && (
                                <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center gap-2 text-xs text-emerald-400/80">
                                    <Database className="h-3 w-3" />
                                    Configured: {supabaseUrl}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-zinc-400 font-medium">Manual Configuration</span>
                                <button 
                                    onClick={() => setUseManualSupabase(false)}
                                    className="text-xs text-[#3ECF8E] hover:underline"
                                >
                                    Use OAuth instead
                                </button>
                            </div>
                            <input 
                                type="text" 
                                placeholder="Supabase Project URL"
                                value={supabaseUrl}
                                onChange={(e) => setSupabaseUrl(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]"
                            />
                            <input 
                                type="password" 
                                placeholder="Supabase Anon Key"
                                value={supabaseKey}
                                onChange={(e) => setSupabaseKey(e.target.value)}
                                className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]"
                            />
                        </div>
                    )}
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
                    disabled={!prompt.trim() || isGenerating || !apiKey || (backendType === 'supabase' && !supabaseUrl)}
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