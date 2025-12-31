
export enum Framework {
  HTML = 'HTML'
}

export type BackendType = 'mock' | 'supabase' | 'genbase';

export interface SupabaseConfig {
  url: string;
  key: string;
}

export interface GenBaseConfig {
  projectId: string;
}

export interface File {
  name: string;
  content: string;
  language: string;
}

export interface GeneratedApp {
  files: File[];
  previewHtml: string;
  explanation?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  framework: Framework;
  createdAt: number;
  files: File[];
  previewHtml?: string;
  messages: Message[];
  backendType: BackendType;
  supabaseConfig?: SupabaseConfig;
  genBaseConfig?: GenBaseConfig;
}

export type ViewMode = 'code' | 'preview' | 'database';
