import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type Role } from '../AuthContext';
import { authService } from '../services/auth/authService';
import {
  Key,
  Eye,
  EyeOff,
  User,
  Phone,
  Calendar,
  Hash,
  ShieldCheck,
  Mail,
  Lock,
  MapPin,
  Building2,
  Truck,
  Navigation,
  Store,
  RefreshCw,
  Smartphone,
  ClipboardCheck,
  Pencil,
} from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import FloatingInput from '../components/FloatingInput';
import PasswordStrengthField, { analyzePassword, type PasswordAnalysis } from '../components/PasswordStrengthField';
import { SubRole, EntityType } from '../types';
import { getRegistrationSchema } from '../services/userSchemas';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { HeroContent } from '../types';
import CompactIdentityCapture from '../components/CompactIdentityCapture';
import NrcDocumentCapture from '../components/NrcDocumentCapture';
import LocationDetails from '../components/LocationDetails';
import RegistrationStepShell from '../components/RegistrationStepShell';
import { useOnboardingDraft } from '../hooks/useOnboardingDraft';
import { useFieldValidation, type Validator } from '../hooks/useFieldValidation';

// Zambian NRC format: XXXXXX/XX/X (6 digits / 2 digits / 1 digit)
function formatNRC(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}/${digits.slice(6)}`;
  return `${digits.slice(0, 6)}/${digits.slice(6, 8)}/${digits.slice(8, 9)}`;
}

const NRC_REGEX = /^\d{6}\/\d{2}\/\d{1}$/;

// Zambian mobile: 9 digits after country code, e.g. +260 9XX XXX XXX
// Strips +260 / 260 / leading 0 — stores as raw 9 digits, displays formatted
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('260')) local = local.slice(3);
  if (local.startsWith('0')) local = local.slice(1);
  local = local.slice(0, 9);
  if (local.length === 0) return '';
  if (local.length <= 3) return `+260 ${local}`;
  if (local.length <= 6) return `+260 ${local.slice(0, 3)} ${local.slice(3)}`;
  return `+260 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 9)}`;
}

function getPhoneDigits(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('260')) return digits.slice(3);
  return digits;
}

function calculateAge(dobString: string): number | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function getMaxDOB(): string {
  const today = new Date();
  const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return max.toISOString().split('T')[0];
}

const REGISTER_HERO: Record<string, HeroContent> = {
  individual: {
    title: 'Verify in Minutes. Trade for Years.',
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: [
      'NRC-matched identity check',
      'Encrypted at rest, in transit',
      'Trusted by 1,200+ Zambian businesses',
    ],
  },
  business: {
    title: 'Register Your Business for Trade.',
    image:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: [
      'PACRA-verified business profile',
      'TPIN-ready invoicing',
      'Direct access to enterprise buyers',
    ],
  },
};

// A titled card of label/value rows shown on the Review step, with an
// Edit shortcut that jumps back to the relevant step.
function ReviewSection({
  title,
  onEdit,
  rows,
}: {
  title: string;
  onEdit: () => void;
  rows: string[][];
}) {
  // The whole card is clickable — tap anywhere (not just "Edit") to jump back
  // to that step, so a missing/incomplete detail is one tap away from fixing.
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group block w-full text-left rounded-2xl border border-[#e8e0d0]/70 bg-brand-white overflow-hidden hover:border-[#C9973A]/50 hover:shadow-[0_4px_18px_-12px_rgba(201,151,58,0.35)] transition-all"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e4dc] bg-[#faf6ee]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">{title}</p>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] group-hover:text-[#B08432] inline-flex items-center gap-1 transition-colors">
          <Pencil className="w-3 h-3" /> Edit
        </span>
      </div>
      <dl className="divide-y divide-[#f1ede5]">
        {rows.map((row) => {
          const missing = !row[1] || ['Not added', 'Not pinned', '—'].includes(row[1]);
          return (
            <div key={row[0]} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-[11px] font-medium text-[#1a1612]/50 shrink-0">{row[0]}</dt>
              <dd
                className={`text-[13px] font-semibold text-right min-w-0 truncate ${
                  missing ? 'text-amber-600' : 'text-[#1a1612]'
                }`}
              >
                {row[1] || 'Not added'}
              </dd>
            </div>
          );
        })}
      </dl>
    </button>
  );
}

const LOAD_STAGES = [
  'Securing your credentials…',
  'Saving your profile…',
  'Preparing your workspace…',
  'Almost there…',
];

// Full-screen progress overlay for the final account creation — gives the
// user clear on-screen progress (staged messages + a rough time estimate)
// instead of just a spinner buried in the button.
function RegistrationLoadingOverlay({ stage }: { stage: number }) {
  const pct = Math.round(((stage + 1) / LOAD_STAGES.length) * 100);
  const remaining = Math.max(0, LOAD_STAGES.length - 1 - stage) * 2; // ~seconds
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[#1a1612]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-brand-white rounded-3xl p-8 shadow-2xl text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white flex items-center justify-center shadow-lg shadow-[#C9973A]/30 mb-5">
          <RefreshCw className="w-7 h-7 animate-spin" strokeWidth={2.5} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#C9973A] mb-1">
          Creating your account
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

export default function Register() {
  try {
    const { register, user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role') || 'BUYER';
    const subRole = (searchParams.get('subRole') as SubRole) || undefined;
    // Phase: matching — RoleSelection now hands us category IDs (not
    // display names). Accept either query key during the transition,
    // newer `categoryIds` first, falling back to the legacy `categories`.
    const categoryIdsParam =
      searchParams.get('categoryIds') || searchParams.get('categories');
    const initialCategories = categoryIdsParam ? categoryIdsParam.split(',') : [];

    // ── Persistent onboarding draft ──────────────────────────────────
    // The whole wizard reads/writes ONE localStorage-backed draft, so it
    // survives forward/back navigation AND a page refresh. Passwords and
    // base64 images are kept in memory only (never written to disk) — see
    // useOnboardingDraft.
    const { draft, patch, reset, resumedFromStorage } = useOnboardingDraft({
      role,
      subRole,
      categoryIds: initialCategories,
    });

    // Same-named accessors + setters so the JSX below reads like plain
    // useState; every setter funnels into patch().
    const { currentStep, logo, nrcDocument, nrc, name, phone, dob } = draft;
    const { province, city, address, latitude, longitude, radius } = draft;
    const { email, agreeToTerms } = draft;
    const setCurrentStep = (v: number) => patch({ currentStep: v });
    const setLogo = (v: string) => patch({ logo: v });
    const setNrcDocument = (v: { front?: string; back?: string }) => patch({ nrcDocument: v });
    const setNrc = (v: string) => patch({ nrc: v });
    const setName = (v: string) => patch({ name: v });
    const setPhone = (v: string) => patch({ phone: v });
    const setDob = (v: string) => patch({ dob: v });
    const setProvince = (v: string) => patch({ province: v });
    const setCity = (v: string) => patch({ city: v });
    const setAddress = (v: string) => patch({ address: v });
    const setLatitude = (v: number | undefined) => patch({ latitude: v });
    const setLongitude = (v: number | undefined) => patch({ longitude: v });
    const setRadius = (v: number | undefined) => patch({ radius: v });
    const setEmail = (v: string) => patch({ email: v });
    const setAgreeToTerms = (v: boolean) => patch({ agreeToTerms: v });

    // Serialised NRC document for the network — empty string when neither
    // side has been captured (lets the backend skip the column write).
    const nrcDocumentPayload =
      nrcDocument.front || nrcDocument.back
        ? JSON.stringify({
            ...(nrcDocument.front ? { front: nrcDocument.front } : {}),
            ...(nrcDocument.back ? { back: nrcDocument.back } : {}),
          })
        : '';

    // Credentials + transient UI state — NOT persisted (memory only).
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [pwAnalysis, setPwAnalysis] = useState<PasswordAnalysis | null>(null);
    const [showResumeBanner, setShowResumeBanner] = useState(resumedFromStorage);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadStage, setLoadStage] = useState(0);

    const isCompany =
      subRole?.startsWith('COMPANY_') ||
      subRole?.includes('SELLER') ||
      role === 'SELLER' ||
      role === 'SUPPLIER' ||
      role === 'SERVICE_PROVIDER' ||
      role === 'ENTERTAINMENT' ||
      role === 'EVENTS';

    const steps = [
      { id: 1, label: 'Profile' },
      { id: 2, label: 'Location' },
      { id: 3, label: 'Credentials' },
      { id: 4, label: 'Review' },
      ...(isCompany ? [{ id: 5, label: 'Business' }] : []),
    ];

    const currentHero = useMemo(() => {
      try {
        return isCompany ? REGISTER_HERO.business : REGISTER_HERO.individual;
      } catch {
        return REGISTER_HERO.individual;
      }
    }, [isCompany]);

    const maxDOB = getMaxDOB();
    const phoneDigits = getPhoneDigits(phone);
    // Async email-availability check against the DB (credentials step). The
    // ref feeds the sync email validator; `emailChecking` drives the UI.
    const [emailChecking, setEmailChecking] = useState(false);
    const emailTakenRef = useRef(false);
    const emailCheckSeq = useRef(0);

    // ── Conversational field validation ──────────────────────────────
    // Validators return '' when valid. Fields stay silent until blur, then
    // switch to live "instant forgiveness"; the step buttons turn every
    // invalid field red and scroll to the first. (see useFieldValidation)
    const fieldValidators: Record<string, Validator> = {
      name: (v) =>
        !v.trim()
          ? 'Full name is required.'
          : v.trim().length < 3
            ? 'Enter your full name (min. 3 characters).'
            : '',
      nrc: (v) =>
        !v.trim()
          ? 'NRC number is required.'
          : !NRC_REGEX.test(v)
            ? 'Format: 123456/78/9 — six digits, two, one.'
            : '',
      phone: (v) => {
        const d = getPhoneDigits(v);
        return !d
          ? 'Phone number is required.'
          : d.length !== 9
            ? 'Zambian mobile must be 9 digits (e.g. +260 977 123 456).'
            : !/^[79]/.test(d)
              ? 'Mobile numbers start with 7 or 9 in Zambia.'
              : '';
      },
      dob: (v) => {
        if (role === 'LABOUR') return '';
        if (!v) return 'Date of birth is required.';
        const age = calculateAge(v);
        return age === null
          ? 'Enter a valid date.'
          : age < 18
            ? 'You must be 18 or older to register.'
            : '';
      },
      email: (v) => {
        if (!v.trim()) return 'Email address is required.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address.';
        if (emailTakenRef.current) return 'Email already registered. Please use a different email.';
        return '';
      },
      password: (v) => (analyzePassword(v).isStrong ? '' : 'Password isn’t strong enough yet.'),
      confirmPassword: (v) =>
        !v ? 'Please confirm your password.' : v !== password ? 'Passwords do not match.' : '',
    };
    const validation = useFieldValidation(fieldValidators);
    const nameV = validation.field('name', name);
    const nrcV = validation.field('nrc', nrc);
    const phoneV = validation.field('phone', phone);
    const dobV = validation.field('dob', dob);
    const emailV = validation.field('email', email);
    const passwordV = validation.field('password', password);
    const confirmV = validation.field('confirmPassword', confirmPassword);

    // Query the DB for email availability. Sequence-guarded so a later check
    // always wins — a fast typist never sees a stale "taken" result.
    const runEmailCheck = async (value: string): Promise<void> => {
      const v = value.trim();
      if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        emailTakenRef.current = false;
        return;
      }
      const seq = ++emailCheckSeq.current;
      setEmailChecking(true);
      try {
        const available = await authService.checkEmailAvailable(v);
        if (seq !== emailCheckSeq.current) return; // superseded by a newer check
        emailTakenRef.current = !available;
        validation.revalidate('email', v); // surface / clear the "taken" error live
      } catch {
        // Network hiccup — don't block; the final submit still guards duplicates.
        if (seq === emailCheckSeq.current) emailTakenRef.current = false;
      } finally {
        if (seq === emailCheckSeq.current) setEmailChecking(false);
      }
    };

    // Cross-field: re-check "confirm password" whenever the password changes,
    // so a matching pair clears (or a divergence flags) without re-blurring.
    useEffect(() => {
      validation.revalidate('confirmPassword', confirmPassword);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [password]);

    // Advance the loading-overlay stages while the final submit runs.
    useEffect(() => {
      if (!isLoading) {
        setLoadStage(0);
        return;
      }
      const id = window.setInterval(() => {
        setLoadStage((s) => Math.min(s + 1, LOAD_STAGES.length - 1));
      }, 1500);
      return () => window.clearInterval(id);
    }, [isLoading]);

    // Terms is a checkbox (not a text field) — tracked separately.
    const termsRef = useRef<HTMLDivElement | null>(null);
    const [termsError, setTermsError] = useState('');

    // Gate for the final "Complete Registration" button on the Review step.
    const passwordsMatch = password.length > 0 && password === confirmPassword;
    const canSubmitStep3 =
      !!email.trim() &&
      (pwAnalysis?.isStrong ?? false) &&
      passwordsMatch &&
      agreeToTerms &&
      !isLoading;

    // Validate Step 1: Personal Information
    const validateStep1 = (): boolean => {
      setError('');

      if (!name || name.trim().length < 3) {
        setError('Full name is required (min. 3 characters).');
        return false;
      }

      if (!nrc || !NRC_REGEX.test(nrc)) {
        setError('Enter a valid NRC in the format 123456/78/9.');
        return false;
      }

      if (phoneDigits.length !== 9) {
        setError('Phone number must be a valid 9-digit Zambian mobile.');
        return false;
      }

      if (!/^[79]/.test(phoneDigits)) {
        setError('Mobile numbers in Zambia start with 7 or 9 (e.g. 0977…).');
        return false;
      }

      if (role !== 'LABOUR') {
        if (!dob) {
          setError('Date of birth is required.');
          return false;
        }
        const age = calculateAge(dob);
        if (age === null || age < 18) {
          setError('You must be 18 or older to register.');
          return false;
        }
      }

      return true;
    };

    // Validate Step 3: Account Credentials
    const validateStep3 = (): boolean => {
      setError('');

      if (!email || email.trim() === '') {
        setError('Email address is required');
        return false;
      }

      if (!analyzePassword(password).isStrong) {
        setError('Please choose a stronger password — meet all the requirements shown.');
        return false;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }

      if (!agreeToTerms) {
        setError('Please agree to the Terms of Service');
        return false;
      }

      return true;
    };

    const handleStep1Next = (): void => {
      setError('');
      // "No hunting" guard — turn any invalid field red and scroll to the first.
      const ok = validation.validateAll([
        { name: 'name', value: name },
        { name: 'nrc', value: nrc },
        { name: 'phone', value: phone },
        ...(role !== 'LABOUR' ? [{ name: 'dob', value: dob }] : []),
      ]);
      if (ok) setCurrentStep(2);
    };

    const handleStep3Next = async (): Promise<void> => {
      setError('');
      // Ensure the email has been checked against the DB before advancing, so
      // a duplicate is caught here (credentials step), not at the final submit.
      if (email.trim() && !emailV.error) {
        await runEmailCheck(email);
      }
      // Validate email (now incl. availability), password strength, and
      // confirm in DOM order — turns each red and scrolls to the first.
      const ok = validation.validateAll([
        { name: 'email', value: email },
        { name: 'password', value: password },
        { name: 'confirmPassword', value: confirmPassword },
      ]);
      if (!ok) return;
      if (!agreeToTerms) {
        setTermsError('Please agree to the Terms of Service to continue.');
        termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      setTermsError('');
      setCurrentStep(4);
    };

    const handleLocationComplete = (data: any) => {
      setProvince(data.province);
      setCity(data.city);
      setAddress(data.address || '');
      setLatitude(data.latitude);
      setLongitude(data.longitude);
      setRadius(data.radius);
      setCurrentStep(3);
    };

    const handleRegister = async (): Promise<void> => {
      if (!validateStep3()) {
        return;
      }

      setIsLoading(true);
      try {
        if (user) {
          // User already logged in - just update their profile
          const updateData: any = {
            name,
            phone,
            dob,
            // Province + city are the matching scope. The composite
            // "City, Province" display string was redundant — no
            // profile entity carries a `location` column, so writing
            // it here triggered "Property location was not found in
            // SellerProfile" from TypeORM. Display surfaces compose
            // it on the fly from the two columns.
            province,
            city,
            area: address,
            latitude,
            longitude,
            radius,
            categoryIds: initialCategories,
            nrc,
            profilePicture: logo,
            ...(nrcDocumentPayload ? { nrcDocumentPath: nrcDocumentPayload } : {}),
          };

          await updateUser(updateData);
        } else {
          // Register new user — pass profile fields as extraProfile so they
          // land on the backend SYNCHRONOUSLY before the auto-login fires.
          // The previous separate updateUser() call hit a closure race
          // (updateUser captured user=null from the pre-register render and
          // threw "No user logged in"), silently dropping every new
          // registration's categories, subRole, location, area, lat/lng.
          const extraProfile: Record<string, any> = {
            province,
            city,
            area: address,
            // Composite "City, Province" string is derived for display
            // — not a column on any profile entity. Sending it here
            // 500'd updateProfile with "Property location was not
            // found in SellerProfile."
            latitude,
            longitude,
            radius,
            categoryIds: initialCategories,
            ...(subRole ? { subRole } : {}),
          };
          await register(
            email,
            password,
            name,
            phone,
            role,
            nrc,
            logo,
            dob,
            extraProfile,
            nrcDocumentPayload
          );
        }

        // Registration submitted — clear the saved draft so the next visit
        // to /register starts blank instead of resuming completed data.
        reset();

        if (isCompany) {
          // Company sellers / service-providers still have one more
          // onboarding step (CompanyDocuments). Stay logged in so the
          // junction-table writes there are authenticated; the final
          // submit on that page logs them out.
          navigate('/register/company-documents');
        } else {
          // Buyers (and non-company providers) finish onboarding here.
          // Per the product rule, end-of-onboarding logs the user out
          // so the very next session is a fully-hydrated re-login.
          try {
            await authService.logout();
          } catch (e) {
            // Local tokens are cleared by authService.logout's
            // catch-all anyway; carry on with the redirect.
          }
          navigate('/login?registered=1', { replace: true, state: { email } });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to register');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        {isLoading && <RegistrationLoadingOverlay stage={loadStage} />}
        <AuthSplitLayout
        title={
          currentStep === 1
            ? isCompany
              ? 'Account Holder'
              : 'Your Profile'
            : currentStep === 2
              ? 'Your Location'
              : currentStep === 3
                ? 'Account Credentials'
                : 'Review'
        }
        subtitle={
          <span className="text-[#1a1612]/60 font-medium">
            {currentStep === 1
              ? isCompany
                ? 'Verify the person behind the business'
                : 'Complete your identity verification'
              : currentStep === 2
                ? 'Set your service or delivery area'
                : currentStep === 3
                  ? 'Secure your account access'
                  : "Check everything's right before we finish"}
          </span>
        }
        onBack={() =>
          currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/role-selection')
        }
        stepper={{
          current: currentStep,
          total: steps.length,
          labels: steps.map((s) => s.label),
          // Free back-navigation: click any already-visited step to jump to it.
          onStepClick: (step: number) => {
            if (step < currentStep) setCurrentStep(step);
          },
        }}
        hero={currentHero}
      >
        <div className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium">
              {error}
            </div>
          )}

          {showResumeBanner && currentStep < 4 && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#C9973A]/30 bg-[#fdf6e9]/60">
              <p className="text-[12px] text-[#1a1612]/70 font-medium flex items-center gap-2 min-w-0">
                <RefreshCw className="w-3.5 h-3.5 text-[#C9973A] shrink-0" />
                <span className="truncate">Resumed your saved progress.</span>
              </p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setShowResumeBanner(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C9973A] hover:text-[#B08432]"
                >
                  Start over
                </button>
                <button
                  type="button"
                  onClick={() => setShowResumeBanner(false)}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1a1612]/45 hover:text-[#1a1612]/70"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 1: PERSONAL INFORMATION & IDENTITY */}
          {currentStep === 1 && (
            <RegistrationStepShell
              eyebrow="Step 01 / Identity"
              title="Identity Verification"
              description="Verify your NRC so buyers know they're trading with a real Zambian business."
              icon={<ShieldCheck className="w-8 h-8" />}
              tips={[
                {
                  icon: <ShieldCheck className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">Real-world anchor</span> — your NRC is the immutable identity behind your business.</>,
                },
                {
                  icon: <Hash className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">No duplicates</span> — one NRC, one account. Stops impersonation before it starts.</>,
                },
                {
                  icon: <Lock className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">ZRA-compliant</span> — verifies you against the official Zambian registry.</>,
                },
              ]}
            >
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Section 01 — Personal details */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                    Section 01
                  </p>
                  <div className="h-px flex-1 bg-[#e8e4dc]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50">
                    Personal Details
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div ref={nameV.ref}>
                    <FloatingInput
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        nameV.onChange(e.target.value);
                      }}
                      onBlur={nameV.onBlur}
                      required
                      icon={User}
                      autoComplete="name"
                      error={nameV.error}
                      valid={nameV.valid}
                    />
                  </div>
                  <div ref={nrcV.ref}>
                    <FloatingInput
                      label="NRC Number"
                      type="text"
                      value={nrc}
                      onChange={(e) => {
                        const f = formatNRC(e.target.value);
                        setNrc(f);
                        nrcV.onChange(f);
                      }}
                      onBlur={nrcV.onBlur}
                      required
                      icon={Hash}
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="123456/78/9"
                      error={nrcV.error}
                      valid={nrcV.valid}
                      hint={!nrcV.error && !nrcV.valid && nrc.length === 0 ? 'Format: 123456/78/9' : undefined}
                    />
                  </div>
                  <div ref={phoneV.ref}>
                    <FloatingInput
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        const f = formatPhone(e.target.value);
                        setPhone(f);
                        phoneV.onChange(f);
                      }}
                      onBlur={phoneV.onBlur}
                      required
                      icon={Phone}
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={17}
                      error={phoneV.error}
                      valid={phoneV.valid}
                      hint={
                        !phoneV.error && !phoneV.valid && phoneDigits.length === 0
                          ? '+260 9XX XXX XXX'
                          : undefined
                      }
                    />
                  </div>
                  {role !== 'LABOUR' && (
                    <div className="relative w-full" ref={dobV.ref}>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                          <Calendar
                            className={`h-5 w-5 ${
                              dobV.error ? 'text-rose-400' : dobV.valid ? 'text-emerald-500' : 'text-[#C9973A]/55'
                            }`}
                            strokeWidth={2}
                          />
                        </div>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => {
                            setDob(e.target.value);
                            dobV.onChange(e.target.value);
                          }}
                          onBlur={dobV.onBlur}
                          max={maxDOB}
                          aria-invalid={dobV.error ? true : undefined}
                          className={`block w-full pl-[52px] pr-4 h-[58px] bg-brand-white border rounded-2xl text-[15px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] outline-none transition-all duration-200 font-medium ${
                            dobV.error
                              ? 'border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                              : dobV.valid
                                ? 'border-emerald-300 focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                                : 'border-[#e8e0d0] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                          }`}
                        />
                        <label
                          className={`absolute top-0 left-[16px] -translate-y-1/2 px-1.5 bg-brand-white text-[12px] font-bold uppercase tracking-[0.08em] pointer-events-none ${
                            dobV.error ? 'text-rose-500' : dobV.valid ? 'text-emerald-600' : 'text-[#C9973A]'
                          }`}
                        >
                          Date of Birth
                        </label>
                      </div>
                      {dobV.error ? (
                        <p className="text-[11px] mt-1.5 ml-1 leading-snug flex items-center gap-1.5 text-rose-500 font-medium">
                          <span className="w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                          {dobV.error}
                        </p>
                      ) : (
                        <p className="text-[11px] mt-1.5 ml-1 leading-snug text-[#1a1612]/45">
                          You must be 18 or older to register.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Section 02 — Identity verification */}
              <section className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                    Section 02
                  </p>
                  <div className="h-px flex-1 bg-[#e8e4dc]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50">
                    Identity Verification
                  </p>
                </div>

                <CompactIdentityCapture value={logo} onCapture={setLogo} />

                <NrcDocumentCapture value={nrcDocument} onCapture={setNrcDocument} />

                <p className="text-[11px] text-[#1a1612]/45 flex items-center gap-2 ml-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C9973A]/60" strokeWidth={2} />
                  Selfie + NRC photo are optional but speed up admin verification.
                </p>
              </section>

              {/* Continue */}
              <Button
                type="button"
                onClick={handleStep1Next}
                disabled={isLoading}
                className="w-full h-[58px] mt-2 shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:opacity-50 disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
              >
                Continue to Location <span className="text-base leading-none">→</span>
              </Button>
            </div>
            </RegistrationStepShell>
          )}

          {/* SCREEN 2: LOCATION DETAILS */}
          {currentStep === 2 && (
            <RegistrationStepShell
              eyebrow="Step 02 / Where"
              title="Your Location"
              description="Set where buyers find your shop."
              icon={<MapPin className="w-8 h-8" />}
              advisory={
                <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#C9973A]/30 bg-gradient-to-br from-[#fdf6e9]/80 to-[#fdf6e9]/30">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#D5A547] to-[#C9973A] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#C9973A]/30">
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A] mb-1">
                      Important · Be at your shop
                    </p>
                    <p className="text-[13px] text-[#1a1612] font-medium leading-snug">
                      Capture GPS from <span className="font-bold">inside your shop</span> — this pin is permanent, and buyers use it to find you.
                    </p>
                  </div>
                </div>
              }
              tips={[
                {
                  icon: <Building2 className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">Local discovery</span> — shoppers find you by area first, exact pin second.</>,
                },
                {
                  icon: <Truck className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">Delivery pricing</span> stays accurate when buyers know exactly where you are.</>,
                },
                {
                  icon: <Navigation className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">GPS pin</span> gives the sharpest match — capture it from inside your shop.</>,
                },
                {
                  icon: <Lock className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">Address stays private</span> until a buyer accepts your quote.</>,
                },
              ]}
            >
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <LocationDetails
                  onComplete={handleLocationComplete}
                  isStandalone={false}
                  submitLabel="Continue to Credentials →"
                  showRadius={false}
                  embeddedInShell={true}
                  initialValue={{ province, city, address, latitude, longitude, radius }}
                />
              </div>
            </RegistrationStepShell>
          )}

          {/* SCREEN 3: ACCOUNT CREDENTIALS */}
          {currentStep === 3 && (
            <RegistrationStepShell
              eyebrow="Step 03 / Access"
              title="Account Credentials"
              description="Set the sign-in email and password you'll use to access this account."
              icon={<Lock className="w-8 h-8" />}
              tips={[
                {
                  icon: <Lock className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">End-to-end encrypted</span> — your password is hashed before it leaves the browser.</>,
                },
                {
                  icon: <RefreshCw className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">NRC-based recovery</span> — if you forget the password, your NRC anchors recovery.</>,
                },
                {
                  icon: <Smartphone className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">Multi-device sign-in</span> — sign in from desktop, mobile, or tablet with the same credentials.</>,
                },
              ]}
            >
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Section 01 — Sign-in email */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                    Section 01
                  </p>
                  <div className="h-px flex-1 bg-[#e8e4dc]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50">
                    Sign-in Email
                  </p>
                </div>

                <div ref={emailV.ref}>
                  <FloatingInput
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Editing clears the prior "taken" flag so it forgives live.
                      emailTakenRef.current = false;
                      emailV.onChange(e.target.value);
                    }}
                    onBlur={() => {
                      emailV.onBlur();
                      runEmailCheck(email);
                    }}
                    required
                    icon={Mail}
                    autoComplete="email"
                    error={emailV.error}
                    valid={emailV.valid && !emailChecking}
                    hint={emailChecking ? 'Checking availability…' : undefined}
                  />
                </div>
              </section>

              {/* Section 02 — Password */}
              <section className="space-y-5">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C9973A]">
                    Section 02
                  </p>
                  <div className="h-px flex-1 bg-[#e8e4dc]" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a1612]/50">
                    Password
                  </p>
                </div>

                <div className="space-y-4">
                  <div ref={passwordV.ref}>
                    <PasswordStrengthField
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      onAnalysis={setPwAnalysis}
                    />
                  </div>

                  <div ref={confirmV.ref}>
                  <FloatingInput
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      confirmV.onChange(e.target.value);
                    }}
                    onBlur={confirmV.onBlur}
                    required
                    icon={Lock}
                    autoComplete="new-password"
                    error={confirmV.error}
                    valid={confirmV.valid}
                    hint={confirmV.valid ? 'Passwords match' : undefined}
                    className={showConfirmPassword ? '' : 'tracking-widest'}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-[#C9973A]/70 hover:text-[#C9973A] transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        )}
                      </button>
                    }
                  />
                  </div>

                  <p className="text-[11px] text-[#1a1612]/45 flex items-center gap-2 ml-1">
                    <Key className="w-3.5 h-3.5 text-[#C9973A]/60" strokeWidth={2} />
                    Tip: paste straight from your password manager — it's fully supported.
                  </p>
                </div>
              </section>

              {/* Terms */}
              <div ref={termsRef}>
              <div
                className={`flex items-start gap-3 p-4 rounded-2xl border bg-brand-white transition-colors ${
                  termsError ? 'border-rose-300' : 'border-[#e8e4dc]'
                }`}
              >
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => {
                    setAgreeToTerms(e.target.checked);
                    if (e.target.checked) setTermsError('');
                  }}
                  className="sr-only"
                />
                <label
                  htmlFor="terms"
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 mt-0.5 ${
                    agreeToTerms
                      ? 'bg-[#C9973A] border-[#C9973A]'
                      : 'bg-white border-[#d6c8a8] hover:border-[#C9973A]'
                  }`}
                >
                  {agreeToTerms && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
                <label
                  htmlFor="terms"
                  className="text-[12px] text-[#1a1612]/65 leading-relaxed cursor-pointer flex-1"
                >
                  I agree to the{' '}
                  <a href="#" className="font-bold text-[#C9973A] hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="font-bold text-[#C9973A] hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
              {termsError && (
                <p className="text-[11px] mt-1.5 ml-1 leading-snug flex items-center gap-1.5 text-rose-500 font-medium">
                  <span className="w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                  {termsError}
                </p>
              )}
              </div>

              {/* Submit */}
              <Button
                type="button"
                onClick={handleStep3Next}
                disabled={isLoading}
                className="w-full h-[58px] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:opacity-50 disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
              >
                Review Your Details
                <span className="text-base leading-none">→</span>
              </Button>
            </div>
            </RegistrationStepShell>
          )}

          {/* SCREEN 4: REVIEW & CONFIRM */}
          {currentStep === 4 && (
            <RegistrationStepShell
              eyebrow="Step 04 / Review"
              title="Review details"
              description="Check everything's right — edit any section before we create your account."
              icon={<ClipboardCheck className="w-8 h-8" />}
              tips={[
                {
                  icon: <ShieldCheck className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">One last look</span> — confirm your details before submitting.</>,
                },
                {
                  icon: <Pencil className="w-4 h-4" />,
                  text: <><span className="font-bold text-[#1a1a2e]">Edit anything</span> — jump back to any step; your entries are saved.</>,
                },
              ]}
            >
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                <ReviewSection
                  title="Profile & Identity"
                  onEdit={() => setCurrentStep(1)}
                  rows={[
                    ['Full name', name],
                    ['NRC', nrc],
                    ['Phone', phone],
                    ...(role !== 'LABOUR' ? [['Date of birth', dob]] : []),
                    ['Selfie', logo ? 'Captured' : 'Not added'],
                    ['NRC photos', `${(nrcDocument.front ? 1 : 0) + (nrcDocument.back ? 1 : 0)} of 2`],
                  ]}
                />
                <ReviewSection
                  title="Location"
                  onEdit={() => setCurrentStep(2)}
                  rows={[
                    ['Province', province],
                    ['City', city],
                    ['Address', address],
                    [
                      'GPS pin',
                      latitude !== undefined && longitude !== undefined
                        ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                        : 'Not pinned',
                    ],
                  ]}
                />
                <ReviewSection
                  title="Credentials"
                  onEdit={() => setCurrentStep(3)}
                  rows={[
                    ['Email', email],
                    ['Password', password ? '••••••••' : 'Re-enter on Credentials'],
                  ]}
                />

                {!isLoading && !canSubmitStep3 && (
                  <p className="text-[12px] text-[#1a1612]/55 flex items-center gap-2 ml-1">
                    <Lock className="w-3.5 h-3.5 text-[#C9973A]/60" strokeWidth={2} />
                    Re-enter your password on the Credentials step to complete.
                  </p>
                )}

                {/* Inline error right by the button — the top-of-form error
                    banner is off-screen when the user has scrolled down to
                    submit, so failures must surface here too. */}
                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">!</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading || !canSubmitStep3}
                  className="w-full h-[58px] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:opacity-50 disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                      Creating your account…
                    </>
                  ) : isCompany ? (
                    <>
                      Complete · Continue to Documents
                      <span className="text-base leading-none">→</span>
                    </>
                  ) : (
                    <>
                      Complete Registration
                      <span className="text-base leading-none">→</span>
                    </>
                  )}
                </Button>
              </div>
            </RegistrationStepShell>
          )}
        </div>

        {currentStep === 3 && (
          <div className="mt-8 text-center">
            <p className="text-[13px] font-medium text-[#1a1612]/55">
              Already a member?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-[#C9973A] font-bold hover:underline ml-1"
              >
                Sign In
              </button>
            </p>
          </div>
        )}
      </AuthSplitLayout>
      </>
    );
  } catch (err) {
    console.error('Register component error:', err);
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="p-8 rounded-lg bg-red-50 border border-red-200 max-w-md">
          <h2 className="text-lg font-bold text-red-800 mb-3">Oops! Something went wrong</h2>
          <p className="text-red-700 text-sm mb-4">
            We encountered an error while loading the registration page. Please try refreshing the
            page or contact support.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
