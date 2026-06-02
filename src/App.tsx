import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertCircle, X, BookOpen } from 'lucide-react';
import { Alert, LLMConfig, StepStatus } from './types';
import { ALERTS } from './lib/mockData';
import Sidebar from './components/Sidebar';
import AlertBanner from './components/AlertBanner';
import SettingsPanel, { loadLLMConfig } from './components/SettingsPanel';
import InvestigationTimeline from './components/InvestigationTimeline';
import SopPanel from './components/SopPanel';
import AppHeader from './components/AppHeader';
import StepProgressBar from './components/StepProgressBar';
import Dashboard from './components/Dashboard';

type Tab = 'investigations' | 'dashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('investigations');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [llmConfig, setLLMConfig] = useState<LLMConfig>(loadLLMConfig);
  const [showSettings, setShowSettings] = useState(false);
  const [showSop, setShowSop] = useState(false);
  const [investigationKey, setInvestigationKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(() => Array(6).fill('idle'));
  const [currentVerdict, setCurrentVerdict] = useState<string | null>(null);

  useEffect(() => {
    if (!llmConfig.apiKey) setShowSettings(true);
  }, []);

  function handleSelectAlert(alert: Alert) {
    setSelectedAlert(alert);
    setActiveAlert(null);
    setError(null);
    setInvestigationKey(k => k + 1);
    setStepStatuses(Array(6).fill('idle'));
    setCurrentVerdict(null);
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
    setStepStatuses(Array(6).fill('idle'));
    setCurrentVerdict(null);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">

      {/* Full-width Straive header */}
      <AppHeader
        llmConfig={llmConfig}
        onOpenSettings={() => setShowSettings(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Dashboard tab — full width, no sidebar */}
      {activeTab === 'dashboard' && <Dashboard />}

      {/* Investigations tab */}
      {activeTab === 'investigations' && <>
      {/* Full-width step progress bar */}
      <StepProgressBar stepStatuses={stepStatuses} activeAlert={!!activeAlert} />

      {/* Main body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar alerts={ALERTS} selectedId={selectedAlert?.id ?? null} onSelect={handleSelectAlert} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Slim context bar */}
          <div className="flex items-center justify-between px-5 py-2 border-b border-gray-200 bg-white flex-shrink-0">
            <span className="text-[11px] text-gray-400 font-mono">
              {activeAlert
                ? `Investigating: ${activeAlert.id} — ${activeAlert.type}`
                : selectedAlert
                ? `Selected: ${selectedAlert.id}`
                : 'No alert selected'}
            </span>
            {activeAlert && (
              <button
                onClick={() => setShowSop(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  showSop
                    ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                    : 'bg-white text-brand-primary border-brand-primary/30 hover:bg-brand-primary/5'
                }`}
                title="Review SOP"
              >
                <BookOpen size={12} />
                SOP
              </button>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-5 mt-3 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 flex-shrink-0">
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
          <div className="flex-1 flex overflow-hidden">
            {/* Main scrollable area */}
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
                <div className="p-5">
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
                <div className="p-5">
                  <AlertBanner alert={activeAlert} />
                  <InvestigationTimeline
                    key={investigationKey}
                    alert={activeAlert}
                    llmConfig={llmConfig}
                    onReset={handleReset}
                    onError={setError}
                    onProgress={(statuses, verdict) => {
                      setStepStatuses(statuses);
                      setCurrentVerdict(verdict);
                    }}
                  />
                </div>
              )}
            </div>

            {/* SOP Panel */}
            {showSop && activeAlert && (
              <div className="w-[380px] flex-shrink-0 border-l border-gray-200 overflow-y-auto">
                <SopPanel
                  alert={activeAlert}
                  stepStatuses={stepStatuses}
                  verdict={currentVerdict}
                  onClose={() => setShowSop(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      </>}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={config => { setLLMConfig(config); setShowSettings(false); }}
        />
      )}
    </div>
  );
}
