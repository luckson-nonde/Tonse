import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Plus,
  Image as ImageIcon,
  Video,
  Clock,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Wallet,
  ArrowLeft,
  Check,
  Store,
  AlertTriangle,
} from 'lucide-react';
import emptyStateImage from '../../assets/images/empty-states/owl_reading.webp';
import { formatCurrency } from '../../utils/financeUtils';
import { compressImage } from '../../utils/compressImage';
import { CATEGORIES_DB } from '../../services/categories';
import { useAuth } from '../../AuthContext';
import { apiClient } from '../../services/api/client';
import { ventureService } from '../../services/api/ventureService';
import {
  adsService,
  calculateAdPrice,
  countAdDays,
  AD_PLACEMENTS,
  Advertisement,
  AdPricingRates,
  AdPlacementLocation,
  AdMediaType,
  EffectiveAdStatus,
} from '../../services/api/adsService';
import DateTimePicker from '../DateTimePicker';
import PaymentSheet, { PaymentSheetSubmitPayload } from '../PaymentSheet';
import Button from '../Button';

const PLACEMENT_LABEL: Record<AdPlacementLocation, string> = {
  HOMEPAGE_CENTER: 'Homepage Center Banner',
  SECONDARY_SIDEBAR: 'Secondary Page Sidebar',
  CATEGORY_SIDEBAR: 'Category Page Sidebar',
};

const PLACEMENT_HELP: Record<AdPlacementLocation, string> = {
  HOMEPAGE_CENTER: 'The wide banner on the buyer home screen, under the main call to action.',
  SECONDARY_SIDEBAR: 'The right-hand panel on inquiries, quotes and order pages.',
  CATEGORY_SIDEBAR: 'Beside the subcategory list while a buyer is choosing what to request.',
};

/** Master categories a category-rail ad can target — the same list the buyer
 *  picks from, so ids line up with what the rail queries. */
const MASTER_CATEGORIES = CATEGORIES_DB.filter((c) => c.parentId === null);

/**
 * The master categories this seller signed up under, from the stable category
 * ids chosen at onboarding. Each id is walked up its parent chain because a
 * seller's selection is usually a SUBcategory ('mobile-phones-sell'), while
 * the ad rail is keyed on the master ('electronics').
 */
function sellerMasterCategories(categoryIds: string[] | undefined): string[] {
  const out: string[] = [];
  for (const id of categoryIds ?? []) {
    let node = CATEGORIES_DB.find((c) => c.id === id);
    while (node?.parentId) {
      const parentId: string = node.parentId;
      node = CATEGORIES_DB.find((c) => c.id === parentId);
    }
    if (node && !out.includes(node.id)) out.push(node.id);
  }
  return out;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseISODate = (value: string): Date | undefined => {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const prettyDate = (value: string) => {
  const d = parseISODate(value);
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
};

const STATUS_STYLE: Record<EffectiveAdStatus, string> = {
  // Amber, not grey: this state needs the seller to act.
  PENDING_PAYMENT: 'bg-amber-50 text-amber-700 border border-amber-200',
  PENDING_APPROVAL: 'bg-[#fdf6e9] text-[#b07f24] border border-[#ecd9b3]',
  APPROVED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-600 border border-rose-100',
  EXPIRED: 'bg-slate-100 text-slate-400 border border-slate-200',
};

const STATUS_LABEL: Record<EffectiveAdStatus, string> = {
  // "Awaiting payment" read as though it were already submitted and merely
  // settling up. It isn't: an unpaid ad has NOT been sent for review and the
  // admin cannot see it at all.
  PENDING_PAYMENT: 'Not submitted',
  PENDING_APPROVAL: 'In review',
  APPROVED: 'Live',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

/** Reads real video runtime from the browser — the client-side half of the
 *  15-second cap (server only re-checks MIME/size, per the "simulate,
 *  don't over-build" convention for a limit that's low-stakes to spoof). */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Couldn't read that video file."));
    };
    video.src = URL.createObjectURL(file);
  });
}

