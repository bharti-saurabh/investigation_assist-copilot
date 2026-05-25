import express from 'express';
import { createServer as createViteServer } from 'vite';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());

// ─── Mock Alerts ──────────────────────────────────────────────────────────────

const ALERTS = [
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

// ─── Rich Mock Diagnosis Data ─────────────────────────────────────────────────

function getMockDiagnosisData(alertId: string) {
  const isFP = alertId === '100005';
  const alert = ALERTS.find(a => a.id === alertId)!;

  // FVR Hourly (24 hours)
  const fvrHourly = Array.from({ length: 24 }, (_, i) => {
    const isSurge = !isFP && i >= 19;
    const total = isSurge
      ? Math.floor(Math.random() * 150) + 450
      : isFP ? Math.floor(Math.random() * 60) + 80 : Math.floor(Math.random() * 25) + 10;
    const fraud = isSurge
      ? Math.floor(total * (0.88 + Math.random() * 0.08))
      : isFP ? Math.floor(total * 0.005) : Math.floor(total * 0.02);
    const fraudAmt = fraud * (49.99 + Math.random() * 10);
    return {
      hour: `${String(i).padStart(2, '0')}:00`,
      total_txns: total,
      fraud_txns: fraud,
      fraud_rate_pct: parseFloat(((fraud / total) * 100).toFixed(1)),
      total_amount: parseFloat((total * (45 + Math.random() * 20)).toFixed(2)),
      fraud_amount: parseFloat(fraudAmt.toFixed(2)),
    };
  });

  // 6-month trend
  const sixMonthTrend = [
    { month: 'Oct 25', txns: 1182, fraud: 9, fraud_rate: 0.76 },
    { month: 'Nov 25', txns: 4523, fraud: 38, fraud_rate: 0.84 },
    { month: 'Dec 25', txns: 8891, fraud: 112, fraud_rate: 1.26 },
    { month: 'Jan 26', txns: 2108, fraud: 14, fraud_rate: 0.66 },
    { month: 'Feb 26', txns: 2341, fraud: 17, fraud_rate: 0.73 },
    { month: 'Mar 26', txns: isFP ? 18240 : 15672, fraud: isFP ? 12 : 4218, fraud_rate: isFP ? 0.07 : 26.91 },
  ];

  // Sample transactions (realistic)
  const rcOptions = isFP
    ? [{ code: '00', desc: 'Approved', fraud: false }, { code: '00', desc: 'Approved', fraud: false }]
    : [
        { code: '05', desc: 'Do Not Honor', fraud: true },
        { code: 'N7', desc: 'CVV2 Mismatch', fraud: true },
        { code: '62', desc: 'Restricted Card', fraud: true },
        { code: '00', desc: 'Approved', fraud: false },
        { code: '51', desc: 'Insufficient Funds', fraud: true },
      ];
  const countries = isFP ? ['USA', 'UK', 'France', 'Germany'] : ['Singapore', 'Singapore', 'Malaysia', 'Indonesia', 'Singapore'];
  const posModes = isFP ? ['Chip (05)', 'Contactless (07)'] : ['Keyed (01)', 'Keyed (01)', 'Fallback (80)', 'Keyed (01)'];
  const pans = Array.from({ length: 10 }, () => `**** **** **** ${Math.floor(Math.random() * 9000) + 1000}`);

  const sampleTransactions = Array.from({ length: 12 }, (_, i) => {
    const rc = rcOptions[Math.floor(Math.random() * rcOptions.length)];
    const pan = pans[Math.floor(Math.random() * pans.length)];
    const minsAgo = 5 + i * 3;
    const ts = new Date(Date.now() - minsAgo * 60000);
    return {
      txn_id: `TXN-${Math.floor(Math.random() * 9000000) + 1000000}`,
      timestamp: ts.toISOString().replace('T', ' ').substring(0, 19),
      masked_pan: pan,
      amount_usd: isFP ? parseFloat((120 + Math.random() * 800).toFixed(2)) : parseFloat((49.99 + Math.floor(Math.random() * 3) * 0.01).toFixed(2)),
      response_code: rc.code,
      rc_description: rc.desc,
      pos_entry_mode: posModes[Math.floor(Math.random() * posModes.length)],
      mfa_status: isFP ? (Math.random() > 0.3 ? '3DS2' : 'None') : 'None',
      country: countries[Math.floor(Math.random() * countries.length)],
      has_history: isFP ? Math.random() > 0.08 : Math.random() > 0.72,
    };
  });

  // Response codes
  const responseCodeBreakdown = isFP ? [
    { code: '00', description: 'Approved', count: 17832, pct: 97.8, is_fraud_indicator: false },
    { code: '05', description: 'Do Not Honor', count: 241, pct: 1.3, is_fraud_indicator: false },
    { code: '51', description: 'Insufficient Funds', count: 127, pct: 0.7, is_fraud_indicator: false },
    { code: 'N7', description: 'CVV2 Mismatch', count: 40, pct: 0.2, is_fraud_indicator: true },
  ] : [
    { code: '00', description: 'Approved', count: 487, pct: 10.3, is_fraud_indicator: false },
    { code: '05', description: 'Do Not Honor', count: 1821, pct: 38.4, is_fraud_indicator: true },
    { code: 'N7', description: 'CVV2 Mismatch', count: 1243, pct: 26.2, is_fraud_indicator: true },
    { code: '62', description: 'Restricted Card', count: 801, pct: 16.9, is_fraud_indicator: true },
    { code: '51', description: 'Insufficient Funds', count: 392, pct: 8.3, is_fraud_indicator: true },
  ];

  // Geographic breakdown
  const geographicBreakdown = isFP ? [
    { country: 'United States', txns: 8210, fraud: 5, fraud_rate: 0.06, amount_usd: 2841200 },
    { country: 'United Kingdom', txns: 3891, fraud: 3, fraud_rate: 0.08, amount_usd: 1340100 },
    { country: 'France', txns: 2940, fraud: 2, fraud_rate: 0.07, amount_usd: 994200 },
    { country: 'Germany', txns: 1821, fraud: 1, fraud_rate: 0.05, amount_usd: 612400 },
    { country: 'Others', txns: 1378, fraud: 1, fraud_rate: 0.07, amount_usd: 412300 },
  ] : [
    { country: 'Singapore', txns: 2841, fraud: 2701, fraud_rate: 95.1, amount_usd: 142001 },
    { country: 'Malaysia', txns: 921, fraud: 867, fraud_rate: 94.1, amount_usd: 43472 },
    { country: 'Indonesia', txns: 612, fraud: 572, fraud_rate: 93.5, amount_usd: 28611 },
    { country: 'Thailand', txns: 287, fraud: 267, fraud_rate: 93.0, amount_usd: 13361 },
    { country: 'Others', txns: 83, fraud: 71, fraud_rate: 85.5, amount_usd: 3541 },
  ];

  // PAN velocity top 10
  const panVelocityTop10 = Array.from({ length: 10 }, (_, i) => ({
    masked_pan: `**** **** **** ${String(1000 + i * 137).padStart(4, '0')}`,
    txn_count: isFP ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 8) + 12,
    fraud_count: isFP ? 0 : Math.floor(Math.random() * 6) + 8,
    total_spend: isFP ? parseFloat((Math.random() * 2000 + 300).toFixed(2)) : parseFloat((Math.random() * 300 + 50).toFixed(2)),
    has_prior_history: isFP ? true : Math.random() > 0.7,
    first_seen: isFP ? '2024-08-12' : '2026-05-22',
  }));

  // Amount distribution
  const amountDistribution = isFP ? [
    { range: '$0–$50', count: 2182, fraud_count: 0, pct_of_fraud: 0 },
    { range: '$50–$100', count: 3291, fraud_count: 2, pct_of_fraud: 0.1 },
    { range: '$100–$250', count: 5821, fraud_count: 5, pct_of_fraud: 0.2 },
    { range: '$250–$500', count: 4118, fraud_count: 3, pct_of_fraud: 0.1 },
    { range: '$500+', count: 2828, fraud_count: 2, pct_of_fraud: 0.1 },
  ] : [
    { range: '$0–$50', count: 4012, fraud_count: 3821, pct_of_fraud: 90.6 },
    { range: '$50–$100', count: 521, fraud_count: 312, pct_of_fraud: 7.4 },
    { range: '$100–$250', count: 181, fraud_count: 71, pct_of_fraud: 1.7 },
    { range: '$250–$500', count: 30, fraud_count: 14, pct_of_fraud: 0.3 },
    { range: '$500+', count: 0, fraud_count: 0, pct_of_fraud: 0 },
  ];

  const totalFraud4h = fvrHourly.slice(18).reduce((s, r) => s + r.fraud_txns, 0);
  const totalTxns4h = fvrHourly.slice(18).reduce((s, r) => s + r.total_txns, 0);
  const peakRow = [...fvrHourly].sort((a, b) => b.fraud_rate_pct - a.fraud_rate_pct)[0];

  return {
    fvrHourly,
    sixMonthTrend,
    sampleTransactions,
    responseCodeBreakdown,
    geographicBreakdown,
    panVelocityTop10,
    amountDistribution,
    attackTaxonomyDetails: {
      posEntryModeShift: isFP
        ? 'No significant shift — 94% Chip/Contactless (normal distribution)'
        : 'Severe shift — 78% Keyed (01), 18% Fallback (80) vs baseline 2% Keyed',
      concentrationAmount: isFP
        ? 'Normal distribution across all amount ranges ($50–$850)'
        : '90.6% of fraud transactions clustered at $49.99 — classic card-testing amount',
      historicalActivity: isFP
        ? 'Merchant active since 2019, consistent seasonal Q1 growth pattern YoY'
        : 'CAID registered Nov 2024 — only 6 months history, no prior relationship established',
      cardPresentRatio: isFP ? '97% card-present' : '78% card-absent or fallback',
      newCardsRatio: isFP ? '8% new cards (within normal)' : '72% cards with no prior merchant history',
    },
    summary: {
      totalTxns4h: totalTxns4h,
      totalFraud4h: totalFraud4h,
      totalFraudAmount: parseFloat(fvrHourly.slice(18).reduce((s, r) => s + r.fraud_amount, 0).toFixed(2)),
      uniquePANs: isFP ? 892 : 628,
      newPANs: isFP ? 71 : 452,
      peakHour: peakRow.hour,
      peakFraudRate: `${peakRow.fraud_rate_pct}%`,
    },
    isLikelyFP: isFP,
    blockRule: isFP ? null : {
      ruleId: `RULE-${Date.now().toString(36).toUpperCase()}`,
      rule: `IF (\n  issuer_bin = '${alert.details.bin}'\n  AND merchant_id = '${alert.details.caid}'\n  AND txn_amount BETWEEN 0.01 AND 99.99\n  AND pos_entry_mode IN ('01', '80')\n  AND mfa_indicator = 'N'\n) THEN\n  ACTION = BLOCK\n  REASON_CODE = 'FR-BIN-ATTACK'\n  NOTIFY = TRUE`,
      variables: ['issuer_bin', 'merchant_id', 'txn_amount', 'pos_entry_mode', 'mfa_indicator'],
      impact: 'Targets the exact attack signature: keyed/fallback entry, sub-$100 amounts, no MFA. Genuine chip-and-contactless traffic is unaffected.',
      fraudBlocked: 4127,
      genuineBlocked: 4,
      catchRate: 97.8,
      falsePositiveRate: 0.09,
      estimatedFraudSavings: 204182,
      expiryHours: 72,
      rationale: 'High confidence block. Attack signature is distinct from organic traffic. Low FP rate due to MFA and POS entry mode filters.',
    },
  };
}

