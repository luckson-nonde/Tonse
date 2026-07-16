import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Trash2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { authService, DeletionCheck } from '../services/auth/authService';
import { formatCurrency } from '../utils/financeUtils';

/** Who to contact when a buyer's funds are stuck in escrow. */
const SUPPORT_CONTACT = 'support@tonse.co.zm';

/**
 * DATA PROTECTION — self-service account deletion, guarded by a pre-flight
 * check (GET /users/:id/deletion-check):
 *
 *   • HARD BLOCK — funds held in escrow. A seller who still owes a handover,
 *     or a buyer whose payment is still held, cannot delete until the escrow
 *     is released/reversed. The type-to-confirm input is hidden; a red panel
 *     explains what to resolve first (buyer: contact the platform admin).
 *   • WARN — open orders/offers/inquiries/incomplete loans. Non-blocking; the
 *     list is shown and the confirm relabelled "Delete anyway", but the user
 *     may proceed.
 *   • CLEAN — straight to type-to-confirm.
 *
 * On confirm the backend irreversibly purges the account and every trace of
 * the user's data. The DELETE re-checks server-side, so a race (escrow arrives
 * between the check and the click) surfaces as a 409 the catch handles.
 */
export default function DeleteAccountSection() {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<DeletionCheck | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);

  const runCheck = async () => {
    if (!user?.id) return;
    setChecking(true);
    setError('');
    setCheckFailed(false);
    try {
      setCheck(await authService.checkDeletion(String(user.id)));
    } catch {
      // If the pre-flight itself fails, don't hard-block the user on a
      // transient error — surface it (so it never looks like nothing ran) and
      // fall through to type-to-confirm; the DELETE re-checks server-side.
      setCheck(null);
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  };

  const openDangerZone = async () => {
    setOpen(true);
    await runCheck();
  };

  const reset = () => {
    setOpen(false);
    setConfirmText('');
    setError('');
    setCheck(null);
    setCheckFailed(false);
  };

  const doDelete = async () => {
    if (!user?.id) return;
    setBusy(true);
    setError('');
    try {
      await authService.deleteAccount(String(user.id));
      // Account + all data are gone — drop the session and leave.
      try {
        await logout?.();
      } catch {
        /* logout is best-effort; the account no longer exists */
      }
      navigate('/');
      window.location.reload();
    } catch (e: any) {
      // A 409 means escrow arrived since the pre-flight — re-check so the
      // block panel replaces the confirm UI, and surface the server message.
      setError(e?.message || 'Failed to delete your account. Please try again.');
      setBusy(false);
      await runCheck();
    }
  };

  const zmw = (n: number) => `ZMW ${formatCurrency(n)}`;

  const sellerBlock = check?.hardBlocks.sellerCollections;
  const buyerBlock = check?.hardBlocks.buyerEscrow;
  const hardBlocked =
    !!check && !check.canDelete && ((sellerBlock?.count ?? 0) > 0 || (buyerBlock?.count ?? 0) > 0);

  const w = check?.warnings;
  const warningItems: string[] = [];
  if (w) {
    if (w.inProgressOrders)
      warningItems.push(`${w.inProgressOrders} order${w.inProgressOrders > 1 ? 's' : ''} in progress`);
    if (w.pendingOffers)
      warningItems.push(`${w.pendingOffers} offer${w.pendingOffers > 1 ? 's' : ''} awaiting your decision`);
    if (w.openInquiries)
      warningItems.push(`${w.openInquiries} open ${w.openInquiries > 1 ? 'inquiries' : 'inquiry'}`);
    if (w.incompleteLoans)
      warningItems.push(`${w.incompleteLoans} incomplete loan${w.incompleteLoans > 1 ? 's' : ''}`);
  }
  const hasWarnings = warningItems.length > 0;

  return (
    <div className="mt-6 bg-white rounded-3xl border-2 border-rose-200 p-6">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-rose-700">Delete account</h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Permanently delete your account and <span className="font-semibold">all</span> of your data —
            inquiries, quotes/offers, orders, uploaded documents, profile, and history. This action{' '}
            <span className="font-semibold">cannot be undone.</span>
          </p>

          {!open ? (
            <button
              onClick={openDangerZone}
              className="mt-4 px-5 py-2.5 text-sm font-bold text-rose-600 border border-rose-300 rounded-xl hover:bg-rose-50 transition-colors"
            >
              Delete my account
            </button>
          ) : checking ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking for pending tasks…
            </div>
          ) : hardBlocked ? (
            /* ── HARD BLOCK: funds in escrow ── */
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  You can’t delete your account yet — funds are in escrow
                </div>
                <ul className="mt-3 space-y-2 text-sm text-rose-700/90">
                  {!!sellerBlock?.count && (
                    <li className="leading-relaxed">
                      <span className="font-semibold">
                        {sellerBlock.count} pending collection{sellerBlock.count > 1 ? 's' : ''}
                      </span>{' '}
                      await{sellerBlock.count > 1 ? '' : 's'} handover ({zmw(sellerBlock.amount)} in
                      escrow). Complete {sellerBlock.count > 1 ? 'them' : 'it'} under{' '}
                      <span className="font-semibold">Collections</span> first — once the buyer collects,
                      the funds are released and you can delete.
                    </li>
                  )}
                  {!!buyerBlock?.count && (
                    <li className="leading-relaxed">
                      <span className="font-semibold">{zmw(buyerBlock.amount)}</span> of yours is held in
                      escrow across {buyerBlock.count} order{buyerBlock.count > 1 ? 's' : ''}. Contact the
                      platform admin at{' '}
                      <a href={`mailto:${SUPPORT_CONTACT}`} className="font-semibold underline">
                        {SUPPORT_CONTACT}
                      </a>{' '}
                      to reverse the funds — then you can delete your account.
                    </li>
                  )}
                </ul>
              </div>
              {hasWarnings && (
                <p className="text-xs text-slate-500">
                  You also have: {warningItems.join(' · ')}.
                </p>
              )}
              <div>
                <button
                  onClick={reset}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* ── WARN or CLEAN: type-to-confirm ── */
            <div className="mt-4 space-y-3">
              {checkFailed ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Couldn’t verify your pending tasks
                  </div>
                  <p className="mt-2 text-sm text-amber-700/90 leading-relaxed">
                    We couldn’t check for pending collections or orders right now. You can still
                    delete, but if any of your funds are held in escrow the deletion will be blocked
                    and you’ll be told to resolve it first.
                  </p>
                </div>
              ) : hasWarnings ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    You have unfinished activity
                  </div>
                  <p className="mt-2 text-sm text-amber-700/90 leading-relaxed">
                    {warningItems.join(' · ')}. Deleting now will cancel {warningItems.length > 1 ? 'these' : 'this'}
                    {' '}and cannot be undone.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    No pending tasks found
                  </div>
                  <p className="mt-2 text-sm text-emerald-700/90 leading-relaxed">
                    We checked your account — no funds in escrow, and no open collections, orders,
                    offers, or inquiries. You’re clear to delete.
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-700">
                Type <span className="font-mono font-bold text-rose-600">DELETE</span> to confirm.
              </p>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoFocus
                className="w-full sm:w-64 p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
              />
              {error && <p className="text-rose-500 text-sm">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  disabled={busy}
                  className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={doDelete}
                  disabled={confirmText !== 'DELETE' || busy}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {hasWarnings ? 'Delete anyway' : 'Permanently delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
