// Dashboard mock data — 30-day rolling window ending today (June 2, 2026)
// Decline rate spikes align to the 5 demo alert events for narrative coherence

export interface DailyAlertPoint {
  date: string;        // "May 03"
  total: number;
  binAttack: number;
  cnpAlert: number;
  posAlert: number;
  atmCashout: number;
  praAlert: number;
}

export interface DailyDeclinePoint {
  date: string;
  declineRate: number;   // %
  baseline: number;      // % (rolling 30d avg)
  alertEvent: string | null; // label for spike marker
}

export interface WeeklyOutcome {
  week: string;       // "Apr W3"
  suspicious: number;
  organic: number;
}

export interface MerchantRiskRow {
  merchant: string;
  caid: string;
  alertCount: number;
  alertTypes: string;
  lastSeen: string;
  riskScore: number;
}

export interface ActiveBlockRule {
  ruleId: string;
  alertType: string;
  merchant: string;
  caid: string;
  patternCoverage: number;  // %
  fpRate: number;           // %
  activatedAt: string;
  expiresIn: string;
  autoRenew: boolean;
  status: 'active' | 'expiring-soon';
}

export interface RecentInvestigation {
  caseId: string;
  alertId: string;
  alertType: string;
  merchant: string;
  analyst: string;
  verdict: 'Suspicious — Action Required' | 'Organic — Close Alert' | 'In Progress';
  responseTime: string;  // "18 min"
  closedAt: string;      // relative
  sopCompliant: boolean;
}