// ─── Alert Profile for Step 1 ─────────────────────────────────────────────────

function getAlertProfile(alertId: string) {
  const alert = ALERTS.find(a => a.id === alertId)!;
  const isFP = alertId === '100005';
  return {
    riskScore: isFP ? 22 : 94,
    confidence: isFP ? 'Low' : 'High',
    matchedPattern: isFP ? 'Seasonal Volume Growth (known pattern)' : 'BIN Attack — High-Volume EMV Bypass',
    velocityMetrics: {
      txnsLastHour: isFP ? 312 : 523,
      fraudLastHour: isFP ? 2 : 487,
      fraudRatePct: isFP ? '0.6%' : '93.1%',
      baselineHourly: isFP ? 290 : 18,
      surgeMultiplier: isFP ? '1.1x' : '29x',
    },
    merchantProfile: {
      registrationDate: isFP ? '2019-03-14' : '2024-11-15',
      totalLifetimeTxns: isFP ? 182441 : 4821,
      avgMonthlyTxns: isFP ? 15200 : 802,
      mcc: alert.details.mcc || '5411',
      mccDescription: alert.details.mccDescription || 'Grocery Stores',
      riskCategory: isFP ? 'Low Risk — Established Merchant' : 'High Risk — New Merchant',
    },
    previousIncidents: alert.previousAlerts.map((id, i) => ({
      id,
      date: `2026-0${i + 2}-${String(10 + i * 5).padStart(2, '0')}`,
      type: i === 0 ? 'Card Testing' : 'BIN Attack',
      outcome: 'TP',
    })),
  };
}

