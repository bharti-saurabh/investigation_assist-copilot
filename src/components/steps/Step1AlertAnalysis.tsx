import React, { useState } from 'react';
import { ChevronRight, TrendingUp, Store, History } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { Alert, AlertProfile, StepStatus } from '../../types';

function buildDefaultNote(alert: Alert): string {
  const { bin, merchant, geography, issuerName, attackTaxonomy } = alert.details;
  switch (alert.type) {
    case 'BIN Attack':
      return `Velocity surge on BIN ${bin} at ${merchant} (${geography}). Pattern matches ${attackTaxonomy} — high decline rate and new PAN concentration expected. ${alert.previousAlerts.length > 0 ? `${alert.previousAlerts.length} prior incident(s) on this entity.` : 'No prior incidents.'} Pulling FVR to confirm surge timing and POS mode shift.`;
    case 'ATM Cashout':
      return `Cross-border velocity on BIN ${bin} at ${merchant} (${geography}). Issuer is ${issuerName} — geography mismatch is the key signal. Checking decline rate and PAN velocity against ${geography} baseline. ${alert.previousAlerts.length > 0 ? 'Prior incidents noted.' : 'First alert on this entity.'}`;
    case 'CNP Alert':
      return `Suspected card testing on BIN ${bin} at ${merchant} (CNP, ${geography}). ${attackTaxonomy} — expect low-amount clustering and high MFA bypass rate. ${alert.previousAlerts.length > 0 ? 'Prior incident on this entity.' : 'No prior incidents.'} Pulling FVR to confirm amount distribution and decline pattern.`;
    case 'POS Alert':
      return `High-value POS anomaly on BIN ${bin} at ${merchant} (${geography}). ${issuerName} issuer — ${attackTaxonomy} pattern. Checking POS entry mode shift and PAN history. ${alert.previousAlerts.length > 0 ? 'Prior incidents on file.' : 'No prior incidents on this entity.'}`;
    case 'PRA Alert':
      return `Low-severity PRA — ${merchant} (${geography}, ${issuerName}). ${attackTaxonomy} — likely organic growth. ${alert.previousAlerts.length > 0 ? 'Prior incident flagged as seasonal.' : ''} Checking 6-month decline trend to confirm volume is within expected seasonal bounds before closing.`;
    default:
      return `Alert on BIN ${bin} at ${merchant} (${geography}). ${attackTaxonomy}. Reviewing authorization signals — pulling FVR and transaction history to assess pattern.`;
  }
}

interface Props {
  status: StepStatus;
  agentText: string;
  alert: Alert;
  alertProfile: AlertProfile | null;
  onProceed: () => void;
}

