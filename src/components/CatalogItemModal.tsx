import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import {
  X,
  Play,
  Package,
  CalendarCheck,
  ShoppingCart,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Maximize2,
} from 'lucide-react';
import ImageLightbox, { useImageLightbox } from './ImageLightbox';
import { toNumber } from '../services/api/discoverService';
import {
  extractYouTubeId,
  youTubeEmbedUrl,
  youTubeThumbnailUrl,
} from '../services/api/portfolioService';
import DateTimePicker from './DateTimePicker';
import QuantityStepper from './QuantityStepper';
import { hasListedPrice, type CatalogGridItem } from './CatalogItemGrid';

type Slide = { type: 'image'; src: string } | { type: 'video'; videoId: string };

interface CatalogItemModalProps {
  item: CatalogGridItem;
  /** SELLER shops sell goods (Buy Now when priced+stocked); SERVICE_PROVIDER
   *  shops take date-anchored bookings. */
  shopType: 'SELLER' | 'SERVICE_PROVIDER';
  shopName?: string;
  onClose: () => void;
  /** Phase B — create the booking inquiry. Absent = booking CTA hidden. */
  onBook?: (preferredDateTime: string, note: string) => Promise<void>;
  /** Phase C — perform the direct purchase (parent owns the simulated
   *  payment delay + API call). Absent = buy CTA hidden. */
  onBuy?: (quantity: number) => Promise<void>;
  /** Fallback CTA for listings that can't be booked/bought here (e.g. a
   *  priceless product) — typically prefills the shop's quote/PO flow. */
  onRequestQuote?: () => void;
  /** When set, the primary CTAs call this instead of opening book/buy —
   *  the parent stashes intent and routes a guest to login. */
  authGate?: () => void;
  /** Success-screen primary action (e.g. navigate to My Inquiries). */
  onDone?: () => void;
}

type Step = 'view' | 'book' | 'buy' | 'success';

const sectionLabel = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

/**
 * Buyer-facing listing detail — image/video gallery, description, price and
 * the transaction CTA (book a date, buy now, or request a quote). Bottom
 * sheet on mobile, centered card on desktop; opaque borders (Mali-GPU rule).
 */
