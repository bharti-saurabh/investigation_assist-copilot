import React, { useState, useMemo } from 'react';
import { ShieldCheck, ChevronRight, AlertTriangle, Lock, Trash2, Plus } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { BlockRule, DiagnosisData, RuleCondition, StepStatus } from '../../types';
import { simulateBlockImpact, AVAILABLE_FIELDS } from '../../lib/mockData';

interface Props {
  status: StepStatus;
  agentText: string;
  diagnosisData: DiagnosisData | null;
  conditions: RuleCondition[];
  onConditionsChange: (c: RuleCondition[]) => void;
  blockRule: BlockRule | null;
  onApprove: () => void;
}

export default function Step4BlockRule({
  status, agentText, diagnosisData, conditions, onConditionsChange, blockRule, onApprove,
}: Props) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const impact = useMemo(() => {
    if (!diagnosisData || conditions.length === 0) return null;
    return simulateBlockImpact(conditions, diagnosisData);
  }, [conditions, diagnosisData]);

  function updateCondition(id: string, patch: Partial<RuleCondition>) {
    onConditionsChange(conditions.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  function removeCondition(id: string) {
    onConditionsChange(conditions.filter(c => c.id !== id));
  }

  function addCondition(f: typeof AVAILABLE_FIELDS[0]) {
    const nc: RuleCondition = {
      id: `c-${Date.now()}`,
      field: f.field,
      label: f.label,
      operator: f.operator,
      value: f.placeholder,
      value2: (f as any).placeholder2 ?? undefined,
      locked: false,
    };
    onConditionsChange([...conditions, nc]);
    setShowAddMenu(false);
  }

  const usedFields = new Set(conditions.map(c => c.field));
  const availableToAdd = AVAILABLE_FIELDS.filter(f => !usedFields.has(f.field));
  const isEditable = status === 'waiting';

  function buildRulePreview() {
    if (conditions.length === 0) return '-- No conditions defined';
    const ruleId = blockRule?.ruleId ?? 'BLK-PENDING';
    const expiry = blockRule?.expiryHours ?? 72;
    const lines = conditions.map((c, i) => {
      const prefix = i === 0 ? '    ' : '  AND ';
      if (c.operator === 'BETWEEN') return `${prefix}${c.field} BETWEEN ${c.value} AND ${c.value2 ?? '?'}`;
      if (c.operator === 'IN') return `${prefix}${c.field} IN ('${c.value.split(',').map(v => v.trim()).join("', '")}')`;
      return `${prefix}${c.field} = '${c.value}'`;
    });
    return `-- Block Rule: ${ruleId}\n-- Expiry: ${expiry}h | Auto-renew: disabled\nBLOCK TRANSACTION WHERE\n${lines.join('\n')}`;
  }

  const showContent = conditions.length > 0;

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {showContent && (
        <div className="mt-4 space-y-4">

          {/* Live Impact KPIs */}
          {impact && (
            <div className="grid grid-cols-4 gap-3">
              <div className="border border-green-200 bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-green-700">{impact.patternCoverage}%</p>
                <p className="text-[10px] text-green-600 mt-0.5">Pattern Coverage</p>
              </div>
              <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-red-700">{impact.suspiciousPatternBlocked.toLocaleString()}</p>
                <p className="text-[10px] text-red-600 mt-0.5">Suspicious Txns Blocked</p>
              </div>
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-yellow-700">{impact.legitimateImpacted.toLocaleString()}</p>
                <p className="text-[10px] text-yellow-600 mt-0.5">Legitimate Impacted</p>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-blue-700">${impact.estimatedRiskExposure.toLocaleString()}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Est. Risk Exposure</p>
              </div>
            </div>
          )}

          {/* Condition Editor */}
          <div className="border border-gray-200 rounded-xl overflow-visible">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 rounded-t-xl">
              <ShieldCheck size={13} className="text-brand-accent" />
              <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">Block Conditions</span>
              <span className="text-[10px] text-gray-400 ml-1">— edit values or add/remove conditions · impact recalculates live</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-7"></th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Field</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase w-20">Operator</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Value(s)</th>
                  <th className="px-3 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {conditions.map(c => (
                  <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 text-center">
                      {c.locked && <Lock size={11} className="text-gray-400 mx-auto" />}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-brand-primary font-semibold">{c.field}</span>
                      <span className="ml-2 text-[10px] text-gray-400">{c.label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{c.operator}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {c.locked ? (
                        <span className="font-mono text-gray-700">{c.value}</span>
                      ) : c.operator === 'BETWEEN' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={c.value}
                            onChange={e => updateCondition(c.id, { value: e.target.value })}
                            disabled={!isEditable}
                            className="w-20 border border-gray-300 rounded px-2 py-0.5 font-mono text-[11px] focus:outline-none focus:border-brand-primary disabled:opacity-60 disabled:bg-gray-50"
                          />
                          <span className="text-[10px] text-gray-400">and</span>
                          <input
                            type="text"
                            value={c.value2 ?? ''}
                            onChange={e => updateCondition(c.id, { value2: e.target.value })}
                            disabled={!isEditable}
                            className="w-20 border border-gray-300 rounded px-2 py-0.5 font-mono text-[11px] focus:outline-none focus:border-brand-primary disabled:opacity-60 disabled:bg-gray-50"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={c.value}
                          onChange={e => updateCondition(c.id, { value: e.target.value })}
                          disabled={!isEditable}
                          className="w-52 border border-gray-300 rounded px-2 py-0.5 font-mono text-[11px] focus:outline-none focus:border-brand-primary disabled:opacity-60 disabled:bg-gray-50"
                          placeholder={c.operator === 'IN' ? 'val1, val2' : 'value'}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {!c.locked && isEditable && (
                        <button
                          onClick={() => removeCondition(c.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          title="Remove condition"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add condition row */}
            {isEditable && (
              <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 rounded-b-xl relative">
                {availableToAdd.length > 0 ? (
                  <>
                    <button
                      onClick={() => setShowAddMenu(v => !v)}
                      className="flex items-center gap-1.5 text-[11px] text-brand-primary font-semibold hover:underline"
                    >
                      <Plus size={12} />
                      Add Condition
                    </button>
                    {showAddMenu && (
                      <div className="absolute left-4 top-9 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-64">
                        {availableToAdd.map(f => (
                          <button
                            key={f.field}
                            onClick={() => addCondition(f)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0"
                          >
                            <span className="font-mono text-brand-primary font-semibold">{f.field}</span>
                            <span className="ml-2 text-gray-500">{f.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] text-gray-400">All available fields are in use</span>
                )}
              </div>
            )}
          </div>

          {/* Generated Rule Preview */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800">
              <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">Generated Rule Preview</span>
              {blockRule && <span className="ml-auto text-[10px] font-mono text-gray-400">{blockRule.ruleId}</span>}
            </div>
            <pre className="bg-gray-900 px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto leading-relaxed whitespace-pre">
              {buildRulePreview()}
            </pre>
          </div>

          {/* Block Validity */}
          {blockRule && (
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Customer Impact</p>
                <p className="text-xs text-gray-700">{blockRule.impact}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-gray-500">False Positive Rate</span>
                  <span className="badge-green">{blockRule.falsePositiveRate}%</span>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Block Validity</p>
                <p className="text-xs text-gray-700">{blockRule.rationale}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-gray-500">Expires after</span>
                  <span className="badge-blue">{blockRule.expiryHours}h — renewable</span>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle size={14} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-orange-700">
              Approving will activate this block rule on the production network immediately. This action is logged and requires supervisor review within 24 hours per SOP-FR-04.
            </p>
          </div>
        </div>
      )}

      {status === 'waiting' && blockRule && (
        <div className="mt-4 flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-xs text-gray-700">
            Review and adjust conditions above. Impact recalculates live.
          </p>
          <button
            onClick={onApprove}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
          >
            <ShieldCheck size={14} />
            Approve &amp; Activate Block <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
