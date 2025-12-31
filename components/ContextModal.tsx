
import React, { useState } from 'react';
import { X, FileText, Link, Save } from 'lucide-react';
import { Button } from './Button';

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (context: string) => void;
  currentContext: string;
}

export const ContextModal: React.FC<ContextModalProps> = ({ isOpen, onClose, onSave, currentContext }) => {
  const [content, setContent] = useState(currentContext);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 rounded-md">
                <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Add Context</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 flex-1 flex flex-col overflow-hidden">
          <p className="text-sm text-zinc-400 mb-4">
            Paste documentation, API references, database schemas, or specific rules you want the AI to follow. 
            You can also paste website text here.
          </p>

          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none placeholder:text-zinc-700"
            placeholder="// Paste your context, code snippets, or documentation here..."
          />
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3 rounded-b-xl bg-surface/50">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
                onClick={() => {
                    onSave(content);
                    onClose();
                }} 
                icon={<Save className="h-4 w-4" />}
                className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Save Context
            </Button>
        </div>
      </div>
    </div>
  );
};
