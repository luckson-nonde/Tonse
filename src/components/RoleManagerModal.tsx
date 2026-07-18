import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Store, Wrench, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useActiveProfileContext } from '../hooks/useActiveProfileContext';
import { authService, RoleAccountsResponse, RoleAccountSlot } from '../services/auth/authService';

interface RoleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_META: Record<
  RoleAccountSlot['role'],
  { label: string; blurb: string; icon: React.ComponentType<{ className?: string }> }
> = {
  BUYER: {
    label: 'Buyer',
    blurb: 'Buy products & services from other companies',
    icon: ShoppingBag,
  },
  SELLER: {
    label: 'Seller',
    blurb: 'Sell your products to buyers',
    icon: Store,
  },
  SERVICE_PROVIDER: {
    label: 'Service Provider',
    blurb: 'Offer services, bookings & repairs',
    icon: Wrench,
  },
};

/**
 * Role Manager — shows every role-account (Buyer/Seller/Service Provider)
 * this company can operate as, which one is active, and switches the
 * dashboard on click. Follows ConfirmModal's house style. Company-account
 * gating and every rule are re-enforced server-side; this UI just reflects
 * what the backend reports via GET /users/:id/role-accounts.
 */
export default function RoleManagerModal({ isOpen, onClose }: RoleManagerModalProps) {
  const { user, switchRole } = useAuth();
  const { setContext } = useActiveProfileContext();
  const navigate = useNavigate();

  const [data, setData] = useState<RoleAccountsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switchingRole, setSwitchingRole] = useState<string | null>(null);
  const [pendingActivateRole, setPendingActivateRole] = useState<
    RoleAccountSlot['role'] | null
  >(null);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    setError(null);
    setPendingActivateRole(null);
    setIsLoading(true);
    authService
      .getRoleAccounts(user.id)
      .then(setData)
      .catch(() => setError('Could not load your role accounts. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleSwitch = async (role: RoleAccountSlot['role']) => {
    setError(null);
    setSwitchingRole(role);
    try {
      await switchRole(role);
      // Different, orthogonal concept (product/service archetype within
      // an already-active profile) — reset it so it never references a
      // now-irrelevant archetype after crossing role boundaries.
      setContext({ type: 'business', archetype: 'RETAIL' });
      onClose();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role switch failed. Please try again.');
      setSwitchingRole(null);
      setPendingActivateRole(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-4xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#fdf6e9]">
                  <CheckCircle2 className="w-6 h-6 text-[#d49b35]" />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-slate-900">Role Manager</h3>
                  <p className="text-xs text-slate-400">
                    One company, switch between how you operate
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="mt-6 space-y-3">
                {isLoading && (
                  <div className="py-10 flex items-center justify-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}

                {!isLoading &&
                  data?.accounts.map((slot) => {
                    const meta = ROLE_META[slot.role];
                    const Icon = meta.icon;
                    const isSwitchingThis = switchingRole === slot.role;
                    const isPendingConfirm = pendingActivateRole === slot.role;

                    if (slot.isActive) {
                      // Verification lives on the profile you're CURRENTLY
                      // on, not the target — if this one isn't VERIFIED yet,
                      // that's exactly why every other slot is locked. Say
                      // so here instead of leaving "Active now" looking like
                      // "all clear" while the real blocker sits unexplained
                      // on the sibling rows.
                      const notVerified = slot.verificationStatus && slot.verificationStatus !== 'VERIFIED';
                      const statusCopy =
                        slot.verificationStatus === 'REJECTED'
                          ? 'Verification rejected — contact support.'
                          : slot.verificationStatus === 'SUSPENDED'
                            ? 'Suspended by admin.'
                            : 'Awaiting admin verification — this is why switching is locked.';
                      return (
                        <div
                          key={slot.role}
                          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-[#C9973A] bg-[#fdf6e9]"
                        >
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white shrink-0">
                            <Icon className="w-5 h-5 text-[#C9973A]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-brand-dark">{meta.label}</p>
                            {notVerified ? (
                              <p className="text-xs text-amber-600 font-medium truncate">{statusCopy}</p>
                            ) : (
                              <p className="text-xs text-slate-500 truncate">{meta.blurb}</p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-[#C9973A] uppercase tracking-widest shrink-0">
                            Active now
                          </span>
                        </div>
                      );
                    }

                    if (!slot.canActivate) {
                      return (
                        <div
                          key={slot.role}
                          className="flex items-center gap-4 p-4 rounded-2xl border border-[#f1f5f9] bg-slate-50 opacity-70"
                        >
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white shrink-0">
                            <Lock className="w-4.5 h-4.5 text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-500">{meta.label}</p>
                            <p className="text-xs text-slate-400">
                              {slot.blockedReason || 'Not available right now.'}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (!slot.exists) {
                      return (
                        <div
                          key={slot.role}
                          className="rounded-2xl border border-[#f1f5f9] overflow-hidden"
                        >
                          <button
                            onClick={() => setPendingActivateRole(isPendingConfirm ? null : slot.role)}
                            disabled={isSwitchingThis}
                            className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors disabled:opacity-60"
                          >
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-50 shrink-0">
                              <Icon className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-brand-dark">{meta.label}</p>
                              <p className="text-xs text-slate-500 truncate">{meta.blurb}</p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                              Set up
                            </span>
                          </button>
                          {isPendingConfirm && (
                            <div className="px-4 pb-4">
                              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                We'll set up your {meta.label} account using your verified
                                company details — no new documents needed.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setPendingActivateRole(null)}
                                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSwitch(slot.role)}
                                  disabled={isSwitchingThis}
                                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-[#C9973A] hover:bg-brand-dark transition-all duration-300 disabled:opacity-60"
                                >
                                  {isSwitchingThis ? 'Setting up…' : `Activate ${meta.label}`}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={slot.role}
                        onClick={() => handleSwitch(slot.role)}
                        disabled={isSwitchingThis}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[#f1f5f9] text-left hover:border-[#C9973A]/40 hover:bg-[#fdf8f0] transition-colors disabled:opacity-60"
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-50 shrink-0">
                          {isSwitchingThis ? (
                            <Loader2 className="w-5 h-5 text-[#C9973A] animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-brand-dark">{meta.label}</p>
                          <p className="text-xs text-slate-500 truncate">{meta.blurb}</p>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                          {isSwitchingThis ? 'Switching…' : 'Switch'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
