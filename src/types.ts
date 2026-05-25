export interface AlertDetails {
  bin: string;
  merchant: string;
  caid: string;
  geography: string;
  issuerName: string;
  acquirerBank: string;
  issuerCountry: string;
  merchantCountry: string;
  attackTaxonomy: string;
  mcc?: string;
  mccDescription?: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Resolved';
  timestamp: string;
  previousAlerts: string[];
  details: AlertDetails;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface Query {
  id: string;
  label: string;
  description: string;
  query: string;
}

export interface FVRRow {
  hour: string;
  total_txns: number;
  fraud_txns: number;
  fraud_rate_pct: number;
  total_amount: number;
  fraud_amount: number;
}

export interface SampleTransaction {
  txn_id: string;
  timestamp: string;
  masked_pan: string;
  amount_usd: number;
  response_code: string;
  rc_description: string;
  pos_entry_mode: string;
  mfa_status: string;
  country: string;
  has_history: boolean;
}

export interface ResponseCode {
  code: string;
  description: string;
  count: number;
  pct: number;
  is_fraud_indicator: boolean;
}

export interface GeoBreakdown {
  country: string;
  txns: number;
  fraud: number;
  fraud_rate: number;
  amount_usd: number;
}

export interface PanVelocityRow {
  masked_pan: string;
  txn_count: number;
  fraud_count: number;
  total_spend: number;
  has_prior_history: boolean;
  first_seen: string;
}

export interface AmountBucket {
  range: string;
  count: number;
  fraud_count: number;
  pct_of_fraud: number;
}

export interface MonthTrend {
  month: string;
  txns: number;
  fraud: number;
  fraud_rate: number;
}

export interface AlertProfile {
  riskScore: number;
  confidence: string;
  matchedPattern: string;
  velocityMetrics: {
    txnsLastHour: number;
    fraudLastHour: number;
    fraudRatePct: string;
    baselineHourly: number;
    surgeMultiplier: string;
  };
  merchantProfile: {
    registrationDate: string;
    totalLifetimeTxns: number;
    avgMonthlyTxns: number;
    mcc: string;
    mccDescription: string;
    riskCategory: string;
  };
  previousIncidents: {
    id: string;
    date: string;
    type: string;
    outcome: string;
  }[];
}

export interface DiagnosisData {
  fvrHourly: FVRRow[];
  sixMonthTrend: MonthTrend[];
  sampleTransactions: SampleTransaction[];
  responseCodeBreakdown: ResponseCode[];
  geographicBreakdown: GeoBreakdown[];
  panVelocityTop10: PanVelocityRow[];
  amountDistribution: AmountBucket[];
  attackTaxonomyDetails: {
    posEntryModeShift: string;
    concentrationAmount: string;
    historicalActivity: string;
    cardPresentRatio: string;
    newCardsRatio: string;
  };
  summary: {
    totalTxns4h: number;
    totalFraud4h: number;
    totalFraudAmount: number;
    uniquePANs: number;
    newPANs: number;
    peakHour: string;
    peakFraudRate: string;
  };
  isLikelyFP: boolean;
  blockRule: BlockRule | null;
}

export interface BlockRule {
  rule: string;
  variables: string[];
  impact: string;
  fraudBlocked: number;
  genuineBlocked: number;
  catchRate: number;
  falsePositiveRate: number;
  estimatedFraudSavings: number;
  ruleId: string;
  expiryHours: number;
  rationale: string;
}

export interface EmailDraft {
  templateId: string;
  issuer: string;
  recipients: string[];
  cc: string[];
  subject: string;
  body: string;
  priority: string;
}

export interface SummaryData {
  ticketId: string;
  status: string;
  monitoringDays: number;
  actions: string[];
  timeline: { time: string; event: string }[];
  sopChecklist: { item: string; passed: boolean }[];
}

export type StepStatus = 'idle' | 'streaming' | 'waiting' | 'complete' | 'skipped';

export interface InvestigationStep {
  id: number;
  label: string;
  status: StepStatus;
  agentText: string;
  data?: unknown;
}
