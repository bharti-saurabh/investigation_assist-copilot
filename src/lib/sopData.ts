import { StepStatus } from '../types';

export interface SopKeyIndicator {
  metric: string;
  suspiciousThreshold: string;
  organicRange: string;
  significance: string;
}

export interface SopStepDef {
  stepIndex: number;
  title: string;
  objective: string;
  keySignals: string[];
  mandatoryActions: string[];
  decisionGate: string;
  skippableWhen: string | null; // verdict that makes skipping compliant
}

export interface SopDefinition {
  sopId: string;
  alertType: string;
  version: string;
  owner: string;
  effectiveDate: string;
  reviewedDate: string;
  sla: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  background: string;
  rationale: string;
  regulatoryContext: string;
  keyIndicators: SopKeyIndicator[];
  escalationCriteria: string[];
  monitoringWindow: string;
  steps: SopStepDef[];
}

// ----- SOP-FR-01: BIN Attack -----
const SOP_BIN_ATTACK: SopDefinition = {
  sopId: 'SOP-FR-01',
  alertType: 'BIN Attack',
  version: '3.1',
  owner: 'Fraud Operations — Card Present Team',
  effectiveDate: '2025-01-15',
  reviewedDate: '2025-Q4',
  sla: 'Tier 1 — First response within 30 min · Block decision within 60 min',
  severity: 'Critical',
  background:
    'A BIN attack (also called BIN enumeration or card-testing) occurs when threat actors obtain a batch of compromised card data — through POS compromise, dark-web purchases, or large-scale breaches — and systematically probe a live merchant to verify which PANs remain active. The hallmark signal is a concentrated velocity surge at a single CAID: many distinct new PANs in a short window, a high decline rate (cancelled cards returning 05/14 responses) mixed with a lower proportion of approvals (still-active cards confirmed viable for downstream fraud). Modern BIN attacks are automated, typically completing within 60–90 minutes before threat actors move to another merchant.',
  rationale:
    'Approved test transactions establish viable PAN lists for immediate escalation to high-value card-present or CNP fraud. Each approval during the test phase is a card actively being enumerated. Delay in detection and blocking directly increases downstream issuer fraud exposure and chargeback liability, both of which accrue before cardholder reporting (3–7 days). Network rules (Brand Protection Program Bulletin AP-2, Excessive Authorization Monitoring threshold) mandate documented response within defined SLAs for high-severity velocity events; non-compliance risks network fines.',
  regulatoryContext:
    'Network Brand Protection Program (GBPP) AP-2 — High Velocity Testing. Network Excessive Authorization Monitoring Program (EAMP). PCI DSS v4.0 §10.7 — incident response requirements. Internal Policy FRM-2024-07.',
  keyIndicators: [
    { metric: 'Surge Multiplier vs Baseline', suspiciousThreshold: '≥ 5×', organicRange: '< 2×', significance: 'Primary trigger — confirms abnormal velocity above seasonal norms' },
    { metric: 'Decline Rate (Current Hour)', suspiciousThreshold: '≥ 25%', organicRange: '< 8%', significance: 'High declines indicate a high proportion of cancelled or invalid cards being probed' },
    { metric: 'New PAN Ratio', suspiciousThreshold: '≥ 35%', organicRange: '< 10%', significance: 'New PANs with no prior history at this merchant are the core testing signal' },
    { metric: 'POS Entry Mode — Keyed/Fallback', suspiciousThreshold: '> 20% of txns', organicRange: '< 3%', significance: 'Card-present BIN attacks often exploit fallback entry to bypass chip validation' },
    { metric: 'Risk Score', suspiciousThreshold: '≥ 80', organicRange: '< 40', significance: 'Composite signal-weighted score; values ≥ 80 indicate confirmed attack pattern' },
  ],
  escalationCriteria: [
    'Confirmed fraud exposure (post-reconciliation) exceeds $10,000 → Escalate to Fraud Investigations team',
    'Multiple CAIDs affected simultaneously → Potential network-level compromise; escalate to Network Risk',
    'Same BIN recurs within 48 hours → Persistent threat actor; escalate to Issuer Relations',
    'Block rule activation fails or is delayed > 30 min past approval → Escalate to Technical Ops',
    'Issuer does not acknowledge notification within 2 hours → Escalate to Issuer Relations Lead',
  ],
  monitoringWindow: '14 days — automated threshold alert at 15% decline rate recurrence on CAID/BIN combination',
  steps: [
    {
      stepIndex: 0,
      title: 'Alert Analysis',
      objective: 'Confirm BIN attack classification, assess risk severity, and document initial analyst read before committing investigative resources.',
      keySignals: [
        'Risk score ≥ 80 with high confidence level (not "Possible" or "Unclassified")',
        'Velocity surge concentrated in a ≤ 90-minute window — automated testing signature',
        'New PAN ratio and decline rate both elevated in the same peak hour',
        'Prior incidents on this BIN/CAID combination indicate a repeat threat actor',
        'Merchant MCC (e.g., unattended, fuel, digital goods) is commonly targeted for testing',
      ],
      mandatoryActions: [
        'Record initial triage notes with: suspected attack type, primary signal driving concern, any known context on this BIN or acquirer',
        'Note any prior incidents and whether previous blocks were effective',
        'Confirm issuer country vs. merchant country — geographic mismatch flags cross-border vectors',
      ],
      decisionGate: 'Analyst triage notes recorded (≥ 10 characters). Risk score assessed and matched against threshold. Proceed to data query only when initial read is documented.',
      skippableWhen: null,
    },
    {
      stepIndex: 1,
      title: 'Data Query Builder',
      objective: 'Pull FVR (hourly authorization frequency) and 6-month PAN history to confirm velocity surge timing and establish the attack window.',
      keySignals: [
        'FVR surge visible in Q1 — one or two hours spiking far above the 6-month hourly baseline',
        'Q2 PAN history distinguishing NEW (no prior txn) from KNOWN PANs',
        'Response code mix in Q2 — expect 05 (Do Not Honor) and 14 (Invalid Card Number) dominating declines',
        'Keyed entry and fallback entries elevated in the same window as the surge',
      ],
      mandatoryActions: [
        'Execute both Q1 (FVR) and Q2 (PAN history) queries — both required for classification',
        'Confirm data freshness — query should cover T-6h to present to capture the full attack window',
        'Note the exact peak hour(s) for the block rule window specification',
      ],
      decisionGate: 'Both queries executed and data loaded. FVR data must show hourly granularity. PAN history must include pan_history_status. Proceed to data analysis.',
      skippableWhen: null,
    },
    {
      stepIndex: 2,
      title: 'Data Analysis & Assessment',
      objective: 'Analyze the authorization behavior signals to classify the alert as Suspicious (Action Required) or Organic (Close), and record a structured assessment with reasoning.',
      keySignals: [
        'FVR spike in a narrow window (≤ 2hrs) confirms automated testing over organic growth',
        '6-month trend showing no historical precedent for this volume → not seasonal',
        'Geographic concentration outside the merchant\'s normal transaction geography',
        'PAN velocity top-10 showing many distinct new PANs each with 1–3 txns — testing, not shopping',
        'Amount distribution clustering (e.g., identical small amounts) — bot-generated',
      ],
      mandatoryActions: [
        'Review all six data panels — do not base assessment on FVR alone',
        'Record verdict (Suspicious / Organic) with a specific reason code and written rationale',
        'If organic signals are mixed with suspicious signals, default to Suspicious and document the ambiguity',
      ],
      decisionGate: 'Assessment form submitted with: verdict, confidence level, reason code, analyst notes. Verdict drives downstream path — Suspicious proceeds to block rule; Organic closes with summary.',
      skippableWhen: null,
    },
    {
      stepIndex: 3,
      title: 'Block Rule Design',
      objective: 'Design and activate a precision block rule targeting the confirmed attack pattern while minimizing legitimate transaction impact.',
      keySignals: [
        'Block at CAID + BIN range (not full BIN unless exposure is broad)',
        'Include entry mode condition if keyed/fallback was the primary attack vector',
        'False positive rate must be < 5% — review legitimateImpacted count before approving',
        'Expiry 48–72 hours — BIN attacks typically exhaust quickly; shorter expiry reduces ongoing false positives',
      ],
      mandatoryActions: [
        'Review and adjust auto-generated conditions before approval — do not approve without review',
        'Verify estimated risk exposure justifies the false positive impact on legitimate transactions',
        'Record the block rule ID for the incident ticket and for issuer notification',
        'Supervisor notification required within 24 hours per SOP-FR-04 (logged automatically)',
      ],
      decisionGate: 'Block rule approved and activated with a documented rule ID. Impact metrics (patternCoverage %, legitimateImpacted count) recorded. Cannot skip for Suspicious verdict.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 4,
      title: 'Issuer Notification',
      objective: 'Issue a Potential Fraud Notification (PFN) to the affected issuer within the SLA window, enabling them to take independent action on affected PANs.',
      keySignals: [
        'Notification must reach issuer fraud team (not generic inbox) within 60 min of block activation',
        'Include: BIN range, CAID, attack window (start-end hours), decline rate, approved PAN count',
        'Recommended issuer action: temporary decline or step-up auth for new PANs from this BIN',
        'Include block rule ID so issuer can cross-reference when reconciling chargebacks',
      ],
      mandatoryActions: [
        'Send email to issuer fraud contact (pre-populated from issuer registry)',
        'Attach or reference block rule ID and estimated exposure',
        'Request issuer acknowledgement — follow up if no response within 2 hours',
        'Log notification timestamp and recipient for compliance record',
      ],
      decisionGate: 'Notification email sent and logged. Issuer contact confirmed. Timestamp recorded in ticket. Cannot skip for Suspicious verdict.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 5,
      title: 'Investigation Summary',
      objective: 'Close the investigation ticket with a complete record: actions taken, decision rationale, SOP compliance, and active monitoring configuration.',
      keySignals: [
        'All mandatory actions documented in Actions Completed section',
        'Fraud reconciliation note: actual fraud amounts will be confirmed in 5–7 business days',
        'Monitoring window set to 14 days with automated re-alert threshold at 15% decline rate',
        'SOP checklist fully passed — any N/A items documented with reason',
      ],
      mandatoryActions: [
        'Record final outcome: Suspicious with block activated, or Organic closed',
        'Confirm SOP checklist completion — all non-N/A items must pass',
        'Set monitoring window and document re-alert threshold',
        'Mark ticket as pending reconciliation — do not close as resolved until fraud confirmation',
      ],
      decisionGate: 'Summary complete with ticket ID, all actions logged, SOP compliance confirmed. Investigation closed pending fraud reconciliation.',
      skippableWhen: null,
    },
  ],
};