// ─── SSE Helpers ──────────────────────────────────────────────────────────────

function sseSetup(res: express.Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
}

function sseWrite(res: express.Response, payload: object) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function sseDone(res: express.Response) {
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}

// ─── LLM Client ───────────────────────────────────────────────────────────────

function getClient(config: { baseUrl: string; apiKey: string }) {
  const opts: any = { apiKey: config.apiKey };
  if (config.baseUrl) opts.baseURL = config.baseUrl;
  return new Anthropic(opts);
}

async function streamText(
  res: express.Response,
  client: Anthropic,
  model: string,
  system: string,
  userMsg: string,
) {
  const stream = await client.messages.stream({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: 'user', content: userMsg }],
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      sseWrite(res, { type: 'thinking', text: event.delta.text });
    }
  }
}

// ─── API Routes ───────────────────────────────────────────────────────────────

app.get('/api/alerts', (_req, res) => res.json(ALERTS));

// Step 1: Analyze alert
app.post('/api/agent/analyze-alert', async (req, res) => {
  sseSetup(res);
  const { alert, llmConfig } = req.body;
  const client = getClient(llmConfig);

  await streamText(res, client, llmConfig.model,
    `You are a senior fraud analyst at a global payment network's 24/7 monitoring center.
A new alert has just fired. Write a brief first-read analysis — what immediately stands out, what's suspicious, and what the risk level is.
Be specific. Reference the actual data. Max 120 words. No headers or bullets. Write as if dictating to a colleague.`,
    `Alert just fired. Quick read:

Alert ID: ${alert.id} | Type: ${alert.type} | Severity: ${alert.severity}
Merchant: ${alert.details.merchant} (CAID: ${alert.details.caid}, MCC: ${alert.details.mcc} — ${alert.details.mccDescription})
BIN: ${alert.details.bin} | Issuer: ${alert.details.issuerName} | Acquirer: ${alert.details.acquirerBank}
Merchant Country: ${alert.details.merchantCountry} | Issuer Country: ${alert.details.issuerCountry}
Geography: ${alert.details.geography} | Attack Taxonomy: ${alert.details.attackTaxonomy}
Previous alerts on this entity: ${alert.previousAlerts.length}

Give me your first read.`
  );

  sseWrite(res, { type: 'data', payload: { alertProfile: getAlertProfile(alert.id) } });
  sseDone(res);
});

