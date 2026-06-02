import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
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
    <div className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#0D1B3E' }}>
      {/* Queue label */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <p className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">
          Alert Queue
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-blue-400">{alerts.length} Pending</span>
          {highCount > 0 && (
            <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
              {highCount} HIGH
            </span>
          )}
        </div>
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
