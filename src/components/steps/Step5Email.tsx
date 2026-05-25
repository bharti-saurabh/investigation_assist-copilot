import React, { useState, useEffect } from 'react';
import { Mail, Send, ChevronRight, Users, Tag, AlertCircle } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { EmailDraft, StepStatus } from '../../types';

interface Props {
  status: StepStatus;
  agentText: string;
  email: EmailDraft | null;
  onSend: () => void;
}

export default function Step5Email({ status, agentText, email, onSend }: Props) {
  const [body, setBody] = useState('');

  useEffect(() => {
    if (email?.body && !body) setBody(email.body);
  }, [email?.body]);

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {email && (
        <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Email header bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <Mail size={13} className="text-brand-primary" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Issuer Notification</span>
            <span className="ml-auto badge-red">{email.priority}</span>
            <span className="badge-gray">{email.templateId}</span>
          </div>

          {/* Metadata fields */}
          <div className="divide-y divide-gray-100 border-b border-gray-200 bg-white">
            <div className="flex items-start gap-3 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-gray-500 w-10 pt-0.5 flex-shrink-0">To</span>
              <div className="flex flex-wrap gap-1.5">
                {email.recipients.map(r => (
                  <span key={r} className="badge-blue">{r}</span>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-gray-500 w-10 pt-0.5 flex-shrink-0">CC</span>
              <div className="flex flex-wrap gap-1.5">
                {email.cc?.map(r => (
                  <span key={r} className="badge-gray">{r}</span>
                ))}
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-gray-500 w-10 pt-0.5 flex-shrink-0">Sub</span>
              <span className="text-xs text-gray-900 font-medium">{email.subject}</span>
            </div>
          </div>

          {/* Editable body */}
          <div className="bg-white">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-500">Email body (editable before sending)</p>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={22}
              className="w-full bg-white px-5 py-4 text-xs font-mono text-gray-800 resize-none focus:outline-none leading-relaxed border-0"
            />
          </div>
        </div>
      )}

      {status === 'waiting' && email && (
        <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle size={13} className="text-blue-500" />
            <p className="text-xs text-blue-700">
              Review the email. Sending dispatches to <strong>{email.issuer}</strong> fraud operations and CC'd parties.
            </p>
          </div>
          <button
            onClick={onSend}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
          >
            <Send size={13} />
            Send Notification <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
