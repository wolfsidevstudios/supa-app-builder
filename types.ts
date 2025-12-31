
export enum Framework {
  HTML = 'HTML'
}

export type BackendType = 'genbase';

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
  genBaseConfig?: GenBaseConfig;
  netlifySiteId?: string;
}

export type ViewMode = 'code' | 'preview' | 'database';
