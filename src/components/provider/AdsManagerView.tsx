import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import emptyStateImage from '../../assets/images/empty-states/owl_reading.webp';
import { formatCurrency } from '../../utils/financeUtils';
import { compressImage } from '../../utils/compressImage';
import { CATEGORIES_DB } from '../../services/categories';
import { apiClient } from '../../services/api/client';
import { ventureService } from '../../services/api/ventureService';
import {
  adsService,
  calculateAdPrice,
  Advertisement,
  AdPricingRates,
  AdPlacementLocation,
  AdMediaType,
  EffectiveAdStatus,
} from '../../services/api/adsService';
import PaymentSheet, { PaymentSheetSubmitPayload } from '../PaymentSheet';
import Button from '../Button';

const PLACEMENT_LABEL: Record<AdPlacementLocation, string> = {
  HOMEPAGE_CENTER: 'Homepage Center Banner',
  SECONDARY_SIDEBAR: 'Secondary Page Sidebar',
  CATEGORY_SIDEBAR: 'Category Page Sidebar',
  BUNDLE_ALL: 'Both (Bundle)',
};

/** Master categories a CATEGORY_SIDEBAR ad can target — the same list the
 *  buyer picks from, so ids line up with what the rail queries. */
const MASTER_CATEGORIES = CATEGORIES_DB.filter((c) => c.parentId === null);

const DURATION_PRESETS = [
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '1 Month', days: 30 },
  { label: '6 Months', days: 180 },
];

const STATUS_STYLE: Record<EffectiveAdStatus, string> = {
  PENDING_PAYMENT: 'bg-slate-100 text-slate-500 border border-slate-200',
  PENDING_APPROVAL: 'bg-[#fdf6e9] text-[#b07f24] border border-[#ecd9b3]',
  APPROVED: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-600 border border-rose-100',
  EXPIRED: 'bg-slate-100 text-slate-400 border border-slate-200',
};

const STATUS_LABEL: Record<EffectiveAdStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
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

/**
 * Seller "Advertise" surface — create a paid ad placement (homepage banner /
 * secondary-page sidebar), pay for it (venture balance or PSP checkout, same
 * sandbox-simulated engine as VentureAccountView), then track it through
 * admin review.
 */
export default function AdsManagerView() {
  const [rates, setRates] = useState<AdPricingRates | null>(null);
  const [myAds, setMyAds] = useState<Advertisement[]>([]);
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [view, setView] = useState<'list' | 'create'>('list');

  // Create-ad form state
  const [title, setTitle] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [mediaType, setMediaType] = useState<AdMediaType>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | undefined>(undefined);
  const [placementLocation, setPlacementLocation] = useState<AdPlacementLocation>('HOMEPAGE_CENTER');
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [durationDays, setDurationDays] = useState(7);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

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

  const resetForm = () => {
    setTitle('');
    setTargetUrl('');
    setMediaType('IMAGE');
    setMediaUrl('');
    setMediaPreview('');
    setVideoDurationSeconds(undefined);
    setPlacementLocation('HOMEPAGE_CENTER');
    setTargetCategoryId('');
    setDurationDays(7);
    setFormError('');
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

  const price = rates ? calculateAdPrice(placementLocation, durationDays, rates) : 0;

  const handleCreate = async () => {
    setFormError('');
    if (!title.trim()) return setFormError('Give your ad a title.');
    if (!targetUrl.trim()) return setFormError('Add a link — where should the ad send people?');
    if (!mediaUrl) return setFormError('Upload an image or video first.');
    setCreating(true);
    try {
      const ad = await adsService.createAd({
        title: title.trim(),
        targetUrl: targetUrl.trim(),
        mediaType,
        mediaUrl,
        videoDurationSeconds,
        placementLocation,
        targetCategoryId:
          placementLocation === 'CATEGORY_SIDEBAR' && targetCategoryId ? targetCategoryId : undefined,
        durationDays,
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
            {PLACEMENT_LABEL[payingAd.placementLocation]} · {payingAd.durationDays} days
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 20% off all repairs this month"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 tracking-normal normal-case focus:outline-none focus:border-[#C9973A]"
            />
          </label>

          <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Link
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="Where should this ad send people? e.g. your shop page"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 tracking-normal normal-case focus:outline-none focus:border-[#C9973A]"
            />
          </label>

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

          {/* Placement */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Placement</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(PLACEMENT_LABEL) as AdPlacementLocation[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlacementLocation(p)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    placementLocation === p ? 'border-[#C9973A] bg-[#fdf6e9]' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <p className="text-[11px] font-black text-slate-900">{PLACEMENT_LABEL[p]}</p>
                  {rates && (
                    <p className="text-[10px] text-slate-400 mt-0.5">ZMW {rates.baseRates[p]}/day</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Category targeting — only meaningful for the category rail */}
          {placementLocation === 'CATEGORY_SIDEBAR' && (
            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Target category
              <select
                value={targetCategoryId}
                onChange={(e) => setTargetCategoryId(e.target.value)}
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 tracking-normal normal-case bg-white focus:outline-none focus:border-[#C9973A]"
              >
                <option value="">All categories</option>
                {MASTER_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="block mt-1 text-[10px] font-medium normal-case tracking-normal text-slate-400">
                Your ad shows to buyers browsing this category. "All categories" runs everywhere but
                loses the spot to a targeted ad.
              </span>
            </label>
          )}

          {/* Duration */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">Duration</p>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setDurationDays(preset.days)}
                  className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    durationDays === preset.days ? 'bg-[#1B3068] text-white border-blue-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 focus:outline-none focus:border-[#C9973A]"
            />
          </div>

          {/* Live price */}
          <div className="bg-slate-50 rounded-2xl p-5 flex items-center justify-between border border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total cost</span>
            <span className="text-2xl font-black text-slate-900">ZMW {formatCurrency(price)}</span>
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
                        {PLACEMENT_LABEL[ad.placementLocation]}
                        {ad.placementLocation === 'CATEGORY_SIDEBAR' && (
                          <> · {MASTER_CATEGORIES.find((c) => c.id === ad.targetCategoryId)?.name ?? 'All categories'}</>
                        )}
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
                        <button
                          type="button"
                          onClick={() => setPayingAd(ad)}
                          className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#C9973A] hover:text-[#b8852f]"
                        >
                          Complete payment →
                        </button>
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
            { label: 'Placement', value: PLACEMENT_LABEL[payingAd.placementLocation] },
          ]}
        />
      )}
    </div>
  );
}