// ----- SOP-FR-02: ATM Cashout -----
const SOP_ATM_CASHOUT: SopDefinition = {
  sopId: 'SOP-FR-02',
  alertType: 'ATM Cashout',
  version: '2.4',
  owner: 'Fraud Operations — Acquiring Risk Team',
  effectiveDate: '2024-09-01',
  reviewedDate: '2025-Q3',
  sla: 'Priority — First response within 15 min · Issuer escalation within 30 min',
  severity: 'Critical',
  background:
    'ATM cashout attacks (also called coordinated cashout or "jackpotting" in its terminal-malware form) involve the use of cloned payment cards — encoded with data stolen via large-scale issuer breaches, skimming networks, or dark-web purchases — to execute simultaneous or rapid-sequence ATM withdrawals across multiple geographies. The defining characteristic is a geographic dislocation: cards issued in one country appearing at ATMs in a distant jurisdiction within a compressed time window, with amounts clustering near daily cash-withdrawal limits ($300–$500 per card per day). Unlike BIN attacks, cashout PANs are usually already-confirmed-active cards, so decline rates may be lower, and the primary signal is geography, not volume.',
  rationale:
    'ATM cashouts can drain hundreds of thousands of dollars within a single business day. The multi-geography pattern means the cardholder (in the issuer country) is unaware and cannot self-report in time. Response must coordinate three parties simultaneously: the network (block or flag), the acquirer (ATM monitoring), and the issuer (account-level intervention). Network rules require issuers to receive accelerated notification for ATM fraud events. Failure to notify within the SLA window shifts chargeback liability away from the issuer and toward the acquirer.',
  regulatoryContext:
    'Network Dispute Resolution Rules §10.5 — ATM Transaction Liability. Network Chargeback Guide §4.7 — Counterfeit/Lost/Stolen at ATM. Cross-border ATM notification requirements per bilateral acquirer agreements. Internal Policy FRM-ATM-2024-03.',
  keyIndicators: [
    { metric: 'Issuer Country vs. Transaction Country', suspiciousThreshold: 'Mismatch (different regions)', organicRange: 'Match or adjacent markets', significance: 'Core cashout signal — cards issued in one country appearing in a remote geography' },
    { metric: 'Amount Clustering (per PAN)', suspiciousThreshold: '$200–$500 range, 1–2 txns per PAN', organicRange: 'Variable amounts, repeat customers', significance: 'Systematic withdrawal near daily limits — one transaction per card, then move on' },
    { metric: 'New PAN Ratio at This CAID', suspiciousThreshold: '< 20% (unlike BIN attacks, these are real cards)', organicRange: 'N/A', significance: 'Cashout PANs may have prior ATM history — low new-PAN ratio distinguishes from BIN attacks' },
    { metric: 'Unique PANs per Hour', suspiciousThreshold: '> 20 distinct PANs/hour', organicRange: '< 5 distinct PANs/hour', significance: 'High cardinality of unique cards at a single ATM indicates coordinated team operation' },
    { metric: 'Decline Rate', suspiciousThreshold: '10–20% (issuer blocking some but not all)', organicRange: '< 5%', significance: 'Moderate decline rate — issuer may be partially blocking but not yet fully aware of scope' },
  ],
  escalationCriteria: [
    'Multiple ATM CAIDs affected across the same geography → Network-wide cashout; escalate to Network Risk immediately',
    'Total estimated exposure > $50,000 → Mandatory senior management notification within 1 hour',
    'Issuer does not respond within 30 minutes → Escalate to Issuer Relations emergency contact',
    'Law enforcement contact from local jurisdiction → Route to Legal & Compliance team',
    'Same BIN active at ATMs in 3+ countries within 24 hours → Cross-border coordination required; escalate to Global Fraud Ops',
  ],
  monitoringWindow: '7 days — if same BIN recurs in a new geography within 72 hours, escalate to network-level case management',
  steps: [
    {
      stepIndex: 0,
      title: 'Alert Analysis',
      objective: 'Confirm ATM cashout classification, verify geographic dislocation, and assess whether this is an isolated incident or part of a broader coordinated campaign.',
      keySignals: [
        'Issuer country vs. transaction country mismatch — the core cashout indicator',
        'ATM terminal type (unattended cash dispenser) — MCC 6011 or similar',
        'Prior incidents on this BIN — prior cashout attempts indicate known compromised batch',
        'Surge time concentrated in business hours of the target geography — coordinated team operation',
        'Issuer is a foreign financial institution — notification may require cross-border coordination',
      ],
      mandatoryActions: [
        'Confirm this is a genuine geographic mismatch (not a traveler scenario)',
        'Check if other CAIDs in the same geography are also showing elevated ATM activity',
        'Document issuer name and issuer country for notification routing',
      ],
      decisionGate: 'Geographic mismatch confirmed. Issuer identity and contact routing confirmed. Initial read documented in triage notes.',
      skippableWhen: null,
    },
    {
      stepIndex: 1,
      title: 'Data Query Builder',
      objective: 'Pull FVR and PAN history to map the full scope of the cashout window and identify all affected PANs for issuer notification.',
      keySignals: [
        'FVR should show a moderate surge (not as extreme as BIN attacks) — cashout is systematic, not testing',
        'PAN velocity top-10 showing each PAN with 1–2 transactions (one withdrawal per card, then done)',
        'Geographic breakdown concentrated in a single non-issuer country or region',
        'Response codes should include some approvals (confirmed viable cards) — the objective is to actually withdraw cash',
      ],
      mandatoryActions: [
        'Ensure Q2 (PAN history) query covers all CAIDs in the affected geography, not just the alert CAID',
        'Capture the complete list of approved PANs — these will be used in the issuer notification',
        'Note transaction amounts to confirm clustering near daily limits',
      ],
      decisionGate: 'FVR and PAN history data loaded. Geographic scope confirmed. Approved PAN list available for issuer notification.',
      skippableWhen: null,
    },
    {
      stepIndex: 2,
      title: 'Data Analysis & Assessment',
      objective: 'Assess the cashout pattern, confirm it is not organic traveler activity, and classify verdict for action.',
      keySignals: [
        '6-month trend showing no historical precedent for this geographic origin at this ATM',
        'Amount clustering near $300–$500 (daily withdrawal limit) — systematic, not shopping behavior',
        'Low-variance amount distribution within the cashout window — automated card loading',
        'Absence of subsequent retail/POS transactions from the same PANs (pure cash extraction)',
      ],
      mandatoryActions: [
        'Specifically check if the issuer country cards have any prior legitimate travel history to this geography',
        'If > 50% of transactions are approvals, flag for immediate escalation — active ongoing cashout',
        'Record assessment with specific geographic evidence in the analyst notes',
      ],
      decisionGate: 'Assessment submitted with: verdict, geographic evidence, estimated affected PAN count. ATM cashout almost always results in Suspicious verdict — organic close requires strong evidence of legitimate cross-border travel.',
      skippableWhen: null,
    },
    {
      stepIndex: 3,
      title: 'Block Rule Design',
      objective: 'Activate a geographic block targeting the specific country/region where cashouts are occurring, preventing further withdrawals while minimizing impact on legitimate international transactions.',
      keySignals: [
        'Block at CAID level for the specific geography — not a BIN-wide block (would deny all cardholders abroad)',
        'ATM POS entry mode (magnetic stripe / fallback) as additional condition if applicable',
        'Short expiry — 24–48h. ATM cashouts exhaust their card batch quickly; longer blocks create unnecessary cardholder friction',
        'False positive rate critical check: are there legitimate international travelers in scope?',
      ],
      mandatoryActions: [
        'Confirm block scope: CAID-level at minimum; BIN-level only if exposure is confirmed broad (> 50 PANs)',
        'Document that supervisor notification will occur within 24h per SOP-FR-04',
        'Note block rule ID for issuer notification reference',
      ],
      decisionGate: 'Block rule activated with geographic constraints. Rule ID documented. Expiry set to 24–48h.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 4,
      title: 'Issuer Notification',
      objective: 'Issue a Priority Fraud Notification (PFN) to the issuer within the 30-minute SLA, providing the approved PAN list so the issuer can take immediate account-level action.',
      keySignals: [
        'Notification must go to the issuer\'s fraud emergency contact, not a general mailbox',
        'Include: complete approved PAN list from the cashout window, geography, time window, estimated amount',
        'Recommended issuer action: immediate account-level block or velocity limit reduction on affected PANs',
        'Request issuer to confirm whether cardholders are in the country or abroad (determines if block should persist)',
      ],
      mandatoryActions: [
        'Send notification within 30 minutes of alert confirmation — SLA clock runs from alert creation',
        'For foreign issuers, use the network notification channel (not direct email) per bilateral agreement',
        'Attach approved PAN list as structured data (not free text) for automated issuer processing',
        'Log notification timestamp and channel for liability evidence',
      ],
      decisionGate: 'Issuer notified via correct channel. Timestamp logged. PAN list transmitted. Acknowledgement requested.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 5,
      title: 'Investigation Summary',
      objective: 'Document the complete incident, including scope, actions, and whether law enforcement referral is warranted.',
      keySignals: [
        'Confirm the block is active and monitoring is configured',
        'Note if additional CAIDs or geographies were subsequently discovered during investigation',
        'Fraud reconciliation note: confirmed loss amounts will be known in 3–7 days post-cardholder reporting',
        'Law enforcement referral: if confirmed loss > $50,000, prepare referral package',
      ],
      mandatoryActions: [
        'Document total estimated affected PANs and estimated exposure',
        'Set 7-day monitoring window with re-alert if same BIN appears in a new geography',
        'If issuer requested, provide a case reference number for their internal tracking',
        'Mark ticket as pending reconciliation',
      ],
      decisionGate: 'Full incident documented. Monitoring active. Issuer notified. Escalation triggered if thresholds met.',
      skippableWhen: null,
    },
  ],
};

