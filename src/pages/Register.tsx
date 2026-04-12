import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type Role } from '../AuthContext';
import { Key, Eye, EyeOff } from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import { SubRole, EntityType } from '../types';
import { getRegistrationSchema } from '../services/userSchemas';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { HeroContent } from '../types';

const REGISTER_HERO: Record<string, HeroContent> = {
  individual: {
    title: "Join the Luxury Community.",
    image: "https://images.unsplash.com/photo-1556740734-7f95834d0ff9?auto=format&fit=crop&q=80&w=1920&h=1080",
    bullets: ["Personalized Experience", "Exclusive Access", "Seamless Trading"]
  },
  business: {
    title: "Professional Network Registration.",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1920&h=1080",
    bullets: ["B2B Opportunities", "Verified Business Status", "Enterprise Tools"]
  }
};

export default function Register() {
  const { register, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'BUYER';
  const subRole = searchParams.get('subRole') as SubRole;
  const categoriesParam = searchParams.get('categories');
  const initialCategories = categoriesParam ? categoriesParam.split(',') : [];

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const isCompany = subRole?.startsWith('COMPANY_') || subRole?.includes('SELLER');

  const registrationSchema = useMemo(() => {
    return getRegistrationSchema(role, subRole);
  }, [role, subRole]);

  const initialData = useMemo(() => ({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  }), [user]);

  const currentHero = useMemo(() => {
    return isCompany ? REGISTER_HERO.business : REGISTER_HERO.individual;
  }, [isCompany]);

  const handleRegister = async (data: Record<string, any>) => {
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setIsLoading(true);
    try {
      const entityType: EntityType = isCompany ? 'BUSINESS' : 'INDIVIDUAL';
      
      const userData: any = {
        ...data,
        role: role as Role,
        subRole,
        entityType,
        password,
        nrc: '', // Default empty, can be updated later
        location: '', // Default empty
        categories: initialCategories,
      };

      if (user) {
        await updateUser(userData);
      } else {
        await register(userData);
      }
      
      if (isCompany) {
        navigate('/register/company-documents');
      } else if (role === 'BUYER') {
        navigate('/buyer');
      } else {
        navigate('/seller/location');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout 
      title={isCompany ? "Business Registration" : "Create Account"} 
      subtitle={
        <span className="text-[#1a1612]/60">
          {isCompany 
            ? "Register your company on the TONSE professional network."
            : "Join the TONSE luxury trade community."
          }
        </span>
      }
      onBack={() => navigate('/role-selection')}
      stepper={isCompany ? { current: 1, total: 2, labels: ['Account Details', 'Documents'] } : undefined}
      hero={currentHero}
    >
      <div className="space-y-5">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium">
            {error}
          </div>
        )}

        <DynamicProfileForm
          schema={registrationSchema}
          initialData={initialData}
          onSubmit={handleRegister}
          isSubmitting={isLoading}
        >
          <div className="space-y-5 mt-5">
            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors" strokeWidth={2} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-[32px] text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-[#C9973A]/40 hover:text-[#C9973A] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Confirm Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors" strokeWidth={2} />
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-[32px] text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest" 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-[#C9973A]/40 hover:text-[#C9973A] transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-4 pt-2">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  id="terms" 
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="sr-only"
                />
                <label 
                  htmlFor="terms" 
                  className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                    agreeToTerms 
                      ? 'bg-[#C9973A] border-[#C9973A]' 
                      : 'bg-[#fdfaf6] border-[#d49b35]'
                  }`}
                >
                  {agreeToTerms && (
                    <svg className="w-3.5 h-3.5 text-[#1a1612]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </label>
              </div>
              <label htmlFor="terms" className="text-[13px] text-[#1a1612]/60 leading-relaxed cursor-pointer">
                I agree to the <a href="#" className="font-bold text-[#C9973A] hover:underline">Terms of Service</a> and <a href="#" className="font-bold text-[#C9973A] hover:underline">Privacy Policy</a>.
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-5 px-4 shadow-md disabled:opacity-50 text-[18px] font-serif font-normal rounded-[32px]"
              >
                {isLoading 
                  ? 'Creating Account...' 
                  : isCompany 
                    ? 'Next: Documents →' 
                    : role === 'BUYER' 
                      ? 'Complete Registration' 
                      : 'Initialize Business Profile'
                }
              </Button>
            </div>
          </div>
        </DynamicProfileForm>
      </div>

      <div className="mt-10 text-center">
        <p className="text-[13px] font-medium text-[#1a1612]/40">
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
    </AuthSplitLayout>
  );
}
