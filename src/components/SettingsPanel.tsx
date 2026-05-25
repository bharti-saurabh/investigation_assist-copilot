import React, { useState } from 'react';
import { X, Save, Eye, EyeOff, Settings } from 'lucide-react';
import { LLMConfig } from '../types';

const STORAGE_KEY = 'ia-copilot-llm-config';

const DEFAULT_CONFIG: LLMConfig = {
  baseUrl: '',
  apiKey: '',
  model: 'claude-sonnet-4-6',
};

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

interface Props {
  onClose: () => void;
  onSave: (config: LLMConfig) => void;
}

export default function SettingsPanel({ onClose, onSave }: Props) {
  const [config, setConfig] = useState<LLMConfig>(loadLLMConfig);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    onSave(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-fade-up">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <Settings size={16} className="text-brand-primary" />
          <h2 className="text-sm font-semibold text-gray-900">LLM Configuration</h2>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Base URL
              <span className="ml-1 text-gray-400 font-normal">(leave blank for Anthropic default)</span>
            </label>
            <input
              type="url"
              placeholder="https://llmfoundry.straive.com/anthropic"
              value={config.baseUrl}
              onChange={e => setConfig(c => ({ ...c, baseUrl: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-ant-... or JWT token"
                value={config.apiKey}
                onChange={e => setConfig(c => ({ ...c, apiKey: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-mono"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Model</label>
            <select
              value={config.model}
              onChange={e => setConfig(c => ({ ...c, model: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
              <option value="claude-opus-4-7">Claude Opus 4.7</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            </select>
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-3">
            Configuration is saved to your browser's localStorage. API keys are sent only to the configured endpoint and never stored on any server.
          </p>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Save size={13} />
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
