import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Key,
  Eye,
  EyeOff,
  User as UserIcon,
  Phone,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import AuthSplitLayout from '../components/AuthSplitLayout';
import FloatingInput from '../components/FloatingInput';
import Logo from '../components/Logo';
import CompactIdentityCapture from '../components/CompactIdentityCapture';
import SocialLinksEditor, { cleanSocialLinks } from '../components/promoter/SocialLinksEditor';
import DocumentUpload from '../components/promoter/DocumentUpload';
import { useAuth, type User, type Role } from '../AuthContext';
import { promoterService, type SocialLink } from '../services/api/promoterService';

/**
 * Hidden promoter (artist) signup — /promote. Two steps:
 *
 *   1. Account — name, email, password, invite key (ACCESS: proves
 *      possession of the NDA packet).
 *   2. Identity — bio, the social platforms they run, an ID document and a
 *      LIVE selfie (IDENTITY: proves it's really the artist registering,
 *      since invite keys travel hand-to-hand). Admin reviews these before
 *      the account earns the verified badge.
 *
 * Deliberately UNLISTED: no nav item, no link from any public page.
 */
export default function PromoterSignup() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([{ platform: 'Instagram', url: '' }]);
  const [selfie, setSelfie] = useState('');
  const [idDocument, setIdDocument] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const continueToIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const links = cleanSocialLinks(socialLinks);
    if (!links.length) {
      setError('Add at least one social platform you run — it’s how we confirm your reach.');
      return;
    }
    if (!idDocument) {
      setError('Upload an ID document (NRC, passport or licence).');
      return;
    }
    if (!selfie) {
      setError('Take a live selfie so we can match your face to the document.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await promoterService.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        inviteKey: inviteKey.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(bio.trim() ? { bio: bio.trim() } : {}),
        socialLinks: links,
        selfie,
        idDocument,
      });
      loginWithTokens(res.accessToken, res.refreshToken, {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role as Role,
      } as User);
      navigate('/promoter', { replace: true });
    } catch (err: any) {
      const raw = String(err?.message ?? '');
      if (/invite/i.test(raw) || /forbidden/i.test(raw) || /not open/i.test(raw)) {
        setError('That invite key is not valid. Check the key you were given and try again.');
        setStep(1);
      } else if (/already registered|conflict/i.test(raw)) {
        setError('This email is already registered. Sign in instead, or use a different email.');
        setStep(1);
      } else if (/failed to fetch|network/i.test(raw)) {
        setError("Couldn't reach the server. Check your connection and try again.");
      } else {
        setError(raw || 'Signup failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthSplitLayout hideHeader>
      <div className="w-full max-w-[480px] mx-auto">
        <div className="hidden lg:flex items-center mb-10">
          <Logo className="text-2xl" />
        </div>

        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          Invite-only artist programme · Step {step} of 2
        </p>
        <h2 className="text-[28px] font-serif font-semibold text-slate-900 tracking-tight leading-none">
          {step === 1 ? 'Become a promoter' : 'Prove it’s you'}
        </h2>
        <p className="text-[14px] text-slate-500 mt-2 mb-6">
          {step === 1
            ? 'Get your personal referral link, track every person you bring to Nyuwe, and earn equity shares as they trade.'
            : 'Invite keys get shared around — your platforms, ID and a live selfie confirm the account really belongs to you.'}
        </p>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl font-medium mb-6">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form className="w-full" onSubmit={continueToIdentity}>
            <div className="mb-5">
              <FloatingInput
                label="Full Name / Stage Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                icon={UserIcon}
              />
            </div>

            <div className="mb-5">
              <FloatingInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                icon={Mail}
              />
            </div>

            <div className="mb-5">
              <FloatingInput
                label="Phone (optional)"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={Phone}
              />
            </div>

            <div className="mb-5">
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

            <div className="mb-5">
              <FloatingInput
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                icon={Key}
                className={showPassword ? '' : 'tracking-widest'}
              />
            </div>

            <div className="mb-6">
              <FloatingInput
                label="Invite Key"
                type="text"
                value={inviteKey}
                onChange={(e) => setInviteKey(e.target.value)}
                required
                icon={KeyRound}
              />
              <p className="mt-2 text-[12px] text-slate-400 font-medium">
                The key from your Nyuwe agreement. This programme is invite-only.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#C9973A] hover:bg-[#b8852f] rounded-full font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] transition-all active:scale-95"
            >
              Continue to identity check
            </button>

            <p className="mt-5 text-center text-[13px] text-slate-500">
              Already a promoter?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-semibold text-[#C9973A] hover:underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </form>
        ) : (
          <form className="w-full" onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                Artist bio (optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Who you are, what you perform, where your audience is…"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-200 bg-white text-[13px] font-medium text-[#1a1a2e] focus:outline-none focus:border-[#C9973A]/60 resize-none"
              />
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                Platforms you run <span className="text-rose-400">*</span>
              </label>
              <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                ID document <span className="text-rose-400">*</span>
              </label>
              <DocumentUpload value={idDocument} onChange={setIdDocument} />
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                Live selfie <span className="text-rose-400">*</span>
              </label>
              <CompactIdentityCapture value={selfie} onCapture={setSelfie} />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="shrink-0 flex items-center gap-2 px-5 py-3.5 rounded-full border border-slate-200 text-[14px] font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3.5 bg-[#C9973A] hover:bg-[#b8852f] disabled:opacity-60 disabled:cursor-not-allowed rounded-full font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] transition-all active:scale-95"
              >
                {isLoading ? 'Creating your account…' : 'Create promoter account'}
              </button>
            </div>

            <p className="mt-4 text-[11px] text-slate-400 font-medium leading-relaxed">
              Your ID and selfie are reviewed by the Nyuwe team only, to confirm your identity —
              they never appear publicly.
            </p>
          </form>
        )}
      </div>
    </AuthSplitLayout>
  );
}
