import React, { useState } from 'react';
import { Landmark, Save, Loader2, CheckCircle2, Info, Paperclip, X } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import type { LoanTypeKey } from '../../utils/loan';
import { API_BASE_URL, apiClient } from '../../services/api/client';
import SecureFile from '../SecureFile';

/**
 * Lender-owner surface to author the loan Terms & Conditions that ship with
 * every offer — kept PER LOAN TYPE because collateral, salary and government
 * loans carry materially different terms. Each type takes the written terms
 * (auto-filled into offers) AND an attached T&C DOCUMENT (the signed contract /
 * PDF the borrower reviews). The offer form pre-fills the matching type
 * (falling back to `general`), so a lender sets these once. Persisted to the
 * service-provider profile (`loanTerms` text + `loanTermsDocs` doc URLs) via
 * the standard profile update.
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

const EMPTY = { collateral: '', salary: '', government: '', general: '' };

export default function LoanTermsEditor() {
  const { user, updateUser } = useAuth() as any;
  const initialTerms = (user?.loanTerms || {}) as Record<string, string>;
  const initialDocs = (user?.loanTermsDocs || {}) as Record<string, string>;
  const [terms, setTerms] = useState<Record<string, string>>({ ...EMPTY, ...initialTerms });
  const [docs, setDocs] = useState<Record<string, string>>({ ...EMPTY, ...initialDocs });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setSaved(false);
    setTerms((prev) => ({ ...prev, [k]: v }));
  };

  /** Upload a T&C document to the encrypted, auth-gated `loan-terms` store and
   *  return its secure URL. */
  const uploadDoc = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    // apiClient attaches the JWT (refreshing if expired) and throws a
    // descriptive Error on any non-OK response.
    const data = await apiClient.post<{ url: string }>(
      `/files/upload?category=loan-terms`,
      fd
    );
    const url = data.data?.url;
    if (!url) throw new Error('Upload returned no URL');
    return `${API_BASE_URL}${url}`;
  };

  const onPickDoc = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setUploadingKey(key);
    setError('');
    try {
      const url = await uploadDoc(file);
      setSaved(false);
      setDocs((prev) => ({ ...prev, [key]: url }));
    } catch (err: any) {
      setError(err?.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploadingKey(null);
    }
  };

  const removeDoc = (key: string) => {
    setSaved(false);
    setDocs((prev) => ({ ...prev, [key]: '' }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateUser({ loanTerms: terms, loanTermsDocs: docs });
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
            Set your standard terms once, per loan type — the written terms plus your signed T&amp;C
            document. They auto-fill and travel with every offer you make, so your loan officers never
            start from a blank box and the borrower always sees the real contract.
          </p>
        </div>
      </div>

      <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 text-[13px] text-blue-800">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          These terms travel with your loan offers. Keep them accurate — the borrower reviews and
          accepts them as part of the offer, and they appear on the printed loan agreement. The
          attached document is stored securely and only visible to the borrower you offer.
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

          {/* Attached T&C document for this loan type */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              T&amp;C document
            </span>
            {docs[s.key] ? (
              <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <SecureFile url={docs[s.key]} asLink />
                <button
                  type="button"
                  onClick={() => removeDoc(s.key)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 hover:text-rose-600"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ) : (
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 text-[12px] font-bold text-slate-600 hover:border-[#C9973A] hover:text-[#C9973A] cursor-pointer transition-colors">
                {uploadingKey === s.key ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                {uploadingKey === s.key ? 'Uploading…' : 'Attach document (PDF or image)'}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  disabled={uploadingKey === s.key}
                  onChange={(e) => onPickDoc(s.key, e)}
                />
              </label>
            )}
          </div>
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
          disabled={saving || !!uploadingKey}
          className="px-7 py-3 bg-[#C9973A] hover:bg-[#b8861e] text-white font-bold rounded-2xl flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Loan Terms
        </button>
      </div>
    </div>
  );
}
