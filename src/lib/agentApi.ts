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

export async function runAnalyzeData(
  alert: Alert,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<DiagnosisData> {
  const data = getMockDiagnosisData(alert);

  await streamClaude(
    llmConfig,
    `You are a senior fraud analyst reviewing pulled data. Narrate key findings as you scan through the data.
Reference specific numbers. Identify the most critical signals. State your working hypothesis.
End with a clear preliminary assessment: True Positive or False Positive, and your confidence level.
Max 200 words. No bullets. No headers. Direct, precise language.`,
    `Data just came back. Here's what I see:

Alert: ${alert.type} on ${alert.details.merchant} (BIN: ${alert.details.bin})
Attack Taxonomy: ${alert.details.attackTaxonomy}

KEY SIGNALS:
- Peak fraud rate: ${data.summary.peakFraudRate} at ${data.summary.peakHour}
- Total fraud txns (last 4h): ${data.summary.totalFraud4h} / ${data.summary.totalTxns4h}
- Fraud exposure: $${data.summary.totalFraudAmount?.toLocaleString()}
- Unique PANs: ${data.summary.uniquePANs} (${data.summary.newPANs} with no prior merchant history)
- POS Entry Mode: ${data.attackTaxonomyDetails.posEntryModeShift}
- Amount distribution: ${data.attackTaxonomyDetails.concentrationAmount}
- Historical context: ${data.attackTaxonomyDetails.historicalActivity}
- New card ratio: ${data.attackTaxonomyDetails.newCardsRatio}
- Top RC: ${data.responseCodeBreakdown[0].code} (${data.responseCodeBreakdown[0].description}) — ${data.responseCodeBreakdown[0].pct}%
- Fraud RCs: ${data.responseCodeBreakdown.filter(r => r.is_fraud_indicator).map(r => `${r.code} (${r.pct}%)`).join(', ')}
- Geography: ${data.geographicBreakdown[0].country} — ${data.geographicBreakdown[0].fraud_rate}% fraud rate

Narrate your analysis and give your verdict.`,
    onText,
  );

  return data;
}

export async function runBlockRule(
  alert: Alert,
  diagnosisData: DiagnosisData,
  llmConfig: LLMConfig,
  onText: (t: string) => void,
): Promise<BlockRule> {
  await streamClaude(
    llmConfig,
    `You are a fraud analyst writing a block rule to stop an active attack.
Explain in 2-3 sentences why each parameter in this rule was selected — the logic behind the combination.
Then explain why this rule won't hurt genuine customers. Be precise about the tradeoffs. Max 130 words.`,
    `Explain the block rule logic for:
Alert: ${alert.type} | BIN: ${alert.details.bin} | Merchant: ${alert.details.caid}
POS shift: ${diagnosisData.attackTaxonomyDetails.posEntryModeShift}
Amount pattern: ${diagnosisData.attackTaxonomyDetails.concentrationAmount}
Card ratio: ${diagnosisData.attackTaxonomyDetails.cardPresentRatio}`,
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
