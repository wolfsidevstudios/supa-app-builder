import React, { useState, useEffect, useCallback } from 'react';
import { Project, File, ViewMode, Framework } from '../types';
import { CodeViewer } from '../components/CodeViewer';
import { DatabaseViewer } from '../components/DatabaseViewer';
import { Button } from '../components/Button';
import { refineApp } from '../services/geminiService';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Play, 
  Code, 
  MessageSquare, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown,
  FileCode,
  Send,
  Download,
  Maximize2,
  Database,
  Copy,
  Check,
  Server
} from 'lucide-react';

interface EditorProps {
  project: Project;
  onUpdateProject: (project: Project) => void;
  apiKey: string;
}

// --- Helper Component for Rendering Chat Messages ---
const ChatMessageContent: React.FC<{ content: string }> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const language = match ? match[1] : 'text';
          const code = match ? match[2] : part.slice(3, -3);

          return (
            <div key={index} className="rounded-lg overflow-hidden border border-white/10 my-3 shadow-lg bg-[#1e1e1e]">
              <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-white/5">
                <span className="text-xs font-mono text-zinc-400 uppercase">{language || 'code'}</span>
                <button 
                  onClick={() => handleCopy(code, index)}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white"
                  title="Copy code"
                >
                  {copiedIndex === index ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <SyntaxHighlighter
                language={language.toLowerCase() || 'javascript'}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: '1rem',
                  background: 'transparent',
                  fontSize: '13px',
                }}
                wrapLines={true}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          );
        } else {
          // Render regular text with bold formatting support
          // This matches **text** and renders it bold
          const textParts = part.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={index} className="leading-relaxed whitespace-pre-wrap">
              {textParts.map((t, i) => {
                if (t.startsWith('**') && t.endsWith('**')) {
                  return <strong key={i} className="text-white font-bold">{t.slice(2, -2)}</strong>;
                }
                return t;
              })}
            </p>
          );
        }
      })}
    </div>
  );
};

