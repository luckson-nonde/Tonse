import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Key, Eye, EyeOff } from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import Button from '../components/Button';
import { HeroContent } from '../types';

const LOGIN_HERO: HeroContent = {
  title: "Welcome Back to the Gold Standard.",
  image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920&h=1080",
  bullets: ["Secure Access", "Real-time Updates", "Global Trade Network"]
};

import FloatingInput from '../components/FloatingInput';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const loggedIn = await login(email, password);
      // Auto-route team members to their leads view. Staff with
      // assignedArchetype have the variant locked server-side, so the
      // landing tab is unambiguous; full staff (parentProviderId set
      // but no archetype assigned) also benefit from landing on
      // /provider where the schema-merged dashboard renders.
      if (loggedIn?.parentProviderId) {
        navigate('/provider?tab=leads');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout 
      title="Welcome Back"
      subtitle="Sign in to access your Trade Portal."
      hero={LOGIN_HERO}
    >
      <form
        className="w-full"
        onSubmit={handleSubmit}
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl font-medium mb-6">
            {error}
          </div>
        )}

        {/* Email/Phone Field */}
        <div className="mb-4">
          <FloatingInput
            label="Email or Phone Number"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={Mail}
          />
        </div>

        {/* Password Field */}
        <div className="mb-2">
          <FloatingInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={Key}
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
        </div>

        <div className="flex justify-end mb-7">
          <button
            type="button"
            className="text-[11px] font-sans font-bold text-[#C9973A] hover:text-[#B08432] transition-colors uppercase tracking-[0.12em]"
          >
            Forgot Password?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-[58px] mb-7 shadow-[0_12px_28px_-8px_rgba(201,151,58,0.4)] disabled:opacity-50 disabled:shadow-none text-[13px] font-sans font-bold text-white bg-gradient-to-b from-[#D5A547] to-[#C9973A] hover:from-[#C9973A] hover:to-[#B08432] transition-all active:scale-[0.98] rounded-2xl uppercase tracking-[0.22em]"
        >
          {isLoading ? 'Authenticating…' : 'Sign In'}
        </Button>
      </form>

      <div className="flex items-center gap-4 mb-5">
        <div className="h-px flex-1 bg-[#e8e0d0]/70" />
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-[#C9973A]/40" />
          <span className="text-[10px] font-bold text-[#1a1612]/40 uppercase tracking-[0.22em]">
            Or sign in with
          </span>
          <span className="w-1 h-1 rounded-full bg-[#C9973A]/40" />
        </div>
        <div className="h-px flex-1 bg-[#e8e0d0]/70" />
      </div>

      <button
        type="button"
        className="w-full h-[54px] flex items-center justify-center gap-3 bg-white border border-[#e8e0d0] rounded-2xl text-[14px] font-sans font-semibold text-[#1a1612] hover:border-[#C9973A]/50 hover:shadow-[0_8px_20px_-12px_rgba(201,151,58,0.4)] transition-all mb-7"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
          alt=""
          aria-hidden="true"
          className="w-[18px] h-[18px]"
        />
        <span>Continue with Google</span>
      </button>

      <p className="text-center text-[13px] font-sans font-medium text-[#1a1612]/70">
        New to the gold standard?{' '}
        <button
          type="button"
          onClick={() => navigate('/role-selection')}
          className="text-[#C9973A] font-bold hover:underline ml-0.5"
        >
          Create Account
        </button>
      </p>
  </AuthSplitLayout>
);
}
