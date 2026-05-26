import { Alert, AlertProfile, DiagnosisData, BlockRule, EmailDraft, SummaryData, RuleCondition, BlockImpact } from '../types';

// ─── Available Condition Fields ───────────────────────────────────────────────

export const AVAILABLE_FIELDS = [
  { field: 'txn_amount',       label: 'Transaction Amount (USD)', operator: 'BETWEEN', placeholder: '0.01', placeholder2: '99.99' },
  { field: 'pos_entry_mode',   label: 'POS Entry Mode',           operator: 'IN',      placeholder: '01, 80' },
  { field: 'mfa_indicator',    label: 'MFA / 3DS Status',         operator: '=',       placeholder: 'N' },
  { field: 'country_code',     label: 'Merchant Country',         operator: 'IN',      placeholder: 'SGP, MYS, IDN' },
  { field: 'pan_history_flag', label: 'PAN Has Prior History',    operator: '=',       placeholder: 'N' },
  { field: 'response_code',    label: 'Response Code',            operator: 'IN',      placeholder: '05, N7, 62' },
];

// Reason codes reflect behavioral pattern assessment — fraud status is confirmed later
export const ACTION_REASON_CODES = [
  { code: 'HIGH-DECLINE-BIN-ANOMALY',  label: 'Decline rate spike on BIN — significantly above merchant baseline' },
  { code: 'CARD-TESTING-PATTERN',      label: 'Card testing — automated low-amount probing with high decline rate' },
  { code: 'NEW-PAN-VELOCITY-SURGE',    label: 'New PAN velocity surge — high ratio of never-before-seen cards' },
  { code: 'EMV-BYPASS-KEYED-SURGE',    label: 'POS entry mode shift — keyed/fallback surge vs chip baseline' },
  { code: 'MFA-BYPASS-COORDINATED',    label: 'MFA bypass pattern — coordinated avoidance of 3DS authentication' },
];

export const CLOSE_REASON_CODES = [
  { code: 'ORGANIC-VOLUME-GROWTH',     label: 'Organic volume growth — within expected bounds for merchant category' },
  { code: 'SEASONAL-CAMPAIGN-SPIKE',   label: 'Marketing campaign or seasonal event driving legitimate spike' },
  { code: 'THRESHOLD-MISCALIBRATION',  label: 'Monitoring rule threshold miscalibrated — review recommended' },
  { code: 'KNOWN-ISSUER-PATTERN',      label: 'Normal cross-border pattern for this issuer portfolio' },
  { code: 'ACQUIRER-CONFIRMED-ORGANIC',label: 'Acquirer confirmed organic — event/promotion validated' },
];

// ─── Live Block Impact Simulation ─────────────────────────────────────────────

function rangeOverlaps(rangeStr: string, lower: number, upper: number): boolean {
  const match = rangeStr.match(/\$(\d+)[–\-]\$(\d+)/);
  if (!match) return upper >= 500;
  return parseInt(match[1]) < upper && parseInt(match[2]) > lower;
}

function getConditionImpact(cond: RuleCondition, data: DiagnosisData): { fraud: number; genuine: number } {
  switch (cond.field) {
    case 'txn_amount': {
      const upper = parseFloat(cond.value2 ?? '9999');
      const lower = parseFloat(cond.value ?? '0');
      // pct_of_total is the concentration proxy for suspicious pattern coverage
      const patternPct = data.amountDistribution
        .filter(b => rangeOverlaps(b.range, lower, upper))
        .reduce((s, b) => s + b.pct_of_total, 0) / 100;
      const genuineFrac = upper <= 50 ? 0.12 : upper <= 75 ? 0.19 : upper <= 100 ? 0.28 : upper <= 250 ? 0.55 : 0.75;
      return { fraud: Math.max(patternPct, 0.01), genuine: genuineFrac };
    }
    case 'pos_entry_mode': {
      const modes = cond.value.split(',').map(v => v.trim());
      const hasSuspiciousModes = modes.some(m => ['01', '80'].includes(m));
      return hasSuspiciousModes ? { fraud: 0.96, genuine: 0.03 } : { fraud: 0.04, genuine: 0.97 };
    }
    case 'mfa_indicator':
      return cond.value.trim() === 'N' ? { fraud: 0.98, genuine: 0.15 } : { fraud: 0.02, genuine: 0.85 };
    case 'country_code': {
      const countries = cond.value.split(',').map(v => v.trim().toUpperCase());
      const matched = data.geographicBreakdown.filter(g =>
        countries.some(c => g.country.toUpperCase().includes(c))
      );
      const totalDeclines = data.geographicBreakdown.reduce((s, g) => s + g.decline_count, 0);
      const patternFrac = matched.reduce((s, g) => s + g.decline_count, 0) / Math.max(totalDeclines, 1);
      return { fraud: Math.max(patternFrac, 0.01), genuine: Math.min(patternFrac * 0.25, 0.5) };
    }
    case 'pan_history_flag':
      return cond.value.trim() === 'N' ? { fraud: 0.72, genuine: 0.08 } : { fraud: 0.28, genuine: 0.92 };
    case 'response_code': {
      const rcs = cond.value.split(',').map(v => v.trim());
      const total = data.responseCodeBreakdown.reduce((s, r) => s + r.count, 0);
      const suspiciousCount = data.responseCodeBreakdown
        .filter(r => rcs.includes(r.code) && r.is_suspicion_indicator)
        .reduce((s, r) => s + r.count, 0);
      return {
        fraud: suspiciousCount / Math.max(total, 1),
        genuine: rcs.includes('00') ? 0.75 : 0.08,
      };
    }
    default:
      return { fraud: 1.0, genuine: 1.0 };
  }
}