// ----- SOP-FR-03: CNP Alert -----
const SOP_CNP_ALERT: SopDefinition = {
  sopId: 'SOP-FR-03',
  alertType: 'CNP Alert',
  version: '2.8',
  owner: 'Fraud Operations — Digital Risk Team',
  effectiveDate: '2025-03-01',
  reviewedDate: '2025-Q4',
  sla: 'Tier 1 — First response within 45 min · Block or close decision within 90 min',
  severity: 'High',
  background:
    'Card-not-present (CNP) fraud manifests in two primary forms at the alert stage: (1) card testing, where automated bots probe a merchant\'s checkout flow with many distinct stolen PANs at low amounts ($0.01–$10) to determine which cards are still active, and (2) account takeover or bulk CNP purchases following a card testing event. The CNP alert is triggered by the testing phase — characterized by high unique-PAN velocity, low amounts, high MFA bypass rates (where bots exploit exemptions or low-friction flows), and elevated declines. The merchant is often a victim (their checkout is being abused) but may also be complicit in providing a lax authorization environment.',
  rationale:
    'Card testing itself causes limited direct financial damage but is the precursor step to high-value fraud. Approved test transactions create a confirmed-viable PAN list that can immediately be used for large CNP purchases at other merchants, or sold on criminal marketplaces. Early detection and notification of approved PANs to the issuer interrupts this downstream escalation. CNP fraud accounts for 65-75% of total card fraud by value in e-commerce markets; issuers rely on network-level detection to catch testing events before cardholder reporting.',
  regulatoryContext:
    'Compelling Evidence 3.0 (CE3) — authorization history requirements for CNP (Card Not Present) disputes. EMV 3DS specification — step-up authentication triggers. PCI DSS v4.0 §6.4 — e-commerce security controls. Network CNP Fraud Monitoring Program threshold: decline rate + velocity composite score.',
  keyIndicators: [
    { metric: 'Amount Distribution — Low-value bucket (< $10)', suspiciousThreshold: '> 40% of transactions in $0–$10 range', organicRange: '< 10%', significance: 'Card testing uses minimal amounts to verify PANs without triggering fraud filters or creating visible charges' },
    { metric: 'MFA Bypass Rate', suspiciousThreshold: '> 60% bypassing step-up auth', organicRange: '< 20%', significance: 'Bots exploit 3DS exemptions (low-value, trusted merchant) or merchant-side auth gaps to avoid step-up' },
    { metric: 'New PAN Ratio', suspiciousThreshold: '> 50%', organicRange: '< 15%', significance: 'Stolen card batches are almost always new to the test merchant — high new-PAN ratio confirms testing rather than repeat customers' },
    { metric: 'Unique PAN Count per Hour', suspiciousThreshold: '> 30 unique PANs/hour', organicRange: '< 8/hour', significance: 'Human customers don\'t transact from 30 unique cards per hour — this is definitively automated' },
    { metric: 'Decline Rate', suspiciousThreshold: '25–60% (mix of approvals + invalid cards)', organicRange: '< 8%', significance: 'CNP testing shows a characteristic mixed decline rate — bots submit both valid and already-cancelled cards' },
  ],
  escalationCriteria: [
    'Approval rate for test transactions exceeds 30% → Significant valid-card batch; escalate immediately for issuer PAN notification',
    'Same merchant shows recurrence within 48 hours → Persistent bot campaign; escalate to Digital Risk',
    'Merchant dispute resolution SLA (Service Level Agreement) approaching (CE3.0 requires auth history) → Engage compliance team',
    'Evidence of merchant complicity (static exemption flags, absent 3DS) → Merchant investigation; escalate to Merchant Risk',
    'Testing batch linked to known dark-web card shop intelligence → Escalate to Threat Intelligence',
  ],
  monitoringWindow: '10 days — watch for high-value CNP transactions from the approved PANs identified during the testing window',
  steps: [
    {
      stepIndex: 0,
      title: 'Alert Analysis',
      objective: 'Confirm CNP card testing classification, assess the merchant environment (victim vs. complicit), and determine priority based on approval rate.',
      keySignals: [
        'CNP channel confirmed (MOTO or e-commerce) — not card present',
        'Low average amount ($0–$10 range) combined with high unique-PAN count',
        'MFA bypass rate elevated — bots bypassing step-up authentication',
        'Merchant MCC: digital goods (5045), gaming (7995), unattended/kiosk (5499) are high-risk testing targets',
        'Prior incidents on this merchant — repeat targeting suggests a known lax authorization environment',
      ],
      mandatoryActions: [
        'Confirm that transactions are CNP (check POS entry mode — should be keyed/manual for e-commerce)',
        'Note the approval rate — if > 30%, treat as high-priority (large valid-card batch in progress)',
        'Document merchant MCC and whether prior incidents suggest a pattern of complicity or victimization',
      ],
      decisionGate: 'CNP channel confirmed. Approval rate noted. Merchant risk context documented. Triage notes recorded.',
      skippableWhen: null,
    },
    {
      stepIndex: 1,
      title: 'Data Query Builder',
      objective: 'Pull FVR and PAN history to characterize the testing burst and identify all approved PANs for issuer notification.',
      keySignals: [
        'FVR Q1: expect a sharp concentrated burst (30–90 minutes) matching automated bot speed',
        'Q2 PAN history: high proportion of new PANs, each appearing 1–5 times (bot submits, confirms, moves on)',
        'Response code distribution: mix of Do Not Honor (05), Insufficient Funds (51), and Approve (00)',
        'Amount distribution data critical — confirm the low-value concentration pattern',
      ],
      mandatoryActions: [
        'Ensure Q2 captures all approved transactions in the testing window — these are the validated PANs',
        'Note the exact testing window start time for the block rule expiry calculation',
        'Flag if amounts show even distribution (e.g., all $1.00) vs. variable — identical amounts = fully automated bot',
      ],
      decisionGate: 'FVR burst timing confirmed. Approved PAN list captured from Q2. Amount distribution data available for Step 3.',
      skippableWhen: null,
    },
    {
      stepIndex: 2,
      title: 'Data Analysis & Assessment',
      objective: 'Confirm the card testing pattern, assess downstream risk from approved PANs, and determine action path.',
      keySignals: [
        'Amount distribution: > 40% in the $0–$10 bucket confirms low-value testing',
        '6-month trend: no prior history at this merchant for this volume level → not organic',
        'PAN velocity pattern: each PAN appearing once or twice (test-and-confirm pattern)',
        'MFA bypass rate from taxonomy details: > 60% indicates bot-level exemption exploitation',
        'Geographic concentration: if all CNP from single IP region, confirms coordinated bot attack',
      ],
      mandatoryActions: [
        'Count approved PANs in the testing window — record this for issuer notification',
        'If both testing signals AND high-value purchases are present in the same window, classify as active CNP fraud (not just testing)',
        'Document confidence in the classification — high confidence requires clear amount distribution + new PAN ratio evidence',
      ],
      decisionGate: 'Assessment submitted with approved PAN count documented. Low-value + new-PAN evidence cited in analyst notes.',
      skippableWhen: null,
    },
    {
      stepIndex: 3,
      title: 'Block Rule Design',
      objective: 'Design a precision block that stops ongoing testing while preserving legitimate low-value transactions from established cardholders.',
      keySignals: [
        'Block conditions: CAID + amount threshold (e.g., amount < $10 + new PAN indicator) — targets testing without blocking genuine small purchases',
        'Alternative: new-PAN-only block at this CAID for 48h — only blocks cards with no prior history',
        'Do NOT use a BIN-wide block — far too broad for CNP testing which uses random stolen PANs from many BINs',
        'False positive assessment: check legitimateImpacted count — low-value organic purchases from new customers will be affected',
      ],
      mandatoryActions: [
        'Review auto-generated conditions carefully — CNP rules need precision targeting',
        'Confirm expiry 24–48h matches the burst duration — testing bots typically exhaust their batch fast',
        'Document the false positive estimate; if > 10%, consider requiring step-up auth (3DS) instead of a hard block',
      ],
      decisionGate: 'Block rule approved with documented conditions. FP rate documented and judged acceptable. Rule ID recorded.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 4,
      title: 'Issuer Notification',
      objective: 'Notify the issuer with the approved PAN list from the testing window — these are the viable cards now known to the threat actor.',
      keySignals: [
        'Key message: tested-and-approved PANs from this window are now confirmed valid and likely to be used for high-value fraud',
        'Include: approved PAN count, testing window, merchant CAID, recommendation to flag for enhanced monitoring or temporary step-up auth',
        'For issuers with real-time API integration, submit the approved PAN list via API for immediate action',
        'If bot approvals suggest the cardholder\'s bank doesn\'t have step-up auth enabled, recommend 3DS enrollment check',
      ],
      mandatoryActions: [
        'Send issuer notification with approved PAN count and recommendation for enhanced monitoring',
        'If approved PANs represent a large batch (> 100 cards), request issuer to consider temporary velocity limits on those PANs',
        'Log notification for compliance record and potential Compelling Evidence 3.0 use in dispute resolution',
      ],
      decisionGate: 'Issuer notified with approved PAN count and monitoring recommendation. Timestamp logged.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 5,
      title: 'Investigation Summary',
      objective: 'Close investigation with full documentation and configure downstream monitoring for high-value CNP fraud from the tested PANs.',
      keySignals: [
        'Monitoring for high-value transactions from approved-PAN pool over the next 10 days',
        'Fraud reconciliation note: confirmed card testing losses are typically small; downstream fraud from approved PANs (if used) reconciles in 3–7 days',
        'If merchant environment showed complicity signals, refer to Merchant Risk for separate investigation',
        'Compelling Evidence 3.0: authorization record from testing window may be relevant for dispute defense at subsequent merchant',
      ],
      mandatoryActions: [
        'Record the approved PAN count and testing window in the ticket for downstream fraud correlation',
        'Set monitoring window to 10 days with re-alert if high-value CNP from identified PANs',
        'Mark ticket as pending reconciliation — actual loss amounts known only after chargeback reporting',
      ],
      decisionGate: 'Summary complete with approved PAN count, block ID, issuer notified flag, and monitoring window set.',
      skippableWhen: null,
    },
  ],
};

