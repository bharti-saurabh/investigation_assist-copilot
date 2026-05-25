import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, AlertCircle, X } from 'lucide-react';
import { Alert, LLMConfig } from './types';
import { ALERTS } from './lib/mockData';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';
import SettingsPanel, { loadLLMConfig } from './components/SettingsPanel';
import InvestigationTimeline from './components/InvestigationTimeline';

export default function App() {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(loadLLMConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [investigationKey, setInvestigationKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!llmConfig.apiKey) setShowSettings(true);
  }, []);

  function handleSelectAlert(alert: Alert) {
    setSelectedAlert(alert);
    setActiveAlert(null);
    setError(null);
    setInvestigationKey(k => k + 1);
  }

  function handleStartInvestigation() {
    if (!llmConfig.apiKey) { setShowSettings(true); return; }
    setError(null);
    setActiveAlert(selectedAlert);
  }

  function handleReset() {
    setActiveAlert(null);
    setSelectedAlert(null);
    setError(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar alerts={ALERTS} selectedId={selectedAlert?.id ?? null} onSelect={handleSelectAlert} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
          <span className="text-xs text-gray-400 font-mono">
            {activeAlert
              ? `Investigating: ${activeAlert.id} — ${activeAlert.type}`
              : selectedAlert
              ? `Selected: ${selectedAlert.id}`
              : 'No alert selected'}
          </span>
          <div className="flex items-center gap-3">
            {llmConfig.model && (
              <span className="text-[10px] text-gray-400 font-mono hidden sm:block">{llmConfig.model}</span>
            )}
            {!llmConfig.apiKey && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <AlertCircle size={11} />
                Configure API key
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              title="LLM Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700">LLM API Error</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
              <p className="text-[10px] text-red-500 mt-1">
                Check your API key and Base URL in Settings. If using a corporate proxy, ensure it allows browser (CORS) requests.
              </p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!selectedAlert && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-4">
                <ShieldAlert size={28} className="text-brand-primary" />
              </div>
              <h2 className="text-base font-semibold text-gray-800 mb-2">Select an Alert to Begin</h2>
              <p className="text-sm text-gray-500 max-w-xs">
                Choose a fraud alert from the queue on the left. The AI will guide you through each step of the investigation.
              </p>
            </div>
          )}

          {selectedAlert && !activeAlert && (
            <div className="p-6">
              <AlertBanner alert={selectedAlert} />
              <div className="mt-2">
                <button
                  onClick={handleStartInvestigation}
                  className="flex items-center gap-2 px-5 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-bold rounded-xl transition-colors shadow-md"
                >
                  <ShieldAlert size={16} />
                  Begin AI-Assisted Investigation
                </button>
                {!llmConfig.apiKey && (
                  <p className="text-xs text-yellow-600 mt-2">Configure your LLM API key in Settings before starting.</p>
                )}
              </div>
            </div>
          )}

          {activeAlert && (
            <div className="p-6">
              <AlertBanner alert={activeAlert} />
              <InvestigationTimeline
                key={investigationKey}
                alert={activeAlert}
                llmConfig={llmConfig}
                onReset={handleReset}
                onError={setError}
              />
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={config => { setLLMConfig(config); setShowSettings(false); }}
        />
      )}
    </div>
  );
}
