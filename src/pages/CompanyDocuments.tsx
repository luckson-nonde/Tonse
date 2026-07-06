import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authService } from '../services/auth/authService';
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  FileText,
  Hash,
  Building2,
  Upload,
  X,
  AlertCircle,
  Wrench,
  Award,
} from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import FloatingInput from '../components/FloatingInput';
import { getPrimaryBusinessType, BusinessType } from '../services/categories';
import { useFieldValidation, type Validator } from '../hooks/useFieldValidation';
import RegistrationLoadingOverlay from '../components/RegistrationLoadingOverlay';
import { useConsentGate } from '../hooks/useConsentGate';
import ConsentModal from '../components/consent/ConsentModal';

// Zambian TPIN is 10 digits, e.g. 1234567890
function formatTPIN(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 10);
}
const TPIN_REGEX = /^\d{10}$/;

// Per-businessType configuration — controls which fields render, which are
// required, and the section labels. Phase 3 of the architectural rule
// (role + subRole + category + specification → BusinessType → tailored UX).
interface DocsConfig {
  brandLabel: string;
  brandHint: string;
  brandIcon: typeof Building2;
  /** Whether PACRA Certificate of Incorporation is required. */
  requiresPACRA: boolean;
  /** Whether TPIN is required. (When false, the TPIN input still renders so
   *  the user can opt-in, but validation skips it if empty.) */
  requiresTPIN: boolean;
  /** Section 02 heading + tile copy. */
  docTitle: string;
  docTileHeadline: string;
  docTileSubcopy: string;
  /** Activation tile copy. */
  activationCopy: string;
}

function getDocsConfig(type: BusinessType): DocsConfig {
  // PRODUCTS_AND_REPAIR retired in Phase 1.5 — a phone shop that both
  // sells and repairs has archetypes=['RETAIL','REPAIR'] and the docs
  // page picks the PRIMARY archetype (REPAIR by priority). The "both
  // sides activate together" copy is irrelevant now since the company
  // is one entity with one PACRA cert anyway.
  switch (type) {
    case 'REPAIR':
      return {
        brandLabel: 'Repair Shop Name',
        brandHint: 'The name customers will see on the marketplace.',
        brandIcon: Wrench,
        requiresPACRA: false,
        requiresTPIN: false,
        docTitle: 'Trade License (Optional)',
        docTileHeadline: 'Trade license or technician certificate',
        docTileSubcopy: 'PDF, JPG, PNG · max 5MB',
        activationCopy:
          'Skill review takes ~24h. You can list your services right away while we verify.',
      };

    case 'SERVICE':
      return {
        brandLabel: 'Service Brand Name',
        brandHint: 'The name clients will see when booking your service.',
        brandIcon: Award,
        requiresPACRA: false,
        requiresTPIN: false,
        docTitle: 'Credentials (Optional)',
        docTileHeadline: 'Certifications, licenses, or portfolio',
        docTileSubcopy: 'PDF, JPG, PNG · max 5MB',
        activationCopy:
          'Sole providers can start listing immediately. Add credentials to qualify for verified-pro badging.',
      };

    case 'WHOLESALE':
      return {
        brandLabel: 'Company Legal Name',
        brandHint: 'Exactly as registered with PACRA.',
        brandIcon: Building2,
        requiresPACRA: true,
        requiresTPIN: true,
        docTitle: 'PACRA Certificate',
        docTileHeadline: 'Certificate of Incorporation',
        docTileSubcopy: 'PDF, JPG, PNG · max 5MB',
        activationCopy:
          'Wholesale verification takes 24–48 working hours. Bulk pricing tools unlock once verified.',
      };

    case 'EVENTS':
    case 'ENTERTAINMENT':
      return {
        brandLabel: 'Brand / Stage Name',
        brandHint: 'The name your audience knows you by.',
        brandIcon: Building2,
        requiresPACRA: false,
        requiresTPIN: false,
        docTitle: 'Portfolio (Optional)',
        docTileHeadline: 'Past-event portfolio or showreel',
        docTileSubcopy: 'PDF, JPG, PNG · max 5MB',
        activationCopy:
          'Performers can list bookings immediately. Verified portfolios surface higher in search.',
      };

    case 'RETAIL':
    default:
      return {
        brandLabel: 'Company Legal Name',
        brandHint: 'Exactly as registered with PACRA.',
        brandIcon: Building2,
        requiresPACRA: true,
        requiresTPIN: true,
        docTitle: 'PACRA Certificate',
        docTileHeadline: 'Certificate of Incorporation',
        docTileSubcopy: 'PDF, JPG, PNG · max 5MB',
        activationCopy:
          'Verification typically takes 24–48 working hours. You can build your shop profile while we review.',
      };
  }
}

