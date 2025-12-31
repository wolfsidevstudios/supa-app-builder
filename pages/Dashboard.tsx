
import React, { useState, useEffect } from 'react';
import { Framework, Project, AIModelConfig } from '../types';
import { Button } from '../components/Button';
import { ContextModal } from '../components/ContextModal';
import { Sparkles, Settings, AtSign, FileText, Zap, Cpu } from 'lucide-react';
import { generateApp } from '../services/geminiService';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface DashboardProps {
  onProjectCreated: (project: Project) => void;
  aiConfig: AIModelConfig;
}

export const Dashboard: React.FC<DashboardProps> = ({ onProjectCreated, aiConfig }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Context Management
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');

  // Framework is always HTML now
  const framework = Framework.HTML;
  const backendType = 'genbase';

  // Handle OAuth tokens on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const netlifyToken = params.get('netlify_access_token');
    if (netlifyToken) {
      localStorage.setItem('netlify_access_token', netlifyToken);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!aiConfig.apiKey) {
      setError("AI API Key is missing. Please add it in Settings.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      let fullPrompt = prompt;
      if (additionalContext.trim()) {
          fullPrompt += `\n\nADDITIONAL CONTEXT/DOCUMENTATION:\n${additionalContext}`;
      }

      let backendConfig: any = undefined;

      setGenerationStep('Provisioning GenBase database...');
      try {
        const res = await fetch('/api/provision', { method: 'POST' });
        if (!res.ok) {
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

      setGenerationStep('Generating application...');
      const generatedData = await generateApp(aiConfig, fullPrompt, framework, backendConfig);
      
      let assistantMessage = generatedData.explanation || "I've generated the initial version of your app.";

      if (backendConfig?.config?.projectId) {
         const schemaFile = generatedData.files.find(f => f.name === 'db/schema.sql' || f.name === 'schema.sql');
         if (schemaFile) {
             setGenerationStep('Applying database schema...');
             try {
                 const res = await fetch('/api/query', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                         projectId: backendConfig.config.projectId,
                         sql: schemaFile.content
                     })
                 });
                 if (!res.ok) {
                   const errText = await res.text();
                   throw new Error(errText);
                 }
                 assistantMessage += "\n\n✅ GenBase database tables created successfully.";
             } catch (e: any) {
                 console.error("GenBase Schema Error", e);
                 assistantMessage += `\n\n⚠️ Failed to apply GenBase schema: ${e.message}`;
             }
         }
      }

      const newProject: Project = {
        id: generateId(),
        name: prompt.slice(0, 20) + (prompt.length > 20 ? '...' : ''),
        description: prompt,
        framework: framework,
        createdAt: Date.now(),
        files: generatedData.files,
        previewHtml: generatedData.previewHtml,
        backendType,
        genBaseConfig: backendConfig.config,
        messages: [
            {
                id: generateId(),
                role: 'user',
                content: fullPrompt,
                timestamp: Date.now()
            },
            {
                id: generateId(),
                role: 'assistant',
                content: assistantMessage,
                timestamp: Date.now() + 1000
            }
        ]
      };

      onProjectCreated(newProject);
    } catch (err: any) {
      setError(err.message || "Failed to generate app. Please try again.");
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
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
            Describe your application. We'll build it with HTML, JS, and a real Postgres database.
          </p>
        </div>

        <div className="bg-surface/50 border border-border rounded-2xl p-2 backdrop-blur-sm shadow-2xl relative">
          
          {!aiConfig.apiKey && (
             <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <div className="bg-surface border border-border p-6 rounded-xl shadow-2xl max-w-md text-center space-y-4">
                    <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <Settings className="h-6 w-6 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">API Key Required</h3>
                    <p className="text-zinc-400 text-sm">To start building apps, you need to provide your AI API Key.</p>
                </div>
             </div>
          )}

          <div className="relative">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!aiConfig.apiKey}
                placeholder="e.g., A minimalist task manager with drag-and-drop, dark mode, and categories..."
                className="w-full bg-transparent text-lg p-6 pb-12 text-white placeholder:text-zinc-600 focus:outline-none resize-none min-h-[140px]"
            />
            
            <div className="absolute bottom-3 left-4">
                <button
                    onClick={() => setIsContextModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        additionalContext.trim() 
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30' 
                        : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-zinc-200'
                    }`}
                >
                    {additionalContext.trim() ? <FileText className="h-3.5 w-3.5" /> : <AtSign className="h-3.5 w-3.5" />}
                    {additionalContext.trim() ? 'Context Added' : 'Context'}
                </button>
            </div>
          </div>
          
          <div className="px-6 pb-4 pt-2 border-t border-white/5">
             <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                   <span>Stack: HTML, Tailwind, GenBase</span>
                   <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                   <span className="flex items-center gap-1 text-blue-400">
                      {aiConfig.provider === 'custom' ? <Cpu className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                      {aiConfig.modelId || 'Gemini 3.0 Flash'}
                   </span>
                </div>
                <Button 
                    onClick={handleGenerate} 
                    disabled={!prompt.trim() || isGenerating || !aiConfig.apiKey}
                    isLoading={isGenerating}
                    className="w-full md:w-auto px-8 py-2.5 rounded-xl text-base"
                >
                    {isGenerating && generationStep ? generationStep : 'Generate App'}
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

      <ContextModal 
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        onSave={setAdditionalContext}
        currentContext={additionalContext}
      />
    </div>
  );
};
