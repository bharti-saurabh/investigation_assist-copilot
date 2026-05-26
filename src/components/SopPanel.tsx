import React, { useState } from 'react';
import {
  X, BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Loader2, SkipForward, AlertTriangle, Clock, TrendingUp, ShieldCheck, Info,
} from 'lucide-react';
import { Alert, StepStatus } from '../types';
import { getSopForAlert, getStepComplianceStatus } from '../lib/sopData';

interface Props {
  alert: Alert;
  stepStatuses: StepStatus[];
  verdict: string | null;
  onClose: () => void;
}

type Section = 'background' | 'rationale' | 'indicators' | 'sla' | 'procedure';

const STEP_LABELS = [
  'Alert Analysis',
  'Data Query Builder',
  'Data Analysis & Assessment',
  'Block Rule Design',
  'Issuer Notification',
  'Investigation Summary',
];

function ComplianceIcon({ status }: { status: ReturnType<typeof getStepComplianceStatus> }) {
  if (status === 'complete') return <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />;
  if (status === 'active') return <Loader2 size={14} className="text-brand-primary animate-spin flex-shrink-0" />;
  if (status === 'waiting') return <Circle size={14} className="text-amber-500 fill-amber-100 flex-shrink-0" />;
  if (status === 'skipped-ok') return <SkipForward size={14} className="text-gray-400 flex-shrink-0" />;
  if (status === 'skipped-gap') return <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />;
  return <Circle size={14} className="text-gray-300 flex-shrink-0" />;
}

function ComplianceBadge({ status }: { status: ReturnType<typeof getStepComplianceStatus> }) {
  if (status === 'complete') return <span className="badge-green text-[9px] py-0">DONE</span>;
  if (status === 'active') return <span className="badge-blue text-[9px] py-0">ACTIVE</span>;
  if (status === 'waiting') return <span className="badge-yellow text-[9px] py-0">AWAITING</span>;
  if (status === 'skipped-ok') return <span className="badge-gray text-[9px] py-0">N/A</span>;
  if (status === 'skipped-gap') return <span className="badge-red text-[9px] py-0">GAP</span>;
  return <span className="badge-gray text-[9px] py-0 opacity-40">PENDING</span>;
}

function SectionToggle({ label, icon, open, onToggle }: {
  label: string; icon: React.ReactNode; open: boolean; onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-200 text-left"
    >
      {icon}
      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide flex-1">{label}</span>
      {open ? <ChevronDown size={13} className="text-gray-400" /> : <ChevronRight size={13} className="text-gray-400" />}
    </button>
  );
}

