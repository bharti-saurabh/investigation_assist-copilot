import React from 'react';
import { CheckCircle2, Circle, Loader2, SkipForward } from 'lucide-react';
import { StepStatus } from '../../types';

interface Props {
  stepNumber: number;
  label: string;
  status: StepStatus;
  children?: React.ReactNode;
}

const icons: Record<StepStatus, React.ReactNode> = {
  idle: <Circle size={16} className="text-gray-300" />,
  streaming: <Loader2 size={16} className="text-brand-primary animate-spin" />,
  waiting: <Circle size={16} className="text-brand-accent fill-brand-accent/20" />,
  complete: <CheckCircle2 size={16} className="text-green-600" />,
  skipped: <SkipForward size={16} className="text-gray-400" />,
};

const borderColors: Record<StepStatus, string> = {
  idle: 'border-gray-200',
  streaming: 'border-brand-primary/30 shadow-sm shadow-blue-100',
  waiting: 'border-brand-accent/50 shadow-sm shadow-amber-50',
  complete: 'border-green-200',
  skipped: 'border-gray-200',
};

const headerBg: Record<StepStatus, string> = {
  idle: 'bg-gray-50',
  streaming: 'bg-blue-50',
  waiting: 'bg-amber-50',
  complete: 'bg-green-50',
  skipped: 'bg-gray-50',
};

export default function StepCard({ stepNumber, label, status, children }: Props) {
  if (status === 'idle') return null;

  return (
    <div className={`border rounded-xl mb-4 bg-white overflow-hidden transition-all duration-300 animate-fade-up ${borderColors[status]}`}>
      <div className={`flex items-center gap-3 px-4 py-3 border-b ${borderColors[status].replace('border-', 'border-b-')} ${headerBg[status]}`}>
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-primary/10 flex items-center justify-center text-xs font-bold text-brand-primary">
          {stepNumber}
        </div>
        {icons[status]}
        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
        {status === 'skipped' && <span className="ml-auto text-xs text-gray-400 italic">Skipped — not applicable</span>}
        {status === 'complete' && <span className="ml-auto text-xs text-green-600 font-medium">Complete</span>}
        {status === 'streaming' && <span className="ml-auto text-xs text-brand-primary font-medium">Agent working…</span>}
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
