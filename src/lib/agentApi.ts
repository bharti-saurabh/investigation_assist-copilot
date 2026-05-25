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
A new alert has just fired. Write a brief first-read analysis — what immediately stands out, what's suspicious, and what the risk level is.
Be specific. Reference the actual data. Max 120 words. No headers or bullets. Write as if dictating to a colleague.`,
    `Alert just fired. Quick read:

Alert ID: ${alert.id} | Type: ${alert.type} | Severity: ${alert.severity}
Merchant: ${alert.details.merchant} (CAID: ${alert.details.caid}, MCC: ${alert.details.mcc} — ${alert.details.mccDescription})
BIN: ${alert.details.bin} | Issuer: ${alert.details.issuerName} | Acquirer: ${alert.details.acquirerBank}
Merchant Country: ${alert.details.merchantCountry} | Issuer Country: ${alert.details.issuerCountry}
Geography: ${alert.details.geography} | Attack Taxonomy: ${alert.details.attackTaxonomy}
Previous alerts on this entity: ${alert.previousAlerts.length}

Give me your first read.`,
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
    `You are a fraud data analyst. You're about to pull investigation data.
In one short paragraph, tell the analyst exactly what data you're fetching and why these two queries answer the investigation question.
Be specific about the tables and what signals you're looking for. Max 80 words.`,
    `Fetching data for: ${alert.type} | BIN: ${alert.details.bin} | Merchant: ${alert.details.merchant} | CAID: ${alert.details.caid}
What are you querying and why?`,
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
  const surgeRows = fvrData.filter(r => r.fraud_rate_pct > 50).sort((a, b) => b.fraud_rate_pct - a.fraud_rate_pct);
  const peakRow = surgeRows[0];
  const surgeStart = fvrData.find(r => r.fraud_rate_pct > 50);

  await streamClaude(
    llmConfig,
    `You are a fraud analyst. The 4-hour velocity report just returned. React immediately to what you see.
Reference specific hours, exact counts, and exact fraud rates from the data below.
Tell the analyst where the surge begins and how severe it is. Sound like you're reading it in real time.
Max 100 words. No headers. Urgent if warranted.`,
    `FVR just returned — 24 rows. Here are the surge hours:

${surgeRows.slice(0, 6).map(r => `${r.hour}: ${r.total_txns} txns | ${r.fraud_txns} fraud | ${r.fraud_rate_pct}% fraud rate | $${r.fraud_amount.toLocaleString()} exposure`).join('\n')}

Baseline (pre-surge sample):
${fvrData.filter(r => r.fraud_rate_pct < 5).slice(0, 3).map(r => `${r.hour}: ${r.total_txns} txns | ${r.fraud_txns} fraud | ${r.fraud_rate_pct}%`).join('\n')}

Surge begins: ${surgeStart?.hour ?? 'unclear'} | Peak rate: ${peakRow?.fraud_rate_pct ?? '?'}% at ${peakRow?.hour ?? '?'}
Alert type: ${alert.type} | Merchant: ${alert.details.merchant} | BIN: ${alert.details.bin}

React to what you see in these specific rows.`,
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
  const fraudTxns = txnSample.filter(t => t.response_code !== '00' || !t.has_history);

  await streamClaude(
    llmConfig,
    `You are a senior fraud analyst. Transaction history just loaded. Continue your analysis — you already reviewed the FVR.
Now look at the SPECIFIC transaction rows and the 6-month trend below.
Quote actual TXN IDs and PANs. Call out the exact pattern you see in the data.
Then give your final assessment: True Positive or False Positive, and state your confidence.
Max 180 words. No headers. Direct language — you are building the case record.`,
    `Transaction history loaded. Here are the most recent transactions:

${txnSample.map(t =>
  `${t.txn_id} | ${t.timestamp.split(' ')[1]} | ${t.masked_pan} | $${t.amount_usd} | RC:${t.response_code} (${t.rc_description}) | ${t.pos_entry_mode} | MFA:${t.mfa_status} | ${t.country} | Prior history: ${t.has_history ? 'Yes' : 'NONE'}`
).join('\n')}

6-month baseline trend:
${data.sixMonthTrend.map(m => `${m.month}: ${m.txns.toLocaleString()} txns | ${m.fraud} fraud | ${m.fraud_rate}% fraud rate`).join('\n')}

Key indicators:
- POS shift: ${data.attackTaxonomyDetails.posEntryModeShift}
- Amount pattern: ${data.attackTaxonomyDetails.concentrationAmount}
- New card ratio: ${data.attackTaxonomyDetails.newCardsRatio}
- ${data.geographicBreakdown[0].country}: ${data.geographicBreakdown[0].fraud_rate}% fraud rate (${data.geographicBreakdown[0].fraud.toLocaleString()} fraud txns)

Reference specific transaction IDs in your analysis. Give your verdict and confidence level.`,
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
    `You are a fraud analyst explaining the logic behind a block rule you just configured.
For each parameter the analyst has set, explain in one sentence why it was chosen and what fraud signal it targets.
Then in one sentence explain why genuine customers with different profiles are protected.
Max 140 words. No headers. Speak directly to the analyst.`,
    `Block rule configured for: ${alert.type} | BIN: ${alert.details.bin} | CAID: ${alert.details.caid}

Conditions set by analyst:
${editableConditions.map(c =>
  c.operator === 'BETWEEN'
    ? `${c.label}: ${c.operator} ${c.value} AND ${c.value2}`
    : `${c.label}: ${c.operator} (${c.value})`
).join('\n')}

Context:
- POS shift observed: ${diagnosisData.attackTaxonomyDetails.posEntryModeShift}
- Amount pattern: ${diagnosisData.attackTaxonomyDetails.concentrationAmount}
- New card ratio: ${diagnosisData.attackTaxonomyDetails.newCardsRatio}

Explain why each condition targets fraud, and why genuine customers are protected.`,
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
    `You are composing an urgent issuer notification email for a confirmed fraud event.
In one sentence, state the template being used and the notification priority. Max 40 words.`,
    `Notifying: ${alert.details.issuerName} | Alert: ${alert.id} | Type: ${alert.type}`,
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
    `You are writing the final case summary entry for a fraud investigation ticket.
Write in past tense. Be factual — what happened, what was found, what action was taken, and what monitoring is in place.
This goes into the SIEM and ticketing system — it must be accurate and complete.
Max 100 words. Professional tone. No headers.`,
    `Summarize for the ticket:
Alert: ${alert.id} | ${alert.type} | ${alert.details.merchant} | BIN: ${alert.details.bin}
Verdict: ${assessment}
Block placed: ${blockApproved ? 'Yes' : 'No'}
Issuer notified: ${emailSent ? alert.details.issuerName : 'No'}
Analyst: RJ-99210`,
    onText,
  );

  return buildSummary(alert, assessment, blockApproved, emailSent, blockRule);
}
