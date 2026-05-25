import React from 'react';
import { BotIcon } from 'lucide-react';

interface Props {
  text: string;
  streaming?: boolean;
}

export default function AgentMessage({ text, streaming }: Props) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center shadow-sm">
        <BotIcon size={14} className="text-brand-accent" />
      </div>
      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-gray-800 leading-relaxed">
        {text}
        {streaming && (
          <span className="inline-block w-1.5 h-4 bg-brand-primary ml-0.5 align-middle animate-blink" />
        )}
      </div>
    </div>
  );
}
