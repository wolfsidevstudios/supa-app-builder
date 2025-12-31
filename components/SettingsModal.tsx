import React, { useState, useEffect } from 'react';
import { X, Key, Save, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, apiKey, onSave }) => {
  const [localKey, setLocalKey] = useState(apiKey);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setLocalKey(apiKey);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              Gemini API Key
            </label>
            <div className="relative">
              <input 
                type={isVisible ? "text" : "password"}
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
              />
              <button 
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                {isVisible ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Your API key is stored locally in your browser and used only to communicate with Google Gemini.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} icon={<Save className="h-4 w-4" />}>
              Save Settings
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};