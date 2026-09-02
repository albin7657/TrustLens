import { SignalBreakdownItem } from '@/lib/api';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

const SIGNAL_NAME_MAP: Record<string, string> = {
  'headers:security': 'Security Headers',
  'ssl:validity': 'SSL Certificate Validity',
  'whois:age': 'Domain Age & Registration',
  'dns:mail_infrastructure': 'Mail Infrastructure (MX / SPF / DMARC)',
  'mail:infrastructure': 'Mail Infrastructure (MX / SPF / DMARC)',
  'domain:typosquatting': 'Brand Typosquatting Check',
  'domain:typosquatting_check': 'Brand Typosquatting Check',
  'internal_db:company': 'Company Database Record',
  'internal_db:recruiter': 'Recruiter Database Record',
  'internal_db:domain': 'Domain Blacklist Record',
  'rules:job_red_flag_phrases': 'Scam Phrase Analysis',
  'rules:internship_fee_phrases': 'Internship Fee Analysis',
  'rules:communication_threat_phrases': 'Phishing Threat Phrases',
  'local_model:distilbert': 'AI Neural Classifier',
  'gemini:salary_plausibility': 'Salary Plausibility',
  'gemini:advance_fee_risk': 'Advance Fee Risk',
  'gemini:urgency_pressure': 'Urgency & Pressure Tactics',
  'gemini:vague_or_generic': 'Role Specificity & Detail',
  'gemini:contact_legitimacy': 'Contact Legitimacy',
  'gemini:predatory_internship_pattern': 'Predatory Internship Pattern',
  'gemini:payment_or_fee_request': 'Payment Request Analysis',
  'gemini:urgency_or_threat': 'Urgency & Threat Analysis',
  'gemini:impersonation_or_authority': 'Authority Impersonation',
  'gemini:credential_or_personal_info_request': 'Credential Theft Analysis',
  'gemini:scam_stage': 'Scam Progression Stage',
  'gemini:lure_type': 'Detected Lure Type',
};

function formatName(name: string) {
  if (SIGNAL_NAME_MAP[name]) return SIGNAL_NAME_MAP[name];
  const cleaned = name.replace(/^[a-z_]+:/, '').replace(/_/g, ' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getStatusDetails(score: number) {
  if (score <= 15) {
    return {
      status: 'passed',
      label: '✓ Verified / Clean',
      badgeClass: 'text-emerald-300 bg-emerald-950/70 border-emerald-800/60',
      cardBorder: 'border-slate-800/80 bg-slate-950/40',
      barClass: 'bg-gradient-to-r from-emerald-600 to-emerald-400 w-full',
    };
  }
  if (score < 50) {
    return {
      status: 'notice',
      label: '⚠️ Notice / Moderate',
      badgeClass: 'text-amber-300 bg-amber-950/70 border-amber-800/60',
      cardBorder: 'border-amber-900/40 bg-amber-950/15',
      barClass: 'bg-gradient-to-r from-amber-600 to-amber-400 w-2/3',
    };
  }
  return {
    status: 'flagged',
    label: '🚨 Flagged Threat',
    badgeClass: 'text-red-300 bg-red-950/70 border-red-800/60',
    cardBorder: 'border-red-900/60 bg-red-950/25 shadow-sm shadow-red-950/50',
    barClass: 'bg-gradient-to-r from-red-600 to-red-400 w-full',
  };
}

export default function SignalBreakdown({ signals }: { signals: SignalBreakdownItem[] }) {
  if (!signals.length) return null;

  return (
    <div className="space-y-3">
      {signals.map((s) => {
        const score = Math.round(s.score);
        const { status, label, badgeClass, cardBorder, barClass } = getStatusDetails(score);

        return (
          <div key={s.name} className={`rounded-xl border p-4 transition-all ${cardBorder}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {status === 'passed' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : status === 'notice' ? (
                  <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                <span className="text-sm font-semibold capitalize text-slate-200">{formatName(s.name)}</span>
              </div>

              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}>
                {label}
              </span>
            </div>

            {/* Clean Status Indicator Bar */}
            <div className="mt-3 h-2 rounded-full bg-slate-800/80 overflow-hidden">
              <div className={`h-2 rounded-full transition-all duration-500 ${barClass}`} />
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">{s.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
