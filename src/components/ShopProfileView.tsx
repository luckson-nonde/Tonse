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
} from 'lucide-react';
import { getShopProfile, type ShopProfile, type ShopResult } from '../services/api/shopService';
import { reviewService, type ShopReview } from '../services/api/reviewService';
import ReportUserModal from './ReportUserModal';
import { Star } from 'lucide-react';

interface ShopProfileViewProps {
  profileId: string;
  onBack: () => void;
  onSendInquiry: (shop: ShopResult) => void;
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

export default function ShopProfileView({ profileId, onBack, onSendInquiry }: ShopProfileViewProps) {
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
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

              {/* CTA */}
              <button
                onClick={() => onSendInquiry(profile as ShopResult)}
                className="w-full py-3 text-sm font-bold rounded-xl bg-[#1a1612] text-white hover:bg-black shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                Send Inquiry <ArrowRight className="w-4 h-4" />
              </button>

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
    </div>
  );
}
