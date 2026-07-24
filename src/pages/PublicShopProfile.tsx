import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Star,
  MapPin,
  ShieldCheck,
  Send,
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Camera,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import DiscoverHeader from '../components/discover/DiscoverHeader';
import {
  fetchDiscoverShopProfile,
  fetchDiscoverShopProducts,
  fetchDiscoverShopReviews,
  toNumber,
  DiscoverShopProfile as ShopProfile,
  DiscoverProduct,
  DiscoverReview,
} from '../services/api/discoverService';
import { createInquiry } from '../services/api/inquiryService';
import { savePendingInquiry } from '../services/pendingInquiry';

const NAVY = '#1B3068';
const NAVY_DEEP = '#142550';
const GOLD = '#c9973a';

const URGENCY_OPTIONS = ['ASAP (Same day)', 'Within 3 days', 'Within a week', 'Flexible / No rush'];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="font-serif font-semibold text-[1.15rem] text-[#1B3068]">{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-[#6b7280]">{label}</span>
    </div>
  );
}

export default function PublicShopProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [products, setProducts] = useState<DiscoverProduct[]>([]);
  const [reviews, setReviews] = useState<{ data: DiscoverReview[]; total: number; average: number }>({
    data: [],
    total: 0,
    average: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState(URGENCY_OPTIONS[3]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    setIsLoading(true);
    fetchDiscoverShopProfile(id).then((data) => {
      if (!isMounted) return;
      setProfile(data);
      setIsLoading(false);
      if (data?.hasProducts) {
        fetchDiscoverShopProducts(data.sellerId).then((p) => isMounted && setProducts(p));
      }
      if (data?.sellerId) {
        fetchDiscoverShopReviews(data.sellerId).then((r) => isMounted && setReviews(r));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Real photos of the shop come from its listed products — there's no
  // separate "gallery" field on the profile, so this is the honest source.
  const galleryImages = useMemo(() => {
    const urls = products.flatMap((p) => p.images || []).filter(Boolean);
    return Array.from(new Set(urls)).slice(0, 10);
  }, [products]);

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitError(null);

    if (title.trim().length < 3) {
      setSubmitError('Tell us what you need (at least 3 characters).');
      return;
    }
    if (description.trim().length < 10) {
      setSubmitError('Add a few more details (at least 10 characters).');
      return;
    }
    if (!profile.categoryIds.length) {
      setSubmitError("This shop hasn't finished setting up its categories yet — try another shop.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      items: JSON.stringify([{ title: title.trim(), description: description.trim(), quantity }]),
      categoryIds: profile.categoryIds,
      location: profile.location,
      province: profile.province ?? undefined,
      city: profile.city ?? undefined,
      status: 'OPEN',
      preferences: JSON.stringify({}),
      attributes: JSON.stringify({
        budget: budget ? Number(budget) : undefined,
        urgency,
      }),
      // Direct-to-shop request, not a broadcast — STANDARD is the safe
      // default (EXPRESS implies a faster multi-shop matching flow).
      processType: 'STANDARD',
      targetedProviderId: profile.sellerId,
    };

    if (!user) {
      savePendingInquiry({ shopId: profile.id, shopName: profile.name, draft: payload });
      navigate('/login', { state: { pendingIntentShopName: profile.name } });
      return;
    }

    if (user.role !== 'BUYER') {
      setSubmitError('Only buyer accounts can send inquiries — log in with a buyer account to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await createInquiry(payload);
      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e?.message || 'Failed to send your inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f2ed] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c9973a]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f5f2ed]">
        <DiscoverHeader onBack={() => navigate('/discover')} />
        <div className="px-5 sm:px-8 lg:px-12 py-24 text-center text-[#6b7280]">
          <p className="mb-4">This shop couldn't be found.</p>
          <button
            onClick={() => navigate('/discover')}
            className="rounded-full bg-[#1B3068] text-white font-semibold text-sm px-5 py-2.5"
          >
            Back to Discover
          </button>
        </div>
      </div>
    );
  }

  const isVerified = profile.verificationStatus === 'VERIFIED';
  const joined = new Date(profile.createdAt);
  const yearsOnPlatform = Math.max(
    0,
    new Date().getFullYear() - joined.getFullYear()
  );

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1e293b] pb-16">
      <DiscoverHeader onBack={() => navigate('/discover')} />

      {/* Profile hero — large by design: this is the shop's real cover
          photo when it has one, so a first-time visitor actually sees the
          business before reading anything about it. Falls back to the
          brand gradient + monogram only when no photo exists. */}
      <section className="px-5 sm:px-8 lg:px-12 pt-5">
        <div className="relative overflow-hidden rounded-3xl text-white flex flex-col justify-end min-h-[420px] sm:min-h-[480px]">
          {profile.coverImage ? (
            <>
              <img
                src={profile.coverImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(15,23,64,0.90) 0%, rgba(15,23,64,0.45) 55%, rgba(15,23,64,0.08) 100%)',
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(110% 130% at 85% -10%, rgba(201,151,58,0.4), transparent 55%), linear-gradient(135deg, ${NAVY}, ${NAVY_DEEP})`,
              }}
            />
          )}
          <div className="relative z-10 px-7 sm:px-10 py-9 sm:py-10">
            {profile.categoryNames[0] && (
              <div className="inline-block bg-[#c9973a]/90 text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg mb-4">
                {profile.categoryNames[0]}
              </div>
            )}
            <div className="w-[80px] h-[80px] rounded-2xl bg-[#fffaf5] text-[#1B3068] font-serif font-bold text-[2rem] flex items-center justify-center mb-4 shadow-lg overflow-hidden">
              {profile.logo ? (
                <img src={profile.logo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                initials(profile.name)
              )}
            </div>
            <h1 className="font-serif font-semibold text-[2rem] sm:text-[2.8rem] leading-tight">
              {profile.name}
            </h1>
            <div className="mt-2.5 flex flex-wrap gap-4 text-[14px] text-white/85">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {profile.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-current text-[#c9973a]" /> {toNumber(profile.rating).toFixed(1)} (
                {profile.reviewCount} reviews)
              </span>
              {isVerified && (
                <span className="flex items-center gap-1.5 text-[#c9973a] font-semibold">
                  <ShieldCheck className="w-4 h-4" /> Verified provider
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Status bar */}
      <div className="px-5 sm:px-8 lg:px-12 mt-3.5">
        <div className="bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl px-5 sm:px-6 py-4 flex flex-wrap items-center gap-x-10 gap-y-3">
          <StatItem label="Quotes exchanged" value={profile.quoteStats.total} />
          <StatItem label="Completed trades" value={profile.quoteStats.completed} />
          <StatItem label="On ProQuote" value={`${yearsOnPlatform || '<1'} yr${yearsOnPlatform === 1 ? '' : 's'}`} />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        {/* Main column */}
        <div className="space-y-8 min-w-0">
          {galleryImages.length > 0 && (
            <section>
              <h2 className="font-serif font-semibold text-[1.25rem] text-[#1B3068] mb-3 flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#6b7280]" /> Photos
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryImages.map((src, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-[#f1f5f9]">
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {profile.categoryNames.length > 0 && (
            <section>
              <h2 className="font-serif font-semibold text-[1.25rem] text-[#1B3068] mb-3">
                Categories
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.categoryNames.map((name) => (
                  <span
                    key={name}
                    className="text-[12px] font-medium bg-[#fffaf5] border border-[#e7e0d5] text-[#1B3068] px-3 py-1.5 rounded-full"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.hasProducts && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif font-semibold text-[1.25rem] text-[#1B3068] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#6b7280]" /> Listed products
                </h2>
                <span className="text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
                  {products.length} available
                </span>
              </div>
              {products.length === 0 ? (
                <p className="text-[#6b7280] text-sm">Loading products…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl overflow-hidden cursor-pointer hover:border-[#c9973a]/40 transition-colors flex flex-col"
                      onClick={() => setTitle(product.name)}
                    >
                      <div className="aspect-square bg-[#f1f5f9] overflow-hidden">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="font-semibold text-[#1B3068] text-[13px] truncate">
                          {product.name}
                        </h4>
                        <p className="text-[13px] font-bold text-[#a97c27] mt-0.5">
                          ZMW {toNumber(product.price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {profile.recentActivity.length > 0 && (
            <section>
              <h2 className="font-serif font-semibold text-[1.25rem] text-[#1B3068] mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#6b7280]" /> Recent activity
              </h2>
              <div className="bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl divide-y divide-[#e7e0d5]">
                {profile.recentActivity.slice(0, 6).map((item, i) => (
                  <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[#1e293b] truncate">{item.inquiryTitle}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#a97c27] shrink-0">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="font-serif font-semibold text-[1.25rem] text-[#1B3068] mb-3">
              Ratings & reviews
            </h2>
            {reviews.data.length === 0 ? (
              <p className="text-[#6b7280] text-sm">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.data.map((review) => (
                  <div key={review.id} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1B3068] text-[#c9973a] flex items-center justify-center font-bold text-sm shrink-0">
                      {(review.reviewerName || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#1B3068]">
                        {review.reviewerName || 'Buyer'} ·{' '}
                        <span className="text-[#c9973a]">{'★'.repeat(Math.round(review.rating))}</span>
                      </div>
                      <p className="text-[13px] text-[#1e293b] mt-0.5">{review.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar: quote request form */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <div className="bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl p-5 shadow-[0_4px_14px_rgba(20,37,80,0.07)]">
            {submitted ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-serif font-semibold text-[#1B3068] text-[1.05rem] mb-1.5">
                  Inquiry sent
                </h3>
                <p className="text-[13px] text-[#6b7280] mb-4">
                  {profile.name} will send you a quotation shortly.
                </p>
                <button
                  onClick={() => navigate('/buyer/dashboard')}
                  className="w-full rounded-full bg-[#1B3068] text-white font-semibold text-sm py-2.5"
                >
                  View in my dashboard
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-serif font-semibold text-[#1B3068] text-[1.05rem] mb-1">
                  Request a Quote
                </h3>
                <p className="text-[13px] text-[#6b7280] mb-4">
                  Tell {profile.name} what you need — no account required to fill this in.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                      What are you looking for?
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Bulk office stationery"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#e7e0d5] rounded-xl text-sm outline-none focus:border-[#c9973a]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                      Details
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Quantities, specs, or anything else the shop should know…"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#e7e0d5] rounded-xl text-sm outline-none focus:border-[#c9973a] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#e7e0d5] rounded-xl text-sm outline-none focus:border-[#c9973a]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Budget (ZMW)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#e7e0d5] rounded-xl text-sm outline-none focus:border-[#c9973a]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                      Urgency
                    </label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#e7e0d5] rounded-xl text-sm outline-none focus:border-[#c9973a]"
                    >
                      {URGENCY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {submitError && <p className="text-[12px] text-rose-600 font-medium">{submitError}</p>}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-full text-white font-semibold text-sm py-3 disabled:opacity-60 transition-colors"
                    style={{ backgroundColor: GOLD }}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {user ? 'Send inquiry' : 'Continue to send'}
                  </button>
                  {!user && (
                    <p className="text-[11px] text-[#9ca3af] text-center">
                      You'll log in or create a free account on the next step — we'll send this exact
                      request the moment you're signed in.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-[#fffaf5] border border-[#e7e0d5] rounded-2xl p-5 text-sm">
            <div className="flex justify-between py-2 border-b border-[#e7e0d5]">
              <span className="text-[#6b7280]">Category</span>
              <span className="font-semibold text-[#1B3068]">
                {profile.categoryNames[0] || '—'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#e7e0d5]">
              <span className="text-[#6b7280]">Location</span>
              <span className="font-semibold text-[#1B3068]">{profile.location}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#6b7280] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Member since
              </span>
              <span className="font-semibold text-[#1B3068]">
                {joined.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
