import React from 'react';
import {
  ShieldAlert, Database, BarChart2, ShieldCheck, Mail, ClipboardCheck,
  CheckCircle2, Loader2, SkipForward, LucideIcon,
} from 'lucide-react';
import { StepStatus } from '../types';

interface Props {
  stepStatuses: StepStatus[];
  activeAlert: boolean;
}

const STEPS: { label: string; icon: LucideIcon }[] = [
  { label: 'Alert Analysis',   icon: ShieldAlert },
  { label: 'Query Builder',    icon: Database },
  { label: 'Data Analysis',    icon: BarChart2 },
  { label: 'Block Rule',       icon: ShieldCheck },
  { label: 'Notification',     icon: Mail },
  { label: 'Summary',          icon: ClipboardCheck },
];

function stepIcon(status: StepStatus, Icon: LucideIcon, idx: number) {
  if (status === 'complete') return <CheckCircle2 size={16} />;
  if (status === 'streaming') return <Loader2 size={16} className="animate-spin" />;
  if (status === 'skipped') return <SkipForward size={14} />;
  if (status === 'waiting') return <Icon size={15} />;
  return <span className="text-[11px] font-bold leading-none">{idx + 1}</span>;
}

function nodeStyle(status: StepStatus): string {
  if (status === 'complete') return 'bg-green-500 text-white shadow-sm shadow-green-200';
  if (status === 'streaming') return 'bg-brand-primary text-white shadow-sm shadow-blue-200';
  if (status === 'waiting') return 'bg-amber-400 text-white shadow-sm shadow-amber-200';
  if (status === 'skipped') return 'bg-gray-300 text-gray-500';
  return 'bg-white text-gray-400 border-2 border-gray-200';
}

function labelStyle(status: StepStatus): string {
  if (status === 'complete') return 'text-green-700 font-semibold';
  if (status === 'streaming') return 'text-brand-primary font-semibold';
  if (status === 'waiting') return 'text-amber-600 font-semibold';
  if (status === 'skipped') return 'text-gray-400';
  return 'text-gray-400';
}

function connectorStyle(leftStatus: StepStatus): string {
  if (leftStatus === 'complete') return 'bg-green-400';
  if (leftStatus === 'streaming' || leftStatus === 'waiting') return 'bg-amber-300';
  return 'bg-gray-200';
}

export default function StepProgressBar({ stepStatuses, activeAlert }: Props) {
  if (!activeAlert) return null;

  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-0" style={{ minHeight: '72px' }}>
      <div className="max-w-5xl mx-auto h-full flex items-center">
        <div className="flex items-center w-full">
          {STEPS.map((step, i) => {
            const status = stepStatuses[i] ?? 'idle';
            const Icon = step.icon;

            return (
              <React.Fragment key={i}>
                {/* Step node */}
                <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '72px' }}>
                  {/* Circle */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${nodeStyle(status)}`}
                  >
                    {stepIcon(status, Icon, i)}
                  </div>
                  {/* Label */}
                  <p className={`text-[10px] mt-1.5 text-center leading-tight transition-colors duration-300 ${labelStyle(status)}`}
                    style={{ maxWidth: '72px' }}>
                    {step.label}
                  </p>
                  {/* Active pulse ring */}
                  {status === 'waiting' && (
                    <div className="absolute w-9 h-9 rounded-full border-2 border-amber-400 animate-ping opacity-30 pointer-events-none" />
                  )}
                </div>

                {/* Connector line between steps */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 relative" style={{ height: '2px', marginBottom: '20px' }}>
                    <div className="absolute inset-0 bg-gray-200 rounded-full" />
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${connectorStyle(status)}`}
                      style={{ width: status === 'complete' ? '100%' : status === 'streaming' || status === 'waiting' ? '50%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
