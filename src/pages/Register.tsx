import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type Role } from '../AuthContext';
import { Key, Eye, EyeOff, User, Phone, Calendar, MapPin, Hash, ShieldCheck, Navigation, Globe, Map, Building2 } from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import { SubRole, EntityType } from '../types';
import { getRegistrationSchema } from '../services/userSchemas';
import DynamicProfileForm from '../components/DynamicProfileForm';
import { HeroContent } from '../types';
import CameraCapture from '../components/CameraCapture';
import LocationDetails from '../components/LocationDetails';

const REGISTER_HERO: Record<string, HeroContent> = {
  individual: {
    title: 'Join the Luxury Community.',
    image:
      'https://images.unsplash.com/photo-1556740734-7f95834d0ff9?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: ['Personalized Experience', 'Exclusive Access', 'Seamless Trading'],
  },
  business: {
    title: 'Professional Network Registration.',
    image:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1920&h=1080',
    bullets: ['B2B Opportunities', 'Verified Business Status', 'Enterprise Tools'],
  },
};

export default function Register() {
  try {
    const { register, user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role') || 'BUYER';
    const subRole = (searchParams.get('subRole') as SubRole) || undefined;
    const categoriesParam = searchParams.get('categories');
    const initialCategories = categoriesParam ? categoriesParam.split(',') : [];

    // Multi-step registration state
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Personal Information & Identity
    const [logo, setLogo] = useState('');
    const [nrc, setNrc] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    
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

    const isCompany = subRole?.startsWith('COMPANY_') || subRole?.includes('SELLER') || role === 'SELLER' || role === 'SUPPLIER' || role === 'SERVICE_PROVIDER' || role === 'ENTERTAINMENT' || role === 'EVENTS';

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

    // Validate Step 1: Personal Information
    const validateStep1 = (): boolean => {
      setError('');

      if (!logo || logo.trim() === '') {
        setError('Profile picture is required for account verification');
        return false;
      }

      if (!nrc || nrc.trim() === '') {
        setError('NRC number is required for account verification');
        return false;
      }

      if (!name || name.trim() === '') {
        setError('Full name is required');
        return false;
      }

      if (!phone || phone.trim() === '') {
        setError('Phone number is required');
        return false;
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
            categories: initialCategories,
            nrc,
            profilePicture: logo,
          };

          await updateUser(updateData);
        } else {
          // Register new user with identity verification fields
          await register(email, password, name, phone, role, nrc, logo);
          
          // After register, update with location info
          const updateData: any = {
            province,
            city,
            area: address,
            latitude,
            longitude,
            radius,
          };
          try {
            await updateUser(updateData);
          } catch (e) {
            console.warn('Failed to update location after register:', e);
          }
        }

        if (isCompany) {
          navigate('/register/company-documents');
        } else {
          navigate(role === 'BUYER' ? '/buyer' : '/provider');
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
              ? 'Business Information'
              : 'Your Profile'
            : currentStep === 2
              ? 'Your Location'
              : 'Account Credentials'
        }
        subtitle={
          <span className="text-[#1a1612]/60 font-medium">
            {currentStep === 1
              ? isCompany
                ? 'Verify your business identity'
                : 'Complete your identity verification'
              : currentStep === 2
                ? 'Set your service or delivery area'
                : 'Secure your account access'}
          </span>
        }
        onBack={() => (currentStep > 1 ? setCurrentStep(currentStep - 1) : navigate('/role-selection'))}
        stepper={{
          current: currentStep,
          total: steps.length,
          labels: steps.map(s => s.label)
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
              {/* Identity Capture */}
              <div className="bg-white p-2 rounded-4xl border border-[#e8e4dc]/60 shadow-sm overflow-hidden">
                <CameraCapture 
                  label="Live Identity Photo *" 
                  onCapture={(img) => setLogo(img)}
                  initialImage={logo}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Identity Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black text-[#1a1612]/40 uppercase tracking-[0.2em] ml-1">
                    <Hash size={12} className="text-[#C9973A]" />
                    NRC Number *
                  </label>
                  <input
                    type="text"
                    value={nrc}
                    onChange={(e) => setNrc(e.target.value)}
                    placeholder="000000/00/0"
                    className="block w-full px-6 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20"
                  />
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black text-[#1a1612]/40 uppercase tracking-[0.2em] ml-1">
                    <User size={12} className="text-[#C9973A]" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="block w-full px-6 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20"
                  />
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[11px] font-black text-[#1a1612]/40 uppercase tracking-[0.2em] ml-1">
                    <Phone size={12} className="text-[#C9973A]" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+260..."
                    className="block w-full px-6 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20"
                  />
                </div>

                {/* DOB Field */}
                {role !== 'LABOUR' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[11px] font-black text-[#1a1612]/40 uppercase tracking-[0.2em] ml-1">
                      <Calendar size={12} className="text-[#C9973A]" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="block w-full px-6 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Next Button */}
              <div className="pt-4">
                <Button
                  type="button"
                  onClick={handleStep1Next}
                  disabled={isLoading}
                  className="w-full py-5 px-4 shadow-xl shadow-[#C9973A]/10 disabled:opacity-50 text-lg font-serif font-black rounded-full flex items-center justify-center gap-3"
                >
                  Continue to Location
                  <ShieldCheck size={20} />
                </Button>
              </div>
            </div>
          )}

          {/* SCREEN 2: LOCATION DETAILS */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="mb-6">
                <h3 className="text-[13px] font-bold text-[#1a1612]/60 uppercase tracking-widest mb-1">
                  Location Setup
                </h3>
                <p className="text-[11px] text-[#1a1612]/40">Set your service or delivery area</p>
              </div>

              <LocationDetails 
                onComplete={handleLocationComplete}
                isStandalone={false}
                submitLabel="Continue to Credentials →"
                showRadius={role !== 'BUYER'} // Only show radius for providers/labour
              />
            </div>
          )}

          {/* SCREEN 3: ACCOUNT CREDENTIALS */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Email Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full px-5 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-4xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20"
                  />
                </div>
              </div>

              {/* Password Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">
                    Password *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Key
                        className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors"
                        strokeWidth={2}
                      />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-4xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest"
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

                <div>
                  <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">
                    Confirm Password *
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Key
                        className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors"
                        strokeWidth={2}
                      />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-4xl text-base text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest"
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
              </div>

              {/* Terms Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative flex items-center pt-1">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="terms"
                      className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                        agreeToTerms
                          ? 'bg-[#C9973A] border-[#C9973A]'
                          : 'bg-[#fdfaf6] border-[#d49b35]'
                      }`}
                    >
                      {agreeToTerms && (
                        <svg
                          className="w-3.5 h-3.5 text-[#1a1612]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={4}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </label>
                  </div>
                  <label
                    htmlFor="terms"
                    className="text-[13px] text-[#1a1612]/60 leading-relaxed cursor-pointer"
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
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <Button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full py-5 px-4 shadow-md disabled:opacity-50 text-lg font-serif font-normal rounded-4xl"
                >
                  {isLoading
                    ? 'Creating Account...'
                    : isCompany
                      ? 'Next: Documents →'
                      : 'Complete Registration'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {currentStep === 3 && (
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
