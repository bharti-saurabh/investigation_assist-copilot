import React, { useState, useEffect } from 'react';
import { Database, ChevronRight, Code2 } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { Query, StepStatus } from '../../types';

interface Props {
  status: StepStatus;
  agentText: string;
  queries: Query[];
  onFetchData: (queries: Query[]) => void;
}

export default function Step2QueryBuilder({ status, agentText, queries, onFetchData }: Props) {
  const [edited, setEdited] = useState<Query[]>([]);

  useEffect(() => {
    if (queries.length > 0 && edited.length === 0) setEdited(queries);
  }, [queries]);

  function updateQuery(id: string, value: string) {
    setEdited(qs => qs.map(q => q.id === id ? { ...q, query: value } : q));
  }

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {edited.length > 0 && (
        <div className="mt-4 space-y-4">
          {edited.map(q => (
            <div key={q.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
                <Code2 size={13} className="text-brand-accent flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-200">{q.label}</span>
              </div>
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                <p className="text-[11px] text-gray-500">{q.description}</p>
              </div>
              <textarea
                value={q.query}
                onChange={e => updateQuery(q.id, e.target.value)}
                rows={q.query.split('\n').length + 1}
                spellCheck={false}
                className="w-full bg-gray-900 px-4 py-3 text-xs font-mono text-green-400 resize-none focus:outline-none leading-relaxed"
              />
            </div>
          ))}

          {status === 'waiting' && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                Review and edit the SQL above. Queries will run against <span className="font-mono font-semibold">visa_prod</span>.
              </p>
              <button
                onClick={() => onFetchData(edited)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/80 text-gray-900 text-sm font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
              >
                <Database size={13} />
                Execute Queries <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
