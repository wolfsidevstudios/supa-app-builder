import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { File as FileType } from '../types';

interface CodeViewerProps {
  file: FileType | null;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ file }) => {
  if (!file) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-500 bg-[#09090b]">
        <p>Select a file to view content</p>
      </div>
    );
  }

  // Map file languages to prism languages where necessary
  const getLanguage = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'html': return 'markup';
      case 'vue': return 'markup'; // vue uses html-like syntax
      case 'react': return 'tsx';
      default: return lang;
    }
  };

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-[#1e1e1e]">
      <div className="flex-none px-6 py-3 border-b border-[#333] bg-[#252526] flex items-center justify-between">
        <span className="text-sm font-mono text-zinc-300">{file.name}</span>
        <span className="text-xs text-zinc-500 uppercase">{file.language}</span>
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <SyntaxHighlighter
          language={getLanguage(file.language)}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            background: 'transparent',
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#6e7681',
            textAlign: 'right',
          }}
          wrapLines={true}
        >
          {file.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};