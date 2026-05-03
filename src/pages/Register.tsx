import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import FloatingInput from '../components/FloatingInput';
import { SubRole, EntityType } from '../types';
import { getRegistrationSchema } from '../services/userSchemas';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { HeroContent } from '../types';
import CompactIdentityCapture from '../components/CompactIdentityCapture';
import NrcDocumentCapture from '../components/NrcDocumentCapture';
import LocationDetails from '../components/LocationDetails';

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

    // Multi-step registration state
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Personal Information & Identity
    const [logo, setLogo] = useState('');
    // NRC document is captured side-by-side: front and back as separate
    // base64 data URLs, serialised to a JSON string when sent to the
    // backend so a single nrcDocumentPath text column holds both.
    const [nrcDocument, setNrcDocument] = useState<{ front?: string; back?: string }>({});
    const [nrc, setNrc] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');

    // Serialised form for the network — empty string when neither side
    // has been captured (lets the backend skip the column write
    // entirely instead of storing an empty JSON envelope).
    const nrcDocumentPayload =
      nrcDocument.front || nrcDocument.back
        ? JSON.stringify({
            ...(nrcDocument.front ? { front: nrcDocument.front } : {}),
            ...(nrcDocument.back ? { back: nrcDocument.back } : {}),
          })
        : '';

    // Step 2: Location State
    const [province, setProvince] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState<number | undefined>();
    const [longitude, setLongitude] = useState<number | undefined>();
    const [radius, setRadius] = useState<number | undefined>();

    // Step 3: Account Credentials
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
      ...(isCompany ? [{ id: 4, label: 'Business' }] : []),
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
    const nameError =
      name.length > 0 && name.trim().length < 3 ? 'Enter your full name (min. 3 characters).' : '';
    const nrcError =
      nrc.length > 0 && !NRC_REGEX.test(nrc) ? 'Format: 123456/78/9 — six digits, two, one.' : '';
    const phoneError =
      phoneDigits.length > 0 && phoneDigits.length !== 9
        ? 'Zambian mobile must be 9 digits (e.g. +260 977 123 456).'
        : phoneDigits.length === 9 && !/^[79]/.test(phoneDigits)
          ? 'Mobile numbers start with 7 or 9 in Zambia.'
          : '';
    const dobAge = calculateAge(dob);
    const dobError =
      dob && dobAge !== null && dobAge < 18 ? 'You must be 18 or older to register.' : '';

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

      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters long');
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
      if (validateStep1()) {
        setCurrentStep(2);
      }
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
            country: 'Zambia',
            location: city && province ? `${city}, ${province}` : '',
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
            location: city && province ? `${city}, ${province}` : '',
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
          navigate('/login', { replace: true });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to register');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <AuthSplitLayout
        title={
          currentStep === 1
            ? isCompany
              ? 'Account Holder'
              : 'Your Profile'
            : currentStep === 2
              ? 'Your Location'
              : 'Account Credentials'
        }
        subtitle={
          <span className="text-[#1a1612]/60 font-medium">
            {currentStep === 1
              ? isCompany
                ? 'Verify the person behind the business'
                : 'Complete your identity verification'
              : currentStep === 2
                ? 'Set your service or delivery area'
                : 'Secure your account access'}
          </span>
        }
        onBack={() =>
          currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/role-selection')
        }
        stepper={{
          current: currentStep,
          total: steps.length,
          labels: steps.map((s) => s.label),
        }}
        hero={currentHero}
      >
        <div className="space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* SCREEN 1: PERSONAL INFORMATION & IDENTITY */}
          {currentStep === 1 && (
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
                  <FloatingInput
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    icon={User}
                    autoComplete="name"
                    error={nameError}
                  />
                  <FloatingInput
                    label="NRC Number"
                    type="text"
                    value={nrc}
                    onChange={(e) => setNrc(formatNRC(e.target.value))}
                    required
                    icon={Hash}
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="123456/78/9"
                    error={nrcError}
                    hint={!nrcError && nrc.length === 0 ? 'Format: 123456/78/9' : undefined}
                  />
                  <FloatingInput
                    label="Phone Number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    required
                    icon={Phone}
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={17}
                    error={phoneError}
                    hint={
                      !phoneError && phoneDigits.length === 0
                        ? '+260 9XX XXX XXX'
                        : undefined
                    }
                  />
                  {role !== 'LABOUR' && (
                    <div className="relative w-full">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                          <Calendar
                            className={`h-5 w-5 ${
                              dobError ? 'text-rose-400' : 'text-[#C9973A]/55'
                            }`}
                            strokeWidth={2}
                          />
                        </div>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          max={maxDOB}
                          aria-invalid={dobError ? true : undefined}
                          className={`block w-full pl-[52px] pr-4 h-[58px] bg-brand-white border rounded-2xl text-[15px] text-brand-dark shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)] outline-none transition-all duration-200 font-medium ${
                            dobError
                              ? 'border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                              : 'border-[#e8e0d0] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                          }`}
                        />
                        <label
                          className={`absolute top-0 left-[16px] -translate-y-1/2 px-1.5 bg-brand-white text-[12px] font-bold uppercase tracking-[0.08em] pointer-events-none ${
                            dobError ? 'text-rose-500' : 'text-[#C9973A]'
                          }`}
                        >
                          Date of Birth
                        </label>
                      </div>
                      {(dobError || (!dob && true)) && (
                        <p
                          className={`text-[11px] mt-1.5 ml-1 leading-snug flex items-center gap-1.5 ${
                            dobError ? 'text-rose-500 font-medium' : 'text-[#1a1612]/45'
                          }`}
                        >
                          {dobError ? (
                            <>
                              <span className="inline-block w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center">!</span>
                              {dobError}
                            </>
                          ) : (
                            <>You must be 18 or older to register.</>
                          )}
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
          )}

          {/* SCREEN 2: LOCATION DETAILS */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <LocationDetails
                onComplete={handleLocationComplete}
                isStandalone={false}
                submitLabel="Continue to Credentials →"
                showRadius={role !== 'BUYER'}
              />
            </div>
          )}

          {/* SCREEN 3: ACCOUNT CREDENTIALS */}
          {currentStep === 3 && (
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

                <FloatingInput
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  icon={Mail}
                  autoComplete="email"
                />
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
                  <FloatingInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    icon={Lock}
                    autoComplete="new-password"
                    className={showPassword ? '' : 'tracking-widest'}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#C9973A]/70 hover:text-[#C9973A] transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
                        )}
                      </button>
                    }
                  />

                  <FloatingInput
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    icon={Lock}
                    autoComplete="new-password"
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

                  <p className="text-[11px] text-[#1a1612]/45 flex items-center gap-2 ml-1">
                    <Key className="w-3.5 h-3.5 text-[#C9973A]/60" strokeWidth={2} />
                    Minimum 8 characters · use a mix of letters, numbers, and symbols.
                  </p>
                </div>
              </section>

              {/* Terms */}
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#e8e4dc] bg-brand-white">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
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

              {/* Submit */}
              <Button
                type="button"
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full h-[58px] shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:opacity-50 disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em] flex justify-center items-center gap-2"
              >
                {isLoading
                  ? 'Creating Account…'
                  : isCompany
                    ? (
                      <>
                        Next · Business Documents
                        <span className="text-base leading-none">→</span>
                      </>
                    )
                    : (
                      <>
                        Complete Registration
                        <span className="text-base leading-none">→</span>
                      </>
                    )}
              </Button>
            </div>
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