export default function CompanyDocuments() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const consent = useConsentGate('business');

  // A multi-archetype seller still has ONE company, so the docs page picks
  // the seller's primary archetype and lets that drive the doc set.
  const businessType = useMemo(() => getPrimaryBusinessType(user as any), [user]);
  const cfg = useMemo(() => getDocsConfig(businessType), [businessType]);

  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [tpin, setTpin] = useState(user?.tpin || '');
  const [certUrl, setCertUrl] = useState(user?.incorporationCertUrl || '');
  const [certName, setCertName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Conversational validation (parity with the buyer flow): silent until
  // blur, live "instant forgiveness" after a failure, green checks on pass,
  // and a submit guard that scrolls to the first invalid field.
  const fieldValidators: Record<string, Validator> = {
    companyName: (v) =>
      !v.trim()
        ? `${cfg.brandLabel} is required.`
        : v.trim().length < 3
          ? `${cfg.brandLabel} should be at least 3 characters.`
          : '',
    tpin: (v) => {
      if (!v.trim()) return cfg.requiresTPIN ? 'TPIN is required — 10 digits from ZRA.' : '';
      return TPIN_REGEX.test(v) ? '' : 'TPIN must be exactly 10 digits.';
    },
  };
  const validation = useFieldValidation(fieldValidators);
  const companyNameV = validation.field('companyName', companyName);
  const tpinV = validation.field('tpin', tpin);
  const certRef = useRef<HTMLDivElement | null>(null);

  const handleFileSelect = async (file: File) => {
    setError('');
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large — max 5MB.');
      return;
    }
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) {
      setError('Only PDF, JPG, PNG or WEBP files are accepted.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCertUrl(reader.result as string);
      setCertName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const navigateAfter = async () => {
    // End-of-onboarding gate: the seller has now provided every piece
    // we ask for at signup (identity, location, credentials, business
    // documents). Per the product rule, this is where the session
    // ends — clear tokens server-side + locally and bounce them to
    // /login so the next entry into the app is a clean, fully-
    // hydrated authenticated session against the freshly-created
    // profile + categories junction rows.
    // Capture the email before logout clears the session, so the login page
    // can pre-fill it and the user only has to type their password.
    const registeredEmail = user?.email;
    try {
      await authService.logout();
    } catch (e) {
      // Even if the server call fails (network blip, expired token),
      // the local fallthrough in authService.logout already cleared
      // tokens. Don't block the redirect.
    }
    navigate('/login?registered=1', { replace: true, state: { email: registeredEmail } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // "No hunting" guard — red the invalid fields and scroll to the first.
    const ok = validation.validateAll([
      { name: 'companyName', value: companyName },
      { name: 'tpin', value: tpin },
    ]);
    if (!ok) return;
    if (cfg.requiresPACRA && !certUrl) {
      setError('Upload your PACRA Certificate of Incorporation.');
      certRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsLoading(true);
    try {
      await updateUser({
        companyName,
        tpin,
        incorporationCertUrl: certUrl,
        verificationStatus: 'PENDING',
      } as any);
      await navigateAfter();
    } catch (err: any) {
      setError(err.message || 'Failed to submit documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await updateUser({ verificationStatus: 'INCOMPLETE' } as any);
      await navigateAfter();
    } catch (err: any) {
      setError(err.message || 'Failed to skip.');
    } finally {
      setIsLoading(false);
    }
  };

  const certUploaded = !!certUrl;
  const BrandIcon = cfg.brandIcon;

  return (
    <>
      <ConsentModal
        open={consent.needsConsent}
        configKey="business"
        scope="pane"
        onConsent={consent.grant}
        onBack={() => { consent.dismiss(); navigate(-1); }}
      />
      <RegistrationLoadingOverlay open={isLoading} />
      <AuthSplitLayout
      title="Business Documents"
      subtitle={
        <span className="text-[#1a1612]/60">
          {cfg.requiresPACRA
            ? 'Verify your business with PACRA & ZRA records'
            : 'Tell us a bit about your business — paperwork is optional'}
        </span>
      }
      onBack={() => navigate(-1)}
      stepper={{
        current: 4,
        total: 4,
        labels: ['Profile', 'Location', 'Credentials', 'Business'],
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {error && (
          <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" strokeWidth={2.5} />
            <p className="text-[12px] text-rose-600 font-medium leading-snug">{error}</p>
          </div>
        )}

        {/* Section 01 — Business Identity */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
              Section 01
            </p>
            <div className="h-px flex-1 bg-[#e8e4dc]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50">
              Business Identity
            </p>
          </div>

          <div ref={companyNameV.ref}>
            <FloatingInput
              label={cfg.brandLabel}
              type="text"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                companyNameV.onChange(e.target.value);
              }}
              onBlur={companyNameV.onBlur}
              required
              icon={BrandIcon}
              autoComplete="organization"
              error={companyNameV.error}
              valid={companyNameV.valid}
              hint={
                !companyNameV.error && !companyNameV.valid && companyName.length === 0
                  ? cfg.brandHint
                  : undefined
              }
            />
          </div>

          <div ref={tpinV.ref}>
            <FloatingInput
              label={cfg.requiresTPIN ? 'TPIN Number' : 'TPIN Number (Optional)'}
              type="text"
              value={tpin}
              onChange={(e) => {
                const f = formatTPIN(e.target.value);
                setTpin(f);
                tpinV.onChange(f);
              }}
              onBlur={tpinV.onBlur}
              required={cfg.requiresTPIN}
              icon={Hash}
              inputMode="numeric"
              maxLength={10}
              placeholder="1234567890"
              error={tpinV.error}
              valid={tpinV.valid}
              hint={
                !tpinV.error && !tpinV.valid && tpin.length === 0
                  ? cfg.requiresTPIN
                    ? '10-digit Tax Payer Identification Number from ZRA.'
                    : 'Add it later from settings if you register with ZRA.'
                  : undefined
              }
            />
          </div>
        </section>

        {/* Section 02 — Documents */}
        <section className="space-y-3" ref={certRef}>
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
              Section 02
            </p>
            <div className="h-px flex-1 bg-[#e8e4dc]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50">
              {cfg.docTitle}
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />

          {certUploaded ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#C9973A]/35 bg-white shadow-[0_4px_18px_-14px_rgba(201,151,58,0.5)]">
              <div className="w-12 h-12 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 mb-0.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" strokeWidth={3} /> Document Attached
                </p>
                <p className="text-[12px] font-medium text-[#1a1612] truncate">
                  {certName || 'document.pdf'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCertUrl('');
                  setCertName('');
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="w-8 h-8 rounded-full bg-[#f5f2ee] hover:bg-[#e8e4dc] text-[#1a1612]/50 flex items-center justify-center transition-colors shrink-0"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-brand-white hover:border-[#C9973A]/45 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-16px_rgba(26,22,18,0.15)] transition-all duration-200 text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1a1612] leading-tight">
                  {cfg.docTileHeadline}
                </p>
                <p className="text-[11px] text-[#1a1612]/55 mt-0.5">{cfg.docTileSubcopy}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C9973A] shrink-0">
                Upload →
              </span>
            </button>
          )}

          <p className="text-[11px] text-[#1a1612]/45 flex items-center gap-2 ml-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9973A]/60" strokeWidth={2} />
            Stored encrypted · only Tonse compliance reviewers can read.
          </p>
        </section>

        {/* Activation status tile */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#e8e4dc] bg-brand-white">
          <div className="w-9 h-9 rounded-lg bg-[#C9973A]/10 text-[#C9973A] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-[#1a1612] leading-tight">
              {cfg.requiresPACRA ? 'Activation pending review' : 'Activate now, verify later'}
            </p>
            <p className="text-[11px] text-[#1a1612]/55 mt-0.5 leading-snug">
              {cfg.activationCopy}
            </p>
          </div>
        </div>

        {/* Submit + Skip */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[58px] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] disabled:from-[#e8e4dc] disabled:to-[#e0dccf] disabled:text-[#1a1612]/30 disabled:cursor-not-allowed transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                {cfg.requiresPACRA ? 'Submit for Verification' : 'Activate Account'}{' '}
                <span className="text-base leading-none">→</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full h-12 text-[11px] font-sans font-bold text-[#1a1612]/45 hover:text-[#C9973A] transition-colors uppercase tracking-[0.18em]"
          >
            I'll do this later
          </button>
        </div>
      </form>
    </AuthSplitLayout>
    </>
  );
}
