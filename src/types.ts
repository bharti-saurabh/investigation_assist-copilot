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

// Fraud is not known in real-time — FVR tracks authorization behavior signals
export interface FVRRow {
  hour: string;
  total_txns: number;
  decline_count: number;
  decline_rate_pct: number;
  new_pan_count: number;
  keyed_entry_count: number;
  avg_amount_usd: number;
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
  is_new_pan: boolean;
}

export interface ResponseCode {
  code: string;
  description: string;
  count: number;
  pct: number;
  is_suspicion_indicator: boolean;
}

export interface GeoBreakdown {
  country: string;
  txns: number;
  decline_count: number;
  decline_rate: number;
  new_pan_count: number;
  amount_usd: number;
}

export interface PanVelocityRow {
  masked_pan: string;
  txn_count: number;
  decline_count: number;
  total_spend: number;
  has_prior_history: boolean;
  first_seen: string;
}

export interface AmountBucket {
  range: string;
  count: number;
  decline_count: number;
  pct_of_total: number;
}

// Historical trend uses settled data — decline rate is the real-time-safe proxy
export interface MonthTrend {
  month: string;
  txns: number;
  decline_count: number;
  decline_rate: number;
  avg_amount: number;
}

export interface AlertProfile {
  riskScore: number;
  confidence: string;
  matchedPattern: string;
  velocityMetrics: {
    txnsLastHour: number;
    declinesLastHour: number;
    declineRatePct: string;
    baselineHourly: number;
    surgeMultiplier: string;
    newPanRatio: string;
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
    newPanRatio: string;
    mfaBypassRate: string;
  };
  summary: {
    totalTxns4h: number;
    totalDeclines4h: number;
    declineRate4h: string;
    uniquePANs: number;
    newPANs: number;
    peakHour: string;
    peakDeclineRate: string;
  };
  isLikelyOrganic: boolean;
  blockRule: BlockRule | null;
}

export interface BlockRule {
  rule: string;
  variables: string[];
  impact: string;
  suspiciousPatternBlocked: number;
  legitimateImpacted: number;
  patternCoverage: number;
  falsePositiveRate: number;
  estimatedRiskExposure: number;
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

export interface RuleCondition {
  id: string;
  field: string;
  label: string;
  operator: string;
  value: string;
  value2?: string;
  locked: boolean;
}

export interface BlockImpact {
  suspiciousPatternBlocked: number;
  legitimateImpacted: number;
  patternCoverage: number;
  falsePositiveRate: number;
  estimatedRiskExposure: number;
}

// Outcome is pattern-based, not fraud-confirmed — fraud reconciles 3–7 days later
export interface Assessment {
  verdict: 'Suspicious — Action Required' | 'Organic — Close Alert';
  confidence: 'High' | 'Medium' | 'Low';
  reasonCode: string;
  notes: string;
  analystId: string;
  timestamp: string;
}

export type StepStatus = 'idle' | 'streaming' | 'waiting' | 'complete' | 'skipped';

export interface InvestigationStep {
  id: number;
  label: string;
  status: StepStatus;
  agentText: string;
  data?: unknown;
}