export default function SopPanel({ alert, stepStatuses, verdict, onClose }: Props) {
  const sop = getSopForAlert(alert.type);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(['procedure']));

  function toggle(s: Section) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  // Compute compliance summary
  const complianceStatuses = stepStatuses.map((st, i) =>
    getStepComplianceStatus(i, st, sop, verdict)
  );
  const doneCount = complianceStatuses.filter(s => s === 'complete' || s === 'skipped-ok').length;
  const gapCount = complianceStatuses.filter(s => s === 'skipped-gap').length;
  const activeCount = complianceStatuses.filter(s => s === 'active' || s === 'waiting').length;
  const totalRelevant = complianceStatuses.filter(s => s !== 'pending' || stepStatuses.some(st => st !== 'idle')).length;
  const progressPct = Math.round((doneCount / 6) * 100);

  const severityColors = {
    Critical: 'bg-red-100 text-red-800 border-red-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Low: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-brand-primary">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-brand-accent flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white leading-tight">{sop.sopId}</p>
              <p className="text-[10px] text-blue-200 mt-0.5 leading-tight">{alert.type} — Standard Operating Procedure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-300 hover:text-white transition-colors flex-shrink-0 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${severityColors[sop.severity]}`}>
            {sop.severity}
          </span>
          <span className="text-[9px] text-blue-300">v{sop.version}</span>
          <span className="text-[9px] text-blue-300">·</span>
          <span className="text-[9px] text-blue-300">{sop.owner.split('—')[0].trim()}</span>
        </div>
      </div>

      {/* SLA strip */}
      <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-amber-600 flex-shrink-0" />
          <p className="text-[10px] text-amber-800 leading-snug">{sop.sla}</p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Progress tracker */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Investigation Progress</p>
            <span className="text-[10px] font-bold text-gray-700">{doneCount} / 6 steps</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                gapCount > 0 ? 'bg-red-500' :
                progressPct === 100 ? 'bg-green-500' :
                activeCount > 0 ? 'bg-brand-primary' : 'bg-gray-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-2">
            {complianceStatuses.map((status, i) => {
              const dotColor =
                status === 'complete' ? 'bg-green-500' :
                status === 'active' ? 'bg-brand-primary animate-pulse' :
                status === 'waiting' ? 'bg-amber-400' :
                status === 'skipped-ok' ? 'bg-gray-300' :
                status === 'skipped-gap' ? 'bg-red-500' :
                'bg-gray-200';
              return (
                <div
                  key={i}
                  className={`flex-1 h-1 rounded-full ${dotColor}`}
                  title={STEP_LABELS[i]}
                />
              );
            })}
          </div>
          {/* Compliance status line */}
          {gapCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-red-500 flex-shrink-0" />
              <p className="text-[10px] text-red-700 font-semibold">{gapCount} SOP compliance gap{gapCount > 1 ? 's' : ''} — review procedure</p>
            </div>
          ) : progressPct === 100 ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-green-600 flex-shrink-0" />
              <p className="text-[10px] text-green-700 font-semibold">All SOP requirements met</p>
            </div>
          ) : activeCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <Loader2 size={11} className="text-brand-primary animate-spin flex-shrink-0" />
              <p className="text-[10px] text-brand-primary font-semibold">Investigation in progress — on track</p>
            </div>
          ) : (
            <p className="text-[10px] text-gray-500">Investigation not yet started</p>
          )}
        </div>

        {/* BACKGROUND */}
        <SectionToggle
          label="Background"
          icon={<Info size={11} className="text-gray-400" />}
          open={openSections.has('background')}
          onToggle={() => toggle('background')}
        />
        {openSections.has('background') && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] text-gray-700 leading-relaxed">{sop.background}</p>
          </div>
        )}

        {/* RATIONALE */}
        <SectionToggle
          label="Rationale & Regulatory Context"
          icon={<ShieldCheck size={11} className="text-gray-400" />}
          open={openSections.has('rationale')}
          onToggle={() => toggle('rationale')}
        />
        {openSections.has('rationale') && (
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <p className="text-[11px] text-gray-700 leading-relaxed">{sop.rationale}</p>
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-2">
              <Info size={11} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 leading-snug">{sop.regulatoryContext}</p>
            </div>
          </div>
        )}

        {/* KEY INDICATORS */}
        <SectionToggle
          label="Key Indicators & Thresholds"
          icon={<TrendingUp size={11} className="text-gray-400" />}
          open={openSections.has('indicators')}
          onToggle={() => toggle('indicators')}
        />
        {openSections.has('indicators') && (
          <div className="border-b border-gray-100">
            <table className="w-full text-[10px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold text-gray-500 uppercase">Metric</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold text-red-500 uppercase">Suspicious</th>
                  <th className="px-3 py-2 text-left text-[9px] font-semibold text-green-600 uppercase">Organic</th>
                </tr>
              </thead>
              <tbody>
                {sop.keyIndicators.map((ind, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-700">{ind.metric}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-snug">{ind.significance}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="badge-red text-[9px] py-0 whitespace-nowrap">{ind.suspiciousThreshold}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="badge-green text-[9px] py-0 whitespace-nowrap">{ind.organicRange}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* SLA & ESCALATION */}
        <SectionToggle
          label="SLA & Escalation Criteria"
          icon={<AlertTriangle size={11} className="text-gray-400" />}
          open={openSections.has('sla')}
          onToggle={() => toggle('sla')}
        />
        {openSections.has('sla') && (
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-[10px] font-semibold text-amber-800 mb-0.5">Monitoring Window</p>
              <p className="text-[10px] text-amber-700">{sop.monitoringWindow}</p>
            </div>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mt-2">Escalation Triggers</p>
            <ul className="space-y-1.5">
              {sop.escalationCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-1.5" />
                  <p className="text-[10px] text-gray-600 leading-snug">{c}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* PROCEDURE — step-by-step */}
        <SectionToggle
          label="Response Procedure"
          icon={<CheckCircle2 size={11} className="text-gray-400" />}
          open={openSections.has('procedure')}
          onToggle={() => toggle('procedure')}
        />
        {openSections.has('procedure') && (
          <div>
            {sop.steps.map((step, i) => {
              const status = complianceStatuses[i];
              const isGap = status === 'skipped-gap';
              const isActive = status === 'active' || status === 'waiting';
              const isDone = status === 'complete';
              const isSkipped = status === 'skipped-ok';

              const borderColor = isGap ? 'border-l-red-400' :
                isDone ? 'border-l-green-400' :
                isActive ? 'border-l-brand-primary' :
                'border-l-gray-200';

              return (
                <div
                  key={i}
                  className={`border-b border-gray-100 border-l-2 ${borderColor} ${
                    isActive ? 'bg-blue-50/30' :
                    isGap ? 'bg-red-50/30' :
                    isDone ? 'bg-green-50/20' :
                    isSkipped ? 'opacity-60' : ''
                  }`}
                >
                  {/* Step header */}
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                      isDone ? 'bg-green-100 text-green-700' :
                      isActive ? 'bg-brand-primary/10 text-brand-primary' :
                      isGap ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                    <ComplianceIcon status={status} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-semibold ${
                        isDone ? 'text-green-800' :
                        isActive ? 'text-brand-primary' :
                        isGap ? 'text-red-700' :
                        'text-gray-600'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                    <ComplianceBadge status={status} />
                  </div>

                  {/* Gap warning */}
                  {isGap && (
                    <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
                      <AlertTriangle size={11} className="text-red-600 flex-shrink-0" />
                      <p className="text-[10px] text-red-700 font-semibold">SOP deviation — this step was skipped but is mandatory for this verdict</p>
                    </div>
                  )}

                  {/* Step body — show for active, pending, or steps with content worth reviewing */}
                  {!isSkipped && (
                    <div className="px-4 pb-3 space-y-2">
                      <p className="text-[10px] text-gray-600 leading-snug">{step.objective}</p>

                      {/* Key signals */}
                      <div>
                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Key Signals</p>
                        <ul className="space-y-1">
                          {step.keySignals.map((s, j) => (
                            <li key={j} className="flex items-start gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-brand-primary/40 flex-shrink-0 mt-1.5" />
                              <p className="text-[10px] text-gray-600 leading-snug">{s}</p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Mandatory actions */}
                      <div>
                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Mandatory Actions</p>
                        <ul className="space-y-1">
                          {step.mandatoryActions.map((a, j) => (
                            <li key={j} className="flex items-start gap-1.5">
                              <CheckCircle2 size={9} className={`flex-shrink-0 mt-1 ${isDone ? 'text-green-500' : 'text-gray-300'}`} />
                              <p className="text-[10px] text-gray-600 leading-snug">{a}</p>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Decision gate */}
                      <div className="bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5">
                        <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Decision Gate</p>
                        <p className="text-[10px] text-gray-600 leading-snug">{step.decisionGate}</p>
                      </div>
                    </div>
                  )}

                  {/* Skipped — show why it's compliant */}
                  {isSkipped && (
                    <div className="px-4 pb-2.5">
                      <p className="text-[10px] text-gray-400 italic">
                        Not applicable — {step.skippableWhen} verdict. Skipping this step is compliant per {sop.sopId}.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-[9px] text-gray-400 leading-snug">
            {sop.sopId} v{sop.version} · {sop.owner} · Effective {sop.effectiveDate} · Reviewed {sop.reviewedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
