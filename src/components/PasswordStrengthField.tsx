import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import FloatingInput from './FloatingInput';

// ─────────────────────────────────────────────────────────────────────
// Password analysis — pure, UI-free, and exported so ForcePasswordChange
// and LabourRegister can reuse the same rules. The gate for "may submit"
// is `isStrong`; the checklist + meter render `rules` and `strength`.
// ─────────────────────────────────────────────────────────────────────

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordAnalysis {
  rules: PasswordRule[];
  strength: PasswordStrength;
  /** 0–100, drives the strength-bar width. */
  score: number;
  /** True only when every rule passes and the password isn't blacklisted. */
  isStrong: boolean;
  /** Set when the password is common / sequential / repeated — caps it at Weak. */
  warning?: string;
}

// Small in-app blacklist. Not a full breach corpus — just the passwords
// people actually reach for first, plus a couple of brand/locale words a
// Zambian user might pick. Substring match so "MyPassword1!" is caught.
const COMMON_PASSWORDS = [
  'password', 'passw0rd', 'pass1234', '12345678', '123456789', '1234567890',
  'qwerty', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'abc123', 'a1b2c3',
  'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', 'sunshine',
  'princess', 'football', 'baseball', 'superman', 'trustno1', '000000',
  'tonse', 'tonsehub', 'proquote', 'proquotezambia', 'zambia', 'lusaka',
];

// 4+ character ascending or descending run of letters/digits (e.g. "1234",
// "abcd", "wxyz", "4321"). Catches keyboard-walk numeric/alpha sequences.
function hasSequentialRun(pw: string): boolean {
  const s = pw.toLowerCase();
  let asc = 1;
  let desc = 1;
  for (let i = 1; i < s.length; i++) {
    const delta = s.charCodeAt(i) - s.charCodeAt(i - 1);
    asc = delta === 1 ? asc + 1 : 1;
    desc = delta === -1 ? desc + 1 : 1;
    if (asc >= 4 || desc >= 4) return true;
  }
  return false;
}

// 4+ of the same character in a row, e.g. "aaaa", "1111".
function hasRepeatedRun(pw: string): boolean {
  return /(.)\1{3,}/.test(pw);
}

function isBlacklisted(pw: string): boolean {
  const s = pw.toLowerCase();
  if (COMMON_PASSWORDS.some((c) => s.includes(c))) return true;
  // Straight keyboard-row walks like "asdf", "qwerty", "7890".
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
  return rows.some((row) => s.length >= 4 && row.includes(s));
}

export function analyzePassword(pw: string): PasswordAnalysis {
  const rules: PasswordRule[] = [
    { id: 'length', label: 'At least 12 characters', met: pw.length >= 12 },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(pw) },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(pw) },
    { id: 'number', label: 'One number', met: /[0-9]/.test(pw) },
    { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(pw) },
  ];

  const metCount = rules.filter((r) => r.met).length;
  const weakByPattern =
    pw.length > 0 && (isBlacklisted(pw) || hasSequentialRun(pw) || hasRepeatedRun(pw));

  let strength: PasswordStrength;
  let warning: string | undefined;

  if (weakByPattern) {
    // A common word, sequence, or repeat never progresses past Weak —
    // no matter how long it is or how many character classes it hits.
    strength = 'weak';
    warning = 'Avoid common words, sequences (12345, qwerty) or repeated characters.';
  } else if (metCount === rules.length) {
    strength = 'strong';
  } else if (metCount >= 3) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  const score = weakByPattern
    ? Math.min(25, metCount * 5)
    : strength === 'strong'
      ? 100
      : strength === 'medium'
        ? 62
        : Math.max(12, metCount * 12);

  return { rules, strength, score, isStrong: strength === 'strong', warning };
}

// ─────────────────────────────────────────────────────────────────────

const STRENGTH_META: Record<PasswordStrength, { label: string; text: string; bar: string }> = {
  weak: { label: 'Weak', text: 'text-rose-600', bar: 'bg-rose-500' },
  medium: { label: 'Medium', text: 'text-amber-600', bar: 'bg-amber-500' },
  strong: { label: 'Strong', text: 'text-emerald-600', bar: 'bg-emerald-500' },
};

interface PasswordStrengthFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires on every keystroke with the current analysis — use it to gate submit. */
  onAnalysis?: (analysis: PasswordAnalysis) => void;
  autoComplete?: string;
  tone?: 'cream' | 'white';
}

export default function PasswordStrengthField({
  label = 'Password',
  value,
  onChange,
  onAnalysis,
  autoComplete = 'new-password',
  tone = 'cream',
}: PasswordStrengthFieldProps) {
  const [show, setShow] = useState(false);
  const analysis = useMemo(() => analyzePassword(value), [value]);

  useEffect(() => {
    onAnalysis?.(analysis);
  }, [analysis, onAnalysis]);

  const meta = STRENGTH_META[analysis.strength];
  const showFeedback = value.length > 0;

  return (
    <div className="space-y-3">
      <FloatingInput
        label={label}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        icon={Lock}
        autoComplete={autoComplete}
        tone={tone}
        className={show ? '' : 'tracking-widest'}
        rightElement={
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-[#C9973A]/70 hover:text-[#C9973A] transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </button>
        }
      />

      {showFeedback && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Strength meter */}
          <div className="space-y-1.5">
            <div className="h-1.5 w-full rounded-full bg-[#efe9dd] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${meta.bar}`}
                style={{ width: `${analysis.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#1a1612]/45">Password strength</span>
              <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.text}`}>
                {meta.label}
              </span>
            </div>
          </div>

          {/* Live checklist */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {analysis.rules.map((rule) => (
              <li key={rule.id} className="flex items-center gap-2">
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-colors duration-200 ${
                    rule.met ? 'bg-emerald-500 text-white' : 'bg-[#efe9dd] text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                <span
                  className={`text-[12px] transition-colors duration-200 ${
                    rule.met ? 'text-emerald-700 font-medium' : 'text-[#1a1612]/50'
                  }`}
                >
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>

          {analysis.warning && (
            <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              {analysis.warning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
