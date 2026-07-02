import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authService } from '../services/auth/authService';
import { Key, Eye, EyeOff, Check, User, Phone, Mail } from 'lucide-react';
import FloatingInput from '../components/FloatingInput';
import PasswordStrengthField, { analyzePassword, type PasswordAnalysis } from '../components/PasswordStrengthField';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import RegistrationLoadingOverlay from '../components/RegistrationLoadingOverlay';
import ReviewSection from '../components/ReviewSection';
import { useFieldValidation, type Validator } from '../hooks/useFieldValidation';
import { LABOUR_CATEGORIES, LABOUR_CATEGORY_GROUPS } from '../services/labourCategories';
import { getLabourProfileSchema } from '../services/labourSchemaRegistry';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { motion, AnimatePresence } from 'motion/react';

// localStorage draft so the wizard survives a refresh (parity with the buyer
// flow's useOnboardingDraft). Password is NEVER persisted.
const DRAFT_KEY = 'tonse:labourDraft';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface LabourDraft {
  step: number;
  fullName: string;
  phone: string;
  email: string;
  selectedGroup: string;
  selectedSubTypes: string[];
  agreeToTerms: boolean;
}

function loadLabourDraft(): Partial<LabourDraft> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const env = JSON.parse(raw);
    if (!env || typeof env.savedAt !== 'number' || Date.now() - env.savedAt > DRAFT_TTL_MS) {
      window.localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return env.data ?? null;
  } catch {
    return null;
  }
}

