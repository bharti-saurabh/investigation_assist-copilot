import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Activity, Globe, CreditCard, BarChart3, MapPin, Hash } from 'lucide-react';
import AgentMessage from '../shared/AgentMessage';
import { DiagnosisData, StepStatus } from '../../types';

interface Props {
  status: StepStatus;
  agentText: string;
  data: DiagnosisData | null;
  onAssessment: (verdict: 'True Positive' | 'False Positive') => void;
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-brand-primary">{icon}</span>
      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
    </div>
  );
}

function FraudRateBar({ rate, max }: { rate: number; max: number }) {
  const pct = max > 0 ? (rate / max) * 100 : 0;
  const color = rate > 50 ? 'bg-red-500' : rate > 10 ? 'bg-orange-400' : rate > 1 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

type Tab = 'fvr' | 'transactions' | 'response_codes' | 'geography' | 'pans' | 'amounts' | 'trend';

export default function Step3DataDashboard({ status, agentText, data, onAssessment }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('fvr');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'fvr', label: 'FVR (4h)' },
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

      {data && (
        <div className="mt-4 space-y-4">
          {/* Summary KPIs */}
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

          {/* Tabbed data panels */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {/* Tab bar */}
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
              {/* FVR Tab */}
              {activeTab === 'fvr' && (
                <div>
                  <SectionHeader icon={<Activity size={13} />} title="Hourly Velocity — Last 24 Hours" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Hour', 'Total Txns', 'Fraud Txns', 'Fraud Rate %', 'Total Amount', 'Fraud Amount'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.fvrHourly.map((row, i) => {
                          const isHot = row.fraud_rate_pct > 50;
                          const isMed = row.fraud_rate_pct > 10;
                          return (
                            <tr key={i} className={`border-t border-gray-100 ${isHot ? 'bg-red-50' : isMed ? 'bg-orange-50/40' : ''}`}>
                              <td className="px-3 py-1.5 font-mono text-gray-700 font-semibold">{row.hour}</td>
                              <td className="px-3 py-1.5 text-gray-800">{row.total_txns.toLocaleString()}</td>
                              <td className={`px-3 py-1.5 font-semibold ${isHot ? 'text-red-700' : 'text-gray-700'}`}>{row.fraud_txns.toLocaleString()}</td>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold ${isHot ? 'text-red-700' : isMed ? 'text-orange-600' : 'text-gray-600'}`}>
                                    {row.fraud_rate_pct}%
                                  </span>
                                  <FraudRateBar rate={row.fraud_rate_pct} max={100} />
                                </div>
                              </td>
                              <td className="px-3 py-1.5 text-gray-600">${row.total_amount.toLocaleString()}</td>
                              <td className={`px-3 py-1.5 font-semibold ${isHot ? 'text-red-700' : 'text-gray-600'}`}>${row.fraud_amount.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transaction Sample Tab */}
              {activeTab === 'transactions' && (
                <div>
                  <SectionHeader icon={<CreditCard size={13} />} title="Transaction Sample — Today (Most Recent 12)" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Txn ID', 'Time', 'PAN', 'Amount', 'RC', 'Description', 'POS Mode', 'MFA', 'Country', 'History'].map(h => (
                            <th key={h} className="px-2.5 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.sampleTransactions.map((t, i) => {
                          const isFraud = t.response_code !== '00' || !t.has_history;
                          return (
                            <tr key={i} className={`border-t border-gray-100 table-row-hover ${!t.has_history && t.response_code !== '00' ? 'bg-red-50/60' : ''}`}>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-500">{t.txn_id}</td>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-600 whitespace-nowrap">{t.timestamp.split(' ')[1]}</td>
                              <td className="px-2.5 py-1.5 font-mono text-[10px] text-gray-700">{t.masked_pan}</td>
                              <td className="px-2.5 py-1.5 font-semibold text-gray-900">${t.amount_usd}</td>
                              <td className="px-2.5 py-1.5">
                                <span className={`font-mono font-bold text-xs ${t.response_code === '00' ? 'text-green-700' : 'text-red-700'}`}>
                                  {t.response_code}
                                </span>
                              </td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">{t.rc_description}</td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">
                                <span className={`text-[10px] font-mono ${t.pos_entry_mode.includes('Key') || t.pos_entry_mode.includes('80') ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                  {t.pos_entry_mode}
                                </span>
                              </td>
                              <td className="px-2.5 py-1.5">
                                <span className={t.mfa_status === 'None' ? 'badge-red' : 'badge-green'}>{t.mfa_status}</span>
                              </td>
                              <td className="px-2.5 py-1.5 text-gray-600 whitespace-nowrap">{t.country}</td>
                              <td className="px-2.5 py-1.5">
                                <span className={t.has_history ? 'badge-green' : 'badge-red'}>
                                  {t.has_history ? 'Yes' : 'New'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Response Codes Tab */}
              {activeTab === 'response_codes' && (
                <div>
                  <SectionHeader icon={<Hash size={13} />} title="Response Code Breakdown" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['RC', 'Description', 'Count', '% of Total', 'Fraud Signal', 'Volume'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.responseCodeBreakdown.map(rc => (
                          <tr key={rc.code} className={`border-t border-gray-100 table-row-hover ${rc.is_fraud_indicator ? 'bg-red-50/40' : ''}`}>
                            <td className="px-3 py-2 font-mono font-bold text-gray-900">{rc.code}</td>
                            <td className="px-3 py-2 text-gray-700">{rc.description}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900">{rc.count.toLocaleString()}</td>
                            <td className="px-3 py-2 font-semibold">{rc.pct}%</td>
                            <td className="px-3 py-2">
                              {rc.is_fraud_indicator
                                ? <span className="badge-red">Fraud Indicator</span>
                                : <span className="badge-green">Normal</span>}
                            </td>
                            <td className="px-3 py-2 w-32">
                              <div className="bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${rc.is_fraud_indicator ? 'bg-red-500' : 'bg-green-500'}`}
                                  style={{ width: `${rc.pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Geography Tab */}
              {activeTab === 'geography' && (
                <div>
                  <SectionHeader icon={<Globe size={13} />} title="Geographic Distribution" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Country', 'Total Txns', 'Fraud Txns', 'Fraud Rate', 'Total Amount (USD)', 'Fraud Rate Visual'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.geographicBreakdown.map(g => {
                          const isHot = g.fraud_rate > 50;
                          return (
                            <tr key={g.country} className={`border-t border-gray-100 table-row-hover ${isHot ? 'bg-red-50/40' : ''}`}>
                              <td className="px-3 py-2 font-semibold text-gray-900">{g.country}</td>
                              <td className="px-3 py-2 text-gray-700">{g.txns.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-semibold ${isHot ? 'text-red-700' : 'text-gray-700'}`}>{g.fraud.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-bold ${isHot ? 'text-red-700' : 'text-gray-700'}`}>{g.fraud_rate}%</td>
                              <td className="px-3 py-2 text-gray-600">${g.amount_usd.toLocaleString()}</td>
                              <td className="px-3 py-2 w-36">
                                <FraudRateBar rate={g.fraud_rate} max={100} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PAN Velocity Tab */}
              {activeTab === 'pans' && (
                <div>
                  <SectionHeader icon={<CreditCard size={13} />} title="Top 10 PANs by Transaction Velocity" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Masked PAN', 'Total Txns', 'Fraud Txns', 'Total Spend', 'Prior History', 'First Seen'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.panVelocityTop10.map((p, i) => (
                          <tr key={i} className={`border-t border-gray-100 table-row-hover ${!p.has_prior_history ? 'bg-orange-50/40' : ''}`}>
                            <td className="px-3 py-2 font-mono text-gray-800">{p.masked_pan}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900">{p.txn_count}</td>
                            <td className={`px-3 py-2 font-semibold ${p.fraud_count > 0 ? 'text-red-700' : 'text-gray-600'}`}>{p.fraud_count}</td>
                            <td className="px-3 py-2 text-gray-700">${p.total_spend.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={p.has_prior_history ? 'badge-green' : 'badge-red'}>
                                {p.has_prior_history ? 'Yes' : 'No prior history'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-gray-600">{p.first_seen}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Amount Distribution Tab */}
              {activeTab === 'amounts' && (
                <div>
                  <SectionHeader icon={<BarChart3 size={13} />} title="Transaction Amount Distribution" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Amount Range', 'Total Txns', 'Fraud Txns', '% of All Fraud', 'Fraud Concentration'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.amountDistribution.map(a => {
                          const isHot = a.pct_of_fraud > 50;
                          return (
                            <tr key={a.range} className={`border-t border-gray-100 table-row-hover ${isHot ? 'bg-red-50/40' : ''}`}>
                              <td className="px-3 py-2 font-semibold text-gray-900 font-mono">{a.range}</td>
                              <td className="px-3 py-2 text-gray-700">{a.count.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-semibold ${a.fraud_count > 0 ? 'text-red-700' : 'text-gray-600'}`}>{a.fraud_count.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-bold ${isHot ? 'text-red-700' : 'text-gray-600'}`}>{a.pct_of_fraud}%</td>
                              <td className="px-3 py-2 w-36">
                                <div className="bg-gray-100 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${isHot ? 'bg-red-500' : a.fraud_count > 0 ? 'bg-orange-400' : 'bg-green-400'}`}
                                    style={{ width: `${a.pct_of_fraud}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6-Month Trend Tab */}
              {activeTab === 'trend' && (
                <div>
                  <SectionHeader icon={<Activity size={13} />} title="6-Month Monthly Trend" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Month', 'Total Txns', 'Fraud Txns', 'Fraud Rate %', 'Trend'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.sixMonthTrend.map(m => {
                          const isHot = m.fraud_rate > 10;
                          return (
                            <tr key={m.month} className={`border-t border-gray-100 table-row-hover ${isHot ? 'bg-red-50/40' : ''}`}>
                              <td className="px-3 py-2 font-semibold text-gray-900">{m.month}</td>
                              <td className="px-3 py-2 text-gray-700">{m.txns.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-semibold ${isHot ? 'text-red-700' : 'text-gray-600'}`}>{m.fraud.toLocaleString()}</td>
                              <td className={`px-3 py-2 font-bold ${isHot ? 'text-red-700' : 'text-gray-600'}`}>{m.fraud_rate}%</td>
                              <td className="px-3 py-2 w-40">
                                <div className="bg-gray-100 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${m.fraud_rate > 10 ? 'bg-red-500' : m.fraud_rate > 1 ? 'bg-orange-400' : 'bg-green-400'}`}
                                    style={{ width: `${Math.min(m.fraud_rate * 3, 100)}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attack taxonomy signals */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <SectionHeader icon={<BarChart3 size={13} />} title="Attack Taxonomy Indicators" />
            <div className="divide-y divide-gray-100">
              {[
                ['POS Entry Mode Shift', data.attackTaxonomyDetails.posEntryModeShift],
                ['Amount Concentration', data.attackTaxonomyDetails.concentrationAmount],
                ['Historical Activity', data.attackTaxonomyDetails.historicalActivity],
                ['Card Present Ratio', data.attackTaxonomyDetails.cardPresentRatio],
                ['New Card Ratio', data.attackTaxonomyDetails.newCardsRatio],
              ].map(([label, val]) => {
                const isBad = String(val).toLowerCase().includes('shift') || String(val).toLowerCase().includes('concentration') || String(val).toLowerCase().includes('new');
                const isGoodVal = String(val).toLowerCase().includes('normal') || String(val).toLowerCase().includes('consistent') || String(val).toLowerCase().includes('organic');
                return (
                  <div key={label} className="flex gap-4 px-4 py-3">
                    <span className="text-xs text-gray-500 w-40 flex-shrink-0 font-medium">{label}</span>
                    <span className={`text-xs flex-1 ${isGoodVal ? 'text-green-700' : isBad ? 'text-red-700' : 'text-gray-700'}`}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {status === 'waiting' && data && (
        <div className="mt-4 border-2 border-brand-primary/30 bg-brand-primary/5 rounded-xl p-5">
          <p className="text-sm font-bold text-gray-900 mb-1">Analyst Assessment Required</p>
          <p className="text-xs text-gray-600 mb-4">
            Review the data above and the agent's analysis. This decision will determine whether a block is placed.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => onAssessment('True Positive')}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              <ThumbsDown size={14} />
              True Positive — Confirmed Fraud
            </button>
            <button
              onClick={() => onAssessment('False Positive')}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
            >
              <ThumbsUp size={14} />
              False Positive — Close Alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
