import React, { useState } from 'react';
import { Activity, Globe, CreditCard, BarChart3, Hash, Loader2, ChevronRight } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { DiagnosisData, FVRRow, StepStatus, Assessment } from '../../types';
import { TP_REASON_CODES, FP_REASON_CODES } from '../../lib/mockData';

interface Props {
  status: StepStatus;
  agentText: string;
  fvrData: FVRRow[] | null;
  data: DiagnosisData | null;
  onAssessment: (a: Assessment) => void;
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-brand-primary">{icon}</span>
      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
    </div>
  );
}

function FraudBar({ rate, max }: { rate: number; max: number }) {
  const pct = max > 0 ? (rate / max) * 100 : 0;
  const color = rate > 50 ? 'bg-red-500' : rate > 10 ? 'bg-orange-400' : rate > 1 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

type Tab = 'fvr' | 'transactions' | 'response_codes' | 'geography' | 'pans' | 'amounts' | 'trend';

function FVRPanel({ fvrData }: { fvrData: FVRRow[] }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <SectionHeader icon={<Activity size={13} />} title="FVR — Hourly Velocity (24 Hours)" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Hour', 'Total Txns', 'Fraud Txns', 'Fraud Rate', 'Total Amount', 'Fraud Amount'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fvrData.map((row, i) => {
              const isHot = row.fraud_rate_pct > 50;
              const isMed = row.fraud_rate_pct > 10;
              return (
                <tr key={i} className={`border-t border-gray-100 ${isHot ? 'bg-red-50' : isMed ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-3 py-1.5 font-mono font-semibold text-gray-700">{row.hour}</td>
                  <td className="px-3 py-1.5 text-gray-700">{row.total_txns.toLocaleString()}</td>
                  <td className={`px-3 py-1.5 font-semibold ${isHot ? 'text-red-700' : 'text-gray-600'}`}>{row.fraud_txns.toLocaleString()}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isHot ? 'text-red-700' : isMed ? 'text-orange-600' : 'text-gray-500'}`}>{row.fraud_rate_pct}%</span>
                      <FraudBar rate={row.fraud_rate_pct} max={100} />
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-gray-500">${row.total_amount.toLocaleString()}</td>
                  <td className={`px-3 py-1.5 font-semibold ${isHot ? 'text-red-700' : 'text-gray-500'}`}>${row.fraud_amount.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AssessmentForm({ onAssessment }: { onAssessment: (a: Assessment) => void }) {
  const [verdict, setVerdict] = useState<'True Positive' | 'False Positive'>('True Positive');
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low'>('High');
  const [reasonCode, setReasonCode] = useState('');
  const [notes, setNotes] = useState('');
  const reasonCodes = verdict === 'True Positive' ? TP_REASON_CODES : FP_REASON_CODES;
  const canSubmit = reasonCode && notes.trim().length >= 20;

  function handleSubmit() {
    if (!canSubmit) return;
    onAssessment({
      verdict,
      confidence,
      reasonCode,
      notes: notes.trim(),
      analystId: 'RJ-99210',
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="border-2 border-brand-primary/20 bg-white rounded-xl overflow-hidden mt-4">
      <div className="flex items-center justify-between px-4 py-3 bg-brand-primary/5 border-b border-brand-primary/10">
        <div>
          <p className="text-sm font-bold text-gray-900">Analyst Assessment</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Analyst: RJ-99210 · {new Date().toLocaleTimeString()} UTC</p>
        </div>
        <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded font-mono">SOP-FR-04 §3.2</span>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Verdict</label>
            <select
              value={verdict}
              onChange={e => { setVerdict(e.target.value as any); setReasonCode(''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="True Positive">True Positive — Confirmed Fraud</option>
              <option value="False Positive">False Positive — Legitimate Activity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confidence Level</label>
            <select
              value={confidence}
              onChange={e => setConfidence(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            >
              <option value="High">High — I'm certain</option>
              <option value="Medium">Medium — Likely, some uncertainty</option>
              <option value="Low">Low — Needs further review</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason Code</label>
          <select
            value={reasonCode}
            onChange={e => setReasonCode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
          >
            <option value="">— Select reason code —</option>
            {reasonCodes.map(r => (
              <option key={r.code} value={r.code}>{r.code}: {r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Supporting Observations
            <span className="ml-1 text-gray-400 font-normal">(minimum 20 characters — this goes into the case record)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. 78% keyed entry, 90.6% of fraud concentrated at $49.99, 72% new PANs with no merchant history. Consistent with automated card testing. POS entry mode shift is definitive."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary resize-none"
          />
          <p className={`text-[10px] mt-1 ${notes.length < 20 ? 'text-gray-400' : 'text-green-600'}`}>
            {notes.length} / 20 characters minimum
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          {confidence === 'Low' && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
              Low confidence — supervisor review recommended before placing a block.
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`ml-auto flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg transition-colors shadow-sm ${
              canSubmit
                ? verdict === 'True Positive'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit Assessment <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Step3DataDashboard({ status, agentText, fvrData, data, onAssessment }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'transactions', label: 'Txn Sample' },
    { id: 'response_codes', label: 'Response Codes' },
    { id: 'geography', label: 'Geography' },
    { id: 'pans', label: 'PAN Velocity' },
    { id: 'amounts', label: 'Amount Dist.' },
    { id: 'trend', label: '6-Month Trend' },
  ];

  return (
    <div>
      {agentText && (
        <AgentMessage text={agentText} streaming={status === 'streaming'} />
      )}

      {/* FVR panel appears as soon as fvrData is set */}
      {fvrData && <div className="mt-4"><FVRPanel fvrData={fvrData} /></div>}

      {/* Loading indicator while history query runs */}
      {fvrData && !data && (
        <div className="mt-3 flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <Loader2 size={13} className="text-brand-primary animate-spin flex-shrink-0" />
          <p className="text-xs text-gray-500 font-mono">Running Query 2 → visa_prod.transactions JOIN pan_history…</p>
        </div>
      )}

      {/* Full analysis panels after history arrives */}
      {data && (
        <div className="mt-4 space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { label: 'Fraud Txns (4h)', value: data.summary.totalFraud4h.toLocaleString(), red: !data.isLikelyFP },
              { label: 'Total Txns (4h)', value: data.summary.totalTxns4h.toLocaleString(), red: false },
              { label: 'Fraud Exposure', value: `$${(data.summary.totalFraudAmount || 0).toLocaleString()}`, red: !data.isLikelyFP },
              { label: 'Unique PANs', value: data.summary.uniquePANs.toLocaleString(), red: false },
              { label: 'New PANs', value: data.summary.newPANs.toLocaleString(), red: !data.isLikelyFP && data.summary.newPANs > 100 },
              { label: 'Peak Fraud Rate', value: data.summary.peakFraudRate, red: !data.isLikelyFP },
            ].map(m => (
              <div key={m.label} className={`border rounded-lg p-3 text-center ${m.red ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <p className={`text-xl font-black ${m.red ? 'text-red-700' : 'text-gray-900'}`}>{m.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Tabbed detail panels */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-brand-primary text-brand-primary bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-white">
              {activeTab === 'transactions' && (
                <div>
                  <SectionHeader icon={<CreditCard size={13} />} title="Transaction Sample — Most Recent 12" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Txn ID', 'Time', 'PAN', 'Amount', 'RC', 'Description', 'POS Mode', 'MFA', 'Country', 'History'].map(h => (
                            <th key={h} className="px-2.5 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.sampleTransactions.map((t, i) => (
                          <tr key={i} className={`border-t border-gray-100 hover:bg-blue-50/30 ${!t.has_history && t.response_code !== '00' ? 'bg-red-50/60' : ''}`}>
                            <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-500">{t.txn_id}</td>
                            <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-600 whitespace-nowrap">{t.timestamp.split(' ')[1]}</td>
                            <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-700">{t.masked_pan}</td>
                            <td className="px-2.5 py-1.5 font-semibold text-gray-900">${t.amount_usd}</td>
                            <td className="px-2.5 py-1.5">
                              <span className={`font-mono font-bold ${t.response_code === '00' ? 'text-green-700' : 'text-red-700'}`}>{t.response_code}</span>
                            </td>
                            <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">{t.rc_description}</td>
                            <td className="px-2.5 py-1.5">
                              <span className={`text-[10px] font-mono font-semibold ${t.pos_entry_mode.includes('Key') || t.pos_entry_mode.includes('80') ? 'text-red-700' : 'text-gray-600'}`}>
                                {t.pos_entry_mode}
                              </span>
                            </td>
                            <td className="px-2.5 py-1.5">
                              <span className={t.mfa_status === 'None' ? 'badge-red' : 'badge-green'}>{t.mfa_status}</span>
                            </td>
                            <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">{t.country}</td>
                            <td className="px-2.5 py-1.5">
                              <span className={t.has_history ? 'badge-green' : 'badge-red'}>{t.has_history ? 'Yes' : 'None'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'response_codes' && (
                <div>
                  <SectionHeader icon={<Hash size={13} />} title="Response Code Breakdown" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['RC', 'Description', 'Count', '% of Total', 'Fraud Signal', 'Volume'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.responseCodeBreakdown.map(rc => (
                          <tr key={rc.code} className={`border-t border-gray-100 hover:bg-blue-50/30 ${rc.is_fraud_indicator ? 'bg-red-50/30' : ''}`}>
                            <td className="px-3 py-2 font-mono font-bold text-gray-900">{rc.code}</td>
                            <td className="px-3 py-2 text-gray-700">{rc.description}</td>
                            <td className="px-3 py-2 font-semibold">{rc.count.toLocaleString()}</td>
                            <td className="px-3 py-2 font-semibold">{rc.pct}%</td>
                            <td className="px-3 py-2">
                              {rc.is_fraud_indicator ? <span className="badge-red">Fraud Indicator</span> : <span className="badge-green">Normal</span>}
                            </td>
                            <td className="px-3 py-2 w-32">
                              <div className="bg-gray-100 rounded-full h-2">
                                <div className={`h-2 rounded-full ${rc.is_fraud_indicator ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${rc.pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'geography' && (
                <div>
                  <SectionHeader icon={<Globe size={13} />} title="Geographic Distribution" />
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Country', 'Total Txns', 'Fraud Txns', 'Fraud Rate', 'Amount (USD)', 'Rate Visual'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.geographicBreakdown.map(g => (
                        <tr key={g.country} className={`border-t border-gray-100 hover:bg-blue-50/30 ${g.fraud_rate > 50 ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2 font-semibold text-gray-900">{g.country}</td>
                          <td className="px-3 py-2 text-gray-700">{g.txns.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-semibold ${g.fraud_rate > 50 ? 'text-red-700' : 'text-gray-700'}`}>{g.fraud.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-bold ${g.fraud_rate > 50 ? 'text-red-700' : 'text-gray-600'}`}>{g.fraud_rate}%</td>
                          <td className="px-3 py-2 text-gray-500">${g.amount_usd.toLocaleString()}</td>
                          <td className="px-3 py-2 w-32"><FraudBar rate={g.fraud_rate} max={100} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'pans' && (
                <div>
                  <SectionHeader icon={<CreditCard size={13} />} title="Top 10 PANs by Velocity" />
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Masked PAN', 'Txns', 'Fraud', 'Total Spend', 'Prior History', 'First Seen'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.panVelocityTop10.map((p, i) => (
                        <tr key={i} className={`border-t border-gray-100 hover:bg-blue-50/30 ${!p.has_prior_history ? 'bg-orange-50/30' : ''}`}>
                          <td className="px-3 py-2 font-mono text-gray-800">{p.masked_pan}</td>
                          <td className="px-3 py-2 font-semibold text-gray-900">{p.txn_count}</td>
                          <td className={`px-3 py-2 font-semibold ${p.fraud_count > 0 ? 'text-red-700' : 'text-gray-500'}`}>{p.fraud_count}</td>
                          <td className="px-3 py-2 text-gray-600">${p.total_spend.toLocaleString()}</td>
                          <td className="px-3 py-2"><span className={p.has_prior_history ? 'badge-green' : 'badge-red'}>{p.has_prior_history ? 'Yes' : 'No prior history'}</span></td>
                          <td className="px-3 py-2 font-mono text-gray-600">{p.first_seen}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'amounts' && (
                <div>
                  <SectionHeader icon={<BarChart3 size={13} />} title="Amount Distribution" />
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Amount Range', 'Total Txns', 'Fraud Txns', '% of Fraud', 'Concentration'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.amountDistribution.map(a => (
                        <tr key={a.range} className={`border-t border-gray-100 hover:bg-blue-50/30 ${a.pct_of_fraud > 50 ? 'bg-red-50/40' : ''}`}>
                          <td className="px-3 py-2 font-mono font-semibold text-gray-900">{a.range}</td>
                          <td className="px-3 py-2 text-gray-700">{a.count.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-semibold ${a.fraud_count > 0 ? 'text-red-700' : 'text-gray-500'}`}>{a.fraud_count.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-bold ${a.pct_of_fraud > 50 ? 'text-red-700' : 'text-gray-600'}`}>{a.pct_of_fraud}%</td>
                          <td className="px-3 py-2 w-36">
                            <div className="bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${a.pct_of_fraud > 50 ? 'bg-red-500' : a.fraud_count > 0 ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${a.pct_of_fraud}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'trend' && (
                <div>
                  <SectionHeader icon={<Activity size={13} />} title="6-Month Monthly Trend" />
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>{['Month', 'Total Txns', 'Fraud Txns', 'Fraud Rate %', 'Trend'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {data.sixMonthTrend.map(m => (
                        <tr key={m.month} className={`border-t border-gray-100 hover:bg-blue-50/30 ${m.fraud_rate > 10 ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2 font-semibold text-gray-900">{m.month}</td>
                          <td className="px-3 py-2 text-gray-700">{m.txns.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-semibold ${m.fraud_rate > 10 ? 'text-red-700' : 'text-gray-600'}`}>{m.fraud.toLocaleString()}</td>
                          <td className={`px-3 py-2 font-bold ${m.fraud_rate > 10 ? 'text-red-700' : 'text-gray-600'}`}>{m.fraud_rate}%</td>
                          <td className="px-3 py-2 w-40">
                            <div className="bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full ${m.fraud_rate > 10 ? 'bg-red-500' : m.fraud_rate > 1 ? 'bg-orange-400' : 'bg-green-400'}`} style={{ width: `${Math.min(m.fraud_rate * 3, 100)}%` }} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Attack taxonomy */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <SectionHeader icon={<BarChart3 size={13} />} title="Attack Taxonomy Indicators" />
            <div className="divide-y divide-gray-100">
              {[
                ['POS Entry Mode', data.attackTaxonomyDetails.posEntryModeShift],
                ['Amount Concentration', data.attackTaxonomyDetails.concentrationAmount],
                ['Historical Activity', data.attackTaxonomyDetails.historicalActivity],
                ['Card Present Ratio', data.attackTaxonomyDetails.cardPresentRatio],
                ['New Card Ratio', data.attackTaxonomyDetails.newCardsRatio],
              ].map(([label, val]) => {
                const isGood = String(val).toLowerCase().match(/normal|consistent|organic/);
                return (
                  <div key={label} className="flex gap-4 px-4 py-3">
                    <span className="text-xs text-gray-500 w-40 flex-shrink-0 font-medium">{label}</span>
                    <span className={`text-xs flex-1 ${isGood ? 'text-green-700' : 'text-red-700'}`}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Assessment form */}
      {status === 'waiting' && data && (
        <AssessmentForm onAssessment={onAssessment} />
      )}
    </div>
  );
}
