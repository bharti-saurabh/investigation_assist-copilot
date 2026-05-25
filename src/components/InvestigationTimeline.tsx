import React, { useState, useRef } from 'react';
import { Alert, LLMConfig, Query, DiagnosisData, BlockRule, EmailDraft, SummaryData, AlertProfile, StepStatus } from '../types';
import {
  runAnalyzeAlert,
  runPlanQueries,
  runAnalyzeData,
  runBlockRule,
  runEmailDraft,
  runSummary,
} from '../lib/agentApi';
import StepCard from './shared/StepCard';
import Step1AlertAnalysis from './steps/Step1AlertAnalysis';
import Step2QueryBuilder from './steps/Step2QueryBuilder';
import Step3DataDashboard from './steps/Step3DataDashboard';
import Step4BlockRule from './steps/Step4BlockRule';
import Step5Email from './steps/Step5Email';
import Step6Summary from './steps/Step6Summary';

interface StepState { status: StepStatus; agentText: string; }

interface Props {
  alert: Alert;
  llmConfig: LLMConfig;
  onReset: () => void;
  onError: (msg: string) => void;
}

const STEP_LABELS = [
  'Step 1 — Alert Analysis',
  'Step 2 — Data Query Builder',
  'Step 3 — Data Analysis & Assessment',
  'Step 4 — Block Rule Design',
  'Step 5 — Issuer Notification',
  'Step 6 — Investigation Summary',
];

const init = (): StepState[] => STEP_LABELS.map(() => ({ status: 'idle', agentText: '' }));

export default function InvestigationTimeline({ alert, llmConfig, onReset, onError }: Props) {
  const [steps, setSteps] = useState<StepState[]>(init);
  const [alertProfile, setAlertProfile] = useState<AlertProfile | null>(null);
  const [queries, setQueries] = useState<Query[]>([]);
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData | null>(null);
  const [assessment, setAssessment] = useState('');
  const [blockRule, setBlockRule] = useState<BlockRule | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const startedRef = useRef(false);

  function patchStep(idx: number, patch: Partial<StepState>) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
  function appendText(idx: number, text: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, agentText: s.agentText + text } : s));
  }

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    step1();
  }, []);

  async function step1() {
    patchStep(0, { status: 'streaming', agentText: '' });
    try {
      const { alertProfile: ap } = await runAnalyzeAlert(alert, llmConfig, t => appendText(0, t));
      setAlertProfile(ap);
      patchStep(0, { status: 'waiting' });
    } catch (e: any) {
      onError(e.message);
      patchStep(0, { status: 'idle' });
    }
  }

  async function step2() {
    patchStep(0, { status: 'complete' });
    patchStep(1, { status: 'streaming', agentText: '' });
    try {
      const { queries: q } = await runPlanQueries(alert, llmConfig, t => appendText(1, t));
      setQueries(q);
      patchStep(1, { status: 'waiting' });
    } catch (e: any) { onError(e.message); }
  }

  async function step3(_qs: Query[]) {
    patchStep(1, { status: 'complete' });
    patchStep(2, { status: 'streaming', agentText: '' });
    try {
      const data = await runAnalyzeData(alert, llmConfig, t => appendText(2, t));
      setDiagnosisData(data);
      patchStep(2, { status: 'waiting' });
    } catch (e: any) { onError(e.message); }
  }

  async function handleAssessment(verdict: 'True Positive' | 'False Positive') {
    setAssessment(verdict);
    patchStep(2, { status: 'complete' });
    if (verdict === 'False Positive') {
      patchStep(3, { status: 'skipped', agentText: '' });
      patchStep(4, { status: 'skipped', agentText: '' });
      await step6(verdict, false, false);
    } else {
      await step4();
    }
  }

  async function step4() {
    patchStep(3, { status: 'streaming', agentText: '' });
    try {
      const rule = await runBlockRule(alert, diagnosisData!, llmConfig, t => appendText(3, t));
      setBlockRule(rule);
      patchStep(3, { status: 'waiting' });
    } catch (e: any) { onError(e.message); }
  }

  async function handleBlockApproved() {
    patchStep(3, { status: 'complete' });
    await step5();
  }

  async function step5() {
    patchStep(4, { status: 'streaming', agentText: '' });
    try {
      const draft = await runEmailDraft(alert, blockRule, llmConfig, t => appendText(4, t));
      setEmailDraft(draft);
      patchStep(4, { status: 'waiting' });
    } catch (e: any) { onError(e.message); }
  }

  async function handleEmailSent() {
    patchStep(4, { status: 'complete' });
    await step6(assessment, true, true);
  }

  async function step6(verdict: string, blockApproved: boolean, emailSent: boolean) {
    patchStep(5, { status: 'streaming', agentText: '' });
    try {
      const s = await runSummary(alert, verdict, blockApproved, emailSent, blockRule, llmConfig, t => appendText(5, t));
      setSummary(s);
      patchStep(5, { status: 'complete' });
    } catch (e: any) { onError(e.message); }
  }

  function handleReset() {
    setSteps(init());
    setAlertProfile(null); setQueries([]); setDiagnosisData(null);
    setAssessment(''); setBlockRule(null); setEmailDraft(null); setSummary(null);
    startedRef.current = false;
    onReset();
  }

  return (
    <div>
      <StepCard stepNumber={1} label={STEP_LABELS[0]} status={steps[0].status}>
        <Step1AlertAnalysis status={steps[0].status} agentText={steps[0].agentText} alertProfile={alertProfile} onProceed={step2} />
      </StepCard>
      <StepCard stepNumber={2} label={STEP_LABELS[1]} status={steps[1].status}>
        <Step2QueryBuilder status={steps[1].status} agentText={steps[1].agentText} queries={queries} onFetchData={step3} />
      </StepCard>
      <StepCard stepNumber={3} label={STEP_LABELS[2]} status={steps[2].status}>
        <Step3DataDashboard status={steps[2].status} agentText={steps[2].agentText} data={diagnosisData} onAssessment={handleAssessment} />
      </StepCard>
      <StepCard stepNumber={4} label={STEP_LABELS[3]} status={steps[3].status}>
        <Step4BlockRule status={steps[3].status} agentText={steps[3].agentText} blockRule={blockRule} onApprove={handleBlockApproved} />
      </StepCard>
      <StepCard stepNumber={5} label={STEP_LABELS[4]} status={steps[4].status}>
        <Step5Email status={steps[4].status} agentText={steps[4].agentText} email={emailDraft} onSend={handleEmailSent} />
      </StepCard>
      <StepCard stepNumber={6} label={STEP_LABELS[5]} status={steps[5].status}>
        <Step6Summary status={steps[5].status} agentText={steps[5].agentText} summary={summary} assessment={assessment} onReset={handleReset} />
      </StepCard>
    </div>
  );
}
