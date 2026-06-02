import React from 'react';
import { Settings, AlertCircle, Wifi, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { LLMConfig } from '../types';

type Tab = 'investigations' | 'dashboard';

interface Props {
  llmConfig: LLMConfig;
  onOpenSettings: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function AppHeader({ llmConfig, onOpenSettings, activeTab, onTabChange }: Props) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between px-5 h-14 border-b border-white/10"
      style={{ background: '#0D1B3E' }}
    >
      {/* Left: Straive logo + divider + tool name */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <img src="./straive-logo.webp" alt="Straive" className="h-7 w-auto" />
        <div className="w-px h-6 bg-white/20" />
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-wide">Investigation Assist</p>
          <p className="text-[10px] text-blue-300 mt-0.5 leading-none">Fraud Operations · AI Copilot</p>
        </div>
      </div>

      {/* Center: Nav tabs */}
      <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
        <button
          onClick={() => onTabChange('investigations')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
            activeTab === 'investigations'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <ShieldAlert size={12} />
          Investigations
        </button>
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
            activeTab === 'dashboard'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
        >
          <LayoutDashboard size={12} />
          Dashboard
        </button>
      </div>

      {/* Right: live status + settings */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded">
          <Wifi size={10} />
          Live Monitoring
        </div>
        {!llmConfig.apiKey && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-[11px] text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-lg hover:bg-yellow-400/20 transition-colors"
          >
            <AlertCircle size={11} />
            Configure API key
          </button>
        )}
        {llmConfig.model && (
          <span className="text-[10px] text-blue-300/60 font-mono hidden sm:block">{llmConfig.model}</span>
        )}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-white/10 text-blue-300 hover:text-white transition-colors"
          title="LLM Settings"
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  );
}
