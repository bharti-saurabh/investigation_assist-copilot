import React, { useState, useEffect } from 'react';
import { Database, ChevronRight, Code2, CheckCircle2, Loader2 } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { Query, StepStatus } from '../../types';

type ExecPhase = 'idle' | 'running-q1' | 'q1-done' | 'running-q2' | 'ready';

interface QueryResult { rows: number; ms: number; }

interface Props {
  status: StepStatus;
  agentText: string;
  queries: Query[];
  onFetchData: (queries: Query[]) => void;
}

export default function Step2QueryBuilder({ status, agentText, queries, onFetchData }: Props) {
  const [edited, setEdited] = useState<Query[]>([]);
  const [phase, setPhase] = useState<ExecPhase>('idle');
  const [q1Result, setQ1Result] = useState<QueryResult | null>(null);
  const [q2Result, setQ2Result] = useState<QueryResult | null>(null);

  useEffect(() => {
    if (queries.length > 0 && edited.length === 0) setEdited(queries);
  }, [queries]);

  function updateQuery(id: string, value: string) {
    setEdited(qs => qs.map(q => q.id === id ? { ...q, query: value } : q));
  }

  async function handleExecute() {
    setPhase('running-q1');
    await new Promise(r => setTimeout(r, 820));
    setQ1Result({ rows: 24, ms: 310 });
    setPhase('q1-done');
    await new Promise(r => setTimeout(r, 200));
    setPhase('running-q2');
    await new Promise(r => setTimeout(r, 1640));
    setQ2Result({ rows: 892, ms: 1830 });
    setPhase('ready');
  }

  const isExecuting = phase === 'running-q1' || phase === 'running-q2';
  const hasExecuted = phase === 'q1-done' || phase === 'running-q2' || phase === 'ready';

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {edited.length > 0 && (
        <div className="mt-4 space-y-4">
          {edited.map((q, qi) => (
            <div key={q.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800">
                <Code2 size={13} className="text-brand-accent flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-200">{q.label}</span>
                {/* Execution status inline */}
                {qi === 0 && q1Result && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400">
                    <CheckCircle2 size={11} />
                    {q1Result.rows} rows · {q1Result.ms}ms
                  </span>
                )}
                {qi === 1 && q2Result && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400">
                    <CheckCircle2 size={11} />
                    {q2Result.rows} rows · {q2Result.ms}ms
                  </span>
                )}
                {qi === 0 && phase === 'running-q1' && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-yellow-400">
                    <Loader2 size={11} className="animate-spin" />
                    Executing…
                  </span>
                )}
                {qi === 1 && phase === 'running-q2' && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-yellow-400">
                    <Loader2 size={11} className="animate-spin" />
                    Executing…
                  </span>
                )}
              </div>
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5">
                <p className="text-[11px] text-gray-500">{q.description}</p>
              </div>
              <textarea
                value={q.query}
                onChange={e => updateQuery(q.id, e.target.value)}
                rows={q.query.split('\n').length + 1}
                spellCheck={false}
                disabled={isExecuting || hasExecuted}
                className="w-full bg-gray-900 px-4 py-3 text-xs font-mono text-green-400 resize-none focus:outline-none leading-relaxed disabled:opacity-70"
              />
            </div>
          ))}

          {/* Execution log */}
          {hasExecuted && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 font-mono text-xs space-y-1">
              {q1Result && (
                <p className="text-green-400">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                  {' '}✓ FVR query → visa_prod.transactions — <span className="text-white font-semibold">{q1Result.rows} rows</span> returned in {q1Result.ms}ms
                </p>
              )}
              {phase === 'running-q2' && (
                <p className="text-yellow-400 flex items-center gap-2">
                  <Loader2 size={10} className="animate-spin" />
                  Running 6-month baseline + PAN history join…
                </p>
              )}
              {q2Result && (
                <p className="text-green-400">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                  {' '}✓ Baseline query → visa_prod.transactions JOIN pan_history — <span className="text-white font-semibold">{q2Result.rows} rows</span> returned in {q2Result.ms}ms
                </p>
              )}
            </div>
          )}

          {/* Action row */}
          {status === 'waiting' && phase === 'idle' && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                Review and edit the SQL above. Queries run against <span className="font-mono font-semibold">visa_prod</span>.
              </p>
              <button
                onClick={handleExecute}
                className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent/80 text-gray-900 text-sm font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
              >
                <Database size={13} />
                Execute Queries
              </button>
            </div>
          )}

          {status === 'waiting' && phase === 'ready' && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-600" />
                <p className="text-xs text-green-700 font-medium">
                  Both queries complete — {(q1Result?.rows ?? 0) + (q2Result?.rows ?? 0)} rows ready for analysis.
                </p>
              </div>
              <button
                onClick={() => onFetchData(edited)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
              >
                Proceed to Analysis <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