function RiskGauge({ score }: { score: number }) {
  const radius = 32;
  const stroke = 7;
  const norm = radius - stroke / 2;
  const circ = 2 * Math.PI * norm;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#22c55e';
  const textColor = score >= 80 ? 'text-red-700' : score >= 50 ? 'text-yellow-700' : 'text-green-700';
  const bgColor = score >= 80 ? 'bg-red-50 border-red-200' : score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
  const label = score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 40 ? 'ELEVATED' : 'NORMAL';

  return (
    <div className={`border rounded-lg p-3 ${bgColor} flex items-center gap-3`}>
      <div className="relative flex-shrink-0 w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={norm} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
          <circle
            cx="32" cy="32" r={norm} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-black leading-none ${textColor}`}>{score}</span>
          <span className="text-[8px] text-gray-400 leading-none">/100</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Risk Score</p>
        <p className={`text-sm font-bold ${textColor}`}>{label}</p>
      </div>
    </div>
  );
}

export default function Step1AlertAnalysis({ status, agentText, alert, alertProfile, onProceed }: Props) {
  const [notes, setNotes] = useState(() => buildDefaultNote(alert));
  const canProceed = notes.trim().length >= 10;

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {alertProfile && (
        <div className="mt-4 space-y-3">
          {/* Risk + Confidence + Incidents */}
          <div className="grid grid-cols-3 gap-3">
            <RiskGauge score={alertProfile.riskScore} />
            <div className="border border-gray-200 rounded-lg p-3 bg-white">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Confidence</p>
              <p className={`text-sm font-bold ${alertProfile.riskScore >= 80 ? 'text-red-700' : alertProfile.riskScore >= 50 ? 'text-yellow-700' : 'text-green-700'}`}>
                {alertProfile.confidence}
              </p>
              <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">{alertProfile.matchedPattern}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-white">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Prior Incidents</p>
              <p className={`text-2xl font-black ${alertProfile.previousIncidents.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {alertProfile.previousIncidents.length}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">on this BIN/merchant</p>
            </div>
          </div>

          {/* Velocity metrics */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
              <TrendingUp size={12} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700">Real-Time Velocity Metrics</span>
            </div>
            <div className="grid grid-cols-6 divide-x divide-gray-100">
              {[
                { label: 'Txns / Hour',    value: alertProfile.velocityMetrics.txnsLastHour.toLocaleString(),  red: false },
                { label: 'Declines / Hr',  value: alertProfile.velocityMetrics.declinesLastHour.toLocaleString(), red: true },
                { label: 'Decline Rate',   value: alertProfile.velocityMetrics.declineRatePct,                 red: true },
                { label: 'New PAN Ratio',  value: alertProfile.velocityMetrics.newPanRatio,                    red: alertProfile.riskScore > 50 },
                { label: 'Baseline / Hr',  value: alertProfile.velocityMetrics.baselineHourly.toString(),      red: false },
                { label: 'Surge ×',        value: alertProfile.velocityMetrics.surgeMultiplier,                red: alertProfile.riskScore > 50 },
              ].map(m => (
                <div key={m.label} className="px-3 py-3 text-center">
                  <p className={`text-lg font-black ${m.red ? 'text-red-600' : 'text-gray-900'}`}>{m.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Merchant profile */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
              <Store size={12} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700">Merchant Profile</span>
            </div>
            <div className="grid grid-cols-2">
              {[
                ['Registered', alertProfile.merchantProfile.registrationDate],
                ['Lifetime Txns', alertProfile.merchantProfile.totalLifetimeTxns.toLocaleString()],
                ['Avg Monthly Txns', alertProfile.merchantProfile.avgMonthlyTxns.toLocaleString()],
                ['Risk Category', alertProfile.merchantProfile.riskCategory],
                ['MCC', `${alertProfile.merchantProfile.mcc} — ${alertProfile.merchantProfile.mccDescription}`],
              ].map(([k, v], i) => (
                <div key={k} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="text-[11px] text-gray-400">{k}</span>
                  <span className={`text-[11px] font-semibold text-right ${String(v).includes('High Risk') ? 'text-red-600' : String(v).includes('Low Risk') ? 'text-green-600' : 'text-gray-800'}`}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Previous incidents */}
          {alertProfile.previousIncidents.length > 0 && (
            <div className="border border-orange-200 rounded-lg bg-orange-50 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border-b border-orange-200">
                <History size={12} className="text-orange-600" />
                <span className="text-xs font-semibold text-orange-800">Previous Incidents on this Entity</span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-orange-100/60">
                  <tr>
                    {['Case ID', 'Date', 'Type', 'Outcome'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-orange-700 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alertProfile.previousIncidents.map(inc => (
                    <tr key={inc.id} className="border-t border-orange-100">
                      <td className="px-3 py-2 font-mono text-gray-700">{inc.id}</td>
                      <td className="px-3 py-2 text-gray-600">{inc.date}</td>
                      <td className="px-3 py-2 text-gray-700">{inc.type}</td>
                      <td className="px-3 py-2">
                        <span className={inc.outcome === 'TP' ? 'badge-red' : 'badge-green'}>{inc.outcome}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Analyst triage notes — required before proceeding */}
      {status === 'waiting' && alertProfile && (
        <div className="mt-4 space-y-3">
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-700">Initial Triage Notes
                <span className="ml-1 text-gray-400 font-normal">— required before proceeding</span>
              </p>
            </div>
            <div className="p-3">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Record your initial read — what stands out, suspected pattern, any known context on this BIN or merchant…"
                className="w-full text-xs text-gray-800 placeholder-gray-300 border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-brand-primary leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] ${notes.trim().length < 10 ? 'text-gray-400' : 'text-green-600'}`}>
                  {notes.trim().length < 10
                    ? `${10 - notes.trim().length} more chars required`
                    : `✓ ${notes.trim().length} chars — ready to proceed`}
                </span>
                <span className="text-[10px] text-gray-300">Analyst: RJ-99210</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
            <p className="text-xs text-gray-600">
              {canProceed ? 'Triage note recorded. Ready to build data queries.' : 'Add triage notes above before proceeding.'}
            </p>
            <button
              onClick={onProceed}
              disabled={!canProceed}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Record &amp; Build Queries <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