export default function LabourRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Hydrate once from any saved draft.
  const initial = useRef<Partial<LabourDraft> | null>(null);
  if (initial.current === null) initial.current = loadLabourDraft() ?? {};
  const seed = initial.current;

  const [step, setStep] = useState<number>(seed.step ?? 1);
  const [formData, setFormData] = useState({
    fullName: seed.fullName ?? '',
    phone: seed.phone ?? '',
    email: seed.email ?? '',
    password: '',
    confirmPassword: '',
    selectedGroup: seed.selectedGroup ?? '',
    selectedSubTypes: (seed.selectedSubTypes ?? []) as string[],
  });
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(seed.agreeToTerms ?? false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwAnalysis, setPwAnalysis] = useState<PasswordAnalysis | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const patch = (p: Partial<typeof formData>) => setFormData((f) => ({ ...f, ...p }));

  // Debounced persistence of a whitelist (never the password).
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const data: LabourDraft = {
          step,
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          selectedGroup: formData.selectedGroup,
          selectedSubTypes: formData.selectedSubTypes,
          agreeToTerms,
        };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        /* quota — keep going, draft just won't refresh-proof */
      }
    }, 350);
    return () => window.clearTimeout(id);
  }, [step, formData, agreeToTerms]);

  // Live email-availability check against the DB (parity with Register).
  const [emailChecking, setEmailChecking] = useState(false);
  const emailTakenRef = useRef(false);
  const emailCheckSeq = useRef(0);

  // Conversational validation for the personal-details step.
  const fieldValidators: Record<string, Validator> = {
    fullName: (v) =>
      !v.trim()
        ? 'Full name is required.'
        : v.trim().length < 3
          ? 'Enter your full name (min. 3 characters).'
          : '',
    phone: (v) => {
      const digits = v.replace(/\D/g, '');
      return !digits ? 'Phone number is required.' : digits.length < 9 ? 'Enter a valid phone number.' : '';
    },
    email: (v) => {
      if (!v.trim()) return 'Email address is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address.';
      if (emailTakenRef.current) return 'Email already registered. Please use a different email.';
      return '';
    },
    password: (v) => (analyzePassword(v).isStrong ? '' : 'Password isn’t strong enough yet.'),
    confirmPassword: (v) =>
      !v ? 'Please confirm your password.' : v !== formData.password ? 'Passwords do not match.' : '',
  };
  const validation = useFieldValidation(fieldValidators);
  const nameV = validation.field('fullName', formData.fullName);
  const phoneV = validation.field('phone', formData.phone);
  const emailV = validation.field('email', formData.email);
  const passwordV = validation.field('password', formData.password);
  const confirmV = validation.field('confirmPassword', formData.confirmPassword);

  // Re-check confirm when password changes (instant forgiveness, cross-field).
  useEffect(() => {
    validation.revalidate('confirmPassword', formData.confirmPassword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.password]);

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
      if (seq !== emailCheckSeq.current) return;
      emailTakenRef.current = !available;
      validation.revalidate('email', v);
    } catch {
      if (seq === emailCheckSeq.current) emailTakenRef.current = false;
    } finally {
      if (seq === emailCheckSeq.current) setEmailChecking(false);
    }
  };

  const filteredSubCategories = LABOUR_CATEGORIES.filter((c) => c.category === formData.selectedGroup);
  const groupLabel = LABOUR_CATEGORY_GROUPS.find((g) => g.id === formData.selectedGroup)?.label || '—';
  const specialtyNames = LABOUR_CATEGORIES.filter((c) => formData.selectedSubTypes.includes(c.id)).map(
    (c) => c.label,
  );

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      if (!formData.selectedGroup) {
        setError('Please select a category group');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.selectedSubTypes.length === 0) {
        setError('Please select at least one specialty');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Check email against the DB before advancing, then run the "no hunting"
      // guard — red every invalid field and scroll to the first.
      if (formData.email.trim() && !emailV.error) await runEmailCheck(formData.email);
      const ok = validation.validateAll([
        { name: 'fullName', value: formData.fullName },
        { name: 'phone', value: formData.phone },
        { name: 'email', value: formData.email },
        { name: 'password', value: formData.password },
        { name: 'confirmPassword', value: formData.confirmPassword },
      ]);
      if (!ok) return;
      if (!agreeToTerms) {
        setError('Please agree to the Terms of Service');
        return;
      }
      setStep(4);
    }
  };

  const handleBack = () => {
    setError('');
    if (step === 1) {
      navigate('/role-selection');
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async (profileData: Record<string, any>) => {
    setIsLoading(true);
    setError('');
    try {
      // Store profile data so AuthContext picks it up (pendingProfile) — kept.
      const labourProfileData = {
        labourCategory: formData.selectedGroup,
        labourSubTypes: formData.selectedSubTypes,
        ...profileData,
        name: profileData.name || formData.fullName,
      };
      localStorage.setItem('pendingProfile', JSON.stringify(labourProfileData));

      // LABOUR registers as SERVICE_PROVIDER with labour categories carried
      // in categories[]; labourCategory/labourSubTypes persist as typed cols.
      const labourCats = [
        formData.selectedGroup ? `Skilled Labour - ${formData.selectedGroup}` : null,
        ...(formData.selectedSubTypes || []),
      ].filter(Boolean) as string[];

      const extraProfile: Record<string, any> = {
        labourCategory: formData.selectedGroup,
        labourSubTypes: formData.selectedSubTypes,
        categories: labourCats,
        ...profileData,
      };

      const registeredEmail = formData.email;
      await register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        'SERVICE_PROVIDER',
        profileData.nrc || '',
        profileData.profilePicture || '',
        '',
        extraProfile,
      );

      // Parity with buyer/company: clear the draft, log out, and land on
      // Login with the email pre-filled (clean, fully-hydrated re-login).
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      try {
        await authService.logout();
      } catch {
        /* tokens cleared locally by logout's fallthrough */
      }
      navigate('/login?registered=1', { replace: true, state: { email: registeredEmail } });
    } catch (e: any) {
      setError(e.message || 'Registration failed');
      setIsLoading(false); // keep the overlay up through success; only drop it on error
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1:
        return 'Select Category';
      case 2:
        return 'Select Specialty';
      case 3:
        return 'Personal Details';
      case 4:
        return 'Skills & Availability';
      default:
        return 'Labour Registration';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 1:
        return 'Choose your primary labour category';
      case 2:
        return 'Select your specific skills';
      case 3:
        return 'Provide your personal details';
      case 4:
        return 'Review your choices and set your skills';
      default:
        return 'Complete your registration';
    }
  };

  return (
    <>
      <RegistrationLoadingOverlay open={isLoading} />
      <AuthSplitLayout
        title={getTitle()}
        subtitle={getSubtitle()}
        onBack={handleBack}
        stepper={{ current: step, total: 4, labels: ['CATEGORY', 'SPECIALTY', 'DETAILS', 'SKILLS'] }}
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium mb-6">
            {error}
          </div>
        )}

        <div className="relative overflow-hidden min-h-[240px] lg:min-h-96">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {LABOUR_CATEGORY_GROUPS.map((group) => {
                    const isSelected = formData.selectedGroup === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => patch({ selectedGroup: group.id, selectedSubTypes: [] })}
                        className={`group p-5 rounded-4xl border text-left transition-all flex items-center gap-4 ${
                          isSelected
                            ? 'border-brand-yellow bg-brand-yellow/5 shadow-md'
                            : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-[15px] font-bold transition-colors ${isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/80'}`}
                          >
                            {group.label}
                          </h3>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-brand-yellow flex items-center justify-center">
                            <Check className="w-4 h-4 text-[#1a1612]" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Button onClick={handleNext} disabled={!formData.selectedGroup} className="w-full py-5 rounded-4xl">
                  Next Step →
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
                  {filteredSubCategories.map((sub) => {
                    const isSelected = formData.selectedSubTypes.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          const newSubTypes = isSelected
                            ? formData.selectedSubTypes.filter((id) => id !== sub.id)
                            : [...formData.selectedSubTypes, sub.id];
                          patch({ selectedSubTypes: newSubTypes });
                        }}
                        className={`group p-5 rounded-4xl border text-left transition-all flex items-center gap-4 ${
                          isSelected
                            ? 'border-brand-yellow bg-brand-yellow/5 shadow-md'
                            : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <h3
                            className={`text-[15px] font-bold transition-colors ${isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/80'}`}
                          >
                            {sub.label}
                          </h3>
                          <p className="text-[13px] text-[#1a1612]/50 leading-snug mt-0.5">{sub.description}</p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-brand-yellow flex items-center justify-center">
                            <Check className="w-4 h-4 text-[#1a1612]" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Button
                  onClick={handleNext}
                  disabled={formData.selectedSubTypes.length === 0}
                  className="w-full py-5 rounded-4xl"
                >
                  Next Step →
                </Button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5"
              >
                <div className="md:col-span-2" ref={nameV.ref}>
                  <FloatingInput
                    label="Full Name"
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      patch({ fullName: e.target.value });
                      nameV.onChange(e.target.value);
                    }}
                    onBlur={nameV.onBlur}
                    icon={User}
                    required
                    error={nameV.error}
                    valid={nameV.valid}
                  />
                </div>
                <div ref={phoneV.ref}>
                  <FloatingInput
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      patch({ phone: e.target.value });
                      phoneV.onChange(e.target.value);
                    }}
                    onBlur={phoneV.onBlur}
                    icon={Phone}
                    required
                    error={phoneV.error}
                    valid={phoneV.valid}
                  />
                </div>
                <div ref={emailV.ref}>
                  <FloatingInput
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      patch({ email: e.target.value });
                      emailTakenRef.current = false;
                      emailV.onChange(e.target.value);
                    }}
                    onBlur={() => {
                      emailV.onBlur();
                      runEmailCheck(formData.email);
                    }}
                    icon={Mail}
                    required
                    error={emailV.error}
                    valid={emailV.valid && !emailChecking}
                    hint={emailChecking ? 'Checking availability…' : undefined}
                  />
                </div>

                <div className="md:col-span-2" ref={passwordV.ref}>
                  <PasswordStrengthField
                    label="Password"
                    value={formData.password}
                    onChange={(v) => {
                      patch({ password: v });
                      passwordV.onChange(v);
                    }}
                    onAnalysis={setPwAnalysis}
                  />
                  {/* PasswordStrengthField's meter only renders once the user
                      types, so an empty-but-required password needs an explicit
                      error line for the submit guard to point at. */}
                  {passwordV.error && (
                    <p className="text-[11px] mt-1.5 ml-1 leading-snug flex items-center gap-1.5 text-rose-500 font-medium">
                      <span className="w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] font-black flex items-center justify-center shrink-0">!</span>
                      {passwordV.error}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2" ref={confirmV.ref}>
                  <FloatingInput
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      patch({ confirmPassword: e.target.value });
                      confirmV.onChange(e.target.value);
                    }}
                    onBlur={confirmV.onBlur}
                    icon={Key}
                    required
                    error={confirmV.error}
                    valid={confirmV.valid}
                    hint={confirmV.valid ? 'Passwords match' : undefined}
                    className={showConfirmPassword ? '' : 'tracking-widest'}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-[#C9973A] hover:text-[#C9973A]/80 transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" strokeWidth={2} />
                        ) : (
                          <Eye className="h-4 w-4" strokeWidth={2} />
                        )}
                      </button>
                    }
                  />
                </div>

                <div className="flex items-start gap-4 pt-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-[13px] text-[#1a1612]/60">
                    I agree to the Terms of Service.
                  </label>
                </div>

                <div className="md:col-span-2 mt-2">
                  <Button
                    onClick={handleNext}
                    className="w-full h-14 shadow-[0_8px_20px_rgba(201,151,58,0.25)] text-base font-sans font-bold text-brand-dark bg-[#C9973A] hover:bg-[#B08432] transition-all rounded-lg uppercase tracking-widest"
                  >
                    Next Step →
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 &&
              (() => {
                const selectedSubTypeId = formData.selectedSubTypes[0];
                const selectedCategory = LABOUR_CATEGORIES.find((c) => c.id === selectedSubTypeId);
                const profileSchemaKey = selectedCategory?.profileSchemaKey ?? 'generic';
                const profileSchema = getLabourProfileSchema(profileSchemaKey);

                if (!profileSchema) {
                  return <div>Loading skills form...</div>;
                }

                return (
                  <motion.div
                    key="step4"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="space-y-5"
                  >
                    {/* Review — confirm the earlier steps; tap any card to edit. */}
                    <div className="space-y-2.5">
                      <ReviewSection
                        title="Category"
                        onEdit={() => setStep(1)}
                        rows={[['Group', groupLabel]]}
                      />
                      <ReviewSection
                        title="Specialties"
                        onEdit={() => setStep(2)}
                        rows={[['Selected', specialtyNames.slice(0, 3).join(', ') + (specialtyNames.length > 3 ? ` +${specialtyNames.length - 3}` : '')]]}
                      />
                      <ReviewSection
                        title="Your details"
                        onEdit={() => setStep(3)}
                        rows={[
                          ['Name', formData.fullName],
                          ['Phone', formData.phone],
                          ['Email', formData.email],
                        ]}
                      />
                    </div>

                    <DynamicProfileForm
                      schema={profileSchema as any}
                      initialData={{
                        name: formData.fullName,
                        phone: formData.phone,
                        location: '',
                      }}
                      onSubmit={handleSubmit}
                      isSubmitting={isLoading}
                    >
                      <div className="flex gap-4 mt-8">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          className="flex-1 py-5 rounded-4xl"
                          disabled={isLoading}
                        >
                          ← Back
                        </Button>
                        <Button type="submit" className="flex-1 py-5 rounded-4xl" disabled={isLoading}>
                          {isLoading ? 'Creating Profile...' : 'Complete Registration'}
                        </Button>
                      </div>
                    </DynamicProfileForm>
                  </motion.div>
                );
              })()}
          </AnimatePresence>
        </div>
      </AuthSplitLayout>
    </>
  );
}