// ----- SOP-FR-04: POS Alert -----
const SOP_POS_ALERT: SopDefinition = {
  sopId: 'SOP-FR-04',
  alertType: 'POS Alert',
  version: '2.2',
  owner: 'Fraud Operations — Card Present Team',
  effectiveDate: '2024-11-01',
  reviewedDate: '2025-Q3',
  sla: 'Tier 2 — First response within 45 min · Merchant notification within 2 hours',
  severity: 'High',
  background:
    'POS (point-of-sale) fraud alerts indicate a terminal compromise scenario — either through physical skimmer installation, malware injection into the merchant\'s POS system, or insider facilitation of unauthorized card data capture. Unlike BIN attacks (which are externally driven), POS compromise is merchant-side: the cards being captured are those of genuine customers visiting a specific retail location. The primary detection signal is an entry mode shift — a terminal that was previously processing transactions via EMV chip or contactless suddenly showing a disproportionate share of magnetic stripe or keyed-entry fallback transactions, indicating the chip bypass mechanism is active.',
  rationale:
    'POS compromise creates a persistent, ongoing data capture risk until the terminal is physically remediated. A single compromised terminal can silently harvest hundreds of PANs over days or weeks before detection, each of which may be cloned and used elsewhere weeks later. Unlike digital fraud, POS compromise requires physical intervention (device inspection, POS software audit), coordinated with the merchant. Network rules require mandatory merchant notification and may require terminal decertification and re-inspection before re-activation.',
  regulatoryContext:
    'PCI DSS v4.0 §9.5 — physical terminal security requirements. Network PIN Security Program — terminal integrity requirements. Network Site Data Protection Program (NSDP). Network Terminal Action Program (TAP) — compromised terminal handling procedures. Merchant Agreement Clause 14.3 — incident disclosure obligations.',
  keyIndicators: [
    { metric: 'POS Entry Mode Shift (Chip → Magnetic/Keyed)', suspiciousThreshold: 'Magnetic/keyed > 25% when baseline < 3%', organicRange: 'Magnetic < 3% at EMV-capable terminal', significance: 'Entry mode shift is the primary POS compromise indicator — chip bypass forces fallback to less secure magnetic strip' },
    { metric: 'New PAN Ratio at this Terminal', suspiciousThreshold: '< 20% (genuine customers, not stolen cards)', organicRange: 'N/A', significance: 'Unlike BIN attacks, POS compromise captures real customer cards — expect many established PANs, not new ones' },
    { metric: 'Decline Rate', suspiciousThreshold: '< 15% (these are genuine customers with valid cards)', organicRange: '< 5%', significance: 'Low decline rate distinguishes POS compromise from BIN attacks — customers have real cards that approve' },
    { metric: 'Transaction Amount', suspiciousThreshold: 'Consistent with normal purchase amounts (no micro-testing)', organicRange: 'N/A', significance: 'POS compromise captures real transaction amounts — no amount clustering, unlike CNP testing' },
    { metric: 'Historical Transaction Rate at CAID', suspiciousThreshold: 'Significant prior history — established merchant', organicRange: 'N/A', significance: 'POS compromise affects established merchants with legitimate traffic; new merchant with no history is a different risk profile' },
  ],
  escalationCriteria: [
    'Multiple terminals at the same merchant or chain showing entry mode shift → Systemic compromise; escalate to Merchant Risk',
    'Physical skimmer confirmed by merchant → Law enforcement referral; escalate to Legal & Compliance',
    'POS malware indicators in terminal logs → Escalate to Cyber & Technical Investigations',
    'Confirmed downstream fraud (cloned cards used elsewhere) > $25,000 → Escalate to Fraud Investigations',
    'Merchant unresponsive to compromise notification within 4 hours → Escalate to Acquirer Relations',
  ],
  monitoringWindow: '14 days initial + 90 days for downstream fraud tracking on captured PANs',
  steps: [
    {
      stepIndex: 0,
      title: 'Alert Analysis',
      objective: 'Confirm POS terminal compromise classification, identify the entry mode shift pattern, and determine the likely compromise vector.',
      keySignals: [
        'POS terminal (not ATM, not e-commerce) — CAID corresponds to physical retail location',
        'Entry mode shift: attackTaxonomy should reference keyed entry or magnetic stripe fallback elevation',
        'Low decline rate (genuine customers with active cards, not stolen data being tested)',
        'Low new-PAN ratio (real customers who shop here, not external card batches)',
        'Prior incidents: repeat compromise at same CAID may indicate persistent insider threat or known skimmer placement',
      ],
      mandatoryActions: [
        'Confirm this is a physical POS terminal (not CNP or ATM) using CAID and MCC',
        'Check whether the merchant has prior POS compromise history — repeat incidents require enhanced response',
        'Note the geographic context — some geographies have higher skimmer prevalence',
      ],
      decisionGate: 'POS terminal compromise pattern confirmed. Entry mode shift noted. Prior incidents checked. Triage notes documented.',
      skippableWhen: null,
    },
    {
      stepIndex: 1,
      title: 'Data Query Builder',
      objective: 'Pull FVR and PAN history to establish the compromise window timeline and identify the captured PAN population.',
      keySignals: [
        'FVR trend: gradual build or steady anomaly (not a spike like BIN attacks) — skimmers operate continuously, not in bursts',
        'PAN history: established cards with prior history at other merchants, but new to this specific CAID recently',
        'Keyed entry count in FVR elevated above norm — the bypass mechanism increases keyed transactions',
        'Sample transactions should show genuine purchase amounts (not low-value test amounts)',
      ],
      mandatoryActions: [
        'Extend Q2 query window to 7 days (not just 24h) — POS compromise may have been active for days before detection',
        'Identify the point in time when the entry mode shift began — the compromise likely started then',
        'Capture the full PAN population that transacted during the suspected compromise window',
      ],
      decisionGate: 'FVR and PAN history loaded. Entry mode shift timeline identified. Suspected compromise window documented.',
      skippableWhen: null,
    },
    {
      stepIndex: 2,
      title: 'Data Analysis & Assessment',
      objective: 'Confirm the compromise pattern, estimate the affected PAN population, and determine the scope of the merchant investigation required.',
      keySignals: [
        'Entry mode shift in 6-month trend: identify the month/week when magnetic stripe or keyed entry increased',
        'PAN velocity: many distinct known-history PANs, each appearing 1–3 times — genuine shoppers, not bots',
        'Amount distribution: consistent with retail purchase amounts (not testing micro-amounts)',
        'Geographic breakdown: all transactions from the local geography of the merchant — confirms physical terminal, not CNP',
        'Response codes: low decline rate with normal approval codes — genuine customers being victimized',
      ],
      mandatoryActions: [
        'Estimate the number of PANs captured during the compromise window — this determines issuer notification scope',
        'Document the suspected start of compromise (entry mode shift start point) — determines lookback window for issuer',
        'If data shows the compromise is ongoing (today\'s transactions showing entry mode shift), treat as active incident requiring immediate merchant contact',
      ],
      decisionGate: 'Compromise scope documented: estimated PAN count, compromise window start date, entry mode evidence cited. Assessment submitted.',
      skippableWhen: null,
    },
    {
      stepIndex: 3,
      title: 'Block Rule Design',
      objective: 'Activate a targeted block on the compromised entry mode vector, preserving normal EMV chip and contactless transactions while blocking the fallback vector.',
      keySignals: [
        'Block on: CAID + entry mode = magnetic stripe OR keyed. This preserves chip and contactless and only blocks the compromised channel',
        'Do NOT block the entire CAID — legitimate customers using chip/contactless should not be impacted',
        'Expiry 72–168h (3–7 days) — merchant remediation takes time; block needs to persist until terminal is inspected and cleared',
        'False positive rate check: review legitimateImpacted — any magnetic stripe transactions by genuine customers will be blocked',
      ],
      mandatoryActions: [
        'Set block conditions to target the specific entry mode vector, not all transactions at the CAID',
        'Notify the merchant simultaneously with block activation — they need to investigate and remediate before the block is removed',
        'Record that block removal requires confirmation of terminal inspection (documented in the ticket)',
      ],
      decisionGate: 'Block activated on entry mode vector. Merchant notification triggered simultaneously. Expiry set to match expected remediation timeline.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 4,
      title: 'Issuer Notification',
      objective: 'Notify affected issuers of the suspected data capture window, enabling them to take preventive account action on the at-risk PAN population.',
      keySignals: [
        'Key message: PANs transacting at this CAID during the compromise window may have been captured and are at risk of downstream cloning',
        'Include: CAID, merchant name, compromise window (estimated start to detection), estimated PAN count, recommendation',
        'Recommended issuer action: enhanced monitoring on affected PANs for card-present transactions outside normal geography, or preventive reissue for high-value accounts',
        'Downstream cloning fraud typically appears 2–8 weeks after capture — longer monitoring window required than BIN attacks',
      ],
      mandatoryActions: [
        'Provide the estimated compromise window dates — issuers need this to pull their own transaction records',
        'Request issuers to monitor for card-present transactions at distant geographies from affected PANs over the next 90 days',
        'Log notification for PCI DSS incident documentation requirements',
      ],
      decisionGate: 'Issuer notified with compromise window dates and PAN count estimate. 90-day downstream monitoring request sent.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 5,
      title: 'Investigation Summary',
      objective: 'Document the full incident and initiate the merchant investigation and terminal remediation tracking.',
      keySignals: [
        'Merchant investigation status must be tracked — block stays active until merchant confirms terminal inspection',
        'Fraud reconciliation: actual cloning fraud from captured PANs may appear weeks later; 90-day monitoring required',
        'If law enforcement is involved (confirmed skimmer), route to Legal & Compliance for referral documentation',
        'SOP compliance: terminal inspection requirement and 90-day monitoring window are mandatory',
      ],
      mandatoryActions: [
        'Create a merchant investigation sub-ticket linked to this case',
        'Set 90-day monitoring flag for downstream card-present fraud from captured PANs',
        'Document block removal criteria: terminal inspection confirmed, no further entry mode anomaly',
        'Mark ticket as pending: (1) fraud reconciliation and (2) merchant terminal remediation confirmation',
      ],
      decisionGate: 'Summary complete with merchant investigation referenced, 90-day monitoring set, and block removal criteria documented.',
      skippableWhen: null,
    },
  ],
};

