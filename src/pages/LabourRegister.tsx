import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Key, Eye, EyeOff, Check, User, Phone, Mail } from 'lucide-react';
import FloatingInput from '../components/FloatingInput';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import { LABOUR_CATEGORIES, LABOUR_CATEGORY_GROUPS } from '../services/labourCategories';
import { getLabourProfileSchema } from '../services/labourSchemaRegistry';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { motion, AnimatePresence } from 'motion/react';

export default function LabourRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    selectedGroup: '',
    selectedSubTypes: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredSubCategories = LABOUR_CATEGORIES.filter(
    (c) => c.category === formData.selectedGroup
  );

  const handleNext = () => {
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
      if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
        setError('Please fill in all required fields');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
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
    try {
      // Store profile data in localStorage for profile completion after login
      // Use 'pendingProfile' key so AuthContext picks it up automatically
      const labourProfileData = {
        labourCategory: formData.selectedGroup,
        labourSubTypes: formData.selectedSubTypes,
        ...profileData,
        // Ensure name is synced
        name: profileData.name || formData.fullName,
      };
      localStorage.setItem('pendingProfile', JSON.stringify(labourProfileData));

      // Register with identity fields, plus the labour-specific profile as
      // extraProfile so it lands on the backend before the auto-login (was
      // previously only stored in localStorage/pendingProfile, leaving the
      // DB columns empty).
      const extraProfile: Record<string, any> = {
        labourCategory: formData.selectedGroup,
        labourSubTypes: formData.selectedSubTypes,
        // Mirror any profile fields collected by DynamicProfileForm into
        // metadata so they survive a fresh login.
        ...profileData,
      };
      await register(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        'LABOUR',
        profileData.nrc || '',
        profileData.profilePicture || '',
        '',
        extraProfile
      );

      navigate('/labour');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setIsLoading(false);
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
        return 'Set your availability and rates';
      default:
        return 'Complete your registration';
    }
  };

  return (
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

      <div className="relative overflow-hidden min-h-96">
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
                      onClick={() =>
                        setFormData({ ...formData, selectedGroup: group.id, selectedSubTypes: [] })
                      }
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
              <Button
                onClick={handleNext}
                disabled={!formData.selectedGroup}
                className="w-full py-5 rounded-4xl"
              >
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
                        setFormData({ ...formData, selectedSubTypes: newSubTypes });
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
                        <p className="text-[13px] text-[#1a1612]/50 leading-snug mt-0.5">
                          {sub.description}
                        </p>
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
              <div className="md:col-span-2">
                <FloatingInput
                  label="Full Name"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  icon={User}
                  required
                />
              </div>
              <FloatingInput
                label="Phone Number"
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                icon={Phone}
                required
              />
              <FloatingInput
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                icon={Mail}
                required
              />

              <FloatingInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                icon={Key}
                className={showPassword ? '' : 'tracking-widest'}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#C9973A] hover:text-[#C9973A]/80 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                }
                required
              />
              <FloatingInput
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                icon={Key}
                className={showConfirmPassword ? '' : 'tracking-widest'}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#C9973A] hover:text-[#C9973A]/80 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={2} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                }
                required
              />

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
                >
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
                      <Button
                        type="submit"
                        className="flex-1 py-5 rounded-4xl"
                        disabled={isLoading}
                      >
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
  );
}