export interface GeoRiskRow {
  region: string;
  alertCount: number;
  declineRate: string;
  topAttackType: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ActivityEntry {
  time: string;
  event: string;
  type: 'block' | 'investigation' | 'notification' | 'alert' | 'system';
  severity: 'high' | 'medium' | 'low' | 'info';
}

// ─── 30-Day Daily Alert Volume ────────────────────────────────────────────────
// Dates: May 3 – June 2, 2026
// Spikes: May 12 (BIN), May 15 (ATM+BIN), May 20 (CNP), May 27 (POS), May 31 (BIN+CNP)
const RAW_DAILY: [number, number, number, number, number, number][] = [
  // total, bin, cnp, pos, atm, pra
  [2, 1, 1, 0, 0, 0], // May 03
  [1, 0, 1, 0, 0, 0], // May 04
  [3, 2, 0, 1, 0, 0], // May 05
  [2, 1, 0, 0, 0, 1], // May 06
  [1, 0, 1, 0, 0, 0], // May 07
  [4, 2, 1, 1, 0, 0], // May 08
  [2, 1, 0, 1, 0, 0], // May 09
  [3, 1, 1, 0, 0, 1], // May 10
  [1, 0, 1, 0, 0, 0], // May 11
  [11,7, 2, 1, 1, 0], // May 12 — BIN attack spike
  [3, 1, 1, 1, 0, 0], // May 13
  [2, 1, 1, 0, 0, 0], // May 14
  [9, 4, 2, 1, 2, 0], // May 15 — ATM cashout + BIN
  [2, 1, 1, 0, 0, 0], // May 16
  [3, 1, 1, 1, 0, 0], // May 17
  [2, 1, 0, 0, 0, 1], // May 18
  [1, 0, 1, 0, 0, 0], // May 19
  [7, 1, 4, 1, 0, 1], // May 20 — CNP card testing event
  [2, 1, 1, 0, 0, 0], // May 21
  [4, 2, 1, 1, 0, 0], // May 22
  [2, 0, 1, 0, 0, 1], // May 23
  [3, 1, 1, 1, 0, 0], // May 24
  [1, 0, 0, 1, 0, 0], // May 25
  [2, 1, 1, 0, 0, 0], // May 26
  [10,3, 2, 4, 0, 1], // May 27 — POS terminal compromise wave
  [3, 1, 1, 1, 0, 0], // May 28
  [2, 1, 0, 0, 0, 1], // May 29
  [4, 2, 1, 1, 0, 0], // May 30
  [14,7, 4, 1, 1, 1], // May 31 — major BIN+CNP combined event
  [5, 2, 2, 0, 1, 0], // June 01
  [3, 1, 1, 1, 0, 0], // June 02 (today, partial)
];

const DAY_LABELS = [
  'May 03','May 04','May 05','May 06','May 07','May 08','May 09',
  'May 10','May 11','May 12','May 13','May 14','May 15','May 16',
  'May 17','May 18','May 19','May 20','May 21','May 22','May 23',
  'May 24','May 25','May 26','May 27','May 28','May 29','May 30',
  'May 31','Jun 01','Jun 02',
];

export const DAILY_ALERT_SERIES: DailyAlertPoint[] = RAW_DAILY.map(([total, binAttack, cnpAlert, posAlert, atmCashout, praAlert], i) => ({
  date: DAY_LABELS[i],
  total, binAttack, cnpAlert, posAlert, atmCashout, praAlert,
}));

// ─── Network-Wide Decline Rate (30 days) ─────────────────────────────────────
const RAW_DECLINE: [number, string | null][] = [
  [2.1, null],  // May 03
  [2.3, null],  // May 04
  [2.0, null],  // May 05
  [2.4, null],  // May 06
  [2.2, null],  // May 07
  [2.6, null],  // May 08
  [2.1, null],  // May 09
  [2.3, null],  // May 10
  [2.5, null],  // May 11
  [18.3,'BIN Attack — GlobalShop Inc'],  // May 12
  [6.2, null],  // May 13
  [3.1, null],  // May 14
  [22.7,'ATM Cashout — FastPay Services'], // May 15
  [5.4, null],  // May 16
  [3.2, null],  // May 17
  [2.7, null],  // May 18
  [2.4, null],  // May 19
  [14.8,'CNP Card Testing — DigitalStream Sub'], // May 20
  [4.1, null],  // May 21
  [3.0, null],  // May 22
  [2.6, null],  // May 23
  [2.8, null],  // May 24
  [2.3, null],  // May 25
  [2.5, null],  // May 26
  [17.2,'POS Compromise — LuxuryRetail'], // May 27
  [4.8, null],  // May 28
  [3.3, null],  // May 29
  [2.9, null],  // May 30
  [34.1,'BIN+CNP Combined Event'],  // May 31
  [8.6, null],  // Jun 01
  [3.4, null],  // Jun 02
];

export const DECLINE_RATE_SERIES: DailyDeclinePoint[] = RAW_DECLINE.map(([declineRate, alertEvent], i) => ({
  date: DAY_LABELS[i],
  declineRate,
  baseline: 2.3,
  alertEvent,
}));

// ─── Weekly Investigation Outcomes (8 weeks) ─────────────────────────────────
export const WEEKLY_OUTCOMES: WeeklyOutcome[] = [
  { week: 'Apr W1', suspicious: 6, organic: 9 },
  { week: 'Apr W2', suspicious: 8, organic: 7 },
  { week: 'Apr W3', suspicious: 5, organic: 11 },
  { week: 'Apr W4', suspicious: 9, organic: 6 },
  { week: 'May W1', suspicious: 12, organic: 5 },
  { week: 'May W2', suspicious: 14, organic: 4 },
  { week: 'May W3', suspicious: 10, organic: 8 },
  { week: 'May W4', suspicious: 18, organic: 3 },
];

// ─── Top Merchants by Alert Count (30d) ──────────────────────────────────────
export const MERCHANT_RISK: MerchantRiskRow[] = [
  { merchant: 'GlobalShop Inc',      caid: 'CAID-9921', alertCount: 11, alertTypes: 'BIN Attack (8), CNP (2), PRA (1)', lastSeen: '2h ago',  riskScore: 91 },
  { merchant: 'DigitalStream Sub',   caid: 'CAID-1022', alertCount: 8,  alertTypes: 'CNP Alert (6), BIN Attack (2)',    lastSeen: '45m ago', riskScore: 84 },
  { merchant: 'FastPay Services',    caid: 'CAID-4412', alertCount: 5,  alertTypes: 'ATM Cashout (3), BIN Attack (2)', lastSeen: '4h ago',  riskScore: 77 },
  { merchant: 'LuxuryRetail',        caid: 'CAID-5567', alertCount: 4,  alertTypes: 'POS Alert (3), BIN Attack (1)',   lastSeen: '6h ago',  riskScore: 72 },
  { merchant: 'HolidayTravels',      caid: 'CAID-8821', alertCount: 3,  alertTypes: 'PRA Alert (2), BIN Attack (1)',   lastSeen: '2d ago',  riskScore: 34 },
  { merchant: 'MetroCash ATM',       caid: 'CAID-7731', alertCount: 3,  alertTypes: 'ATM Cashout (2), BIN Attack (1)','lastSeen': '3d ago', riskScore: 58 },
  { merchant: 'QuickFuel Kiosk',     caid: 'CAID-2214', alertCount: 2,  alertTypes: 'POS Alert (2)',                   lastSeen: '5d ago',  riskScore: 46 },
  { merchant: 'TechZone Online',     caid: 'CAID-3390', alertCount: 1,  alertTypes: 'CNP Alert (1)',                   lastSeen: '1w ago',  riskScore: 29 },
];

// ─── Active Block Rules ───────────────────────────────────────────────────────
export const ACTIVE_BLOCKS: ActiveBlockRule[] = [
  {
    ruleId: 'BLK-2026-0441', alertType: 'BIN Attack', merchant: 'GlobalShop Inc',
    caid: 'CAID-9921', patternCoverage: 94.2, fpRate: 0.8,
    activatedAt: '08:14 UTC', expiresIn: '2h 18m', autoRenew: false, status: 'expiring-soon',
  },
  {
    ruleId: 'BLK-2026-0439', alertType: 'CNP Alert', merchant: 'DigitalStream Sub',
    caid: 'CAID-1022', patternCoverage: 87.3, fpRate: 2.1,
    activatedAt: '07:31 UTC', expiresIn: '18h 44m', autoRenew: false, status: 'active',
  },
  {
    ruleId: 'BLK-2026-0437', alertType: 'ATM Cashout', merchant: 'FastPay Services',
    caid: 'CAID-4412', patternCoverage: 91.6, fpRate: 0.4,
    activatedAt: '06:02 UTC', expiresIn: '6h 05m', autoRenew: false, status: 'expiring-soon',
  },
  {
    ruleId: 'BLK-2026-0435', alertType: 'POS Alert', merchant: 'LuxuryRetail',
    caid: 'CAID-5567', patternCoverage: 88.9, fpRate: 1.6,
    activatedAt: 'Jun 01 14:22', expiresIn: '2d 22h', autoRenew: true, status: 'active',
  },
  {
    ruleId: 'BLK-2026-0431', alertType: 'BIN Attack', merchant: 'MetroCash ATM',
    caid: 'CAID-7731', patternCoverage: 78.4, fpRate: 3.2,
    activatedAt: 'May 31 22:18', expiresIn: '4h 02m', autoRenew: false, status: 'expiring-soon',
  },
  {
    ruleId: 'BLK-2026-0428', alertType: 'CNP Alert', merchant: 'TechZone Online',
    caid: 'CAID-3390', patternCoverage: 82.1, fpRate: 4.3,
    activatedAt: 'May 31 19:45', expiresIn: '1d 7h', autoRenew: false, status: 'active',
  },
  {
    ruleId: 'BLK-2026-0422', alertType: 'POS Alert', merchant: 'QuickFuel Kiosk',
    caid: 'CAID-2214', patternCoverage: 96.3, fpRate: 0.6,
    activatedAt: 'May 30 11:33', expiresIn: '2d 3h', autoRenew: true, status: 'active',
  },
];

// ─── Recent Investigations ────────────────────────────────────────────────────
export const RECENT_INVESTIGATIONS: RecentInvestigation[] = [
  { caseId:'INV-2026-0892', alertId:'100001', alertType:'BIN Attack',   merchant:'GlobalShop Inc',    analyst:'RJ-99210', verdict:'Suspicious — Action Required', responseTime:'14 min', closedAt:'12 min ago',   sopCompliant:true },
  { caseId:'INV-2026-0891', alertId:'100002', alertType:'ATM Cashout',  merchant:'FastPay Services',  analyst:'RJ-99210', verdict:'In Progress',                  responseTime:'—',      closedAt:'In progress',  sopCompliant:true },
  { caseId:'INV-2026-0890', alertId:'100003', alertType:'CNP Alert',    merchant:'DigitalStream Sub', analyst:'AM-44103', verdict:'Suspicious — Action Required', responseTime:'22 min', closedAt:'1h ago',       sopCompliant:true },
  { caseId:'INV-2026-0889', alertId:'100004', alertType:'POS Alert',    merchant:'LuxuryRetail',      analyst:'SK-71882', verdict:'Suspicious — Action Required', responseTime:'31 min', closedAt:'3h ago',       sopCompliant:true },
  { caseId:'INV-2026-0888', alertId:'100005', alertType:'PRA Alert',    merchant:'HolidayTravels',    analyst:'RJ-99210', verdict:'Organic — Close Alert',        responseTime:'18 min', closedAt:'5h ago',       sopCompliant:true },
  { caseId:'INV-2026-0887', alertId:'99998',  alertType:'BIN Attack',   merchant:'GlobalShop Inc',    analyst:'AM-44103', verdict:'Suspicious — Action Required', responseTime:'11 min', closedAt:'8h ago',       sopCompliant:true },
  { caseId:'INV-2026-0886', alertId:'99997',  alertType:'CNP Alert',    merchant:'TechZone Online',   analyst:'SK-71882', verdict:'Suspicious — Action Required', responseTime:'28 min', closedAt:'12h ago',      sopCompliant:true },
  { caseId:'INV-2026-0885', alertId:'99996',  alertType:'POS Alert',    merchant:'QuickFuel Kiosk',   analyst:'RJ-99210', verdict:'Organic — Close Alert',        responseTime:'35 min', closedAt:'1d ago',       sopCompliant:true },
  { caseId:'INV-2026-0884', alertId:'99995',  alertType:'BIN Attack',   merchant:'MetroCash ATM',     analyst:'AM-44103', verdict:'Suspicious — Action Required', responseTime:'16 min', closedAt:'1d ago',       sopCompliant:true },
  { caseId:'INV-2026-0883', alertId:'99994',  alertType:'PRA Alert',    merchant:'HolidayTravels',    analyst:'SK-71882', verdict:'Organic — Close Alert',        responseTime:'42 min', closedAt:'2d ago',       sopCompliant:true },
];

// ─── Geographic Risk ──────────────────────────────────────────────────────────
export const GEO_RISK: GeoRiskRow[] = [
  { region: 'South East Asia', alertCount: 18, declineRate: '31.4%', topAttackType: 'BIN Attack',   trend: 'up' },
  { region: 'Europe',          alertCount: 11, declineRate: '22.7%', topAttackType: 'ATM Cashout',  trend: 'up' },
  { region: 'North America',   alertCount: 9,  declineRate: '14.8%', topAttackType: 'CNP Alert',    trend: 'stable' },
  { region: 'Middle East',     alertCount: 6,  declineRate: '17.2%', topAttackType: 'POS Alert',    trend: 'down' },
  { region: 'Global / Multi',  alertCount: 3,  declineRate: '3.2%',  topAttackType: 'PRA Alert',    trend: 'stable' },
];

// ─── Activity Feed ────────────────────────────────────────────────────────────
export const ACTIVITY_FEED: ActivityEntry[] = [
  { time: '10:28 UTC', event: 'Block rule BLK-2026-0441 activating — BIN Attack at GlobalShop Inc (CAID-9921)',  type: 'block',          severity: 'high' },
  { time: '10:14 UTC', event: 'Investigation INV-2026-0892 closed — Suspicious verdict, analyst RJ-99210',       type: 'investigation',  severity: 'high' },
  { time: '10:11 UTC', event: 'Issuer notification sent to Chase Bank — BIN 453211 exposure, 14 PANs confirmed', type: 'notification',   severity: 'high' },
  { time: '09:47 UTC', event: 'New alert 100001 created — BIN Attack, GlobalShop Inc, High severity',            type: 'alert',          severity: 'high' },
  { time: '09:33 UTC', event: 'Block rule BLK-2026-0439 activated — CNP Alert at DigitalStream Sub',             type: 'block',          severity: 'medium' },
  { time: '09:18 UTC', event: 'Investigation INV-2026-0890 closed — Suspicious verdict, block rule applied',     type: 'investigation',  severity: 'medium' },
  { time: '08:55 UTC', event: 'Issuer notification sent to Wells Fargo — CNP card testing, 31 PANs tested',      type: 'notification',   severity: 'medium' },
  { time: '08:31 UTC', event: 'Block rule BLK-2026-0437 activated — ATM Cashout at FastPay Services',            type: 'block',          severity: 'high' },
  { time: '08:14 UTC', event: 'BLK-2026-0431 expiry warning — auto-renew disabled, analyst review required',     type: 'system',         severity: 'medium' },
  { time: '07:52 UTC', event: 'Investigation INV-2026-0888 closed — Organic verdict, PRA alert cleared',         type: 'investigation',  severity: 'low' },
];

// ─── KPI Summary ──────────────────────────────────────────────────────────────
export const KPI_SUMMARY = {
  queueDepth:         { value: 5,      label: 'Queue Depth',                  sub: '3 High, 1 Med, 1 Low',    trend: +2,  trendLabel: 'vs yesterday' },
  investigatedToday:  { value: 8,      label: 'Investigated Today',           sub: '5 closed, 3 in progress', trend: +1,  trendLabel: 'vs avg' },
  suspiciousRate7d:   { value: '38%',  label: 'Suspicious Rate (7d)',         sub: '18 of 47 cases actioned', trend: +4,  trendLabel: 'pp vs prior 7d' },
  avgResponseTime:    { value: '18.3', label: 'Avg Response Time (min)',      sub: 'SLA target: 30 min',      trend: -3,  trendLabel: 'min vs prior 7d' },
  activeBlocks:       { value: 7,      label: 'Active Block Rules',           sub: '3 expiring within 6h',    trend: +2,  trendLabel: 'vs yesterday' },
  issuerNotifAckRate: { value: '91%',  label: 'Issuer Notification Ack Rate', sub: '21 of 23 acknowledged',   trend: -3,  trendLabel: 'pp vs 30d avg' },
  sopCompliance:      { value: '99%',  label: 'SOP Compliance Rate (30d)',    sub: 'All cases SOP-compliant',  trend: +5,  trendLabel: 'pp vs prior 30d' },
  declineRateNow:     { value: '3.4%', label: 'Network Decline Rate (now)',   sub: 'Baseline: 2.3%',          trend: +1.1,trendLabel: 'pp above baseline' },
};

// ─── Alert Type Distribution (30d totals from daily series) ──────────────────
export const ALERT_TYPE_DIST = [
  { name: 'BIN Attack',   value: 19, color: '#ef4444' },
  { name: 'CNP Alert',    value: 14, color: '#f59e0b' },
  { name: 'POS Alert',    value: 8,  color: '#3b82f6' },
  { name: 'PRA Alert',    value: 5,  color: '#10b981' },
  { name: 'ATM Cashout',  value: 2,  color: '#8b5cf6' },
];