export const Editor: React.FC<EditorProps> = ({ project, onUpdateProject, apiKey }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(project.files.length > 0 ? project.files[0] : null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [chatInput, setChatInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Ensure selected file is valid if project updates
  useEffect(() => {
    if (!project.files.find(f => f.name === selectedFile?.name)) {
        if (project.files.length > 0) setSelectedFile(project.files[0]);
    }
  }, [project.files, selectedFile]);

  // Listen for Live Data Updates from the Preview Iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DB_UPDATE' && Array.isArray(event.data.data)) {
        const newData = event.data.data;
        const dataFileIndex = project.files.findIndex(f => 
            f.name === 'data/initialData.ts' || 
            f.name === 'data/initialData.js' || 
            ((f.name.includes('data/') || f.name.includes('mock')) && 
            (f.name.endsWith('.ts') || f.name.endsWith('.js')))
        );

        if (dataFileIndex !== -1) {
            const dataFile = project.files[dataFileIndex];
            const updatedContent = dataFile.content.replace(
                /\[([\s\S]*?)\]/, 
                JSON.stringify(newData, null, 2)
            );

            if (updatedContent !== dataFile.content) {
                const newFiles = [...project.files];
                newFiles[dataFileIndex] = { ...dataFile, content: updatedContent };
                onUpdateProject({ ...project, files: newFiles });
            }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [project, onUpdateProject]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isRefining) return;

    const userMsg = chatInput;
    setChatInput('');
    setIsRefining(true);

    const updatedMessages = [
        ...project.messages,
        { id: Math.random().toString(), role: 'user' as const, content: userMsg, timestamp: Date.now() }
    ];
    
    onUpdateProject({ ...project, messages: updatedMessages });

    try {
        const refinedData = await refineApp(apiKey, project, userMsg, project.framework);
        
        const assistantMsg = {
            id: Math.random().toString(),
            role: 'assistant' as const,
            content: refinedData.explanation || "I've updated the code based on your feedback.",
            timestamp: Date.now()
        };

        const updatedProject: Project = {
            ...project,
            files: refinedData.files,
            previewHtml: refinedData.previewHtml,
            messages: [...updatedMessages, assistantMsg],
            supabaseConfig: project.supabaseConfig,
            genBaseConfig: project.genBaseConfig,
            backendType: project.backendType
        };

        onUpdateProject(updatedProject);
        setViewMode('preview');
    } catch (error) {
        console.error(error);
    } finally {
        setIsRefining(false);
    }
  };

  const renderContent = () => {
      switch (viewMode) {
          case 'preview':
              return project.previewHtml ? (
                <iframe 
                    title="Live Preview"
                    srcDoc={project.previewHtml}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-scripts allow-same-origin allow-modals allow-forms allow-popups"
                />
             ) : (
                 <div className="flex items-center justify-center h-full text-zinc-500">
                     No preview available.
                 </div>
             );
          case 'code':
              return <CodeViewer file={selectedFile} />;
          case 'database':
              if (project.backendType === 'supabase' && project.supabaseConfig) {
                  return (
                      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 bg-[#09090b] gap-4">
                        <div className="p-4 bg-emerald-500/10 rounded-full">
                           <Database className="h-8 w-8 text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-medium text-white">Supabase Connected</h3>
                        <p className="max-w-md text-center text-sm text-zinc-400">
                            Your app is connected to a live Supabase database. 
                            <br/>
                            Data operations are happening directly in the preview.
                        </p>
                        <div className="flex flex-col gap-2 w-full max-w-sm">
                             <div className="bg-surface border border-border p-3 rounded-lg flex items-center justify-between">
                                 <span className="text-xs text-zinc-500">URL</span>
                                 <span className="text-xs text-zinc-300 font-mono truncate max-w-[200px]">{project.supabaseConfig.url}</span>
                             </div>
                        </div>
                        <p className="text-xs text-zinc-600 mt-4">Check the 'db/schema.sql' file for table definitions.</p>
                      </div>
                  );
              }
              if (project.backendType === 'genbase' && project.genBaseConfig) {
                  return (
                      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 bg-[#09090b] gap-4">
                        <div className="p-4 bg-blue-500/10 rounded-full">
                           <Server className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-medium text-white">GenBase Connected</h3>
                        <p className="max-w-md text-center text-sm text-zinc-400">
                            Managed Postgres Database (Neon.tech).
                            <br/>
                            Requests are proxied through '/api/query'.
                        </p>
                        <div className="flex flex-col gap-2 w-full max-w-sm">
                             <div className="bg-surface border border-border p-3 rounded-lg flex items-center justify-between">
                                 <span className="text-xs text-zinc-500">Project ID</span>
                                 <span className="text-xs text-zinc-300 font-mono truncate max-w-[200px]">{project.genBaseConfig.projectId}</span>
                             </div>
                        </div>
                      </div>
                  );
              }
              return <DatabaseViewer files={project.files} />;
          default:
              return null;
      }
  };

  return (
    <div className="flex h-full w-full bg-[#09090b] text-zinc-100 overflow-hidden">
      
      {/* Chat Panel */}
      <div className="w-[400px] md:w-[450px] border-r border-border bg-surface flex flex-col flex-none z-10 shadow-xl">
        <div className="p-4 border-b border-border font-semibold text-sm tracking-wide text-zinc-200 flex items-center gap-2 bg-surface">
            <MessageSquare className="h-4 w-4 text-primary" />
            AI ASSISTANT
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {project.messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[95%] rounded-2xl px-5 py-4 text-sm ${
                        msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-none shadow-md' 
                        : 'bg-white/5 text-zinc-300 rounded-bl-none border border-white/5'
                    }`}>
                        <ChatMessageContent content={msg.content} />
                    </div>
                    <span className="text-[10px] text-zinc-600 mt-1 px-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
            ))}
             {isRefining && (
                <div className="flex flex-col items-start">
                    <div className="rounded-2xl px-5 py-4 bg-white/5 border border-white/5 rounded-bl-none flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-border bg-surface">
            <div className="relative">
                <textarea 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    placeholder="Describe changes or ask for SQL..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none h-[120px] placeholder:text-zinc-600"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isRefining}
                    className="absolute bottom-4 right-4 p-2 bg-primary rounded-lg text-white disabled:opacity-50 hover:bg-primary-hover transition-colors shadow-lg"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="h-14 border-b border-border bg-surface/50 backdrop-blur flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`p-2 hover:bg-white/5 rounded-md transition-colors ${isSidebarOpen ? 'text-primary' : 'text-zinc-400'}`}
                    title="Toggle File Explorer"
                >
                    <FolderOpen className="h-4 w-4" />
                </button>
                <div className="h-6 w-px bg-white/10 mx-2" />
                <div className="flex bg-surface p-1 rounded-lg border border-white/5">
                    <button
                    onClick={() => setViewMode('preview')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'preview' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    >
                    <Play className="h-3 w-3" />
                    Preview
                    </button>
                    <button
                    onClick={() => setViewMode('code')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'code' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    >
                    <Code className="h-3 w-3" />
                    Code
                    </button>
                    <button
                    onClick={() => setViewMode('database')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        viewMode === 'database' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    >
                    <Database className="h-3 w-3" />
                    {project.backendType === 'genbase' ? 'GenBase' : project.backendType === 'supabase' ? 'Supabase' : 'Data'}
                    </button>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                 {(project.supabaseConfig || project.genBaseConfig) && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Connected
                    </span>
                 )}
                 <span className="text-xs text-zinc-500 hidden md:block">{project.framework} Project</span>
                 <Button variant="secondary" className="h-8 text-xs" icon={<Download className="h-3 w-3"/>}>Export</Button>
            </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">
             {/* Main Preview/Code View */}
            <div className="flex-1 relative bg-black/20">
               {renderContent()}
            </div>

            {/* File Explorer Sidebar - now on the Right or collapsed */}
            {isSidebarOpen && (
                <div className="w-60 border-l border-border bg-surface flex flex-col flex-none transition-all">
                <div className="p-3 border-b border-border flex items-center justify-between bg-surface">
                    <span className="font-semibold text-xs tracking-wide text-zinc-400 uppercase">Files</span>
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-2">
                        {project.files.map((file) => (
                        <button
                            key={file.name}
                            onClick={() => { setSelectedFile(file); setViewMode('code'); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors mb-0.5 group ${
                            selectedFile?.name === file.name && viewMode === 'code'
                                ? 'bg-primary/20 text-primary'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            }`}
                        >
                            <FileCode className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                            <span className="truncate">{file.name}</span>
                        </button>
                        ))}
                    </div>
                </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};