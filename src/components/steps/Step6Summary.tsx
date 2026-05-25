import React from 'react';
import { CheckCircle2, RotateCcw, ClipboardList, Clock, CheckSquare, XSquare } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { SummaryData, StepStatus } from '../../types';

interface Props {
  status: StepStatus;
  agentText: string;
  summary: SummaryData | null;
  assessment: string;
  onReset: () => void;
}

export default function Step6Summary({ status, agentText, summary, assessment, onReset }: Props) {
  const isTP = assessment === 'True Positive';

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {summary && (
        <div className="mt-4 space-y-4">
          {/* Verdict banner */}
          <div className={`border-2 rounded-xl p-4 flex items-center gap-4 ${isTP ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isTP ? 'bg-red-100' : 'bg-green-100'}`}>
              <CheckCircle2 size={24} className={isTP ? 'text-red-600' : 'text-green-600'} />
            </div>
            <div>
              <p className={`text-lg font-black ${isTP ? 'text-red-800' : 'text-green-800'}`}>{assessment}</p>
              <p className={`text-xs ${isTP ? 'text-red-600' : 'text-green-600'}`}>{summary.status}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-gray-500">Ticket Reference</p>
              <p className="text-sm font-bold font-mono text-gray-900">{summary.ticketId}</p>
            </div>
          </div>

          {/* Actions taken */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <ClipboardList size={13} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions Completed</span>
            </div>
            <div className="p-4 space-y-2">
              {summary.actions.map((action, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-gray-700">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Investigation timeline */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <Clock size={13} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Investigation Timeline</span>
            </div>
            <div className="p-4">
              <div className="relative pl-5 space-y-3">
                <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-200" />
                {summary.timeline.map((entry, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <div className="absolute -left-4 w-2 h-2 rounded-full bg-brand-primary mt-1.5 flex-shrink-0" />
                    <span className="text-[10px] font-mono text-gray-500 w-16 flex-shrink-0 mt-0.5">{entry.time}</span>
                    <span className="text-xs text-gray-700">{entry.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SOP Checklist */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <CheckSquare size={13} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">SOP Compliance Checklist</span>
              <span className="ml-auto text-[10px] text-gray-500">SOP-FR-04</span>
            </div>
            <div className="divide-y divide-gray-100">
              {summary.sopChecklist.map((item, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${item.passed ? '' : 'bg-gray-50'}`}>
                  {item.passed
                    ? <CheckSquare size={13} className="text-green-600 flex-shrink-0" />
                    : <XSquare size={13} className="text-gray-400 flex-shrink-0" />}
                  <span className={`text-xs ${item.passed ? 'text-gray-700' : 'text-gray-400'}`}>{item.item}</span>
                  <span className={`ml-auto text-[10px] font-semibold ${item.passed ? 'text-green-600' : 'text-gray-400'}`}>
                    {item.passed ? 'PASS' : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isTP && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>{summary.monitoringDays}-day monitoring window active.</strong> Automated alerts will fire if fraud rate increases beyond threshold on this CAID/BIN.
              </p>
            </div>
          )}
        </div>
      )}

      {status === 'complete' && summary && (
        <div className="mt-4">
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-lg border border-gray-300 transition-colors shadow-sm"
          >
            <RotateCcw size={13} />
            Start New Investigation
          </button>
        </div>
      )}
    </div>
  );
}
