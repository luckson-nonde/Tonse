import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Key, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import Button from '../components/Button';

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
    <AuthLayout 
      title={
        <div className="flex flex-col items-center">
          <span>Welcome Back</span>
        </div>
      }
      subtitle={
        <span className="text-[#1a1612]/60">
          Sign in to access your <span className="text-[#C9973A] font-bold">Trade Portal</span>.
        </span>
      }
    >
      <form 
        className="space-y-6" 
        onSubmit={handleSubmit}
      >
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-[13px] rounded-xl font-medium">
            {error}
          </div>
        )}
        
        {/* Email/Phone Field */}
        <div>
          <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em] mb-3 ml-1">Email or Phone Number</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors" strokeWidth={2} />
            </div>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com or 097..." 
              className="block w-full pl-14 pr-5 py-4 bg-[#fcfcfc] border border-[#e8e0d0] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20 font-medium" 
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex justify-between items-center mb-3 ml-1">
            <label className="block text-[11px] font-bold text-[#1a1612]/40 uppercase tracking-[0.2em]">Password</label>
            <button type="button" className="text-[10px] font-bold text-[#C9973A] uppercase tracking-widest hover:underline">Forgot?</button>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Key className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors" strokeWidth={2} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••" 
              className="block w-full pl-14 pr-14 py-4 bg-[#fcfcfc] border border-[#e8e0d0] rounded-2xl text-[15px] text-[#1a1612] focus:ring-4 focus:ring-[#C9973A]/10 focus:border-[#C9973A] outline-none transition-all placeholder:text-[#1a1612]/20 tracking-widest" 
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

        {/* Submit Button */}
        <div className="!mt-8">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 px-4 shadow-md disabled:opacity-50 text-[18px] font-sans font-medium bg-[#C9973A] hover:bg-[#B08432] transition-colors"
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </div>
      </form>

      <div className="mt-10 text-center">
        <p className="text-[13px] font-medium text-[#1a1612]/40">
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
  </AuthLayout>
);
}