export default function CatalogItemModal({
  item,
  shopType,
  shopName,
  onClose,
  onBook,
  onBuy,
  onRequestQuote,
  authGate,
  onDone,
}: CatalogItemModalProps) {
  const videoId = useMemo(() => extractYouTubeId(item.youtubeUrl ?? null), [item.youtubeUrl]);
  const slides = useMemo<Slide[]>(() => {
    const imgs: Slide[] = (item.images ?? []).filter(Boolean).map((src) => ({ type: 'image', src }));
    return videoId ? [...imgs, { type: 'video', videoId }] : imgs;
  }, [item.images, videoId]);

  /** Just the photos — the full-screen viewer shows images, not the video
   *  slide, so its indices are their own sequence. */
  const imageSlides = useMemo(
    () => slides.filter((s): s is Extract<Slide, { type: 'image' }> => s.type === 'image').map((s) => s.src),
    [slides],
  );
  const lightbox = useImageLightbox(imageSlides);

  const [slideIdx, setSlideIdx] = useState(0);
  const [step, setStep] = useState<Step>('view');
  const [successKind, setSuccessKind] = useState<'book' | 'buy'>('book');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Book step state
  const [preferredDateTime, setPreferredDateTime] = useState('');
  const [note, setNote] = useState('');

  // Buy step state
  const [quantity, setQuantity] = useState(1);

  const priced = hasListedPrice(item);
  const unitPrice = toNumber(item.price);
  const isSeller = shopType === 'SELLER';
  const soldOut = isSeller && item.stock === 0;
  const canBuy = isSeller && priced && !soldOut && (!!onBuy || !!authGate);
  const canBook = !isSeller && (!!onBook || !!authGate);
  const activeSlide = slides[slideIdx] as Slide | undefined;

  const bookLabel = priced ? 'Book at this price' : 'Check availability & price';

  const handleBookSubmit = async () => {
    if (!preferredDateTime) {
      setError('Pick the day on the calendar (time is optional).');
      return;
    }
    if (!onBook) return;
    setBusy(true);
    setError(null);
    try {
      await onBook(preferredDateTime, note.trim());
      setSuccessKind('book');
      setStep('success');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Could not send the request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleBuySubmit = async () => {
    if (!onBuy) return;
    setBusy(true);
    setError(null);
    try {
      await onBuy(quantity);
      setSuccessKind('buy');
      setStep('success');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Payment failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const dateLabel = useMemo(() => {
    if (!preferredDateTime) return '';
    try {
      return format(parseISO(preferredDateTime), preferredDateTime.includes('T') ? "EEEE d MMMM 'at' h:mm a" : 'EEEE d MMMM');
    } catch {
      return preferredDateTime;
    }
  }, [preferredDateTime]);

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-lg lg:max-w-2xl bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-xl border border-slate-200 flex flex-col max-h-[92vh]"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full transition-colors text-slate-600 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto">
          {step === 'success' ? (
            <div className="px-7 py-14 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h3 className="text-xl font-serif font-bold text-brand-dark mb-2">
                {successKind === 'buy' ? 'Order placed & paid' : 'Booking request sent'}
              </h3>
              <p className="text-[13px] text-slate-500 max-w-sm leading-relaxed">
                {successKind === 'buy'
                  ? `Payment received — ${shopName || 'the shop'} has been notified and your collection code is ready. Track everything under My Inquiries.`
                  : `${shopName || 'The shop'} will confirm ${priced ? 'availability for your date — the price is already fixed by the listing' : 'availability and price for your date'}. Track it under My Inquiries.`}
              </p>
              <div className="mt-8 flex gap-3 w-full max-w-xs">
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-[#f5f2ed] text-brand-dark text-sm font-bold rounded-xl hover:bg-[#ece7de] transition-colors"
                >
                  Close
                </button>
                {onDone && (
                  <button
                    onClick={onDone}
                    className="flex-1 py-3.5 bg-[#c9973a] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#c9973a]/30"
                  >
                    View my inquiries
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Gallery */}
              <div className="aspect-video sm:aspect-[2/1] bg-[#f1f5f9] relative">
                {activeSlide?.type === 'video' ? (
                  <iframe
                    src={youTubeEmbedUrl(activeSlide.videoId)}
                    title={`${item.name} — video`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : activeSlide?.type === 'image' ? (
                  /* The hero is cropped to the modal's ratio; clicking it
                     opens the uncropped photo full-screen, with the rest of
                     this item's photos one arrow/swipe away. */
                  <button
                    type="button"
                    onClick={() => {
                      const imageOnlyIdx = imageSlides.indexOf(activeSlide.src);
                      lightbox.openAt(imageOnlyIdx < 0 ? 0 : imageOnlyIdx);
                    }}
                    aria-label={`View ${item.name} photo full screen`}
                    className="group w-full h-full cursor-zoom-in"
                  >
                    <img
                      src={activeSlide.src}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-900/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                  </button>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-slate-300" />
                  </div>
                )}
              </div>
              {slides.length > 1 && (
                <div className="px-5 pt-3 flex gap-2 overflow-x-auto">
                  {slides.map((slide, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIdx(i)}
                      aria-label={slide.type === 'video' ? 'Play video' : `Photo ${i + 1}`}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${
                        i === slideIdx ? 'border-[#c9973a]' : 'border-[#e7e0d5]'
                      }`}
                    >
                      <img
                        src={slide.type === 'video' ? youTubeThumbnailUrl(slide.videoId) : slide.src}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {slide.type === 'video' && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="px-6 sm:px-7 py-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-dark leading-tight">
                    {item.name}
                  </h2>
                  {soldOut && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-[#1a1612] text-white px-2.5 py-1 rounded-full mt-1">
                      Sold out
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-baseline gap-3">
                  {priced ? (
                    <p className="text-lg font-black text-[#a97c27]">
                      ZMW {unitPrice.toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-sm font-bold text-slate-500">Price on request</p>
                  )}
                  {isSeller && !soldOut && typeof item.stock === 'number' && item.stock > 0 && (
                    <p className="text-[11px] font-semibold text-slate-400">
                      {item.stock} in stock
                    </p>
                  )}
                </div>

                {item.description && (
                  <p className="mt-4 text-[13.5px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                    {item.description}
                  </p>
                )}

                {/* Book step */}
                {step === 'book' && (
                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                    <div className="space-y-1.5">
                      <p className={sectionLabel}>When do you need it?</p>
                      <DateTimePicker
                        value={preferredDateTime}
                        onChange={setPreferredDateTime}
                        mode="datetime"
                        placeholder="Pick a day — time is optional"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className={sectionLabel}>Note to the shop (optional)</p>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        placeholder="Anything they should know?"
                        className="w-full p-3.5 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-sm text-brand-dark placeholder-slate-400 resize-none"
                      />
                    </div>
                    {priced && (
                      <p className="text-[11px] text-slate-500 bg-[#fffaf5] border border-[#e7e0d5] rounded-xl p-3">
                        The price is fixed by this listing — {shopName || 'the shop'} only
                        confirms availability{dateLabel ? ` for ${dateLabel}` : ''}.
                      </p>
                    )}
                  </div>
                )}

                {/* Buy step */}
                {step === 'buy' && (
                  <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <p className={sectionLabel}>Quantity</p>
                        <QuantityStepper
                          value={quantity}
                          onChange={setQuantity}
                          min={1}
                          max={item.stock}
                        />
                      </div>
                      <div className="text-right">
                        <p className={sectionLabel}>Total</p>
                        <p className="text-xl font-black text-[#a97c27] mt-1.5">
                          ZMW {(unitPrice * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 bg-[#fffaf5] border border-[#e7e0d5] rounded-xl p-3">
                      Paid into escrow — released to {shopName || 'the shop'} after you collect
                      your order.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="mt-4 text-sm text-red-600 bg-red-50 border border-[#fecaca] rounded-xl p-3">
                    {error}
                  </p>
                )}

                {/* CTA row */}
                <div className="mt-6 flex gap-3">
                  {step === 'view' && (
                    <>
                      {canBook && (
                        <button
                          onClick={() => (authGate ? authGate() : setStep('book'))}
                          className="flex-1 py-4 bg-[#c9973a] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#c9973a]/30 flex items-center justify-center gap-2"
                        >
                          <CalendarCheck className="w-4.5 h-4.5" />
                          {bookLabel}
                        </button>
                      )}
                      {canBuy && (
                        <button
                          onClick={() => (authGate ? authGate() : setStep('buy'))}
                          className="flex-1 py-4 bg-[#c9973a] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#c9973a]/30 flex items-center justify-center gap-2"
                        >
                          <ShoppingCart className="w-4.5 h-4.5" />
                          Buy now
                        </button>
                      )}
                      {isSeller && soldOut && (
                        <button
                          disabled
                          className="flex-1 py-4 bg-slate-100 text-slate-400 text-sm font-bold rounded-xl cursor-not-allowed"
                        >
                          Sold out
                        </button>
                      )}
                      {!canBuy && !soldOut && onRequestQuote && (
                        <button
                          onClick={onRequestQuote}
                          className={`flex-1 py-4 text-sm font-bold rounded-xl flex items-center justify-center gap-2 ${
                            canBook
                              ? 'bg-[#f5f2ed] text-brand-dark hover:bg-[#ece7de]'
                              : 'bg-[#c9973a] text-white shadow-lg shadow-[#c9973a]/30'
                          }`}
                        >
                          <MessageSquare className="w-4.5 h-4.5" />
                          Request a quote
                        </button>
                      )}
                    </>
                  )}
                  {step === 'book' && (
                    <>
                      <button
                        onClick={() => { setStep('view'); setError(null); }}
                        className="flex-1 py-4 bg-[#f5f2ed] text-brand-dark text-sm font-bold rounded-xl hover:bg-[#ece7de] transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBookSubmit}
                        disabled={busy}
                        className="flex-1 py-4 bg-[#c9973a] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#c9973a]/30 flex items-center justify-center gap-2"
                      >
                        {busy ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <CalendarCheck className="w-4.5 h-4.5" />}
                        {busy ? 'Sending…' : 'Send booking request'}
                      </button>
                    </>
                  )}
                  {step === 'buy' && (
                    <>
                      <button
                        onClick={() => { setStep('view'); setError(null); }}
                        disabled={busy}
                        className="flex-1 py-4 bg-[#f5f2ed] text-brand-dark text-sm font-bold rounded-xl hover:bg-[#ece7de] transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleBuySubmit}
                        disabled={busy}
                        className="flex-1 py-4 bg-[#c9973a] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#c9973a]/30 flex items-center justify-center gap-2"
                      >
                        {busy ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <ShoppingCart className="w-4.5 h-4.5" />}
                        {busy ? 'Processing payment…' : `Pay ZMW ${(unitPrice * quantity).toLocaleString()}`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Full-screen photo viewer — portals to the body, so it clears this
          modal rather than being clipped inside it. */}
      <ImageLightbox {...lightbox.props} title={item.name} />
    </div>
  );
}