export function simulateBlockImpact(conditions: RuleCondition[], data: DiagnosisData): BlockImpact {
  if (!data.blockRule) return { suspiciousPatternBlocked: 0, legitimateImpacted: 0, patternCoverage: 0, falsePositiveRate: 0, estimatedRiskExposure: 0 };
  const TOTAL_PATTERN = data.blockRule.suspiciousPatternBlocked;
  const TOTAL_LEGIT = Math.round(TOTAL_PATTERN * (data.blockRule.falsePositiveRate / 100));

  let patternFrac = 1.0;
  let legitFrac = 1.0;
  for (const cond of conditions) {
    if (cond.locked) continue;
    const impact = getConditionImpact(cond, data);
    patternFrac *= impact.fraud;
    legitFrac *= impact.genuine;
  }

  const suspiciousPatternBlocked = Math.round(TOTAL_PATTERN * patternFrac);
  const legitimateImpacted = Math.round(TOTAL_LEGIT * legitFrac);
  return {
    suspiciousPatternBlocked,
    legitimateImpacted,
    patternCoverage: parseFloat((suspiciousPatternBlocked / TOTAL_PATTERN * 100).toFixed(1)),
    falsePositiveRate: parseFloat((legitimateImpacted / Math.max(TOTAL_LEGIT, 1) * 100).toFixed(2)),
    estimatedRiskExposure: Math.round(suspiciousPatternBlocked * 49.5),
  };
}