// ----- SOP-FR-05: PRA Alert -----
const SOP_PRA_ALERT: SopDefinition = {
  sopId: 'SOP-FR-05',
  alertType: 'PRA Alert',
  version: '1.9',
  owner: 'Fraud Operations — Analytics & Risk Scoring Team',
  effectiveDate: '2025-02-01',
  reviewedDate: '2025-Q4',
  sla: 'Tier 3 — First response within 4 hours · Close or escalate within 8 hours',
  severity: 'Low',
  background:
    'A Potential Risk Alert (PRA) is a low-severity, system-generated alert triggered when a merchant\'s rolling authorization metrics cross a preliminary threshold without yet reaching the severity of a confirmed fraud pattern. PRAs are designed to catch emerging issues early — including BIN attacks in their initial stage, seasonal merchants misclassified by volume thresholds, and genuine organic growth events that temporarily elevate authorization velocity. The vast majority of PRAs (historically 70–80% in production) resolve as organic and are closed without action. The analyst\'s task is to accurately distinguish the small minority requiring escalation from the organic majority requiring only documentation.',
  rationale:
    'PRAs exist to reduce false negatives in the detection system — catching fraud events before they reach BIN Attack or POS Alert severity. However, unnecessary action on organic PRAs has direct business consequences: blocking a legitimate merchant\'s transactions damages the merchant relationship, generates false-positive chargebacks, and may trigger regulatory scrutiny of the network\'s fraud monitoring practices. The SOP mandates a data-driven organic/suspicious classification before any intervention — "when in doubt, do not block" is the default posture for PRA alerts.',
  regulatoryContext:
    'Network Risk Management Standards — False Positive Rate targets. Network Merchant Monitoring Program — PRA (Potential Risk Alert) generation criteria and response documentation requirements. Internal Policy FRM-PRA-2025-01 — organic close documentation standards. Merchant Agreement — merchant right to dispute erroneous blocks.',
  keyIndicators: [
    { metric: 'Decline Rate vs. 6-Month Baseline', suspiciousThreshold: '> 2× historical average', organicRange: 'Within ±2% of historical average', significance: 'An organic PRA typically shows a volume increase but STABLE decline rate — fraud shows both volume and decline rate rising' },
    { metric: 'New PAN Ratio', suspiciousThreshold: '> 20%', organicRange: '< 12% (seasonal shoppers, not stolen batches)', significance: 'Organic volume increases come from returning or slightly expanded customer base — not large new-PAN influx' },
    { metric: '6-Month Trend — Volume Increase', suspiciousThreshold: 'Spike in isolated month with no prior trend', organicRange: 'Gradual upward trend or known seasonal pattern', significance: 'Organic merchants show gradual or seasonal growth; fraud attacks create point spikes with no preceding trend' },
    { metric: 'Geographic Concentration', suspiciousThreshold: 'New geography appearing in top-5 this month', organicRange: 'Consistent with prior months\' geographic mix', significance: 'Organic growth happens within the merchant\'s existing customer geography; fraud often introduces new geographic signals' },
    { metric: 'MCC Context', suspiciousThreshold: 'High-risk MCC (fuel, gaming, digital goods, unattended)', organicRange: 'Low-risk MCC (grocery, pharmacy, healthcare)', significance: 'High-risk MCCs are more likely to generate fraud-driven PRAs; low-risk MCCs are almost always organic volume increases' },
  ],
  escalationCriteria: [
    'Any single indicator crosses suspicious threshold → Do not close as organic; escalate to full investigation (convert to appropriate alert type)',
    'Decline rate rising even as overall volume grows → Active fraud embedding in organic traffic; escalate',
    'Merchant is new (< 6 months history) → Limited baseline; default to enhanced monitoring, not close',
    'Same merchant has had a prior PRA closed as organic within 60 days → Pattern indicates surveillance gap; escalate to Analytics',
    'Any geographic anomaly detected → Escalate to Card Present or Digital Risk depending on channel',
  ],
  monitoringWindow: '3 days — reduced monitoring for organic close; full 30-day monitoring if any indicators were borderline',
  steps: [
    {
      stepIndex: 0,
      title: 'Alert Analysis',
      objective: 'Rapidly assess the PRA context to determine whether full investigation is warranted or whether organic signals support an expedited close.',
      keySignals: [
        'PRA is Tier 3 severity — review for organic signals first, before committing full investigation resources',
        'Merchant MCC: low-risk MCCs (grocery, pharmacy) with stable decline rates strongly suggest organic',
        'Merchant history: long-established merchant with consistent prior monthly volume → likely seasonal growth',
        'Prior PRAs on same merchant: were they organic closes? If so, consistent pattern supports organic',
        'Attack taxonomy note: PRAs flagged as "Organic Seasonal Trend" or "Volume Threshold Breach" are organic until proven otherwise',
      ],
      mandatoryActions: [
        'Review the specific triggering metric: what threshold did the merchant cross? Is it volume or decline rate or both?',
        'If decline rate is the triggering metric (not just volume), treat with higher urgency',
        'Document initial organic/suspicious hypothesis in triage notes before pulling data',
      ],
      decisionGate: 'Initial hypothesis (organic or suspicious) documented. Triggering metric identified. If any suspicious signals visible even at Step 1, proceed with full investigation urgency.',
      skippableWhen: null,
    },
    {
      stepIndex: 1,
      title: 'Data Query Builder',
      objective: 'Pull the minimum necessary data to confirm or refute the organic hypothesis — focus on 6-month trend for organic closes.',
      keySignals: [
        'For probable organic: 6-month trend query is the primary decision data — does volume growth follow a seasonal or gradual trend?',
        'For borderline cases: also pull FVR hourly to check whether volume is spiking (attack) or growing (organic)',
        'PAN history query: primarily to check new-PAN ratio — organic growth should be from returning or incrementally new customers, not large new-PAN batches',
      ],
      mandatoryActions: [
        'Execute both queries to ensure sufficient data for the classification — do not shortcut to organic close without data',
        'Note the merchant registration date — very new merchants have limited baselines and should not be quickly closed as organic',
        'Check the 6-month trend for the presence of prior PRAs and how they resolved',
      ],
      decisionGate: 'Both queries executed. 6-month trend data available. New-PAN ratio data available. Sufficient basis for Step 3 assessment.',
      skippableWhen: null,
    },
    {
      stepIndex: 2,
      title: 'Data Analysis & Assessment',
      objective: 'Apply the organic close criteria rigorously — all four conditions must be met for an organic close; any deviation requires full investigation.',
      keySignals: [
        'ORGANIC CLOSE criteria (ALL four must hold): (1) decline rate consistent with history (within ±2%), (2) new PAN ratio < 15%, (3) no geographic anomaly in top markets, (4) volume trend is gradual or follows a known seasonal pattern',
        'SUSPICIOUS escalation trigger (ANY one sufficient): spike in isolated period with no trend, decline rate rising, geography shift, new-PAN ratio > 20%',
        '6-month trend is the decisive dataset for PRAs — look for gradual slope vs. point spike',
        'isLikelyOrganic flag in the data will pre-compute this assessment — but analyst must verify, not just accept the flag',
      ],
      mandatoryActions: [
        'Explicitly check all four organic criteria — document each one in the analyst notes',
        'If classifying as Organic, clearly state which conditions were met and why',
        'If classifying as Suspicious, document which criterion was violated and what follow-up action is required',
      ],
      decisionGate: 'Assessment submitted with explicit organic criteria check documented. Verdict supported by 6-month trend data. "Organic — Close Alert" is a valid outcome for PRAs meeting all criteria.',
      skippableWhen: null,
    },
    {
      stepIndex: 3,
      title: 'Block Rule Design',
      objective: 'Not required for organic closes. Activate only if investigation reveals a fraud pattern requiring intervention.',
      keySignals: [
        'If organic: this step is legitimately skipped per SOP-FR-05 policy',
        'If escalated to suspicious: the appropriate fraud-type SOP now applies (BIN Attack, CNP, POS) and that SOP\'s block rule guidance supersedes this step',
        'Never activate a block rule based solely on volume threshold breach without accompanying suspicious behavior signals',
      ],
      mandatoryActions: [
        'For organic close: no action required. Skip is compliant and expected.',
        'For suspicious escalation: treat as the relevant alert type and follow that SOP\'s block rule criteria',
      ],
      decisionGate: 'If organic: step skipped and documented as N/A per policy. If suspicious: block rule from escalated SOP type applies.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 4,
      title: 'Issuer Notification',
      objective: 'Not required for organic closes. Required only if investigation reveals fraud requiring issuer action.',
      keySignals: [
        'Organic close: no issuer notification required — volume increase is benign',
        'Suspicious escalation: follow the notification protocol of the escalated alert type',
        'Do not send precautionary notifications for organic PRAs — unnecessary notifications generate noise in issuer fraud queues',
      ],
      mandatoryActions: [
        'For organic close: no action. Skip is compliant.',
        'For suspicious escalation: issuer notification per the relevant SOP type (SOP-FR-01 through SOP-FR-04)',
      ],
      decisionGate: 'If organic: step skipped, compliant. If suspicious: issuer notified per escalated SOP.',
      skippableWhen: 'Organic — Close Alert',
    },
    {
      stepIndex: 5,
      title: 'Investigation Summary',
      objective: 'Close the ticket with a documented organic classification rationale, or escalate with a full investigation record.',
      keySignals: [
        'Organic close documentation is a compliance record — regulators and auditors review PRA close rates and rationale quality',
        'Fraud reconciliation note: even organic closes warrant a short monitoring window — organic can be a misclassification',
        '3-day monitoring window for organic close (vs. 14 days for confirmed fraud alerts)',
        'If same merchant generates a third PRA within 90 days, flag for Analytics team review of threshold calibration',
      ],
      mandatoryActions: [
        'Document the organic close rationale explicitly: which metrics supported the close and their values',
        'Set 3-day monitoring window (or 30-day if any indicators were borderline)',
        'Confirm SOP compliance: organic close steps (4 & 5 skipped) are correctly marked as N/A',
        'Do not mark ticket as "Resolved" — mark as "Closed — Organic" for distinct tracking',
      ],
      decisionGate: 'Ticket closed with documented rationale. Monitoring window set (3 or 30 days). SOP compliance confirmed.',
      skippableWhen: null,
    },
  ],
};

