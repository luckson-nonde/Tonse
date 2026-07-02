import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const LOAD_STAGES = [
  'Securing your credentials…',
  'Saving your profile…',
  'Preparing your workspace…',
  'Almost there…',
];

/**
 * Full-screen progress overlay for the final account-creation submit across
 * every onboarding flow (buyer/company/labour). Self-contained: pass `open`
 * and it manages its own staged messages + progress. Gives clear on-screen
 * progress (with a rough time estimate) instead of a spinner buried in a button.
 */
export default function RegistrationLoadingOverlay({
  open,
  eyebrow = 'Creating your account',
}: {
  open: boolean;
  eyebrow?: string;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!open) {
      setStage(0);
      return;
    }
    const id = window.setInterval(() => {
      setStage((s) => Math.min(s + 1, LOAD_STAGES.length - 1));
    }, 1500);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  const pct = Math.round(((stage + 1) / LOAD_STAGES.length) * 100);
  const remaining = Math.max(0, LOAD_STAGES.length - 1 - stage) * 2; // ~seconds

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#1a1612]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-brand-white rounded-3xl p-8 shadow-2xl text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white flex items-center justify-center shadow-lg shadow-[#C9973A]/30 mb-5">
          <RefreshCw className="w-7 h-7 animate-spin" strokeWidth={2.5} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A] mb-1">
          {eyebrow}
        </p>
        <h3 className="font-serif text-[20px] font-bold text-[#1a1612] mb-4">{LOAD_STAGES[stage]}</h3>
        <div className="h-2 bg-[#e8e4dc] rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-[#C9973A] to-[#D5A547] rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[12px] text-[#1a1612]/55 tabular-nums">
          {remaining > 0 ? `About ${remaining}s remaining…` : 'Finishing up…'}
        </p>
      </div>
    </div>
  );
}
