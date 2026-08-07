import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { authService } from '../services/auth/authService';

export default function ForcePasswordChange() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Routes through POST /users/:id/password — backend bcrypt-hashes
      // and clears mustChangePassword. The previous updateUser({password,
      // mustChangePassword}) path 400'd because UpdateUserDto whitelists
      // neither field (passwords shouldn't flow through the generic
      // update — they need hashing).
      if (!user?.id) {
        setError('Please sign in again.');
        return;
      }
      await authService.changePassword(user.id, newPassword);
      // Refresh /auth/me so mustChangePassword flips to false on the
      // client; otherwise the route guard would bounce the user back
      // to this page on the next navigation.
      await updateUser({});
      navigate('/');
    } catch (err) {
      setError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="noiseFilter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.6"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-4xl shadow-xl border border-slate-100 relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-[#fdf8f0] rounded-2xl flex items-center justify-center text-[#C9973A] mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif mb-2">Update Password</h1>
          <p className="text-slate-500 text-sm">
            Your account was created with a temporary password. For security, please set a new
            password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-2xl font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:ring-2 focus:ring-[#C9973A] focus:border-transparent transition-all outline-none"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:ring-2 focus:ring-[#C9973A] focus:border-transparent transition-all outline-none"
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Choose a strong password that you haven't used elsewhere. This will be your permanent
              password for Nyuwe.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-dark text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Set New Password'}
            {!isLoading && (
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>
      </motion.div>

      <p className="mt-8 text-slate-400 text-xs font-medium tracking-wide uppercase">
        Nyuwe v4 • Secure Access
      </p>
    </div>
  );
}
