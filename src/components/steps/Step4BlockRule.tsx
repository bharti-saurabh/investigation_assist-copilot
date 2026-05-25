import React from 'react';
import { ShieldCheck, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { BlockRule, StepStatus } from '../../types';

interface Props {
  status: StepStatus;
  agentText: string;
  blockRule: BlockRule | null;
  onApprove: () => void;
}

export default function Step4BlockRule({ status, agentText, blockRule, onApprove }: Props) {
  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {blockRule && (
        <div className="mt-4 space-y-4">
          {/* Impact KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="border border-green-200 bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-green-700">{blockRule.catchRate}%</p>
              <p className="text-[10px] text-green-600 mt-0.5">Fraud Catch Rate</p>
            </div>
            <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-red-700">{blockRule.fraudBlocked.toLocaleString()}</p>
              <p className="text-[10px] text-red-600 mt-0.5">Fraud Txns Blocked</p>
            </div>
            <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-yellow-700">{blockRule.genuineBlocked}</p>
              <p className="text-[10px] text-yellow-600 mt-0.5">Genuine Impacted</p>
            </div>
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-blue-700">${blockRule.estimatedFraudSavings.toLocaleString()}</p>
              <p className="text-[10px] text-blue-600 mt-0.5">Est. Fraud Savings</p>
            </div>
          </div>

          {/* Rule definition */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-gray-700">
              <ShieldCheck size={13} className="text-brand-accent" />
              <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">Block Rule Definition</span>
              <span className="ml-auto text-[10px] font-mono text-gray-400">{blockRule.ruleId}</span>
            </div>
            <pre className="bg-gray-900 px-4 py-4 text-xs font-mono text-green-400 overflow-x-auto leading-relaxed whitespace-pre">
{blockRule.rule}
            </pre>
          </div>

          {/* Rule parameters table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <Info size={13} className="text-brand-primary" />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Rule Parameters</span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Variable</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['issuer_bin', 'Scopes the rule to the specific BIN under attack — avoids impact on other issuers'],
                  ['merchant_id', 'Restricts block to the exact CAID — fraud is concentrated at this merchant'],
                  ['txn_amount', 'Amount filter ($0.01–$99.99) captures 90.6% of fraud while preserving high-value genuine txns'],
                  ['pos_entry_mode', 'Keyed (01) and fallback (80) are abnormal — genuine customers use chip or contactless'],
                  ['mfa_indicator', 'No-MFA transactions only — genuine customers with 3DS2 are unaffected'],
                ].filter(([v]) => blockRule.variables.some(bv => v.includes(bv) || bv.includes(v))).map(([v, desc]) => (
                  <tr key={v} className="border-t border-gray-100 table-row-hover">
                    <td className="px-4 py-2 font-mono text-brand-primary font-semibold">{v}</td>
                    <td className="px-4 py-2 text-gray-600">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Impact + rationale */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Customer Impact Assessment</p>
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
          <p className="text-xs text-gray-700">Review rule above. Approval activates it on the production network.</p>
          <button
            onClick={onApprove}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm flex-shrink-0"
          >
            <ShieldCheck size={14} />
            Approve & Activate Block <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