// Step 2: Generate SQL queries
app.post('/api/agent/plan-queries', async (req, res) => {
  sseSetup(res);
  const { alert, llmConfig } = req.body;
  const client = getClient(llmConfig);

  await streamText(res, client, llmConfig.model,
    `You are a fraud data analyst. You're about to pull investigation data.
In one short paragraph, tell the analyst exactly what data you're fetching and why these two queries answer the investigation question.
Be specific about the tables and what signals you're looking for. Max 80 words.`,
    `Fetching data for: ${alert.type} | BIN: ${alert.details.bin} | Merchant: ${alert.details.merchant} | CAID: ${alert.details.caid}
What are you querying and why?`
  );

  const now = new Date().toISOString();
  const from4h = new Date(Date.now() - 4 * 3600000).toISOString();
  const from6m = new Date(Date.now() - 183 * 86400000).toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  sseWrite(res, {
    type: 'data',
    payload: {
      queries: [
        {
          id: 'fvr',
          label: 'Query 1 — FVR: 4-Hour Velocity Report',
          description: 'Pulls hourly transaction velocity with fraud breakdown for the impacted CAID/BIN in the last 4 hours.',
          query: `-- FVR: Hourly Transaction Velocity (Last 4 Hours)
-- Schema: visa_prod.transactions | Filtered by CAID + BIN + time window
SELECT
    DATE_TRUNC('hour', txn_timestamp)    AS hour_bucket,
    COUNT(*)                              AS total_txns,
    SUM(fraud_flag)                       AS fraud_txns,
    ROUND(
        SUM(fraud_flag)::NUMERIC
        / NULLIF(COUNT(*), 0) * 100, 2
    )                                     AS fraud_rate_pct,
    ROUND(SUM(txn_amount_usd), 2)         AS total_amount_usd,
    ROUND(SUM(
        CASE WHEN fraud_flag = 1
        THEN txn_amount_usd ELSE 0 END
    ), 2)                                 AS fraud_amount_usd
FROM visa_prod.transactions
WHERE
    merchant_caid    = '${alert.details.caid}'
    AND issuer_bin   = '${alert.details.bin}'
    AND txn_timestamp BETWEEN '${from4h}' AND '${now}'
GROUP BY 1
ORDER BY 1 ASC;`,
        },
        {
          id: 'history',
          label: 'Query 2 — 6-Month Baseline + Transaction Detail',
          description: 'Pulls monthly fraud trends and a sample of individual transactions for pattern analysis, PAN history, and POS entry mode review.',
          query: `-- 6-Month Baseline + Transaction Sample
-- Schema: visa_prod.transactions, visa_prod.pan_history
WITH monthly_baseline AS (
    SELECT
        TO_CHAR(txn_timestamp, 'Mon YY')  AS month,
        COUNT(*)                           AS total_txns,
        SUM(fraud_flag)                    AS fraud_txns,
        ROUND(AVG(txn_amount_usd), 2)      AS avg_txn_amount,
        ROUND(
            SUM(fraud_flag)::NUMERIC
            / NULLIF(COUNT(*), 0) * 100, 2
        )                                  AS fraud_rate_pct
    FROM visa_prod.transactions
    WHERE
        merchant_caid   = '${alert.details.caid}'
        AND issuer_bin  = '${alert.details.bin}'
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
        ph.prior_txn_count           AS pan_history_count,
        ph.account_open_date,
        t.fraud_flag
    FROM visa_prod.transactions t
    LEFT JOIN visa_prod.pan_history ph
        ON t.masked_pan = ph.masked_pan
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
      ],
    },
  });
  sseDone(res);
});

// Step 3: Analyze data
app.post('/api/agent/analyze-data', async (req, res) => {
  sseSetup(res);
  const { alert, llmConfig } = req.body;
  const client = getClient(llmConfig);
  const mockData = getMockDiagnosisData(alert.id);

  await streamText(res, client, llmConfig.model,
    `You are a senior fraud analyst reviewing pulled data. Narrate key findings as you scan through the data.
Reference specific numbers. Identify the most critical signals. State your working hypothesis.
End with a clear preliminary assessment: True Positive or False Positive, and your confidence level.
Max 200 words. No bullets. No headers. Direct, precise language.`,
    `Data just came back. Here's what I see:

Alert: ${alert.type} on ${alert.details.merchant} (BIN: ${alert.details.bin})
Attack Taxonomy: ${alert.details.attackTaxonomy}

KEY SIGNALS:
- Peak fraud rate: ${mockData.summary.peakFraudRate} at ${mockData.summary.peakHour}
- Total fraud txns (last 4h): ${mockData.summary.totalFraud4h} / ${mockData.summary.totalTxns4h} transactions
- Fraud exposure: $${mockData.summary.totalFraudAmount?.toLocaleString()}
- Unique PANs: ${mockData.summary.uniquePANs} (${mockData.summary.newPANs} with no prior merchant history)
- POS Entry Mode: ${mockData.attackTaxonomyDetails.posEntryModeShift}
- Amount distribution: ${mockData.attackTaxonomyDetails.concentrationAmount}
- Historical context: ${mockData.attackTaxonomyDetails.historicalActivity}
- New card ratio: ${mockData.attackTaxonomyDetails.newCardsRatio}
- Top RC: ${mockData.responseCodeBreakdown[0].code} (${mockData.responseCodeBreakdown[0].description}) — ${mockData.responseCodeBreakdown[0].pct}%
- Fraud RC signals: ${mockData.responseCodeBreakdown.filter(r => r.is_fraud_indicator).map(r => `${r.code} (${r.pct}%)`).join(', ')}
- Geography concentration: ${mockData.geographicBreakdown[0].country} — ${mockData.geographicBreakdown[0].fraud_rate}% fraud rate

Narrate your analysis and give your verdict.`
  );

  sseWrite(res, { type: 'data', payload: mockData });
  sseDone(res);
});

// Step 4: Block rule
app.post('/api/agent/block-rule', async (req, res) => {
  sseSetup(res);
  const { alert, diagnosisData, llmConfig } = req.body;
  const client = getClient(llmConfig);

  await streamText(res, client, llmConfig.model,
    `You are a fraud analyst writing a block rule to stop an active attack.
Explain in 2-3 sentences why each parameter in this rule was selected — the logic behind the combination.
Then explain why this rule won't hurt genuine customers. Be precise about the tradeoffs.
Max 130 words.`,
    `Explain the block rule logic for:
Alert: ${alert.type} | BIN: ${alert.details.bin} | Merchant: ${alert.details.caid}
POS shift: ${diagnosisData?.attackTaxonomyDetails?.posEntryModeShift || 'N/A'}
Amount pattern: ${diagnosisData?.attackTaxonomyDetails?.concentrationAmount || 'N/A'}
MFA status: ${diagnosisData?.attackTaxonomyDetails?.cardPresentRatio || 'N/A'}

Why these parameters, and what's the customer impact tradeoff?`
  );

  sseWrite(res, {
    type: 'data',
    payload: diagnosisData?.blockRule || getMockDiagnosisData(alert.id).blockRule,
  });
  sseDone(res);
});

// Step 5: Email draft
app.post('/api/agent/email-draft', async (req, res) => {
  sseSetup(res);
  const { alert, blockRule, llmConfig } = req.body;
  const client = getClient(llmConfig);

  await streamText(res, client, llmConfig.model,
    `You are composing an urgent issuer notification email for a confirmed fraud event.
In one sentence, state the template being used and the notification priority. Max 40 words.`,
    `Notifying: ${alert.details.issuerName} | Alert: ${alert.id} | Type: ${alert.type} | Block placed: ${!!blockRule}`
  );

  const now = new Date();
  const expiry = new Date(now.getTime() + 72 * 3600000);

  sseWrite(res, {
    type: 'data',
    payload: {
      templateId: `TMPL-FRAUD-ALERT-001`,
      priority: 'URGENT',
      issuer: alert.details.issuerName,
      recipients: [`fraud-ops@${alert.details.issuerName.toLowerCase().replace(/\s/g, '')}.com`],
      cc: ['fraud-monitoring@visapayments.com', `siem-ingest@internal.visa.com`],
      subject: `[URGENT] Fraud Alert — ${alert.type} Confirmed | BIN ${alert.details.bin} | ${alert.details.issuerName} | Case ${alert.id}`,
      body: `Dear ${alert.details.issuerName} Fraud Operations Team,

This is an urgent notification from the Visa Global Fraud Monitoring Center.

Our real-time monitoring systems have detected and confirmed a ${alert.type} targeting your portfolio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INCIDENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Case Reference  : ${alert.id}
Detection Time  : ${now.toUTCString()}
Alert Type      : ${alert.type}
Attack Pattern  : ${alert.details.attackTaxonomy}
Merchant        : ${alert.details.merchant}
CAID            : ${alert.details.caid}
Affected BIN    : ${alert.details.bin}
Geography       : ${alert.details.geography}
Acquirer        : ${alert.details.acquirerBank}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRAUD METRICS (Last 4 Hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fraudulent Transactions : ${blockRule?.fraudBlocked || 487}
Genuine Transactions    : ${blockRule?.genuineBlocked || 3}
Catch Rate              : ${blockRule?.catchRate || 94.2}%
Estimated Exposure      : $${(blockRule?.estimatedFraudSavings || 24000).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTROL APPLIED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rule ID         : ${blockRule?.ruleId || 'RULE-PENDING'}
Applied At      : ${now.toUTCString()}
Valid Until     : ${expiry.toUTCString()} (72-hour window)
Block Criteria  : ${blockRule?.rule?.split('\n')[0] || 'BIN + Merchant + Amount + POS Mode'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECOMMENDED ISSUER ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review and consider re-issuing cards with 5+ transactions at this CAID
2. Activate enhanced monitoring on BIN ${alert.details.bin} for 72 hours
3. Confirm receipt of this notification within 4 hours per SLA
4. Initiate chargeback process for confirmed fraud transactions

Please confirm receipt of this notification and advise if additional controls are required.

For queries, contact the Fraud Monitoring Hotline: +1-800-VISA-FRD (ext. 2)
Secure portal: https://fraud-portal.visa.com/case/${alert.id}

Regards,

Fraud Monitoring Analyst — Visa Global Fraud Operations
Case Reference: ${alert.id} | Classification: CONFIDENTIAL`,
    },
  });
  sseDone(res);
});

// Step 6: Summary
app.post('/api/agent/summary', async (req, res) => {
  sseSetup(res);
  const { alert, assessment, blockApproved, emailSent, llmConfig } = req.body;
  const client = getClient(llmConfig);

  await streamText(res, client, llmConfig.model,
    `You are writing the final case summary entry for a fraud investigation ticket.
Write in past tense. Be factual — what happened, what was found, what action was taken, and what monitoring is in place.
This goes into the SIEM and ticketing system — it must be accurate and complete.
Max 100 words. Professional tone. No headers.`,
    `Summarize for the ticket:
Alert: ${alert.id} | ${alert.type} | ${alert.details.merchant} | BIN: ${alert.details.bin}
Verdict: ${assessment}
Block placed: ${blockApproved ? 'Yes' : 'No'}
Issuer notified: ${emailSent ? alert.details.issuerName : 'No'}
Analyst: RJ-99210`
  );

  const now = new Date();
  sseWrite(res, {
    type: 'data',
    payload: {
      ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
      status: assessment === 'True Positive' ? 'Active — 3-Day Monitoring' : 'Closed — False Positive',
      monitoringDays: assessment === 'True Positive' ? 3 : 0,
      actions: [
        assessment === 'True Positive' ? '✓ True Positive confirmed — fraud attack verified' : '✓ False Positive confirmed — organic activity, no action required',
        blockApproved ? `✓ Block rule placed (${getMockDiagnosisData(alert.id).blockRule?.ruleId || 'RULE-N/A'})` : null,
        emailSent ? `✓ Issuer notification dispatched to ${alert.details.issuerName}` : null,
        '✓ SOP compliance checklist completed',
        '✓ Investigation documented in SIEM',
        assessment === 'True Positive' ? '↻ 3-day monitoring window activated' : null,
      ].filter(Boolean) as string[],
      timeline: [
        { time: new Date(Date.now() - 900000).toLocaleTimeString(), event: `Alert ${alert.id} fired — ${alert.type} detected` },
        { time: new Date(Date.now() - 750000).toLocaleTimeString(), event: 'Alert assigned to analyst RJ-99210' },
        { time: new Date(Date.now() - 600000).toLocaleTimeString(), event: 'FVR and 6-month history queried' },
        { time: new Date(Date.now() - 450000).toLocaleTimeString(), event: 'Data analysis completed' },
        { time: new Date(Date.now() - 300000).toLocaleTimeString(), event: `Assessment: ${assessment}` },
        blockApproved ? { time: new Date(Date.now() - 180000).toLocaleTimeString(), event: 'Block rule approved and activated' } : null,
        emailSent ? { time: new Date(Date.now() - 60000).toLocaleTimeString(), event: `Issuer notification sent to ${alert.details.issuerName}` } : null,
        { time: now.toLocaleTimeString(), event: 'Investigation closed — ticket created' },
      ].filter(Boolean) as { time: string; event: string }[],
      sopChecklist: [
        { item: 'FVR data reviewed (last 4 hours)', passed: true },
        { item: '6-month transaction history pulled', passed: true },
        { item: 'PAN velocity and history analyzed', passed: true },
        { item: 'POS entry mode and amount pattern reviewed', passed: true },
        { item: 'TP/FP assessment documented', passed: true },
        { item: 'Block rule placed (TP only)', passed: blockApproved },
        { item: 'Issuer notification sent (TP only)', passed: emailSent },
        { item: 'Investigation ticket created', passed: true },
        { item: '3-day monitoring scheduled (TP only)', passed: assessment === 'True Positive' },
      ],
    },
  });
  sseDone(res);
});

// ─── Vite Dev Middleware ──────────────────────────────────────────────────────

const PORT = 3001;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, () => {
    console.log(`\n  IA Copilot running at http://localhost:${PORT}\n`);
  });
}

startServer();
