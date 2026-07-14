import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../AuthContext';

/**
 * Soft-verification notice for buyers. Unapproved buyers keep full access —
 * this banner just tells them their account is awaiting admin approval and
 * that sellers/providers see them marked as unverified until then. Renders
 * nothing for non-buyers, verified buyers, or while the status is unknown.
 *
 * Border colors are opaque hexes on purpose — translucent borders on
 * rounded cards mis-rasterize on Mali-GPU Android phones.
 */
export default function BuyerVerificationBanner() {
  const { user } = useAuth();
  if (!user || user.role !== 'BUYER') return null;
  const status = user.verificationStatus;
  if (!status || status === 'VERIFIED') return null;

  const rejected = status === 'REJECTED';
  const reason = user.verificationRejectionReason;

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 flex items-start gap-3 ${
        rejected ? 'bg-[#fdf2f2] border-[#f3c6c6]' : 'bg-[#fdf6e9] border-[#ecd9b3]'
      }`}
    >
      <ShieldAlert
        className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${rejected ? 'text-[#c0392b]' : 'text-[#b07f24]'}`}
      />
      <div className="min-w-0">
        <p
          className={`text-[13px] font-bold leading-snug ${
            rejected ? 'text-[#8f2b20]' : 'text-[#8a6118]'
          }`}
        >
          {rejected ? 'Your account approval was declined' : 'Your account is awaiting approval'}
        </p>
        <p
          className={`text-[12px] leading-snug mt-0.5 ${
            rejected ? 'text-[#a94438]' : 'text-[#a3782a]'
          }`}
        >
          {rejected ? (
            <>
              {reason ? `Reason: ${reason}. ` : ''}
              You can still browse and send inquiries, but sellers and service providers will see
              your account marked as unverified.
            </>
          ) : (
            <>
              You can browse and send inquiries as normal — sellers and service providers will see
              your account marked as unverified until an admin approves it.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
