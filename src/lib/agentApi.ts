import { Alert, LLMConfig, DiagnosisData, BlockRule, EmailDraft, SummaryData, AlertProfile, Query } from '../types';
import {
  getAlertProfile,
  buildQueries,
  getMockDiagnosisData,
  buildEmailDraft,
  buildSummary,
} from './mockData';

// ─── Core Streaming ───────────────────────────────────────────────────────────

async function streamClaude(
  llmConfig: LLMConfig,
  system: string,
  userMsg: string,
  onText: (t: string) => void,
): Promise<void> {
  const base = llmConfig.baseUrl?.replace(/\/$/, '') || 'https://api.anthropic.com';
  const endpoint = `${base}/v1/messages`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': llmConfig.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: llmConfig.model,
      max_tokens: 1024,
      stream: true,
      system,
      messages: [{ role: 'user', content: userMsg }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => resp.statusText);
    throw new Error(`LLM API error ${resp.status}: ${err}`);
  }

  if (!resp.body) throw new Error('No response body from LLM API');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'content_block_delta' && msg.delta?.type === 'text_delta') {
          onText(msg.delta.text);
        }
      } catch {}
    }
  }
}

// ─── Agent Steps ──────────────────────────────────────────────────────────────

export async function runAnalyzeAlert(
  alert: Alert,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<{ alertProfile: AlertProfile }> {
  await streamClaude(
    llmConfig,
    `You are a senior fraud analyst at a global payment network's 24/7 monitoring center.
A new alert has just fired based on authorization anomaly detection — NOT confirmed fraud.
Remember: fraud is reconciled 3–7 days after customer reporting. You are working with behavioral signals only.
Write a brief first-read — what immediately stands out, what's suspicious about the authorization pattern, and the risk level.
Be specific. Reference the actual data. Max 120 words. No headers or bullets. Write as if dictating to a colleague.`,
    `Alert just fired. Quick read:

Alert ID: ${alert.id} | Type: ${alert.type} | Severity: ${alert.severity}
Merchant: ${alert.details.merchant} (CAID: ${alert.details.caid}, MCC: ${alert.details.mcc} — ${alert.details.mccDescription})
BIN: ${alert.details.bin} | Issuer: ${alert.details.issuerName} | Acquirer: ${alert.details.acquirerBank}
Merchant Country: ${alert.details.merchantCountry} | Issuer Country: ${alert.details.issuerCountry}
Geography: ${alert.details.geography} | Pattern Taxonomy: ${alert.details.attackTaxonomy}
Previous alerts on this entity: ${alert.previousAlerts.length}

This is based on authorization signals — no confirmed fraud data yet. Give me your first read on the suspicious behavior.`,
    onText,
  );

  return { alertProfile: getAlertProfile(alert) };
}

export async function runPlanQueries(
  alert: Alert,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<{ queries: Query[] }> {
  await streamClaude(
    llmConfig,
    `You are a fraud data analyst. You're about to pull investigation data from the authorization system.
In one short paragraph, tell the analyst exactly what signals you're fetching and why.
Key point: these queries use response codes, POS entry mode, PAN history — NOT fraud_flag (unavailable in real-time).
Be specific about which authorization anomaly signals each query targets. Max 80 words.`,
    `Fetching data for: ${alert.type} | BIN: ${alert.details.bin} | Merchant: ${alert.details.merchant} | CAID: ${alert.details.caid}
What authorization signals are you querying and why?`,
    onText,
  );

  return { queries: buildQueries(alert) };
}

// Phase 1: React to FVR data as soon as it arrives
export async function runAnalyzeFVR(
  alert: Alert,
  fvrData: import('../types').FVRRow[],
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<void> {
  const surgeRows = fvrData.filter(r => r.decline_rate_pct > 15).sort((a, b) => b.decline_rate_pct - a.decline_rate_pct);
  const peakRow = surgeRows[0];
  const surgeStart = fvrData.find(r => r.decline_rate_pct > 15);

  await streamClaude(
    llmConfig,
    `You are a fraud analyst. The 4-hour authorization report just came back. React immediately to what you see.
IMPORTANT: These are authorization signals — decline rate, new PAN count, POS mode, amount avg. There is NO fraud_flag in real-time.
Reference the specific hours, exact decline rates, new PAN counts, and amounts from the data.
Tell the analyst where the anomaly begins and how severe the behavioral shift is. Max 100 words. No headers. Urgent if warranted.`,
    `FVR just returned. Here are the anomalous hours:

${surgeRows.slice(0, 6).map(r =>
  `${r.hour}: ${r.total_txns} txns | ${r.decline_count} declines | ${r.decline_rate_pct}% decline rate | ${r.new_pan_count} new PANs | ${r.keyed_entry_count} keyed | avg $${r.avg_amount_usd}`
).join('\n')}

Baseline sample (pre-anomaly):
${fvrData.filter(r => r.decline_rate_pct < 3).slice(0, 3).map(r =>
  `${r.hour}: ${r.total_txns} txns | ${r.decline_count} declines | ${r.decline_rate_pct}% decline rate`
).join('\n')}

Anomaly starts: ${surgeStart?.hour ?? 'unclear'} | Peak decline rate: ${peakRow?.decline_rate_pct ?? '?'}% at ${peakRow?.hour ?? '?'}
Alert type: ${alert.type} | Merchant: ${alert.details.merchant} | BIN: ${alert.details.bin}

React to what you see. No fraud confirmed — these are authorization anomaly signals only.`,
    onText,
  );
}

// Phase 2: Full analysis after history data arrives — references specific transaction rows
export async function runAnalyzeHistory(
  alert: Alert,
  data: import('../types').DiagnosisData,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<void> {
  const txnSample = data.sampleTransactions.slice(0, 8);
  const declined = txnSample.filter(t => t.response_code !== '00');
  const newPans = txnSample.filter(t => t.is_new_pan);

  await streamClaude(
    llmConfig,
    `You are a senior fraud analyst. Transaction history just loaded. Continue your analysis — you already reviewed the FVR.
Look at the SPECIFIC transaction rows and 6-month decline trend below.
Quote actual TXN IDs and PANs. Call out the exact behavioral pattern: response codes, POS mode, new PAN ratio, amounts.
IMPORTANT: Do NOT claim fraud is confirmed — you are assessing suspicious authorization behavior.
Then give your assessment: Suspicious Pattern (action required) or Organic Activity (close alert), and your confidence.
Max 180 words. No headers. Direct language.`,
    `Transaction history loaded. Recent transactions:

${txnSample.map(t =>
  `${t.txn_id} | ${t.timestamp.split(' ')[1]} | ${t.masked_pan} | $${t.amount_usd} | RC:${t.response_code} (${t.rc_description}) | ${t.pos_entry_mode} | MFA:${t.mfa_status} | ${t.country} | PAN history: ${t.has_history ? 'Known' : 'NEW — no prior activity'}`
).join('\n')}

${declined.length} of ${txnSample.length} sampled transactions declined | ${newPans.length} new PANs with no prior merchant history

6-month baseline trend (decline rate):
${data.sixMonthTrend.map(m => `${m.month}: ${m.txns.toLocaleString()} txns | ${m.decline_count} declines | ${m.decline_rate}% decline rate | avg $${m.avg_amount}`).join('\n')}

Key behavioral indicators:
- POS mode shift: ${data.attackTaxonomyDetails.posEntryModeShift}
- Amount pattern: ${data.attackTaxonomyDetails.concentrationAmount}
- New PAN ratio: ${data.attackTaxonomyDetails.newPanRatio}
- MFA bypass: ${data.attackTaxonomyDetails.mfaBypassRate}
- ${data.geographicBreakdown[0].country}: ${data.geographicBreakdown[0].decline_rate}% decline rate (${data.geographicBreakdown[0].new_pan_count.toLocaleString()} new PANs)

Reference specific TXN IDs. Assess: Suspicious Pattern or Organic Activity? State your confidence. Remember — no fraud data confirmed yet.`,
    onText,
  );
}

export async function runBlockRule(
  alert: Alert,
  diagnosisData: DiagnosisData,
  conditions: import('../types').RuleCondition[],
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<BlockRule> {
  const editableConditions = conditions.filter(c => !c.locked);

  await streamClaude(
    llmConfig,
    `You are a fraud analyst explaining a protective block rule you just configured.
This block targets a suspicious behavioral pattern — fraud is NOT yet confirmed; cardholder reconciliation takes 3–7 days.
For each condition the analyst set, explain in one sentence why it targets the suspicious behavior and what signal it captures.
Then in one sentence explain why genuine customers with different profiles are protected.
Max 140 words. No headers. Speak directly to the analyst.`,
    `Protective block configured for: ${alert.type} | BIN: ${alert.details.bin} | CAID: ${alert.details.caid}

Conditions set:
${editableConditions.map(c =>
  c.operator === 'BETWEEN'
    ? `${c.label}: ${c.operator} ${c.value} AND ${c.value2}`
    : `${c.label}: ${c.operator} (${c.value})`
).join('\n')}

Behavioral signals observed:
- POS mode shift: ${diagnosisData.attackTaxonomyDetails.posEntryModeShift}
- Amount pattern: ${diagnosisData.attackTaxonomyDetails.concentrationAmount}
- New PAN ratio: ${diagnosisData.attackTaxonomyDetails.newPanRatio}
- MFA bypass: ${diagnosisData.attackTaxonomyDetails.mfaBypassRate}

Explain why each condition targets the suspicious pattern, and why legitimate cardholders are protected.`,
    onText,
  );

  return diagnosisData.blockRule!;
}

export async function runEmailDraft(
  alert: Alert,
  blockRule: BlockRule | null,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<EmailDraft> {
  await streamClaude(
    llmConfig,
    `You are composing an urgent issuer notification about a suspicious transaction pattern.
In one sentence, state the template being used and the notification priority.
Emphasize this is a pattern-based alert — fraud reconciliation data will follow in 3–7 days.
Max 40 words.`,
    `Notifying: ${alert.details.issuerName} | Alert: ${alert.id} | Type: ${alert.type} | Protective block: ${blockRule ? 'Yes' : 'No'}`,
    onText,
  );

  return buildEmailDraft(alert, blockRule);
}

export async function runSummary(
  alert: Alert,
  assessment: string,
  blockApproved: boolean,
  emailSent: boolean,
  blockRule: BlockRule | null,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<SummaryData> {
  await streamClaude(
    llmConfig,
    `You are writing the final case entry for an authorization anomaly investigation.
Write in past tense. Be factual — what behavioral pattern was observed, what action was taken, and what monitoring is in place.
IMPORTANT: State clearly that fraud confirmation is pending cardholder reconciliation (3–5 days).
This goes into the SIEM and ticketing system — accuracy is critical.
Max 100 words. Professional tone. No headers.`,
    `Summarize for the ticket:
Alert: ${alert.id} | ${alert.type} | ${alert.details.merchant} | BIN: ${alert.details.bin}
Analyst assessment: ${assessment}
Protective block placed: ${blockApproved ? 'Yes' : 'No'}
Issuer notified: ${emailSent ? alert.details.issuerName : 'No'}
Fraud reconciliation: Pending — expected in 3–5 business days
Analyst: RJ-99210`,
    onText,
  );

  return buildSummary(alert, assessment, blockApproved, emailSent, blockRule);
}
