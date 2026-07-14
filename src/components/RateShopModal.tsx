/**
 * Rate-a-shop modal — opened from a DELIVERED/COMPLETED order in the
 * buyer's Order History. Submits to POST /shops/:sellerUserId/reviews;
 * the server enforces the order gate and one-review-per-order.
 *
 * sellerUserId is the provider's users.id (NOT the profile row id).
 * Border colors are opaque hexes — translucent borders on rounded cards
 * mis-rasterize on Mali-GPU Android phones.
 */
import React, { useState } from 'react';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';
import { reviewService } from '../services/api/reviewService';

export default function RateShopModal({
  sellerUserId,
  sellerName,
  orderId,
  onClose,
  onSubmitted,
}: {
  sellerUserId: string;
  sellerName?: string;
  orderId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      setError('Tap a star to choose your rating.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reviewService.submit(sellerUserId, {
        orderId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setDone(true);
      onSubmitted?.();
    } catch (e: any) {
      setError(e?.message || 'Could not submit your rating — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  const shown = hovered || rating;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f1f5f9] flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-slate-900">
            Rate {sellerName || 'this shop'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-slate-900">Thanks for the feedback</p>
            <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
              Your rating helps other buyers choose with confidence.
            </p>
            <button
              onClick={onClose}
              className="mt-5 px-6 py-2.5 rounded-xl bg-[#1a1a2e] text-white text-[12px] font-bold hover:bg-[#C9973A] transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div
                role="radiogroup"
                aria-label="Rating out of 5 stars"
                className="flex items-center gap-1.5"
                onMouseLeave={() => setHovered(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHovered(n)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setRating(Math.min(5, (rating || 0) + 1));
                      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        setRating(Math.max(1, (rating || 1) - 1));
                      }
                    }}
                    className="p-1 rounded-lg hover:bg-[#fdf6e9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9973A]"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        n <= shown ? 'text-[#C9973A] fill-[#C9973A]' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[12px] font-bold text-slate-500 h-4">
                {shown > 0 ? RATING_LABELS[shown] : 'Tap to rate'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Add a comment (optional)
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="How was the product or service?"
                className="w-full px-4 py-3 bg-slate-50 border border-[#f1f5f9] rounded-xl text-[13px] font-medium focus:bg-white focus:border-[#d49b35] outline-none resize-none"
              />
            </div>

            {error && <p className="text-[12px] font-semibold text-rose-500">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#1B3068] text-white text-[12px] font-black uppercase tracking-widest hover:bg-[#152554] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit rating
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