const SOP_MAP: Record<string, SopDefinition> = {
  'BIN Attack': SOP_BIN_ATTACK,
  'ATM Cashout': SOP_ATM_CASHOUT,
  'CNP Alert': SOP_CNP_ALERT,
  'POS Alert': SOP_POS_ALERT,
  'PRA Alert': SOP_PRA_ALERT,
};

export function getSopForAlert(alertType: string): SopDefinition {
  return SOP_MAP[alertType] ?? SOP_BIN_ATTACK;
}

export function getStepComplianceStatus(
  stepIndex: number,
  stepStatus: StepStatus,
  sop: SopDefinition,
  verdict: string | null
): 'complete' | 'active' | 'pending' | 'skipped-ok' | 'skipped-gap' | 'waiting' {
  const sopStep = sop.steps[stepIndex];
  if (!sopStep) return 'pending';

  if (stepStatus === 'complete') return 'complete';
  if (stepStatus === 'streaming') return 'active';
  if (stepStatus === 'waiting') return 'waiting';

  if (stepStatus === 'skipped') {
    // Skipping is compliant if the verdict matches the step's skippableWhen condition
    if (sopStep.skippableWhen && verdict === sopStep.skippableWhen) return 'skipped-ok';
    // Skipping a step that should not be skipped is a compliance gap
    return 'skipped-gap';
  }

  return 'pending';
}
