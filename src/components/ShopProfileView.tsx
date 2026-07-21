import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Tag,
  ShieldCheck,
  BadgeCheck,
  Store,
  Building2,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ExternalLink,
  FileText,
  Calendar,
  Flag,
  ShoppingCart,
  Plus,
  Minus,
  Package,
  X,
  Send,
} from 'lucide-react';
import {
  getShopProfile,
  fetchShopProducts,
  type ShopProfile,
  type ShopResult,
  type ShopProduct,
} from '../services/api/shopService';
import { reviewService, type ShopReview } from '../services/api/reviewService';
import ReportUserModal from './ReportUserModal';
import { Star } from 'lucide-react';

export interface PurchaseOrderLine {
  /** Present only when the line was picked from the shop's catalog; typed
   *  (free-text) items have none. */
  productId?: string;
  title: string;
  quantity: number;
  category?: string;
}

/** A PO line in the composer — a PurchaseOrderLine plus a stable React key. */
type POLine = PurchaseOrderLine & { key: string };

interface ShopProfileViewProps {
  profileId: string;
  onBack: () => void;
  onSendInquiry: (shop: ShopResult) => void;
  /** Send a product-anchored Purchase Order to this shop. Resolves once the
   *  PO inquiry is created (the parent then navigates to My Inquiries). */
  onSendPurchaseOrder: (
    shop: ShopResult,
    items: PurchaseOrderLine[],
    note?: string,
  ) => Promise<void>;
  /** Open the PO composer immediately on mount (arrived via a card's
   *  "Send Purchase Order" button). */
  autoOpenPO?: boolean;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  COMPLETED:         { label: 'Completed',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200'  },
  PAID:              { label: 'Paid',              cls: 'bg-emerald-50 text-emerald-700 border-emerald-200'  },
  ACCEPTED:          { label: 'Accepted',          cls: 'bg-blue-50 text-blue-700 border-blue-200'           },
  PENDING:           { label: 'Pending',           cls: 'bg-amber-50 text-amber-700 border-amber-200'        },
  PENDING_COLLECTION:{ label: 'Pending Collection',cls: 'bg-amber-50 text-amber-700 border-amber-200'        },
  AWAITING_PICKUP:   { label: 'Awaiting Pickup',   cls: 'bg-amber-50 text-amber-700 border-amber-200'        },
  HANDED_OVER:       { label: 'Handed Over',       cls: 'bg-blue-50 text-blue-700 border-blue-200'           },
  REJECTED:          { label: 'Rejected',          cls: 'bg-red-50 text-red-700 border-red-200'              },
  ARCHIVED:          { label: 'Archived',          cls: 'bg-slate-50 text-slate-500 border-slate-200'        },
};

function parseSocialLinks(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZM', { year: 'numeric', month: 'short', day: 'numeric' });
}

function memberSince(iso: string | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return 'Just joined';
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''}`;
}

export default function ShopProfileView({
  profileId,
  onBack,
  onSendInquiry,
  onSendPurchaseOrder,
  autoOpenPO = false,
}: ShopProfileViewProps) {
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  // Purchase Order state. Lines are unified across typed (free-text) items and
  // catalog picks — a shop needn't have a catalog to receive a PO.
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [showPOModal, setShowPOModal] = useState(false);
  const [lines, setLines] = useState<POLine[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [poNote, setPoNote] = useState('');
  const [submittingPO, setSubmittingPO] = useState(false);
  const [poError, setPoError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<{ data: ShopReview[]; total: number; average: number }>({
    data: [],
    total: 0,
    average: 0,
  });

  useEffect(() => {
    setLoading(true);
    getShopProfile(profileId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [profileId]);

  // Arrived via a card's "Send Purchase Order" → open the composer straight away.
  useEffect(() => {
    if (autoOpenPO) {
      setPoError(null);
      setShowPOModal(true);
    }
  }, [autoOpenPO, profileId]);

  // Sequential by necessity: reviews key off the seller's users.id
  // (profile.sellerId — NOT profileId, the profile row), which only
  // exists once the profile resolves.
  useEffect(() => {
    if (!profile?.sellerId) return;
    let cancelled = false;
    reviewService
      .fetchForShop(profile.sellerId, { limit: 10 })
      .then((r) => { if (!cancelled) setReviews(r); })
      .catch(() => { /* reviews are additive — profile stays useful without them */ });
    return () => { cancelled = true; };
  }, [profile?.sellerId]);

  // Shop catalog for the Purchase Order flow. Keyed on sellerId (users.id),
  // the same id targeted inquiries are directed at.
  useEffect(() => {
    if (!profile?.sellerId) return;
    let cancelled = false;
    fetchShopProducts(profile.sellerId)
      .then((p) => { if (!cancelled) setProducts(p); })
      .catch(() => { /* catalog is optional — typed items still work */ });
    return () => { cancelled = true; };
  }, [profile?.sellerId]);

  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  const setLineQty = (key: string, qty: number) =>
    setLines((ls) =>
      qty <= 0 ? ls.filter((l) => l.key !== key) : ls.map((l) => (l.key === key ? { ...l, quantity: qty } : l)),
    );
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  // Catalog "Add": increment the existing line for this product, else append.
  const addProduct = (p: ShopProduct) =>
    setLines((ls) => {
      const existing = ls.find((l) => l.productId === p.id);
      if (existing) return ls.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      return [...ls, { key: `prod-${p.id}`, productId: p.id, title: p.name, quantity: 1, category: p.category }];
    });

  // Typed "Add": a free-text line, no productId. Keyed by a monotonic counter
  // (Date.now is unavailable in some sandboxes but fine in the browser).
  const addCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    setLines((ls) => [...ls, { key: `custom-${ls.length}-${title}`, title, quantity: Math.max(1, customQty) }]);
    setCustomTitle('');
    setCustomQty(1);
  };

  const openPO = () => { setPoError(null); setShowPOModal(true); };

  const handleSendPO = async () => {
    if (!profile || lines.length === 0) return;
    const items: PurchaseOrderLine[] = lines.map((l) => ({
      ...(l.productId ? { productId: l.productId } : {}),
      title: l.title,
      quantity: l.quantity,
      category: l.category,
    }));
    setSubmittingPO(true);
    setPoError(null);
    try {
      await onSendPurchaseOrder(profile as ShopResult, items, poNote.trim() || undefined);
      // Parent navigates to My Inquiries on success; this view unmounts.
    } catch (e: any) {
      setPoError(e?.message || 'Could not send the purchase order. Please try again.');
      setSubmittingPO(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-9 h-9 animate-spin text-[#C9973A]" />
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Loading profile</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-sm font-semibold text-slate-500">Profile not found.</p>
        <button onClick={onBack} className="text-[#C9973A] text-sm font-bold hover:underline">← Back to shops</button>
      </div>
    );
  }

  const initial = (profile.name || 'S').charAt(0).toUpperCase();
  const isVerified = profile.verificationStatus === 'VERIFIED';
  const socialLinks = parseSocialLinks(profile.socialLinks);
  const stats = profile.quoteStats ?? { total: 0, completed: 0, active: 0 };
  const activity = profile.recentActivity ?? [];
  const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : null;

  return (
    <div className="w-full bg-[#f5f2ed] min-h-screen font-sans">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-6 md:py-10 space-y-6">

        {/* Back button — sits above both columns so everything aligns on one line */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider hover:gap-3 transition-all w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to shops
        </button>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Left sidebar ───────────────────────────────────────────── */}
          <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-5 lg:sticky lg:top-8">

            {/* Identity card */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-7 flex flex-col items-center text-center gap-4">
              {profile.logo ? (
                <img
                  src={profile.logo}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#C9973A]/20 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] border-2 border-[#C9973A]/20 flex items-center justify-center text-[#C9973A] font-bold text-4xl shadow-md">
                  {initial}
                </div>
              )}

              <div className="space-y-1">
                <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">{profile.name}</h1>
                {profile.companyName && profile.companyName !== profile.name && (
                  <p className="text-[12px] text-slate-400 font-medium">{profile.companyName}</p>
                )}
              </div>

              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {isVerified ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                    <AlertCircle className="w-3.5 h-3.5" /> Unverified
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {profile.shopType === 'SELLER' ? <Store className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                  {profile.shopType === 'SELLER' ? 'Seller' : 'Service Provider'}
                </span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-1.5 text-[12px] text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#C9973A] shrink-0" />
                {profile.location}
                {profile.area ? `, ${profile.area}` : ''}
              </div>

              {/* CTAs — Send Inquiry (open request) + Send Purchase Order
                  (tell the shop exactly what you want to buy). */}
              <div className="w-full space-y-2.5">
                <button
                  onClick={() => onSendInquiry(profile as ShopResult)}
                  className="w-full py-3 text-sm font-bold rounded-xl bg-[#1a1612] text-white hover:bg-black shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  Send Inquiry <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={openPO}
                  className="w-full py-3 text-sm font-bold rounded-xl bg-[#C9973A] text-white hover:bg-[#b8851d] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" /> Send Purchase Order
                </button>
              </div>

              {/* Report — sellerId is the shop owner's users.id (profile.id
                  is the profile row, not a reportable user) */}
              {profile.sellerId && (
                <button
                  onClick={() => setShowReport(true)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-[#c0392b] transition-colors"
                >
                  <Flag className="w-3 h-3" /> Report this shop
                </button>
              )}
            </div>

            {/* Contact card */}
            {(profile.phone || profile.email || Object.keys(socialLinks).length > 0) && (
              <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-4">Contact</p>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#C9973A] transition-colors">{profile.phone}</span>
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#C9973A] transition-colors truncate">{profile.email}</span>
                  </a>
                )}
                {Object.entries(socialLinks).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-700 group-hover:text-[#C9973A] transition-colors capitalize">{platform}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Main content ───────────────────────────────────────────── */}
          <div className="flex-1 w-full space-y-6">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: Clock,
                  label: 'Member Since',
                  value: memberSince(profile.createdAt),
                  sub: formatDate(profile.createdAt),
                  color: 'text-[#C9973A]',
                  bg: 'bg-[#fdf6e9]',
                },
                {
                  icon: FileText,
                  label: 'Quotes Submitted',
                  value: stats.total.toLocaleString(),
                  sub: 'total quotes given',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  icon: CheckCircle2,
                  label: 'Completed',
                  value: stats.completed.toLocaleString(),
                  sub: successRate !== null ? `${successRate}% success rate` : 'transactions done',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
                {
                  icon: TrendingUp,
                  label: 'Active Quotes',
                  value: stats.active.toLocaleString(),
                  sub: 'in progress',
                  color: 'text-slate-500',
                  bg: 'bg-slate-50',
                },
              ].map(({ icon: Icon, label, value, sub, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <p className="text-[20px] font-bold text-[#1a1a2e] leading-tight">{value}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Legitimacy indicators */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-5">Business Legitimacy</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${isVerified ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <ShieldCheck className={`w-5 h-5 shrink-0 ${isVerified ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <div>
                    <p className={`text-[11px] font-bold ${isVerified ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {isVerified ? 'Identity Verified' : 'Not Yet Verified'}
                    </p>
                    {isVerified && profile.verifiedAt && (
                      <p className="text-[10px] text-emerald-600">{formatDate(profile.verifiedAt)}</p>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${profile.hasTpin ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <BadgeCheck className={`w-5 h-5 shrink-0 ${profile.hasTpin ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <div>
                    <p className={`text-[11px] font-bold ${profile.hasTpin ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {profile.hasTpin ? 'TPIN Registered' : 'No TPIN on file'}
                    </p>
                    <p className="text-[10px] text-slate-400">Tax registration</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-slate-50 border-slate-100">
                  <Calendar className="w-5 h-5 shrink-0 text-[#C9973A]" />
                  <div>
                    <p className="text-[11px] font-bold text-slate-600">Registered</p>
                    <p className="text-[10px] text-slate-400">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            {(profile.categoryNames ?? []).length > 0 && (
              <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-4">
                  {profile.shopType === 'SELLER' ? 'Products Sold' : 'Services Offered'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
                  {(profile.categoryNames ?? []).map((name, i) => (
                    <span key={i} className="px-3 py-1.5 text-[11px] font-semibold bg-[#fdf6e9] text-[#C9973A] border border-[#C9973A]/20 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Customer reviews — earned through DELIVERED/COMPLETED orders */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">Customer Reviews</p>
                {reviews.total > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-[#C9973A] fill-[#C9973A]" />
                    <span className="text-[14px] font-black text-[#1a1a2e]">{reviews.average.toFixed(1)}</span>
                    <span className="text-[11px] font-medium text-slate-400">
                      ({reviews.total} review{reviews.total !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </div>

              {reviews.data.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <Star className="w-8 h-8 text-slate-200" />
                  <p className="text-[13px] font-medium text-slate-400">No reviews yet</p>
                  <p className="text-[11px] text-slate-300">
                    Buyers can rate this shop after a completed order.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {reviews.data.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12px] font-bold text-[#1a1a2e] truncate">
                          {r.reviewerName || 'Buyer'}
                        </p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3.5 h-3.5 ${
                                n <= r.rating ? 'text-[#C9973A] fill-[#C9973A]' : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="mt-1.5 text-[12px] text-slate-600 leading-relaxed">{r.comment}</p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400 font-medium">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">Transaction History</p>
                {stats.total > 12 && (
                  <p className="text-[10px] font-medium text-slate-400">Showing last 12 of {stats.total}</p>
                )}
              </div>

              {activity.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-2 text-center">
                  <FileText className="w-8 h-8 text-slate-200" />
                  <p className="text-[13px] font-medium text-slate-400">No transactions yet</p>
                  <p className="text-[11px] text-slate-300">This provider hasn't submitted quotes yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activity.map((item, i) => {
                    const badge = STATUS_BADGE[item.status] ?? { label: item.status, cls: 'bg-slate-50 text-slate-400 border-slate-200' };
                    const isDone = ['COMPLETED', 'PAID', 'HANDED_OVER'].includes(item.status);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:border-[#C9973A]/20 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                          <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-slate-300'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[#1a1a2e] truncate">
                            {item.inquiryTitle || 'Unnamed Inquiry'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">{formatDate(item.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.price != null && (
                            <span className="text-[12px] font-bold text-[#1a1a2e]">
                              K{Number(item.price).toLocaleString()}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showReport && profile.sellerId && (
        <ReportUserModal
          reportedUserId={profile.sellerId}
          reportedUserName={profile.name}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Purchase Order composer — type what you want (catalog optional) */}
      {showPOModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => !submittingPO && setShowPOModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-100 shadow-xl p-6 max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">Purchase Order</p>
                <h3 className="font-serif text-[19px] font-bold text-[#1a1a2e]">Send to {profile.name}</h3>
              </div>
              <button
                onClick={() => !submittingPO && setShowPOModal(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[12px] text-slate-500 mb-4 leading-relaxed">
              Tell {profile.name} what you want and how many. They'll reply with the price, then you can pay.
            </p>

            {/* Typed item — the primary path (works for any shop) */}
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              What do you need?
            </label>
            <div className="flex items-stretch gap-2 mb-4">
              <input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                placeholder="e.g. Toyota Corolla key, 25kg cement…"
                className="flex-1 min-w-0 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-[#1a1a2e] outline-none focus:border-[#C9973A]"
              />
              <div className="flex items-center gap-1 rounded-xl border border-[#d8c08a] bg-white px-1.5 shrink-0">
                <button
                  onClick={() => setCustomQty((q) => Math.max(1, q - 1))}
                  aria-label="Reduce quantity"
                  className="w-6 h-6 rounded-md text-[#C9973A] flex items-center justify-center hover:bg-[#fdf6e9]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-5 text-center text-[13px] font-bold text-[#1a1a2e]">{customQty}</span>
                <button
                  onClick={() => setCustomQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-6 h-6 rounded-md text-[#C9973A] flex items-center justify-center hover:bg-[#fdf6e9]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={addCustom}
                disabled={!customTitle.trim()}
                className="shrink-0 px-3 rounded-xl bg-[#1a1612] text-white text-[12px] font-bold hover:bg-black transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Catalog shortcut — only when the shop has listed products */}
            {products.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Or pick from their catalog</p>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {products.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60 border border-slate-100">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#1a1a2e] truncate">{p.name}</span>
                      <button
                        onClick={() => addProduct(p)}
                        className="shrink-0 px-2.5 py-1 rounded-lg bg-[#fdf6e9] text-[#8a6118] border border-[#ecd9b3] text-[11px] font-bold hover:bg-[#f7ecd2] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Line items */}
            {lines.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Your order · {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                  {lines.map((l) => (
                    <div key={l.key} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#fdf6e9] border border-[#ecd9b3]">
                      <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#1a1a2e] truncate">{l.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setLineQty(l.key, l.quantity - 1)}
                          aria-label="Reduce quantity"
                          className="w-6 h-6 rounded-md bg-white border border-[#d8c08a] text-[#C9973A] flex items-center justify-center hover:bg-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-[13px] font-bold text-[#1a1a2e]">{l.quantity}</span>
                        <button
                          onClick={() => setLineQty(l.key, l.quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-6 h-6 rounded-md bg-white border border-[#d8c08a] text-[#C9973A] flex items-center justify-center hover:bg-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeLine(l.key)}
                          aria-label="Remove item"
                          className="w-6 h-6 rounded-md text-slate-400 hover:text-rose-500 flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Note (optional)
            </label>
            <textarea
              value={poNote}
              onChange={(e) => setPoNote(e.target.value)}
              rows={2}
              placeholder="Delivery address, preferred variant, timing…"
              className="w-full rounded-xl border border-slate-200 p-3 text-[13px] text-[#1a1a2e] outline-none focus:border-[#C9973A] resize-none mb-2"
            />

            {poError && <p className="text-[12px] text-rose-600 font-medium mb-3">{poError}</p>}

            <button
              onClick={handleSendPO}
              disabled={submittingPO || lines.length === 0}
              className="w-full py-3 rounded-xl bg-[#C9973A] text-white text-sm font-bold hover:bg-[#b8851d] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submittingPO ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" /> Send Purchase Order{lines.length > 0 ? ` · ${lines.length} item${lines.length !== 1 ? 's' : ''}` : ''}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
