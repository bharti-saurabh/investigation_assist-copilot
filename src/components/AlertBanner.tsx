import React from 'react';
import { MapPin, Building2, CreditCard, Globe, AlertTriangle, Tag, CalendarClock } from 'lucide-react';
import { Alert } from '../types';

interface Props {
  alert: Alert;
  compact?: boolean;
}

const severityConfig = {
  High: { bg: 'bg-red-50 border-red-200', dot: 'bg-red-500', badge: 'badge-red', text: 'text-red-700' },
  Medium: { bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500', badge: 'badge-yellow', text: 'text-yellow-700' },
  Low: { bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', badge: 'badge-blue', text: 'text-blue-700' },
};

export default function AlertBanner({ alert, compact }: Props) {
  const cfg = severityConfig[alert.severity];
  const d = alert.details;

  return (
    <div className={`border rounded-xl p-4 mb-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${cfg.dot}`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-gray-900">{alert.type}</span>
              <span className="text-xs text-gray-500 font-mono bg-white border border-gray-200 px-2 py-0.5 rounded">#{alert.id}</span>
              <span className={cfg.badge}>{alert.severity} Severity</span>
              {alert.previousAlerts.length > 0 && (
                <span className="badge-yellow">
                  <AlertTriangle size={10} />
                  {alert.previousAlerts.length} previous incident{alert.previousAlerts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{d.attackTaxonomy}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Detected</p>
          <p className="text-xs text-gray-700 font-medium">{new Date(alert.timestamp).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-black/5">
        <div className="flex items-start gap-2">
          <Building2 size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Merchant · CAID (Card Acceptor ID)</p>
            <p className="text-xs text-gray-900 font-semibold">{d.merchant}</p>
            <p className="text-[10px] font-mono text-gray-500">{d.caid}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CreditCard size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">BIN (Bank ID No.) · MCC</p>
            <p className="text-xs text-gray-900 font-semibold font-mono">{d.bin}</p>
            <p className="text-[10px] text-gray-500">{d.mcc} — {d.mccDescription}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Building2 size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Issuer · Acquirer</p>
            <p className="text-xs text-gray-900 font-semibold">{d.issuerName}</p>
            <p className="text-[10px] text-gray-500">{d.acquirerBank}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Globe size={13} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Geography</p>
            <p className="text-xs text-gray-900 font-semibold">{d.geography}</p>
            <p className="text-[10px] text-gray-500">{d.issuerCountry} → {d.merchantCountry}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
