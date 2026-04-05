import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, type Role } from '../AuthContext';
import { Mail, Key, Phone, Eye, EyeOff, User } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'BUYER';
  const initialCategory = searchParams.get('category');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await register({
        role: role as Role,
        name,
        email,
        phone,
        password,
        nrc: '', // Default empty, can be updated later
        location: '', // Default empty
        categories: initialCategory ? [initialCategory] : [],
      });
      
      if (role === 'BUYER') {
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
    <AuthLayout 
      title="Create Account" 
      align="left"
      subtitle={
        <span className="text-[#1a1612]/60 whitespace-nowrap">
          Join the <span className="text-brand-yellow font-bold">TONSE</span> luxury trade community.
        </span>
      }
    >
      <form className="space-y-5" onSubmit={handleRegister}>
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Username Field */}
        <div>
          <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Username</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
            </div>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter username" 
              required
              className="block w-full pl-14 pr-5 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 font-medium" 
            />
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Email Address</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              required
              className="block w-full pl-14 pr-5 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 font-medium" 
            />
          </div>
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Phone Number</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
            </div>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number" 
              required
              className="block w-full pl-14 pr-5 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 font-medium" 
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Password</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Key className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              required
              className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-brand-yellow/40 hover:text-brand-yellow transition-colors"
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
              <Key className="h-4 w-4 text-brand-yellow/40 group-focus-within:text-brand-yellow transition-colors" strokeWidth={2} />
            </div>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              required
              className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e4dc] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-brand-yellow/10 focus:border-brand-yellow outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest" 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-brand-yellow/40 hover:text-brand-yellow transition-colors"
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
                  ? 'bg-brand-yellow border-brand-yellow' 
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
            I agree to the <a href="#" className="font-bold text-brand-yellow hover:underline">Terms of Service</a> and <a href="#" className="font-bold text-brand-yellow hover:underline">Privacy Policy</a>.
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 px-4 shadow-md disabled:opacity-50 text-[18px] font-serif font-normal"
          >
            {isLoading ? 'Creating Account...' : 'Initialize Membership'}
          </Button>
        </div>
      </form>

      <div className="mt-10 text-center">
        <p className="text-[13px] font-medium text-[#1a1612]/40">
          Already a member?{' '}
          <button 
            type="button"
            onClick={() => navigate('/login')} 
            className="text-brand-yellow font-bold hover:underline ml-1"
          >
            Sign In
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
