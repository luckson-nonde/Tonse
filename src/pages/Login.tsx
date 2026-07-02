import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Mail, Key, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import FloatingInput from '../components/FloatingInput';
import Logo from '../components/Logo';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  // Registration redirects here with ?registered=1 after logging the user
  // out, so we can confirm the account was created (otherwise the silent
  // logout → login bounce reads as "nothing happened").
  const justRegistered = searchParams.get('registered') === '1';
  // ...and hands the just-created email via router state (kept out of the URL)
  // so the user only needs to type their password.
  const prefillEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(prefillEmail);
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
      const raw = err?.message || '';
      if (/failed to fetch|network|networkerror/i.test(raw)) {
        setError("Couldn't reach the server. Check your connection and try again.");
      } else if (/credential|password|invalid|unauthor|not found|no user/i.test(raw)) {
        setError("That email and password don't match. Double-check both, or reset your password.");
      } else {
        setError(raw || 'Sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout paneTone="white" hideHeader trustBand>
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
      <p className="text-[14px] text-slate-500 mt-2 mb-6">
        Welcome back to your trade portal.
      </p>

      {justRegistered && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm rounded-xl font-medium mb-6 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={2} />
          <span>Your account was created successfully — sign in to continue.</span>
        </div>
      )}

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
            autoFocus={!!prefillEmail}
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
        <div className="hidden lg:flex flex-wrap items-center gap-x-5 gap-y-2 mb-5 text-[12px] text-slate-500">
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
          className="w-full h-[52px] mb-6 text-[15px] font-sans font-semibold text-white bg-[#C9973A] hover:bg-[#B08432] transition-colors active:scale-[0.99] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Divider — universal premium pattern: thin slate hairline,
          floating sentence-case "or". The floating "or" needs
          `bg-white` to mask the hairline behind it; if the right pane
          ever regresses to cream, this single span becomes the visible
          mismatch. */}
      <div className="hidden lg:block relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-[13px] text-slate-400">or</span>
        </div>
      </div>

      <button
        type="button"
        className="w-full h-[48px] flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl text-[14px] font-sans font-semibold text-slate-700 hover:bg-slate-50 transition-colors mt-6 lg:mt-0 mb-7"
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
