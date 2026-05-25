import React, { useState, useEffect } from 'react';
import { Database, ChevronRight, Code2, CheckCircle2, Loader2, GitBranch, RotateCcw } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { Alert, Query, StepStatus } from '../../types';

type ExecPhase = 'idle' | 'connecting' | 'running-q1' | 'q1-done' | 'running-q2' | 'ready';

interface QueryResult { rows: number; ms: number; mbScanned: number; }

interface LogEntry { time: string; text: string; type: 'info' | 'ok' | 'running' | 'warn'; }

interface Props {
  status: StepStatus;
  agentText: string;
  queries: Query[];
  alert: Alert;
  onFetchData: (queries: Query[]) => void;
}

function SchemaPanel({ alert }: { alert: Alert }) {
  const bin = alert.details.bin;
  const caid = alert.details.caid;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800">
        <GitBranch size={13} className="text-brand-accent" />
        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">Data Lineage — Query Schema</span>
        <span className="ml-auto text-[10px] font-mono text-gray-400">visa_prod ← read-only replica</span>
      </div>
      <div className="bg-gray-50 p-4">
        <div className="flex items-start gap-2">

          {/* Table 1: transactions */}
          <div className="flex-1 border border-blue-300 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="px-3 py-1.5 bg-blue-700 text-white text-[10px] font-mono font-semibold flex items-center gap-1.5">
              <Database size={10} />
              visa_prod.transactions
            </div>
            <div className="px-3 py-2 space-y-1 text-[10px] font-mono">
              <p className="text-yellow-600 font-semibold">PK  txn_id</p>
              <p className="text-gray-500">    txn_timestamp</p>
              <p className="text-gray-500">    fraud_flag</p>
              <p className="text-gray-500">    txn_amount_usd</p>
              <p className="text-gray-500">    pos_entry_mode</p>
              <p className="text-gray-500">    mfa_status</p>
              <p className="text-gray-500">    response_code</p>
              <div className="border-t border-gray-100 mt-1 pt-1 space-y-0.5">
                <p className="text-blue-500">⊛  issuer_bin
                  <span className="ml-1 text-red-500 font-semibold">= {bin}</span>
                </p>
                <p className="text-blue-500">⊛  merchant_caid
                  <span className="ml-1 text-red-500 font-semibold">= {caid}</span>
                </p>
                <p className="text-purple-500">FK  masked_pan ───→</p>
              </div>
            </div>
          </div>

          {/* Join arrow */}
          <div className="flex flex-col items-center flex-shrink-0 pt-10 w-20">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">LEFT JOIN</span>
            <div className="flex items-center w-full">
              <div className="flex-1 h-px bg-gray-400" />
              <ChevronRight size={10} className="text-gray-500 -ml-1 flex-shrink-0" />
            </div>
            <span className="text-[9px] text-gray-400 mt-1 text-center leading-tight">masked_pan<br />+ merchant_caid</span>
          </div>

          {/* Table 2: pan_history */}
          <div className="flex-1 border border-purple-300 rounded-lg overflow-hidden bg-white shadow-sm">
            <div className="px-3 py-1.5 bg-purple-700 text-white text-[10px] font-mono font-semibold flex items-center gap-1.5">
              <Database size={10} />
              visa_prod.pan_history
            </div>
            <div className="px-3 py-2 space-y-1 text-[10px] font-mono">
              <p className="text-yellow-600 font-semibold">PK  masked_pan</p>
              <p className="text-gray-500">    merchant_caid</p>
              <p className="text-gray-500">    first_seen_date</p>
              <p className="text-gray-500">    txn_count_6m</p>
              <p className="text-gray-500">    fraud_count_6m</p>
              <p className="text-gray-500">    avg_amount_6m</p>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <p className="text-purple-500">    6-month baseline →</p>
                <p className="text-purple-500">    history lookup</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter summary bar */}
        <div className="mt-3 px-3 py-2 bg-gray-900 rounded-lg font-mono text-[10px] leading-relaxed">
          <span className="text-purple-400">WHERE </span>
          <span className="text-gray-300">issuer_bin = </span>
          <span className="text-green-400">'{bin}'</span>
          <span className="text-gray-500"> AND </span>
          <span className="text-gray-300">merchant_caid = </span>
          <span className="text-green-400">'{caid}'</span>
          <span className="text-gray-500"> AND </span>
          <span className="text-gray-300">txn_timestamp </span>
          <span className="text-purple-400">BETWEEN </span>
          <span className="text-green-400">NOW()-4h</span>
          <span className="text-gray-500"> AND </span>
          <span className="text-green-400">NOW()</span>
          <span className="text-gray-600 ml-3">-- ~1.2M rows pre-filter</span>
        </div>
      </div>
    </div>
  );
}

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export default function Step2QueryBuilder({ status, agentText, queries, alert, onFetchData }: Props) {
  const [edited, setEdited] = useState<Query[]>([]);
  const [phase, setPhase] = useState<ExecPhase>('idle');
  const [q1Result, setQ1Result] = useState<QueryResult | null>(null);
  const [q2Result, setQ2Result] = useState<QueryResult | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (queries.length > 0 && edited.length === 0) setEdited(queries);
  }, [queries]);

  function addLog(entry: LogEntry) {
    setLog(prev => [...prev, entry]);
  }

  function updateQuery(id: string, value: string) {
    setEdited(qs => qs.map(q => q.id === id ? { ...q, query: value } : q));
  }

  async function handleExecute() {
    setLog([]);
    setQ1Result(null);
    setQ2Result(null);

    setPhase('connecting');
    addLog({ time: ts(), text: `Connecting to visa_prod@prod-ro-1.internal…`, type: 'info' });
    await new Promise(r => setTimeout(r, 350));
    addLog({ time: ts(), text: `Auth: visa_readonly role granted  |  Connection pool: 3/50 active`, type: 'ok' });
    await new Promise(r => setTimeout(r, 150));

    setPhase('running-q1');
    addLog({ time: ts(), text: `Executing Q1 → visa_prod.transactions  (scanning ~1.2M rows…)`, type: 'running' });
    await new Promise(r => setTimeout(r, 820));
    const r1: QueryResult = { rows: 24, ms: 310, mbScanned: 8.4 };
    setQ1Result(r1);
    addLog({ time: ts(), text: `Q1 complete → ${r1.rows} rows  |  ${r1.ms}ms  |  ${r1.mbScanned} MB scanned`, type: 'ok' });
    setPhase('q1-done');

    await new Promise(r => setTimeout(r, 180));
    setPhase('running-q2');
    addLog({ time: ts(), text: `Executing Q2 → transactions JOIN pan_history  (6-month window, 892 PANs…)`, type: 'running' });
    await new Promise(r => setTimeout(r, 1640));
    const r2: QueryResult = { rows: 892, ms: 1830, mbScanned: 142.3 };
    setQ2Result(r2);
    addLog({ time: ts(), text: `Q2 complete → ${r2.rows} rows  |  ${r2.ms}ms  |  ${r2.mbScanned} MB scanned`, type: 'ok' });
    addLog({ time: ts(), text: `Total: ${r1.rows + r2.rows} rows ready  |  ${r1.mbScanned + r2.mbScanned} MB read  |  All results cached`, type: 'ok' });
    setPhase('ready');
  }

  function handleRerun() {
    setPhase('idle');
    setQ1Result(null);
    setQ2Result(null);
    setLog([]);
  }

  const isExecuting = phase === 'connecting' || phase === 'running-q1' || phase === 'running-q2';
  const hasExecuted = phase === 'q1-done' || phase === 'running-q2' || phase === 'ready';

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {/* Schema diagram — shown as soon as queries load */}
      {edited.length > 0 && (
        <div className="mt-4 space-y-4">
          <SchemaPanel alert={alert} />

          {/* SQL editors */}
          {edited.map((q, qi) => (
            <div key={q.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800">
                <Code2 size={13} className="text-brand-accent flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-200">{q.label}</span>
                {qi === 0 && q1Result && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400">
                    <CheckCircle2 size={11} />
                    {q1Result.rows} rows · {q1Result.ms}ms · {q1Result.mbScanned} MB
                  </span>
                )}
                {qi === 1 && q2Result && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400">
                    <CheckCircle2 size={11} />
                    {q2Result.rows} rows · {q2Result.ms}ms · {q2Result.mbScanned} MB
                  </span>
                )}
                {qi === 0 && phase === 'running-q1' && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-yellow-400">
                    <Loader2 size={11} className="animate-spin" />
                    Scanning ~1.2M rows…
                  </span>
                )}
                {qi === 1 && phase === 'running-q2' && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-yellow-400">
                    <Loader2 size={11} className="animate-spin" />
                    Joining pan_history…
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
          {(log.length > 0 || phase === 'connecting') && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 font-mono text-xs space-y-1">
              {log.map((entry, i) => (
                <p key={i} className={
                  entry.type === 'ok' ? 'text-green-400' :
                  entry.type === 'running' ? 'text-yellow-400' :
                  entry.type === 'warn' ? 'text-orange-400' :
                  'text-gray-400'
                }>
                  <span className="text-gray-600">[{entry.time}]</span>
                  {' '}
                  {entry.type === 'ok' && '✓ '}
                  {entry.type === 'running' && '⟳ '}
                  {entry.text}
                </p>
              ))}
              {phase === 'running-q2' && (
                <p className="text-yellow-400 flex items-center gap-2">
                  <Loader2 size={10} className="animate-spin flex-shrink-0" />
                  Building 6-month PAN history window…
                </p>
              )}
              {phase === 'connecting' && (
                <p className="text-yellow-400 flex items-center gap-2">
                  <Loader2 size={10} className="animate-spin flex-shrink-0" />
                  Authenticating…
                </p>
              )}
            </div>
          )}

          {/* Action row */}
          {status === 'waiting' && phase === 'idle' && (
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                Review and edit SQL above. Queries run read-only against <span className="font-mono font-semibold">visa_prod</span> replica.
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
                <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700 font-medium">
                  Both queries complete — {((q1Result?.rows ?? 0) + (q2Result?.rows ?? 0)).toLocaleString()} rows &amp; {((q1Result?.mbScanned ?? 0) + (q2Result?.mbScanned ?? 0)).toFixed(1)} MB ready for analysis.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleRerun}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg transition-colors"
                >
                  <RotateCcw size={11} />
                  Modify &amp; Re-run
                </button>
                <button
                  onClick={() => onFetchData(edited)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                  Proceed to Analysis <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
