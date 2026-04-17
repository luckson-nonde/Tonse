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
      await login(email, password);
      navigate('/');
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
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium mb-6">
            {error}
          </div>
        )}
        
        {/* Email/Phone Field */}
        <div className="mb-6">
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
        <div className="mb-8">
          <FloatingInput
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={Key}
            className={showPassword ? "" : "tracking-widest"}
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
          />
          <div className="flex justify-end -mt-5 pr-2">
            <button 
              type="button" 
              className="text-[11px] font-sans font-bold text-[#C9973A] hover:text-[#B08432] transition-colors uppercase tracking-wider"
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mb-8">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-14 shadow-[0_8px_20px_rgba(201,151,58,0.25)] disabled:opacity-50 text-base font-sans font-bold text-brand-dark bg-[#C9973A] hover:bg-[#B08432] transition-all active:scale-[0.98] rounded-xl uppercase tracking-widest"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </div>
      </form>

      <div className="text-center">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-[#e8e0d0]/60"></div>
          <span className="text-[10px] font-bold text-[#1a1612]/30 uppercase tracking-[0.2em]">Or continue with</span>
          <div className="h-px flex-1 bg-[#e8e0d0]/60"></div>
        </div>

        <div className="flex justify-center mb-10">
          <a 
            href="#"
            className="flex items-center gap-3 text-[#1a1612] hover:text-[#C9973A] transition-all text-[15px] font-sans font-bold group"
          >
            <div className="w-10 h-10 bg-white border border-[#e8e0d0] rounded-full flex items-center justify-center shadow-sm group-hover:border-[#C9973A] transition-colors">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" className="w-5 h-5" />
            </div>
            <span>Google Account</span>
          </a>
        </div>

        <p className="text-[14px] font-sans font-medium text-[#1a1612] pb-12">
          New to the gold standard?{' '}
          <button 
          type="button"
          onClick={() => navigate('/role-selection')} 
          className="text-[#C9973A] font-bold hover:underline ml-1"
        >
          Create Account
        </button>
      </p>
    </div>
  </AuthSplitLayout>
);
}
