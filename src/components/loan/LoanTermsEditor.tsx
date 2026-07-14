import React, { useState } from 'react';
import { Landmark, Save, Loader2, CheckCircle2, Info } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import type { LoanTypeKey } from '../../utils/loan';

/**
 * Lender-owner surface to author the loan Terms & Conditions that ship with
 * every offer — kept PER LOAN TYPE because collateral, salary and government
 * loans carry materially different terms. The offer form pre-fills the matching
 * type (falling back to `general`), so a lender writes these once and barely
 * touches the T&C box afterwards. Persisted to the service-provider profile
 * (`loanTerms` json) via the standard profile update.
 */
const SECTIONS: Array<{ key: LoanTypeKey | 'general'; label: string; hint: string; placeholder: string }> = [
  {
    key: 'collateral',
    label: 'Collateral Loan Terms',
    hint: 'Asset-backed loans.',
    placeholder:
      'e.g. Collateral must be valued by an approved assessor. Original ownership documents held until settlement. Default triggers repossession after 30 days…',
  },
  {
    key: 'salary',
    label: 'Salary Loan Terms',
    hint: 'Private / parastatal salaried borrowers.',
    placeholder:
      'e.g. Repayment by standing order on payday. Proof of employment and 3 months’ payslips required. Early settlement rebate available…',
  },
  {
    key: 'government',
    label: 'Government Employee Loan Terms',
    hint: 'Public-sector payroll loans.',
    placeholder:
      'e.g. Repayment via payroll (salary) deduction with signed consent. Maximum tenure 60 months. Subject to remaining net-pay rules…',
  },
  {
    key: 'general',
    label: 'General / Fallback Terms',
    hint: 'Used when a loan type above has no specific terms.',
    placeholder: 'Default terms & conditions applied to any loan offer without type-specific terms…',
  },
];

export default function LoanTermsEditor() {
  const { user, updateUser } = useAuth() as any;
  const initial = (user?.loanTerms || {}) as Record<string, string>;
  const [terms, setTerms] = useState<Record<string, string>>({
    collateral: initial.collateral || '',
    salary: initial.salary || '',
    government: initial.government || '',
    general: initial.general || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => {
    setSaved(false);
    setTerms((prev) => ({ ...prev, [k]: v }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateUser({ loanTerms: terms });
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } catch (e: any) {
      setError(e?.message || 'Failed to save loan terms. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-black text-brand-dark">Loan Terms &amp; Conditions</h2>
          <p className="text-sm text-slate-500 mt-1">
            Write your standard terms once, per loan type. They auto-fill into every offer you make —
            editable per offer — so your loan officers never start from a blank box.
          </p>
        </div>
      </div>

      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-[13px] text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          These terms travel with your loan offers. Keep them accurate — the borrower reviews and
          accepts them as part of the offer, and they appear on the printed loan agreement.
        </p>
      </div>

      {SECTIONS.map((s) => (
        <div key={s.key} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-900">{s.label}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.hint}</span>
          </div>
          <textarea
            value={terms[s.key] || ''}
            onChange={(e) => set(s.key, e.target.value)}
            rows={5}
            placeholder={s.placeholder}
            className="w-full mt-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-[#C9973A] focus:border-transparent outline-none text-sm text-slate-800 leading-relaxed resize-y"
          />
        </div>
      ))}

      {error && <p className="text-rose-500 text-sm text-center">{error}</p>}

      <div className="flex items-center justify-end gap-3 pb-4">
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="px-7 py-3 bg-[#C9973A] hover:bg-[#b8861e] text-white font-bold rounded-2xl flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Loan Terms
        </button>
      </div>
    </div>
  );
}
