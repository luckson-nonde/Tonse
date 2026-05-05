import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Key, Eye, EyeOff } from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import FloatingInput from '../components/FloatingInput';
import Logo from '../components/Logo';
import { HeroContent } from '../types';

// Hero data: bullets are the real compliance signals (previously
// exiled to the bottom-corner footer as 11px gray throwaway). Pulling
// them up lets the hero do the work of building first-time confidence
// while collapsing the duplicated trust system that had two places
// saying the same thing in two different treatments.
const LOGIN_HERO: HeroContent = {
  title: 'Welcome back to the gold standard.',
  image:
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920&h=1080',
  bullets: ['ZRA-compliant invoicing', 'Escrow on every order', 'ISO 27001 certified'],
};

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
    <AuthSplitLayout hero={LOGIN_HERO} paneTone="white" hideHeader trustBand>
      {/* Single sensible-width column. AuthSplitLayout's outer
          container scales out to 1040px at xl+ for multi-step
          registration forms that need 2-column inner layouts; Login's
          form is single-column and would stretch absurdly without
          this constraint. 480px is wider than the Stripe / Mercury
          / Linear baseline (~360-400px) — the extra ~80px gives the
          fields more presence in the white pane without pushing them
          out of "form" territory into "dashboard" territory. */}
      <div className="w-full max-w-[480px] mx-auto">

      {/* Right-pane minimal header.
          Hero owns the brand statement ("Welcome back to the gold
          standard"); right pane owns the task. The 28px serif "Sign in"
          replaces the prior 40px serif "Welcome Back" that was
          duplicating the hero one row over — premium B2B never
          repeats the welcome. */}
      <div className="hidden lg:flex items-center mb-10">
        <Logo className="text-2xl" />
      </div>
      <h2 className="text-[28px] font-serif font-semibold text-slate-900 tracking-tight leading-none">
        Sign in
      </h2>
      <p className="text-[14px] text-slate-500 mt-2 mb-8">
        Welcome back to your trade portal.
      </p>

      <form className="w-full" onSubmit={handleSubmit}>
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium mb-6">
            {error}
          </div>
        )}

        <div className="mb-6">
          <FloatingInput
            label="Email or Phone Number"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={Mail}
            tone="white"
          />
        </div>

        <div className="mb-2">
          <FloatingInput
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={Key}
            tone="white"
            className={showPassword ? '' : 'tracking-widest'}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
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

        {/* Forgot password — sentence case, slate-500. The tracked
            uppercase 11px gold treatment read as a button label, not a
            tertiary link. */}
        <div className="flex justify-end mb-5">
          <button
            type="button"
            className="text-[13px] font-sans font-medium text-slate-500 hover:text-slate-700 hover:underline underline-offset-2"
          >
            Forgot password?
          </button>
        </div>

        {/* Trust band — pulls the compliance trio up from the
            bottom-corner footer to the moment of credentialing.
            Mercury / Stripe Atlas use this exact pattern: trust signals
            visually adjacent to the primary CTA. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-[12px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#C9973A]" />
            ZRA-compliant
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#C9973A]" />
            Escrow-protected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#C9973A]" />
            ISO 27001
          </span>
        </div>

        {/* Primary CTA. Solid `#C9973A`, sentence case, no gradient,
            no glow shadow, no uppercase tracking. Stripe / Mercury /
            Linear all ship auth CTAs at this tier of restraint. */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-[52px] mb-7 text-[15px] font-sans font-semibold text-white bg-[#C9973A] hover:bg-[#B08432] transition-colors active:scale-[0.99] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Divider — universal premium pattern: thin slate hairline,
          floating sentence-case "or". The floating "or" needs
          `bg-white` to mask the hairline behind it; if the right pane
          ever regresses to cream, this single span becomes the visible
          mismatch. */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[13px] text-slate-400">or</span>
        </div>
      </div>

      <button
        type="button"
        className="w-full h-[48px] flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl text-[14px] font-sans font-semibold text-slate-700 hover:bg-slate-50 transition-colors mb-7"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
          alt=""
          aria-hidden="true"
          className="w-[18px] h-[18px]"
        />
        <span>Continue with Google</span>
      </button>

      <p className="text-center text-[14px] font-sans text-slate-500">
        New to Tonse?{' '}
        <button
          type="button"
          onClick={() => navigate('/role-selection')}
          className="text-[#C9973A] font-semibold hover:underline underline-offset-2"
        >
          Create an account
        </button>
      </p>

      </div>
    </AuthSplitLayout>
  );
}
