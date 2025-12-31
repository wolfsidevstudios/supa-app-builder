
import React, { useState, useEffect } from 'react';
import { X, Key, Save, AlertCircle, Cpu, Globe } from 'lucide-react';
import { Button } from './Button';
import { AIModelConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AIModelConfig;
  onSave: (config: AIModelConfig) => void;
}

const PRESET_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Recommended)', provider: 'gemini' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro', provider: 'gemini' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.5 Flash (Preview)', provider: 'gemini' },
  { id: 'gemini-2.0-pro-exp-02-05', name: 'Gemini 2.5 Pro (Preview)', provider: 'gemini' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<AIModelConfig>(config);
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     const val = e.target.value;
     if (val === 'custom') {
         setLocalConfig({ ...localConfig, provider: 'custom', modelId: '', baseUrl: '' });
     } else {
         setLocalConfig({ ...localConfig, provider: 'gemini', modelId: val });
     }
  };

  const isPreset = localConfig.provider === 'gemini' && PRESET_MODELS.some(m => m.id === localConfig.modelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-white" />
            <h2 className="text-lg font-semibold text-white">AI Settings</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              AI Model
            </label>
            <select
                value={localConfig.provider === 'custom' ? 'custom' : localConfig.modelId}
                onChange={handlePresetChange}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
                {PRESET_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                <option value="custom">Custom / OpenAI Compatible</option>
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              API Key {localConfig.provider === 'gemini' ? '(Google AI)' : ''}
            </label>
            <div className="relative">
              <input 
                type={isKeyVisible ? "text" : "password"}
                value={localConfig.apiKey}
                onChange={(e) => setLocalConfig({...localConfig, apiKey: e.target.value})}
                placeholder={localConfig.provider === 'gemini' ? "AIza..." : "sk-..."}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
              />
              <button 
                onClick={() => setIsKeyVisible(!isKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                {isKeyVisible ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Custom Settings */}
          {localConfig.provider === 'custom' && (
              <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/5 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
                      <Globe className="h-4 w-4" />
                      <span>Custom Endpoint Config</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Base URL
                    </label>
                    <input 
                        type="text"
                        value={localConfig.baseUrl || ''}
                        onChange={(e) => setLocalConfig({...localConfig, baseUrl: e.target.value})}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Model ID
                    </label>
                    <input 
                        type="text"
                        value={localConfig.modelId}
                        onChange={(e) => setLocalConfig({...localConfig, modelId: e.target.value})}
                        placeholder="gpt-4o, claude-3-5, llama-3..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600"
                    />
                  </div>
              </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
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