interface PendingCheckout {
  reference: string;
  status: string;
  amount: string;
}

/** Human-readable placement list, plus the targeted category when the
 *  category rail is one of them. Tolerates legacy rows with no array. */
function placementSummary(ad: Advertisement): string {
  const list = (ad.placements ?? []).map((p) => PLACEMENT_LABEL[p] ?? p);
  const base = list.length ? list.join(' + ') : '—';
  if (!(ad.placements ?? []).includes('CATEGORY_SIDEBAR')) return base;
  const category = MASTER_CATEGORIES.find((c) => c.id === ad.targetCategoryId)?.name ?? 'All categories';
  return `${base} (${category})`;
}

/** One line under a field: its error if it has one, otherwise its help text.
 *  Keeps the message next to the input it's about. */
function FieldNote({ error, help }: { error?: string; help?: string }) {
  if (!error && !help) return null;
  return (
    <span
      className={`block mt-1 text-[10px] font-medium normal-case tracking-normal ${
        error ? 'text-rose-500' : 'text-slate-400'
      }`}
    >
      {error || help}
    </span>
  );
}

/**
 * Seller "Advertise" surface — create a paid ad placement (homepage banner /
 * secondary-page sidebar), pay for it (venture balance or PSP checkout, same
 * sandbox-simulated engine as VentureAccountView), then track it through
 * admin review.
 */