export function buildDefaultConditions(alert: Alert): RuleCondition[] {
  return [
    { id: 'bin',  field: 'issuer_bin',     label: 'Issuer BIN',               operator: '=',       value: alert.details.bin,   locked: true },
    { id: 'caid', field: 'merchant_id',    label: 'Merchant CAID',            operator: '=',       value: alert.details.caid,  locked: true },
    { id: 'amt',  field: 'txn_amount',     label: 'Transaction Amount (USD)',  operator: 'BETWEEN', value: '0.01', value2: '99.99', locked: false },
    { id: 'pos',  field: 'pos_entry_mode', label: 'POS Entry Mode',            operator: 'IN',      value: '01, 80',            locked: false },
    { id: 'mfa',  field: 'mfa_indicator',  label: 'MFA / 3DS Status',          operator: '=',       value: 'N',                 locked: false },
  ];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const ALERTS: Alert[] = [
  {
    id: '100001', type: 'BIN Attack', severity: 'High', status: 'Pending',
    timestamp: new Date().toISOString(),
    previousAlerts: ['100000-X', '100000-Y'],
    details: {
      bin: '453211', merchant: 'GlobalShop Inc', caid: 'CAID-9921',
      geography: 'South East Asia', issuerName: 'Chase Bank',
      acquirerBank: 'J.P. Morgan', issuerCountry: 'USA', merchantCountry: 'Singapore',
      attackTaxonomy: 'High Volume BIN Attack', mcc: '5411', mccDescription: 'Grocery Stores',
    },
  },
  {
    id: '100002', type: 'ATM Cashout', severity: 'Medium', status: 'Pending',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    previousAlerts: [],
    details: {
      bin: '512299', merchant: 'FastPay Services', caid: 'CAID-4412',
      geography: 'Europe', issuerName: 'Barclays',
      acquirerBank: 'HSBC', issuerCountry: 'UK', merchantCountry: 'Germany',
      attackTaxonomy: 'Cross-Border Velocity Surge', mcc: '6011', mccDescription: 'ATM Cash Disbursements',
    },
  },
  {
    id: '100003', type: 'CNP Alert', severity: 'High', status: 'Pending',
    timestamp: new Date(Date.now() - 2700000).toISOString(),
    previousAlerts: ['100000-Z'],
    details: {
      bin: '411111', merchant: 'DigitalStream Sub', caid: 'CAID-1022',
      geography: 'North America', issuerName: 'Wells Fargo',
      acquirerBank: 'Stripe', issuerCountry: 'USA', merchantCountry: 'USA',
      attackTaxonomy: 'Small Amount Card Testing', mcc: '7372', mccDescription: 'Computer Programming/Data Processing',
    },
  },
  {
    id: '100004', type: 'POS Alert', severity: 'High', status: 'Pending',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    previousAlerts: [],
    details: {
      bin: '400022', merchant: 'LuxuryRetail', caid: 'CAID-5567',
      geography: 'Middle East', issuerName: 'Emirates NBD',
      acquirerBank: 'Network Intl', issuerCountry: 'UAE', merchantCountry: 'UAE',
      attackTaxonomy: 'High Value ATO Pattern', mcc: '5944', mccDescription: 'Jewelry Stores, Watches, Clocks',
    },
  },
  {
    id: '100005', type: 'PRA Alert', severity: 'Low', status: 'Pending',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    previousAlerts: ['100000-W'],
    details: {
      bin: '491288', merchant: 'HolidayTravels', caid: 'CAID-8821',
      geography: 'Global', issuerName: 'CitiBank',
      acquirerBank: 'WorldPay', issuerCountry: 'Global', merchantCountry: 'Global',
      attackTaxonomy: 'Organic Seasonal Growth', mcc: '4722', mccDescription: 'Travel Agencies, Tour Operators',
    },
  },
];

// ─── Alert Profile ────────────────────────────────────────────────────────────

export function getAlertProfile(alert: Alert): AlertProfile {
  const isOrganic = alert.id === '100005';
  return {
    riskScore: isOrganic ? 22 : 94,
    confidence: isOrganic ? 'Low' : 'High',
    matchedPattern: isOrganic
      ? 'Seasonal Volume Growth — consistent with historical YoY pattern'
      : 'BIN Anomaly — High decline rate + new PAN surge + keyed entry shift',
    velocityMetrics: {
      txnsLastHour: isOrganic ? 312 : 523,
      declinesLastHour: isOrganic ? 5 : 194,
      declineRatePct: isOrganic ? '1.6%' : '37.1%',
      baselineHourly: isOrganic ? 290 : 18,
      surgeMultiplier: isOrganic ? '1.1x' : '29x',
      newPanRatio: isOrganic ? '5.1%' : '72.4%',
    },
    merchantProfile: {
      registrationDate: isOrganic ? '2019-03-14' : '2024-11-15',
      totalLifetimeTxns: isOrganic ? 182441 : 4821,
      avgMonthlyTxns: isOrganic ? 15200 : 802,
      mcc: alert.details.mcc || '5411',
      mccDescription: alert.details.mccDescription || 'Grocery Stores',
      riskCategory: isOrganic ? 'Low Risk — Established Merchant' : 'High Risk — New Merchant',
    },
    previousIncidents: alert.previousAlerts.map((id, i) => ({
      id,
      date: `2026-0${i + 2}-${String(10 + i * 5).padStart(2, '0')}`,
      type: i === 0 ? 'Card Testing' : 'BIN Anomaly',
      outcome: 'Actioned',
    })),
  };
}

// ─── SQL Queries ──────────────────────────────────────────────────────────────

export function buildQueries(alert: Alert) {
  const now = new Date().toISOString();
  const from4h = new Date(Date.now() - 4 * 3600000).toISOString();
  const from6m = new Date(Date.now() - 183 * 86400000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  return [
    {
      id: 'fvr',
      label: 'Query 1 — FVR: 4-Hour Authorization Anomaly Report',
      description: 'Hourly authorization behavior: decline rate, new PAN count, POS entry mode shift, amount average — no fraud_flag (not available in real-time).',
      query: `-- FVR: Hourly Authorization Anomaly Report (Last 4 Hours)
-- Schema: visa_prod.transactions LEFT JOIN visa_prod.pan_history
-- Note: fraud_flag excluded — reconciled 3-7 days post-transaction
SELECT
    DATE_TRUNC('hour', t.txn_timestamp)         AS hour_bucket,
    COUNT(*)                                     AS total_txns,
    SUM(CASE WHEN t.response_code <> '00'
        THEN 1 ELSE 0 END)                       AS decline_count,
    ROUND(
        SUM(CASE WHEN t.response_code <> '00'
            THEN 1 ELSE 0 END)::NUMERIC
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                            AS decline_rate_pct,
    COUNT(DISTINCT t.masked_pan)                 AS unique_pans,
    SUM(CASE WHEN ph.masked_pan IS NULL
        THEN 1 ELSE 0 END)                       AS new_pan_count,
    SUM(CASE WHEN t.pos_entry_mode IN ('01','80')
        THEN 1 ELSE 0 END)                       AS keyed_entry_count,
    ROUND(AVG(t.txn_amount_usd), 2)              AS avg_amount_usd
FROM visa_prod.transactions t
LEFT JOIN visa_prod.pan_history ph
    ON  t.masked_pan     = ph.masked_pan
    AND ph.merchant_caid = t.merchant_caid
WHERE
    t.merchant_caid  = '${alert.details.caid}'
    AND t.issuer_bin = '${alert.details.bin}'
    AND t.txn_timestamp BETWEEN '${from4h}' AND '${now}'
GROUP BY 1
ORDER BY 1 ASC;`,
    },
    {
      id: 'history',
      label: 'Query 2 — 6-Month Baseline + Transaction Detail',
      description: 'Monthly decline rate trend vs baseline, and transaction sample with PAN history status — establishes normal authorization behavior for comparison.',
      query: `-- 6-Month Baseline + Transaction Sample (Behavioral Comparison)
-- Schema: visa_prod.transactions LEFT JOIN visa_prod.pan_history
-- Purpose: compare current decline/POS/PAN pattern against 6-month baseline
WITH monthly_baseline AS (
    SELECT
        TO_CHAR(txn_timestamp, 'Mon YY')    AS month,
        COUNT(*)                             AS total_txns,
        SUM(CASE WHEN response_code <> '00'
            THEN 1 ELSE 0 END)               AS decline_count,
        ROUND(
            SUM(CASE WHEN response_code <> '00'
                THEN 1 ELSE 0 END)::NUMERIC
            / NULLIF(COUNT(*), 0) * 100, 2
        )                                    AS decline_rate_pct,
        ROUND(AVG(txn_amount_usd), 2)        AS avg_txn_amount
    FROM visa_prod.transactions
    WHERE
        merchant_caid  = '${alert.details.caid}'
        AND issuer_bin = '${alert.details.bin}'
        AND txn_timestamp >= '${from6m}'
    GROUP BY 1
    ORDER BY MIN(txn_timestamp)
),
txn_sample AS (
    SELECT
        t.txn_id,
        t.txn_timestamp,
        t.masked_pan,
        t.txn_amount_usd,
        t.response_code,
        t.pos_entry_mode,
        t.mfa_indicator,
        t.merchant_country,
        ph.prior_txn_count                   AS pan_history_count,
        ph.account_open_date,
        CASE WHEN ph.masked_pan IS NULL
             THEN 'NEW' ELSE 'KNOWN' END     AS pan_history_status
    FROM visa_prod.transactions t
    LEFT JOIN visa_prod.pan_history ph
        ON  t.masked_pan     = ph.masked_pan
        AND ph.merchant_caid = t.merchant_caid
    WHERE
        t.merchant_caid  = '${alert.details.caid}'
        AND t.issuer_bin = '${alert.details.bin}'
        AND t.txn_timestamp::DATE = '${todayStr}'
    ORDER BY t.txn_timestamp DESC
    LIMIT 100
)
SELECT * FROM monthly_baseline
UNION ALL
SELECT * FROM txn_sample;`,
    },
  ];
}

// ─── Diagnosis Data ───────────────────────────────────────────────────────────

export function getMockDiagnosisData(alert: Alert): DiagnosisData {
  const isOrganic = alert.id === '100005';

  // FVR: authorization behavior signals — no fraud_flag
  const fvrHourly = Array.from({ length: 24 }, (_, i) => {
    const isSurge = !isOrganic && i >= 19;
    const total = isOrganic
      ? Math.floor(Math.random() * 60) + 80
      : isSurge
        ? Math.floor(Math.random() * 150) + 450
        : Math.floor(Math.random() * 25) + 10;
    const declines = isSurge
      ? Math.floor(total * (0.34 + Math.random() * 0.10))
      : Math.floor(total * (0.01 + Math.random() * 0.015));
    const newPans = isSurge
      ? Math.floor(total * (0.68 + Math.random() * 0.08))
      : Math.floor(total * 0.04);
    const keyed = isSurge
      ? Math.floor(total * (0.74 + Math.random() * 0.10))
      : Math.floor(total * 0.02);
    const avgAmt = isSurge
      ? parseFloat((49.97 + Math.random() * 0.04).toFixed(2))
      : isOrganic
        ? parseFloat((120 + Math.random() * 200).toFixed(2))
        : parseFloat((45 + Math.random() * 30).toFixed(2));
    return {
      hour: `${String(i).padStart(2, '0')}:00`,
      total_txns: total,
      decline_count: declines,
      decline_rate_pct: parseFloat(((declines / total) * 100).toFixed(1)),
      new_pan_count: newPans,
      keyed_entry_count: keyed,
      avg_amount_usd: avgAmt,
    };
  });

  // 6-month trend: decline rate is the real-time-safe historical proxy
  const sixMonthTrend = isOrganic ? [
    { month: 'Oct 25', txns: 12182, decline_count: 183, decline_rate: 1.50, avg_amount: 412.50 },
    { month: 'Nov 25', txns: 14523, decline_count: 218, decline_rate: 1.50, avg_amount: 438.20 },
    { month: 'Dec 25', txns: 28891, decline_count: 433, decline_rate: 1.50, avg_amount: 489.10 },
    { month: 'Jan 26', txns: 12108, decline_count: 182, decline_rate: 1.50, avg_amount: 401.30 },
    { month: 'Feb 26', txns: 14241, decline_count: 214, decline_rate: 1.50, avg_amount: 422.80 },
    { month: 'Mar 26', txns: 18240, decline_count: 274, decline_rate: 1.50, avg_amount: 449.90 },
  ] : [
    { month: 'Oct 25', txns: 1182,  decline_count: 9,    decline_rate: 0.76, avg_amount: 142.50 },
    { month: 'Nov 25', txns: 4523,  decline_count: 38,   decline_rate: 0.84, avg_amount: 138.20 },
    { month: 'Dec 25', txns: 8891,  decline_count: 89,   decline_rate: 1.00, avg_amount: 145.80 },
    { month: 'Jan 26', txns: 2108,  decline_count: 14,   decline_rate: 0.66, avg_amount: 139.10 },
    { month: 'Feb 26', txns: 2341,  decline_count: 17,   decline_rate: 0.73, avg_amount: 141.30 },
    { month: 'Mar 26', txns: 15672, decline_count: 5821, decline_rate: 37.14, avg_amount: 49.98 },
  ];

  const rcOptions = isOrganic
    ? [{ code: '00', desc: 'Approved', suspicious: false }]
    : [
        { code: '05', desc: 'Do Not Honor', suspicious: true },
        { code: 'N7', desc: 'CVV2 Mismatch', suspicious: true },
        { code: '62', desc: 'Restricted Card', suspicious: true },
        { code: '00', desc: 'Approved', suspicious: false },
        { code: '51', desc: 'Insufficient Funds', suspicious: true },
      ];
  const countries = isOrganic
    ? ['USA', 'UK', 'France', 'Germany']
    : ['Singapore', 'Malaysia', 'Indonesia', 'Singapore'];
  const posModes = isOrganic
    ? ['Chip (05)', 'Contactless (07)']
    : ['Keyed (01)', 'Keyed (01)', 'Fallback (80)'];

  const sampleTransactions = Array.from({ length: 12 }, (_, i) => {
    const rc = rcOptions[Math.floor(Math.random() * rcOptions.length)];
    const minsAgo = 5 + i * 3;
    const ts = new Date(Date.now() - minsAgo * 60000);
    const hasHistory = isOrganic ? Math.random() > 0.08 : Math.random() > 0.72;
    return {
      txn_id: `TXN-${Math.floor(Math.random() * 9000000) + 1000000}`,
      timestamp: ts.toISOString().replace('T', ' ').substring(0, 19),
      masked_pan: `**** **** **** ${Math.floor(Math.random() * 9000) + 1000}`,
      amount_usd: isOrganic
        ? parseFloat((120 + Math.random() * 800).toFixed(2))
        : parseFloat((49.97 + Math.floor(Math.random() * 4) * 0.01).toFixed(2)),
      response_code: rc.code,
      rc_description: rc.desc,
      pos_entry_mode: posModes[Math.floor(Math.random() * posModes.length)],
      mfa_status: isOrganic ? (Math.random() > 0.3 ? '3DS2' : 'None') : 'None',
      country: countries[Math.floor(Math.random() * countries.length)],
      has_history: hasHistory,
      is_new_pan: !hasHistory,
    };
  });

  const responseCodeBreakdown = isOrganic ? [
    { code: '00', description: 'Approved',           count: 17832, pct: 97.8, is_suspicion_indicator: false },
    { code: '05', description: 'Do Not Honor',       count: 241,   pct: 1.3,  is_suspicion_indicator: false },
    { code: '51', description: 'Insufficient Funds', count: 127,   pct: 0.7,  is_suspicion_indicator: false },
    { code: 'N7', description: 'CVV2 Mismatch',      count: 40,    pct: 0.2,  is_suspicion_indicator: true  },
  ] : [
    { code: '00', description: 'Approved',           count: 487,  pct: 10.3, is_suspicion_indicator: false },
    { code: '05', description: 'Do Not Honor',       count: 1821, pct: 38.4, is_suspicion_indicator: true  },
    { code: 'N7', description: 'CVV2 Mismatch',      count: 1243, pct: 26.2, is_suspicion_indicator: true  },
    { code: '62', description: 'Restricted Card',    count: 801,  pct: 16.9, is_suspicion_indicator: true  },
    { code: '51', description: 'Insufficient Funds', count: 392,  pct: 8.3,  is_suspicion_indicator: true  },
  ];

  const geographicBreakdown = isOrganic ? [
    { country: 'United States', txns: 8210, decline_count: 123, decline_rate: 1.50, new_pan_count: 328,  amount_usd: 2841200 },
    { country: 'United Kingdom', txns: 3891, decline_count: 58,  decline_rate: 1.49, new_pan_count: 156,  amount_usd: 1340100 },
    { country: 'France',         txns: 2940, decline_count: 44,  decline_rate: 1.50, new_pan_count: 118,  amount_usd: 994200  },
    { country: 'Germany',        txns: 1821, decline_count: 27,  decline_rate: 1.48, new_pan_count: 73,   amount_usd: 612400  },
    { country: 'Others',         txns: 1378, decline_count: 21,  decline_rate: 1.52, new_pan_count: 55,   amount_usd: 412300  },
  ] : [
    { country: 'Singapore', txns: 2841, decline_count: 1102, decline_rate: 38.8, new_pan_count: 2041, amount_usd: 142001 },
    { country: 'Malaysia',  txns: 921,  decline_count: 338,  decline_rate: 36.7, new_pan_count: 672,  amount_usd: 43472  },
    { country: 'Indonesia', txns: 612,  decline_count: 217,  decline_rate: 35.5, new_pan_count: 441,  amount_usd: 28611  },
    { country: 'Thailand',  txns: 287,  decline_count: 99,   decline_rate: 34.5, new_pan_count: 201,  amount_usd: 13361  },
    { country: 'Others',    txns: 83,   decline_count: 28,   decline_rate: 33.7, new_pan_count: 58,   amount_usd: 3541   },
  ];

  const panVelocityTop10 = Array.from({ length: 10 }, (_, i) => ({
    masked_pan: `**** **** **** ${String(1000 + i * 137).padStart(4, '0')}`,
    txn_count: isOrganic ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 8) + 12,
    decline_count: isOrganic ? 0 : Math.floor(Math.random() * 6) + 8,
    total_spend: isOrganic
      ? parseFloat((Math.random() * 2000 + 300).toFixed(2))
      : parseFloat((Math.random() * 300 + 50).toFixed(2)),
    has_prior_history: isOrganic ? true : Math.random() > 0.7,
    first_seen: isOrganic ? '2024-08-12' : '2026-05-26',
  }));

  const amountDistribution = isOrganic ? [
    { range: '$0–$50',    count: 2182, decline_count: 33, pct_of_total: 11.9 },
    { range: '$50–$100',  count: 3291, decline_count: 49, pct_of_total: 18.0 },
    { range: '$100–$250', count: 5821, decline_count: 87, pct_of_total: 31.8 },
    { range: '$250–$500', count: 4118, decline_count: 62, pct_of_total: 22.5 },
    { range: '$500+',     count: 2828, decline_count: 42, pct_of_total: 15.5 },
  ] : [
    { range: '$0–$50',    count: 4012, decline_count: 1604, pct_of_total: 86.2 },
    { range: '$50–$100',  count: 521,  decline_count: 182,  pct_of_total: 11.2 },
    { range: '$100–$250', count: 181,  decline_count: 41,   pct_of_total: 3.9  },
    { range: '$250–$500', count: 30,   decline_count: 4,    pct_of_total: 0.6  },
    { range: '$500+',     count: 0,    decline_count: 0,    pct_of_total: 0.0  },
  ];

  const totalDeclines4h = fvrHourly.slice(18).reduce((s, r) => s + r.decline_count, 0);
  const totalTxns4h = fvrHourly.slice(18).reduce((s, r) => s + r.total_txns, 0);
  const peakRow = [...fvrHourly].sort((a, b) => b.decline_rate_pct - a.decline_rate_pct)[0];

  const blockRule: BlockRule | null = isOrganic ? null : {
    ruleId: `RULE-${Date.now().toString(36).toUpperCase()}`,
    rule: `IF (\n  issuer_bin = '${alert.details.bin}'\n  AND merchant_id = '${alert.details.caid}'\n  AND txn_amount BETWEEN 0.01 AND 99.99\n  AND pos_entry_mode IN ('01', '80')\n  AND mfa_indicator = 'N'\n) THEN\n  ACTION = BLOCK\n  REASON_CODE = 'PA-ANOMALY-BLOCK'\n  NOTIFY = TRUE`,
    variables: ['issuer_bin', 'merchant_id', 'txn_amount', 'pos_entry_mode', 'mfa_indicator'],
    impact: 'Targets the exact behavioral signature: keyed/fallback entry, sub-$100 amounts, no 3DS. Genuine chip-and-contactless transactions are unaffected.',
    suspiciousPatternBlocked: 4127,
    legitimateImpacted: 4,
    patternCoverage: 97.8,
    falsePositiveRate: 0.09,
    estimatedRiskExposure: 204182,
    expiryHours: 72,
    rationale: 'High confidence protective block. Behavioral signature is highly distinct from organic traffic. Low collateral impact due to MFA and POS mode filters.',
  };

  return {
    fvrHourly,
    sixMonthTrend,
    sampleTransactions,
    responseCodeBreakdown,
    geographicBreakdown,
    panVelocityTop10,
    amountDistribution,
    attackTaxonomyDetails: isOrganic ? {
      posEntryModeShift: 'No shift — 94% Chip/Contactless, consistent with merchant profile',
      concentrationAmount: 'Normal distribution across all amount ranges — no clustering signal',
      historicalActivity: 'Merchant active since 2019, consistent seasonal growth YoY',
      newPanRatio: '5.1% new PANs — within normal range for this merchant category',
      mfaBypassRate: '14.8% non-3DS — consistent with historical baseline for this issuer',
    } : {
      posEntryModeShift: 'Severe shift — 78% Keyed (01) + 18% Fallback (80) vs <2% baseline',
      concentrationAmount: '86.2% of transactions $49.97–$50.01 — automated card testing signature',
      historicalActivity: 'CAID registered Nov 2024 — limited 6-month history, no seasonal baseline',
      newPanRatio: '72.4% PANs with no prior activity at this merchant — card dump indicator',
      mfaBypassRate: '98.1% transactions bypassing 3DS — authentication circumvention pattern',
    },
    summary: {
      totalTxns4h,
      totalDeclines4h,
      declineRate4h: `${((totalDeclines4h / Math.max(totalTxns4h, 1)) * 100).toFixed(1)}%`,
      uniquePANs: isOrganic ? 892 : 628,
      newPANs: isOrganic ? 71 : 452,
      peakHour: peakRow.hour,
      peakDeclineRate: `${peakRow.decline_rate_pct}%`,
    },
    isLikelyOrganic: isOrganic,
    blockRule,
  };
}

// ─── Email Draft ──────────────────────────────────────────────────────────────

export function buildEmailDraft(alert: Alert, blockRule: BlockRule | null): EmailDraft {
  const now = new Date();
  const expiry = new Date(now.getTime() + 72 * 3600000);
  return {
    templateId: 'TMPL-PATTERN-ALERT-001',
    priority: 'URGENT',
    issuer: alert.details.issuerName,
    recipients: [`fraud-ops@${alert.details.issuerName.toLowerCase().replace(/\s/g, '')}.com`],
    cc: ['fraud-monitoring@visapayments.com', 'siem-ingest@internal.visa.com'],
    subject: `[URGENT] Suspicious Transaction Pattern Detected — BIN ${alert.details.bin} | ${alert.details.issuerName} | Case ${alert.id}`,
    body: `Dear ${alert.details.issuerName} Fraud Operations Team,

This is an urgent notification from the Visa Global Fraud Monitoring Center.

Our real-time authorization monitoring has detected a suspicious behavioral pattern on your portfolio that warrants immediate review and protective action.

IMPORTANT: This notification is based on authorization anomaly signals (decline rate, POS mode shift, new PAN velocity). Fraud confirmation from cardholder reporting will follow in 3–7 business days per standard reconciliation timelines.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCIDENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Case Reference  : ${alert.id}
Detection Time  : ${now.toUTCString()}
Pattern Type    : ${alert.type}
Attack Taxonomy : ${alert.details.attackTaxonomy}
Merchant        : ${alert.details.merchant}
CAID            : ${alert.details.caid}
Affected BIN    : ${alert.details.bin}
Geography       : ${alert.details.geography}
Acquirer        : ${alert.details.acquirerBank}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANOMALY SIGNALS (Last 4 Hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Authorization Volume    : ${(blockRule?.suspiciousPatternBlocked ?? 487).toLocaleString()} transactions (29x baseline)
Decline Rate            : ~37% (baseline <1%)
New PAN Ratio           : ~72% PANs with no prior merchant history
POS Mode Shift          : 78% Keyed entry vs <2% baseline
MFA / 3DS Bypass        : 98% transactions without authentication
Estimated Risk Exposure : $${(blockRule?.estimatedRiskExposure ?? 24000).toLocaleString()} (pending reconciliation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROTECTIVE CONTROL APPLIED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rule ID         : ${blockRule?.ruleId ?? 'RULE-PENDING'}
Applied At      : ${now.toUTCString()}
Valid Until     : ${expiry.toUTCString()} (72-hour protective window)
Pattern Coverage: ${blockRule?.patternCoverage ?? 97.8}%
Collateral Risk : ${blockRule?.falsePositiveRate ?? 0.09}% of legitimate transactions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REQUESTED ISSUER ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Validate against your cardholder complaint and early fraud reporting systems
2. Share any confirmed fraud data to support reconciliation and rule tuning
3. Consider proactive card controls for PANs with 3+ transactions at this CAID
4. Activate enhanced monitoring on BIN ${alert.details.bin} for 72 hours
5. Confirm receipt of this notification within 4 hours per SLA-FMC-002

Fraud confirmation data, once reconciled, will be shared via the standard post-incident report within 5–7 business days.

Regards,
Fraud Monitoring Analyst — Visa Global Fraud Operations
Case Reference: ${alert.id} | Classification: CONFIDENTIAL`,
  };
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function buildSummary(
  alert: Alert,
  assessment: string,
  blockApproved: boolean,
  emailSent: boolean,
  blockRule: BlockRule | null,
): SummaryData {
  const now = new Date();
  const isSuspicious = assessment === 'Suspicious — Action Required';
  return {
    ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
    status: isSuspicious ? 'Active — Fraud Reconciliation Pending (3–5 days)' : 'Closed — Organic Activity',
    monitoringDays: isSuspicious ? 5 : 0,
    actions: [
      isSuspicious
        ? '✓ Suspicious pattern confirmed — protective action initiated'
        : '✓ Organic activity — alert closed, no action required',
      blockApproved ? `✓ Protective block placed (${blockRule?.ruleId ?? 'RULE-N/A'})` : null,
      emailSent ? `✓ Issuer notification dispatched to ${alert.details.issuerName}` : null,
      '✓ SOP compliance checklist completed',
      '✓ Investigation documented in SIEM',
      isSuspicious ? '↻ Fraud reconciliation monitoring window: 3–5 days' : null,
    ].filter(Boolean) as string[],
    timeline: [
      { time: new Date(Date.now() - 900000).toLocaleTimeString(), event: `Alert ${alert.id} fired — ${alert.type} anomaly detected` },
      { time: new Date(Date.now() - 750000).toLocaleTimeString(), event: 'Alert assigned to analyst RJ-99210' },
      { time: new Date(Date.now() - 600000).toLocaleTimeString(), event: 'FVR and 6-month baseline queried' },
      { time: new Date(Date.now() - 450000).toLocaleTimeString(), event: 'Authorization anomaly analysis completed' },
      { time: new Date(Date.now() - 300000).toLocaleTimeString(), event: `Assessment: ${assessment}` },
      blockApproved ? { time: new Date(Date.now() - 180000).toLocaleTimeString(), event: 'Protective block rule approved and activated' } : null,
      emailSent ? { time: new Date(Date.now() - 60000).toLocaleTimeString(), event: `Issuer notification sent to ${alert.details.issuerName}` } : null,
      { time: now.toLocaleTimeString(), event: isSuspicious ? 'Ticket created — pending fraud reconciliation' : 'Investigation closed — organic activity confirmed' },
    ].filter(Boolean) as { time: string; event: string }[],
    sopChecklist: [
      { item: 'FVR authorization anomaly report reviewed (last 4 hours)',    passed: true },
      { item: '6-month baseline decline trend analyzed',                     passed: true },
      { item: 'PAN velocity and new-PAN ratio assessed',                     passed: true },
      { item: 'POS entry mode and amount concentration reviewed',            passed: true },
      { item: 'Behavioral pattern assessment documented',                    passed: true },
      { item: 'Protective block placed (suspicious only)',                   passed: blockApproved },
      { item: 'Issuer notification sent (suspicious only)',                  passed: emailSent },
      { item: 'Investigation ticket created',                                passed: true },
      { item: 'Fraud reconciliation monitoring scheduled (suspicious only)', passed: isSuspicious },
    ],
  };
}
