import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Key, Eye, EyeOff, Check } from 'lucide-react';
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

  const filteredSubCategories = LABOUR_CATEGORIES.filter(c => c.category === formData.selectedGroup);

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
      await register({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'LABOUR',
        labourCategory: formData.selectedGroup,
        labourSubTypes: formData.selectedSubTypes,
        entityType: 'INDIVIDUAL',
        verificationStatus: 'ACTIVE',
        ...profileData
      } as any);
      navigate('/labour');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case 1: return "Select Category";
      case 2: return "Select Specialty";
      case 3: return "Personal Details";
      case 4: return "Skills & Availability";
      default: return "Labour Registration";
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 1: return "Choose your primary labour category";
      case 2: return "Select your specific skills";
      case 3: return "Provide your personal details";
      case 4: return "Set your availability and rates";
      default: return "Complete your registration";
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

      <div className="relative overflow-hidden min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-3">
                {LABOUR_CATEGORY_GROUPS.map(group => {
                  const isSelected = formData.selectedGroup === group.id;
                  return (
                    <button 
                      key={group.id} 
                      onClick={() => setFormData({...formData, selectedGroup: group.id, selectedSubTypes: []})} 
                      className={`group p-5 rounded-[32px] border text-left transition-all flex items-center gap-4 ${
                        isSelected 
                          ? 'border-brand-yellow bg-brand-yellow/5 shadow-md' 
                          : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-[15px] font-bold transition-colors ${isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/80'}`}>
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
              <Button onClick={handleNext} disabled={!formData.selectedGroup} className="w-full py-5 rounded-[32px]">Next Step →</Button>
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
              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto p-1">
                {filteredSubCategories.map(sub => {
                  const isSelected = formData.selectedSubTypes.includes(sub.id);
                  return (
                    <button 
                      key={sub.id} 
                      onClick={() => {
                        const newSubTypes = isSelected 
                          ? formData.selectedSubTypes.filter(id => id !== sub.id)
                          : [...formData.selectedSubTypes, sub.id];
                        setFormData({...formData, selectedSubTypes: newSubTypes});
                      }} 
                      className={`group p-5 rounded-[32px] border text-left transition-all flex items-center gap-4 ${
                        isSelected 
                          ? 'border-brand-yellow bg-brand-yellow/5 shadow-md' 
                          : 'border-[#e8e4dc] bg-white hover:border-brand-yellow/30'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-[15px] font-bold transition-colors ${isSelected ? 'text-[#1a1612]' : 'text-[#1a1612]/80'}`}>
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
              <Button onClick={handleNext} disabled={formData.selectedSubTypes.length === 0} className="w-full py-5 rounded-[32px]">Next Step →</Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-5"
            >
              <input type="text" placeholder="Full Name" className="w-full p-4 rounded-[32px] border border-[#e8e4dc] bg-[#fcfcfc]" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              <input type="text" placeholder="Phone" className="w-full p-4 rounded-[32px] border border-[#e8e4dc] bg-[#fcfcfc]" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input type="email" placeholder="Email" className="w-full p-4 rounded-[32px] border border-[#e8e4dc] bg-[#fcfcfc]" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Password" className="w-full p-4 rounded-[32px] border border-[#e8e4dc] bg-[#fcfcfc]" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-[#C9973A]">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" className="w-full p-4 rounded-[32px] border border-[#e8e4dc] bg-[#fcfcfc]" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-4 text-[#C9973A]">{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div>
              
              <div className="flex items-start gap-4 pt-2">
                <input type="checkbox" id="terms" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} className="mt-1" />
                <label htmlFor="terms" className="text-[13px] text-[#1a1612]/60">I agree to the Terms of Service.</label>
              </div>

              <Button onClick={handleNext} className="w-full py-5 rounded-[32px]">Next Step →</Button>
            </motion.div>
          )}

          {step === 4 && (() => {
            const selectedSubTypeId = formData.selectedSubTypes[0];
            const selectedCategory = LABOUR_CATEGORIES.find(c => c.id === selectedSubTypeId);
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
                  initialData={{}}
                  onSubmit={handleSubmit}
                  isSubmitting={isLoading}
                >
                  <div className="flex gap-4 mt-8">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleBack}
                      className="flex-1 py-5 rounded-[32px]"
                      disabled={isLoading}
                    >
                      ← Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 py-5 rounded-[32px]"
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
