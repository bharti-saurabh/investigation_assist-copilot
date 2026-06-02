import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck,
  Clock, Mail, Activity, CheckCircle2, XCircle, Loader2,
  RefreshCw, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  KPI_SUMMARY, DAILY_ALERT_SERIES, DECLINE_RATE_SERIES, WEEKLY_OUTCOMES,
  ALERT_TYPE_DIST, MERCHANT_RISK, ACTIVE_BLOCKS, RECENT_INVESTIGATIONS,
  GEO_RISK, ACTIVITY_FEED,
} from '../lib/dashboardData';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function TrendBadge({ trend, unit = '' }: { trend: number; unit?: string }) {
  if (trend === 0) return (
    <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><Minus size={10} />{unit}</span>
  );
  const up = trend > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${up ? 'text-red-500' : 'text-green-600'}`}>
      {up ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      {Math.abs(trend)}{unit}
    </span>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">{title}</h3>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const CARD = 'bg-white border border-gray-200 rounded-xl shadow-sm';

const alertTypeColor: Record<string, string> = {
  'BIN Attack':  '#ef4444',
  'ATM Cashout': '#8b5cf6',
  'CNP Alert':   '#f59e0b',
  'POS Alert':   '#3b82f6',
  'PRA Alert':   '#10b981',
};

function alertBadge(type: string) {
  const color = alertTypeColor[type] ?? '#6b7280';
  return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '20', color }}>
      {type}
    </span>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function DeclineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = DECLINE_RATE_SERIES.find(r => r.date === label);
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-gray-700">Decline Rate: <span className="font-bold text-red-600">{payload[0]?.value}%</span></p>
      <p className="text-gray-400">Baseline: 2.3%</p>
      {d?.alertEvent && <p className="text-orange-600 font-semibold mt-1">⚠ {d.alertEvent}</p>}
    </div>
  );
}

function AlertVolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label} — {total} alerts</p>
      {payload.map((p: any) => p.value > 0 && (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [lastRefresh] = useState(() => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} UTC`;
  });

  const kpi = KPI_SUMMARY;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-screen-2xl mx-auto px-6 py-5">

        {/* Dashboard header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">Fraud Operations Dashboard</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Network-wide authorization anomaly monitoring · 30-day rolling window
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live · last refresh {lastRefresh}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw size={11} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-8 gap-3 mb-5">
          {[
            { k: kpi.queueDepth,         icon: <AlertTriangle size={14} className="text-red-500" />,    positive: false },
            { k: kpi.investigatedToday,  icon: <Activity size={14} className="text-brand-primary" />,   positive: true },
            { k: kpi.suspiciousRate7d,   icon: <TrendingUp size={14} className="text-orange-500" />,    positive: false },
            { k: kpi.avgResponseTime,    icon: <Clock size={14} className="text-blue-500" />,           positive: true /* lower is better */ },
            { k: kpi.activeBlocks,       icon: <ShieldCheck size={14} className="text-indigo-500" />,   positive: false },
            { k: kpi.issuerNotifAckRate, icon: <Mail size={14} className="text-teal-500" />,            positive: true },
            { k: kpi.sopCompliance,      icon: <CheckCircle2 size={14} className="text-green-600" />,   positive: true },
            { k: kpi.declineRateNow,     icon: <TrendingUp size={14} className="text-red-500" />,       positive: false },
          ].map(({ k, icon }) => (
            <div key={k.label} className={`${CARD} px-3 py-3`}>
              <div className="flex items-center justify-between mb-1.5">
                {icon}
                <TrendBadge trend={k.trend} unit={typeof k.trend === 'number' && Math.abs(k.trend) < 10 && !String(k.value).includes('%') ? '' : ''} />
              </div>
              <p className="text-xl font-black text-gray-900 leading-none">{k.value}</p>
              <p className="text-[9px] font-semibold text-gray-600 mt-1 leading-tight">{k.label}</p>
              <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Row 1: Alert Volume + Type Distribution ── */}
        <div className="grid grid-cols-3 gap-4 mb-4">

          {/* Alert Volume Trend */}
          <div className={`${CARD} p-4 col-span-2`}>
            <SectionHeader title="Daily Alert Volume — Last 30 Days" sub="Stacked by alert type · spikes indicate active attack events" />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={DAILY_ALERT_SERIES} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={9}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#9ca3af' }} interval={4} />
                <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} />
                <Tooltip content={<AlertVolumeTooltip />} />
                <Bar dataKey="binAttack"  stackId="a" fill="#ef4444" name="BIN Attack" />
                <Bar dataKey="cnpAlert"   stackId="a" fill="#f59e0b" name="CNP Alert" />
                <Bar dataKey="posAlert"   stackId="a" fill="#3b82f6" name="POS Alert" />
                <Bar dataKey="atmCashout" stackId="a" fill="#8b5cf6" name="ATM Cashout" />
                <Bar dataKey="praAlert"   stackId="a" fill="#10b981" name="PRA Alert" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Type Distribution */}
          <div className={`${CARD} p-4`}>
            <SectionHeader title="Alert Type Distribution" sub="30-day totals · 48 alerts" />
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={ALERT_TYPE_DIST}
                  cx="50%" cy="50%"
                  innerRadius={38} outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {ALERT_TYPE_DIST.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} alerts`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {ALERT_TYPE_DIST.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-gray-600">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-800">{d.value}</span>
                    <span className="text-[10px] text-gray-400">{Math.round(d.value / 48 * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 2: Decline Rate Trend ── */}
        <div className={`${CARD} p-4 mb-4`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">Network-Wide Authorization Decline Rate — Last 30 Days</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Real-time authorization anomaly signal · fraud confirmation pending cardholder reconciliation (3–7 days) · baseline 2.3%
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-red-400 rounded" /><span className="text-gray-500">Decline Rate</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-gray-300 border-dashed border-t" /><span className="text-gray-500">Baseline 2.3%</span></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={DECLINE_RATE_SERIES} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="declineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#9ca3af' }} interval={4} />
              <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} unit="%" domain={[0, 40]} />
              <Tooltip content={<DeclineTooltip />} />
              <ReferenceLine y={2.3} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth={1} />
              <ReferenceLine y={8} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1} label={{ value: 'Alert threshold 8%', position: 'right', fontSize: 8, fill: '#f59e0b' }} />
              <Area type="monotone" dataKey="declineRate" stroke="#ef4444" strokeWidth={2} fill="url(#declineGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Row 3: Weekly Outcomes + Top Merchants ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* Weekly Outcomes */}
          <div className={`${CARD} p-4`}>
            <SectionHeader title="Investigation Outcomes — Last 8 Weeks" sub="Suspicious (actioned) vs Organic (closed)" />
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={WEEKLY_OUTCOMES} margin={{ top: 0, right: 4, left: -20, bottom: 0 }} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 8, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 8, fill: '#9ca3af' }} />
                <Tooltip formatter={(v: number, name: string) => [v, name.charAt(0).toUpperCase() + name.slice(1)]} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="suspicious" stackId="a" fill="#f97316" name="Suspicious" />
                <Bar dataKey="organic"    stackId="a" fill="#22c55e" name="Organic" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Merchants */}
          <div className={`${CARD} p-4`}>
            <SectionHeader title="Top Merchants by Alert Count (30d)" sub="Risk score = composite of alert frequency, type severity, and unresolved blocks" />
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={MERCHANT_RISK.slice(0, 6).map(m => ({ name: m.merchant.replace(' ', '\n'), count: m.alertCount, risk: m.riskScore }))}
                layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={10}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 8, fill: '#9ca3af' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} width={90} />
                <Tooltip formatter={(v: number, name: string) => [v, name === 'count' ? 'Alerts' : 'Risk Score']} />
                <Bar dataKey="count" fill="#1A1F71" radius={[0, 2, 2, 0]} name="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Row 4: Active Block Rules ── */}
        <div className={`${CARD} p-4 mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title="Active Block Rules" sub="7 rules live on production network · 3 expiring within 6 hours" />
            <div className="flex items-center gap-2">
              <span className="badge-red text-[9px]">3 expiring soon</span>
              <span className="badge-green text-[9px]">4 active</span>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['Rule ID', 'Type', 'Merchant · CAID (Card Acceptor ID)', 'Coverage', 'FP (False Positive) Rate', 'Activated', 'Expires In', 'Auto-Renew', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ACTIVE_BLOCKS.map(rule => (
                <tr key={rule.ruleId} className={`hover:bg-gray-50 ${rule.status === 'expiring-soon' ? 'bg-amber-50/40' : ''}`}>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-brand-primary font-semibold">{rule.ruleId}</td>
                  <td className="px-3 py-2.5">{alertBadge(rule.alertType)}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-gray-800 text-[11px]">{rule.merchant}</p>
                    <p className="text-[10px] font-mono text-gray-400">{rule.caid}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
                        <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${rule.patternCoverage}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-green-700">{rule.patternCoverage}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] font-bold ${rule.fpRate > 3 ? 'text-red-600' : rule.fpRate > 1.5 ? 'text-amber-600' : 'text-green-700'}`}>
                      {rule.fpRate}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] font-mono text-gray-500">{rule.activatedAt}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] font-bold ${rule.status === 'expiring-soon' ? 'text-amber-600' : 'text-gray-700'}`}>
                      {rule.expiresIn}
                      {rule.status === 'expiring-soon' && <span className="ml-1 text-[9px] bg-amber-100 text-amber-700 px-1 rounded">!</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[10px] text-center">
                    {rule.autoRenew
                      ? <CheckCircle2 size={12} className="text-green-500 mx-auto" />
                      : <XCircle size={12} className="text-gray-300 mx-auto" />}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${rule.status === 'expiring-soon' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {rule.status === 'expiring-soon' ? 'EXPIRING' : 'ACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Row 5: Recent Investigations + Activity Feed ── */}
        <div className="grid grid-cols-3 gap-4 mb-4">

          {/* Recent Investigations */}
          <div className={`${CARD} p-4 col-span-2`}>
            <SectionHeader title="Recent Investigations" sub="Last 10 cases · response time = alert creation to first analyst action" />
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Case ID', 'Type', 'Merchant', 'Analyst', 'Verdict', 'Response', 'Closed', 'SOP'].map(h => (
                    <th key={h} className="px-2.5 py-2 text-left text-[9px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {RECENT_INVESTIGATIONS.map(inv => (
                  <tr key={inv.caseId} className="hover:bg-gray-50">
                    <td className="px-2.5 py-2 font-mono text-[10px] text-gray-600">{inv.caseId}</td>
                    <td className="px-2.5 py-2">{alertBadge(inv.alertType)}</td>
                    <td className="px-2.5 py-2 text-[11px] text-gray-700 font-medium">{inv.merchant}</td>
                    <td className="px-2.5 py-2 font-mono text-[10px] text-gray-500">{inv.analyst}</td>
                    <td className="px-2.5 py-2">
                      {inv.verdict === 'In Progress'
                        ? <span className="flex items-center gap-1 text-[9px] text-blue-600 font-semibold"><Loader2 size={9} className="animate-spin" />In Progress</span>
                        : inv.verdict === 'Suspicious — Action Required'
                        ? <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Suspicious</span>
                        : <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Organic</span>
                      }
                    </td>
                    <td className="px-2.5 py-2 text-[11px] font-mono text-gray-600">{inv.responseTime}</td>
                    <td className="px-2.5 py-2 text-[10px] text-gray-500">{inv.closedAt}</td>
                    <td className="px-2.5 py-2 text-center">
                      {inv.sopCompliant
                        ? <CheckCircle2 size={12} className="text-green-500 mx-auto" />
                        : <AlertTriangle size={12} className="text-red-500 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Activity Feed + Geographic Risk */}
          <div className="space-y-4">
            {/* Activity Feed */}
            <div className={`${CARD} p-4`}>
              <SectionHeader title="Activity Feed" sub="Today's events" />
              <div className="space-y-2">
                {ACTIVITY_FEED.slice(0, 6).map((entry, i) => {
                  const dot = entry.severity === 'high' ? 'bg-red-500' : entry.severity === 'medium' ? 'bg-amber-400' : 'bg-green-400';
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${dot}`} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-700 leading-snug">{entry.event}</p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{entry.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Geographic Risk */}
            <div className={`${CARD} p-4`}>
              <SectionHeader title="Geographic Risk (30d)" />
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-[9px] font-semibold text-gray-500 uppercase pb-1.5">Region</th>
                    <th className="text-center text-[9px] font-semibold text-gray-500 uppercase pb-1.5">Alerts</th>
                    <th className="text-right text-[9px] font-semibold text-gray-500 uppercase pb-1.5">Decline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {GEO_RISK.map(g => (
                    <tr key={g.region}>
                      <td className="py-1.5">
                        <p className="text-[11px] text-gray-700 font-medium">{g.region}</p>
                        <p className="text-[9px] text-gray-400">{g.topAttackType}</p>
                      </td>
                      <td className="py-1.5 text-center">
                        <span className={`text-[11px] font-bold ${g.alertCount >= 10 ? 'text-red-600' : g.alertCount >= 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {g.alertCount}
                        </span>
                      </td>
                      <td className="py-1.5 text-right">
                        <span className={`text-[11px] font-bold ${parseFloat(g.declineRate) > 10 ? 'text-red-600' : parseFloat(g.declineRate) > 5 ? 'text-amber-600' : 'text-gray-600'}`}>
                          {g.declineRate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Footnote ── */}
        <div className="border-t border-gray-200 pt-3 mt-2">
          <p className="text-[10px] text-gray-400">
            <strong>Data notice:</strong> Decline rates and authorization anomaly signals reflect real-time behavioral data. Fraud confirmation from cardholder reporting and reconciliation is expected 3–7 business days post-event. All risk exposure figures are estimates pending reconciliation. Dashboard refreshes every 5 minutes.
          </p>
        </div>

      </div>
    </div>
  );
}
