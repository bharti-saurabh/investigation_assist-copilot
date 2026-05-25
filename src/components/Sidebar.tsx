import React from 'react';
import { AlertTriangle, ShieldAlert, Clock, Wifi } from 'lucide-react';
import { Alert } from '../types';

interface Props {
  alerts: Alert[];
  selectedId: string | null;
  onSelect: (alert: Alert) => void;
}

const severityDot = { High: 'bg-red-500', Medium: 'bg-yellow-500', Low: 'bg-blue-400' };
const severityText = { High: 'text-red-300', Medium: 'text-yellow-300', Low: 'text-blue-300' };

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function Sidebar({ alerts, selectedId, onSelect }: Props) {
  const highCount = alerts.filter(a => a.severity === 'High').length;

  return (
    <div className="w-64 flex-shrink-0 bg-brand-secondary flex flex-col" style={{ background: '#0D1B3E' }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center shadow">
            <ShieldAlert size={16} className="text-brand-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">IA Copilot</p>
            <p className="text-[10px] text-blue-300 mt-0.5">Fraud Investigation Assist</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded">
            <Wifi size={10} />
            Live Monitoring
          </div>
          {highCount > 0 && (
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
              {highCount} HIGH
            </span>
          )}
        </div>
      </div>

      {/* Queue label */}
      <div className="px-4 py-2.5 border-b border-white/5">
        <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">
          Alert Queue — {alerts.length} Pending
        </p>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {alerts.map(alert => {
          const isSelected = selectedId === alert.id;
          return (
            <button
              key={alert.id}
              onClick={() => onSelect(alert)}
              className={`w-full text-left px-4 py-3.5 border-b border-white/5 transition-all ${
                isSelected
                  ? 'bg-brand-accent/15 border-l-2 border-l-brand-accent'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${severityDot[alert.severity]}`} />
                  <span className={`text-[10px] font-bold uppercase ${severityText[alert.severity]}`}>
                    {alert.severity}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{alert.id}</span>
              </div>
              <p className="text-xs font-semibold text-white mb-0.5">{alert.type}</p>
              <p className="text-[11px] text-gray-400 truncate">{alert.details.merchant}</p>
              <div className="flex items-center gap-1 mt-1.5">
                <Clock size={9} className="text-gray-600" />
                <span className="text-[10px] text-gray-600">{timeAgo(alert.timestamp)}</span>
                {alert.previousAlerts.length > 0 && (
                  <span className="ml-auto text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                    {alert.previousAlerts.length} prior
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Analyst badge */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-[10px] text-gray-500">Analyst</p>
        <p className="text-xs font-semibold text-gray-300">RJ-99210 · Fraud Ops</p>
      </div>
    </div>
  );
}
