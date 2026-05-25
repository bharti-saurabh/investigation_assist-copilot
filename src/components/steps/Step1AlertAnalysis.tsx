import React from 'react';
import { ChevronRight, TrendingUp, Store, History, AlertCircle } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { AlertProfile, StepStatus } from '../../types';

interface Props {
  status: StepStatus;
  agentText: string;
  alertProfile: AlertProfile | null;
  onProceed: () => void;
}

function RiskMeter({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 50 ? 'bg-yellow-500' : 'bg-green-500';
  const textColor = score >= 80 ? 'text-red-700' : score >= 50 ? 'text-yellow-700' : 'text-green-700';
  const bg = score >= 80 ? 'bg-red-50 border-red-200' : score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
  return (
    <div className={`border rounded-lg p-3 ${bg}`}>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Risk Score</p>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-black ${textColor}`}>{score}</span>
        <span className={`text-sm font-semibold ${textColor} mb-0.5`}>/100</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
        <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function Step1AlertAnalysis({ status, agentText, alertProfile, onProceed }: Props) {
  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {alertProfile && (
        <div className="mt-4 space-y-3">
          {/* Risk + Pattern row */}
          <div className="grid grid-cols-3 gap-3">
            <RiskMeter score={alertProfile.riskScore} />
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Confidence</p>
              <p className={`text-sm font-bold ${alertProfile.riskScore >= 80 ? 'text-red-700' : alertProfile.riskScore >= 50 ? 'text-yellow-700' : 'text-green-700'}`}>
                {alertProfile.confidence}
              </p>
              <p className="text-[10px] text-gray-500 mt-1 leading-tight">{alertProfile.matchedPattern}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Prior Incidents</p>
              <p className={`text-2xl font-black ${alertProfile.previousIncidents.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {alertProfile.previousIncidents.length}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">on this entity</p>
            </div>
          </div>

          {/* Velocity metrics */}
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
              <TrendingUp size={12} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700">Real-Time Velocity Metrics</span>
            </div>
            <div className="grid grid-cols-5 divide-x divide-gray-100">
              {[
                { label: 'Txns / Hour', value: alertProfile.velocityMetrics.txnsLastHour.toLocaleString() },
                { label: 'Fraud / Hour', value: alertProfile.velocityMetrics.fraudLastHour.toLocaleString(), red: true },
                { label: 'Fraud Rate', value: alertProfile.velocityMetrics.fraudRatePct, red: true },
                { label: 'Baseline / Hr', value: alertProfile.velocityMetrics.baselineHourly.toString() },
                { label: 'Surge', value: alertProfile.velocityMetrics.surgeMultiplier, red: alertProfile.riskScore > 50 },
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
            <div className="grid grid-cols-2 gap-0 divide-y divide-gray-100">
              {[
                ['Registered', alertProfile.merchantProfile.registrationDate],
                ['Lifetime Txns', alertProfile.merchantProfile.totalLifetimeTxns.toLocaleString()],
                ['Avg Monthly Txns', alertProfile.merchantProfile.avgMonthlyTxns.toLocaleString()],
                ['Risk Category', alertProfile.merchantProfile.riskCategory],
                ['MCC', `${alertProfile.merchantProfile.mcc} — ${alertProfile.merchantProfile.mccDescription}`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] text-gray-500">{k}</span>
                  <span className={`text-[11px] font-semibold text-right ${String(v).includes('High Risk') ? 'text-red-600' : String(v).includes('Low Risk') ? 'text-green-600' : 'text-gray-900'}`}>
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
                <thead className="bg-orange-100/50">
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

      {status === 'waiting' && alertProfile && (
        <div className="mt-4 flex items-center justify-between p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
          <p className="text-xs text-gray-600">
            Alert profiled. Ready to generate data fetch queries.
          </p>
          <button
            onClick={onProceed}
            className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            Build Queries <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