export default function AdsManagerView() {
  const { user } = useAuth();
  const [rates, setRates] = useState<AdPricingRates | null>(null);
  const [myAds, setMyAds] = useState<Advertisement[]>([]);
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<'list' | 'create'>('list');

  // Create-ad form state
  const [title, setTitle] = useState('');
  const [mediaType, setMediaType] = useState<AdMediaType>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | undefined>(undefined);
  const [placements, setPlacements] = useState<AdPlacementLocation[]>(['HOMEPAGE_CENTER']);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  /** Once the seller picks a category themselves, stop re-applying the
   *  onboarding default over their choice. */
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  /** Per-field messages, so an error sits under the field it belongs to
   *  rather than as one orphaned line above the submit button. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Payment state — the ad currently being paid for.
  const [payingAd, setPayingAd] = useState<Advertisement | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [payingFromBalance, setPayingFromBalance] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, ads, bal] = await Promise.all([
        adsService.getPricingRates(),
        adsService.getMyAds(),
        ventureService.getBalance(),
      ]);
      setRates(r);
      setMyAds(ads);
      setBalance(bal);
    } catch (e: any) {
      setError(e?.message || 'Failed to load your ads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The seller's own categories, split out so their own trade leads the
  // dropdown and everything else is still reachable below it.
  const myCategoryIds = useMemo(
    () => sellerMasterCategories((user as any)?.categoryIds),
    [user],
  );
  const myCategories = useMemo(
    () => MASTER_CATEGORIES.filter((c) => myCategoryIds.includes(c.id)),
    [myCategoryIds],
  );
  const otherCategories = useMemo(
    () => MASTER_CATEGORIES.filter((c) => !myCategoryIds.includes(c.id)),
    [myCategoryIds],
  );
  const defaultCategoryId = myCategoryIds[0] ?? '';

  // Default the target to what they registered under. Applied in an effect
  // (not useState's initial value) because `user` can still be loading on
  // first render — but never over a choice they've already made.
  useEffect(() => {
    if (!categoryTouched && defaultCategoryId) setTargetCategoryId(defaultCategoryId);
  }, [defaultCategoryId, categoryTouched]);

  const resetForm = () => {
    setTitle('');
    setMediaType('IMAGE');
    setMediaUrl('');
    setMediaPreview('');
    setVideoDurationSeconds(undefined);
    setPlacements(['HOMEPAGE_CENTER']);
    setTargetCategoryId(defaultCategoryId);
    setCategoryTouched(false);
    setStartDate('');
    setEndDate('');
    setFormError('');
    setFieldErrors({});
  };

  const togglePlacement = (p: AdPlacementLocation) => {
    setFieldErrors((e) => ({ ...e, placements: '' }));
    setPlacements((current) =>
      current.includes(p) ? current.filter((x) => x !== p) : [...current, p],
    );
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setFormError('');
    setUploading(true);
    try {
      let toSend: File | Blob = file;
      let duration: number | undefined;
      if (mediaType === 'VIDEO') {
        duration = await getVideoDuration(file);
        if (duration > 15) {
          setFormError('Video length exceeds the 15-second maximum limit.');
          setUploading(false);
          return;
        }
      } else {
        toSend = await compressImage(file);
      }
      const formData = new FormData();
      formData.append('file', toSend, file.name);
      const response = await apiClient.post<{ url: string }>('/files/upload?category=ad-media', formData);
      const url = response.data?.url;
      if (!url) throw new Error('Upload did not return a file URL');
      setMediaUrl(url);
      setMediaPreview(URL.createObjectURL(file));
      setVideoDurationSeconds(duration);
    } catch (e: any) {
      setFormError(e?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  /** Created but never paid for — so never sent for review, and invisible to
   *  the admin. The single most common way an ad goes nowhere. */
  const unpaidAds = myAds.filter((a) => (a.effectiveStatus ?? a.status) === 'PENDING_PAYMENT');

  const durationDays = countAdDays(startDate, endDate);
  const price = rates ? calculateAdPrice(durationDays, rates) : 0;

  const handleCreate = async () => {
    setFormError('');
    // Collect every problem at once so the seller fixes them in one pass
    // instead of discovering them one submit at a time.
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Give your ad a title.';
    if (!mediaUrl) errs.media = 'Upload an image or video first.';
    if (placements.length === 0) errs.placements = 'Pick at least one place to show the ad.';
    if (!startDate) errs.startDate = 'Choose the day the ad should start.';
    if (!endDate) errs.endDate = 'Choose the day the ad should stop.';
    if (startDate && endDate && durationDays <= 0) {
      errs.endDate = 'The end date must be on or after the start date.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setCreating(true);
    try {
      const ad = await adsService.createAd({
        title: title.trim(),
        mediaType,
        mediaUrl,
        videoDurationSeconds,
        placements,
        targetCategoryId:
          placements.includes('CATEGORY_SIDEBAR') && targetCategoryId ? targetCategoryId : undefined,
        startDate,
        endDate,
      });
      resetForm();
      setView('list');
      setPayingAd(ad);
      await load();
    } catch (e: any) {
      setFormError(e?.message || 'Could not create the ad. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handlePayFromBalance = async () => {
    if (!payingAd) return;
    setPayingFromBalance(true);
    setError('');
    try {
      await adsService.payFromBalance(payingAd.id);
      setPayingAd(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Payment failed. Please try again.');
    } finally {
      setPayingFromBalance(false);
    }
  };

  const handleCheckoutSubmit = async (payload: PaymentSheetSubmitPayload) => {
    if (!payingAd) return;
    const result = await adsService.checkoutAd(payingAd.id, {
      channel: payload.method === 'card' ? 'card' : 'mobile-money',
      phone: payload.phone,
      operator: payload.provider,
    });
    setShowPaymentSheet(false);
    if (result.status === 'failed') {
      setError('Payment could not be started. Please try again.');
      return;
    }
    setPendingCheckout({ reference: result.reference, status: result.status, amount: result.amount });
  };

  const handleSimulateApproval = async () => {
    if (!pendingCheckout) return;
    setSimulating(true);
    try {
      await adsService.simulatePayment(pendingCheckout.reference, 'successful');
      setPendingCheckout(null);
      setPayingAd(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not confirm the payment. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  const balanceCoversAd = payingAd ? Number(balance) >= Number(payingAd.totalPaidAmount) : false;

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d49b35]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-serif font-bold text-slate-900">Advertise</h2>
        {view === 'list' && !payingAd && (
          <button
            type="button"
            onClick={() => setView('create')}
            className="shrink-0 flex items-center gap-1.5 bg-[#d49b35] hover:brightness-95 text-slate-900 font-black text-[10px] uppercase tracking-widest px-3.5 py-2.5 rounded-xl shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ad
          </button>
        )}
      </div>

      {error && <p className="text-rose-500 font-bold text-center text-sm">{error}</p>}

      {/* ── Payment step for a just-created (or resumed) PENDING_PAYMENT ad ── */}
      {payingAd && (
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm text-white space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setPayingAd(null); setPendingCheckout(null); }} className="text-white/50 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Complete payment</p>
              <p className="font-bold">{payingAd.title}</p>
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black">
            ZMW {formatCurrency(Number(payingAd.totalPaidAmount))}
          </p>
          <p className="text-[11px] text-white/50">
            {placementSummary(payingAd)} · {payingAd.durationDays} days
          </p>
          <p className="text-[11px] text-amber-300/90 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            Your ad goes to our review team once this is paid — until then it isn't submitted.
          </p>

          {pendingCheckout ? (
            <div className="bg-white/10 rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm">Awaiting approval</h4>
                  <p className="text-[11px] text-white/50">{pendingCheckout.reference}</p>
                </div>
              </div>
              <p className="text-[12px] text-white/60 leading-relaxed">
                In production you'd approve this on your phone. This environment runs on the sandbox
                payment provider, so use the button below to simulate that approval.
              </p>
              <Button
                onClick={handleSimulateApproval}
                disabled={simulating}
                className="w-full py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                Simulate approval (sandbox)
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePayFromBalance}
                disabled={!balanceCoversAd || payingFromBalance}
                title={!balanceCoversAd ? `Your balance (ZMW ${formatCurrency(Number(balance))}) doesn't cover this` : undefined}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 font-black uppercase tracking-widest text-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {payingFromBalance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                Pay from balance
              </button>
              <Button
                onClick={() => setShowPaymentSheet(true)}
                className="py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px]"
              >
                Mobile Money / Card
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Create-ad form ── */}
      {view === 'create' && !payingAd && (
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setView('list'); resetForm(); }} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="font-black text-slate-900">New ad placement</h3>
          </div>

          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Title
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setFieldErrors((x) => ({ ...x, title: '' })); }}
              placeholder="e.g. 20% off all repairs this month"
              className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border text-[13px] font-medium text-slate-900 tracking-normal normal-case focus:outline-none ${
                fieldErrors.title ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 focus:border-[#C9973A]'
              }`}
            />
            <FieldNote error={fieldErrors.title} help="The headline buyers read on your ad." />
          </label>

          {/* No link field: the destination is always this seller's own shop
              page, resolved server-side. Stated plainly so it doesn't look
              like something was left out. */}
          <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-100 px-3.5 py-3">
            <Store className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tapping this ad opens <span className="font-bold text-slate-700">your shop's request form</span>, so
              buyers can tell you exactly what they want. You'll see which ad brought them in.
            </p>
          </div>

          {/* Media */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Media</p>
            <div className="flex gap-2 mb-3">
              {(['IMAGE', 'VIDEO'] as AdMediaType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setMediaType(t); setMediaUrl(''); setMediaPreview(''); }}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 border text-[10px] font-black uppercase tracking-widest transition-all ${
                    mediaType === t ? 'bg-[#1B3068] text-white border-blue-900' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {t === 'IMAGE' ? <ImageIcon className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  {t === 'IMAGE' ? 'Image' : 'Video (max 15s)'}
                </button>
              ))}
            </div>
            {mediaPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                {mediaType === 'IMAGE' ? (
                  <img src={mediaPreview} alt="Ad preview" className="w-full max-h-56 object-contain" />
                ) : (
                  <video src={mediaPreview} controls className="w-full max-h-56" />
                )}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 cursor-pointer hover:border-[#C9973A]/40 hover:text-[#C9973A] transition-all">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : mediaType === 'IMAGE' ? (
                  <ImageIcon className="w-6 h-6" />
                ) : (
                  <Video className="w-6 h-6" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  {uploading ? 'Uploading…' : `Upload ${mediaType === 'IMAGE' ? 'an image' : 'a short video'}`}
                </span>
                <input
                  type="file"
                  accept={mediaType === 'IMAGE' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm'}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {/* Placements — multi-select. Cost doesn't change with how many are
              picked, so there's deliberately no per-tile price. */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              Where should it appear?
            </p>
            <span className="block mb-2 text-[10px] font-medium text-slate-400">
              Pick as many as you like — showing in more places doesn't cost extra.
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {AD_PLACEMENTS.map((p) => {
                const selected = placements.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlacement(p)}
                    aria-pressed={selected}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selected ? 'border-[#C9973A] bg-[#fdf6e9]' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          selected ? 'bg-[#C9973A] border-[#C9973A]' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-black text-slate-900">{PLACEMENT_LABEL[p]}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {PLACEMENT_HELP[p]}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <FieldNote error={fieldErrors.placements} />
          </div>

          {/* Category targeting — only meaningful when the category rail is on */}
          {placements.includes('CATEGORY_SIDEBAR') && (
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Target category
              <select
                value={targetCategoryId}
                onChange={(e) => { setTargetCategoryId(e.target.value); setCategoryTouched(true); }}
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 tracking-normal normal-case bg-white focus:outline-none focus:border-[#C9973A]"
              >
                {myCategories.length > 0 && (
                  <optgroup label="Your categories">
                    {myCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={myCategories.length > 0 ? 'Other categories' : 'Categories'}>
                  {otherCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Everywhere">
                  <option value="">All categories</option>
                </optgroup>
              </select>
              <FieldNote
                help={
                  myCategories.length > 0
                    ? 'Starts on the category you registered under — change it if this ad is for something else. "All categories" runs everywhere but gives up the spot to a targeted ad.'
                    : 'Your ad shows to buyers browsing this category. "All categories" runs everywhere but gives up the spot to a targeted ad.'
                }
              />
            </label>
          )}

          {/* Campaign window */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
              When should it run?
            </p>
            <span className="block mb-2 text-[10px] font-medium text-slate-400">
              Both days are included. If we're still reviewing when your start date arrives, the whole
              run shifts forward — you never lose days you paid for.
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  Start date
                </span>
                <DateTimePicker
                  mode="date"
                  value={startDate}
                  onChange={(v) => {
                    setStartDate(v);
                    setFieldErrors((x) => ({ ...x, startDate: '', endDate: '' }));
                    // An end date now before the start is worse than none.
                    if (endDate && countAdDays(v, endDate) <= 0) setEndDate('');
                  }}
                  placeholder="Pick a start date"
                  error={!!fieldErrors.startDate}
                />
                <FieldNote error={fieldErrors.startDate} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                  End date
                </span>
                <DateTimePicker
                  mode="date"
                  value={endDate}
                  onChange={(v) => { setEndDate(v); setFieldErrors((x) => ({ ...x, endDate: '' })); }}
                  placeholder="Pick an end date"
                  error={!!fieldErrors.endDate}
                  // Can't end before it starts — the calendar just won't offer it.
                  minDate={parseISODate(startDate) ?? parseISODate(todayISO())}
                />
                <FieldNote error={fieldErrors.endDate} />
              </div>
            </div>
          </div>

          {/* Live price */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total cost</span>
              <span className="text-2xl font-black text-slate-900">ZMW {formatCurrency(price)}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {durationDays > 0 ? (
                <>
                  {durationDays} {durationDays === 1 ? 'day' : 'days'}
                  {startDate && endDate && <> · {prettyDate(startDate)} → {prettyDate(endDate)}</>}
                  {rates && <> · ZMW {formatCurrency(Number(rates.baseRatePerDay))}/day</>}
                </>
              ) : (
                'Pick your dates to see the price.'
              )}
            </p>
          </div>

          {formError && <p className="text-rose-500 font-bold text-[12px]">{formError}</p>}

          <Button
            onClick={handleCreate}
            disabled={creating || uploading || !mediaUrl}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2"
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue to payment
          </Button>
          <p className="-mt-2 text-center text-[11px] text-slate-400">
            Next you'll pay — that's what sends the ad to our review team.
          </p>
        </div>
      )}

      {/* ── My Ads ── */}
      {view === 'list' && !payingAd && (
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-lg font-black text-slate-900">My Ads</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">
              {myAds.length}
            </span>
          </div>

          {/* Unpaid ads are invisible to the reviewer, which is not obvious
              from a quiet row in a list — say it once, loudly, at the top. */}
          {unpaidAds.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[12px] font-black text-amber-900">
                  {unpaidAds.length} ad{unpaidAds.length === 1 ? '' : 's'} not submitted yet
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  We only send an ad for review once it's paid for, so these aren't with our team yet and
                  can't go live. Tap "Complete payment" on one to send it.
                </p>
                <button
                  type="button"
                  onClick={() => setPayingAd(unpaidAds[0])}
                  className="mt-2 text-[10px] font-black uppercase tracking-widest text-amber-800 hover:text-amber-900 underline underline-offset-2"
                >
                  Pay for "{unpaidAds[0].title}" →
                </button>
              </div>
            </div>
          )}

          {myAds.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-10 sm:p-16 text-center border border-slate-100 flex flex-col items-center justify-center shadow-sm">
              <img src={emptyStateImage} alt="No ads yet" className="w-40 h-40 sm:w-48 sm:h-48 object-contain opacity-90 mb-6" />
              <p className="text-slate-500 font-medium max-w-sm">
                You haven't placed any ads yet. Promote your shop on the homepage banner or a page sidebar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAds.map((ad) => {
                const status = ad.effectiveStatus ?? ad.status;
                return (
                  <div key={ad.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {ad.mediaType === 'IMAGE' ? (
                        <img src={ad.mediaUrl} alt={ad.title} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{ad.title}</h4>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${STATUS_STYLE[status]}`}>
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {placementSummary(ad)}
                        {' · '}ZMW {formatCurrency(Number(ad.totalPaidAmount))} · {ad.durationDays} days
                      </p>
                      {status === 'REJECTED' && ad.rejectionReason && (
                        <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                          <XCircle className="w-3 h-3 shrink-0" /> {ad.rejectionReason}
                        </p>
                      )}
                      {status === 'APPROVED' && ad.endDate && (
                        <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" /> Live until {new Date(ad.endDate).toLocaleDateString()}
                        </p>
                      )}
                      {status === 'PENDING_PAYMENT' && (
                        <>
                          <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" /> Not sent for review yet — pay to submit it.
                          </p>
                          <button
                            type="button"
                            onClick={() => setPayingAd(ad)}
                            className="mt-2 px-3 py-1.5 rounded-lg bg-[#C9973A] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#b8852f] transition-all"
                          >
                            Complete payment →
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {payingAd && (
        <PaymentSheet
          open={showPaymentSheet}
          onClose={() => setShowPaymentSheet(false)}
          title="Pay for Ad Placement"
          subtitle="Secure Transaction"
          amountMode="fixed"
          fixedAmount={Number(payingAd.totalPaidAmount)}
          methods={['mobile_money', 'card']}
          actionLabel={(amount) => `Pay ZMW ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          onSubmit={handleCheckoutSubmit}
          context={[
            { label: 'Ad', value: payingAd.title },
            { label: 'Placement', value: placementSummary(payingAd) },
          ]}
        />
      )}
    </div>
  );
}
