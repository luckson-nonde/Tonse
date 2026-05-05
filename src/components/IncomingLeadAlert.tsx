import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Clock, Users, ArrowRight, X, MapPin } from 'lucide-react';
import type { InquiryResponse } from '../services/api/inquiryService';

/**
 * IncomingLeadAlert
 *
 * Uber-driver-style alert that fires when a brand-new matched lead
 * lands in the provider's queue. It's deliberately hard to ignore:
 * full-screen overlay, repeating WebAudio ping, vibration burst on
 * supporting devices, big countdown to the response deadline, and
 * a slots-remaining badge that updates live as peers quote.
 *
 * The alert is single-instance: if multiple leads arrive on the same
 * poll, the consumer is expected to queue them and feed one at a time.
 */
interface IncomingLeadAlertProps {
  lead: InquiryResponse | null;
  onAccept: (lead: InquiryResponse) => void;
  onDismiss: () => void;
}

function formatRemaining(deadlineIso?: string): string {
  if (!deadlineIso) return '';
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) return 'Closed';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

// WebAudio synthesised "incoming" chirp — no asset file needed. Two
// quick sine sweeps with a short envelope so it sounds like a soft
// notification ping rather than an obnoxious siren.
function playIncomingChime() {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    const ctx: AudioContext = new Ctor();
    const beep = (atSec: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + atSec);
      gain.gain.setValueAtTime(0, ctx.currentTime + atSec);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + atSec + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + atSec + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + atSec);
      osc.stop(ctx.currentTime + atSec + 0.34);
    };
    beep(0, 880);
    beep(0.18, 1175);
    return ctx;
  } catch {
    return null;
  }
}

export default function IncomingLeadAlert({ lead, onAccept, onDismiss }: IncomingLeadAlertProps) {
  const [, force] = useState(0); // tick for countdown re-render
  const audioRepeatRef = useRef<number | null>(null);

  // Drive the live countdown by re-rendering once per second while
  // the alert is open. Cheap — just a state bump.
  useEffect(() => {
    if (!lead) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [lead]);

  // Vibration + audio + repeat-ping for 9 seconds or until dismissed,
  // whichever comes first. Vibration silently no-ops on desktop /
  // unsupported browsers. Audio requires a prior user gesture in the
  // tab; if blocked, we just stay silent — the modal still flashes.
  useEffect(() => {
    if (!lead) return;
    try { (navigator as any).vibrate?.([350, 180, 350, 180, 600]); } catch {}
    playIncomingChime();
    audioRepeatRef.current = window.setInterval(() => {
      try { (navigator as any).vibrate?.([200, 120, 200]); } catch {}
      playIncomingChime();
    }, 3000);
    const stop = window.setTimeout(() => {
      if (audioRepeatRef.current != null) {
        clearInterval(audioRepeatRef.current);
        audioRepeatRef.current = null;
      }
    }, 9000);
    return () => {
      clearTimeout(stop);
      if (audioRepeatRef.current != null) {
        clearInterval(audioRepeatRef.current);
        audioRepeatRef.current = null;
      }
      try { (navigator as any).vibrate?.(0); } catch {}
    };
  }, [lead?.id]);

  if (!lead) return null;

  const slotsTotal = lead.maxQuotes ?? 3;
  const slotsTaken = lead.quoteCount ?? 0;
  const slotsRemaining = Math.max(0, slotsTotal - slotsTaken);
  const slotsFull = slotsRemaining === 0;
  const remaining = formatRemaining(lead.responseDeadlineAt);
  const expired = remaining === 'Closed';

  return (
    <AnimatePresence>
      <motion.div
        key="lead-alert-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', damping: 18, stiffness: 240 }}
          className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
        >
          {/* Pulsing top banner */}
          <div className="relative bg-gradient-to-br from-[#C9973A] to-[#a37d35] px-6 py-5 text-white">
            <motion.div
              className="absolute inset-0 bg-white/20"
              animate={{ opacity: [0.05, 0.25, 0.05] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <div className="relative flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0"
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              >
                <Bell className="w-6 h-6" />
              </motion.div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">New Lead Match</p>
                <h3 className="text-lg font-serif font-black leading-tight truncate">{lead.title}</h3>
              </div>
              <button
                onClick={onDismiss}
                aria-label="Dismiss alert"
                className="p-2 hover:bg-white/15 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Countdown + slots */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-2xl border-2 p-4 ${expired ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock className={`w-3.5 h-3.5 ${expired ? 'text-rose-500' : 'text-slate-400'}`} />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Respond In</p>
                </div>
                <p className={`text-lg font-black ${expired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {remaining || '—'}
                </p>
              </div>
              <div className={`rounded-2xl border-2 p-4 ${slotsFull ? 'border-rose-200 bg-rose-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Users className={`w-3.5 h-3.5 ${slotsFull ? 'text-rose-500' : 'text-emerald-500'}`} />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Slots Left</p>
                </div>
                <p className={`text-lg font-black ${slotsFull ? 'text-rose-600' : 'text-slate-900'}`}>
                  {slotsRemaining} <span className="text-xs font-bold text-slate-400">/ {slotsTotal}</span>
                </p>
              </div>
            </div>

            {/* Description preview */}
            {lead.description && (
              <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-3">
                {lead.description}
              </p>
            )}

            {/* Location */}
            {lead.location && (
              <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-medium truncate">{lead.location}</span>
              </div>
            )}

            {/* CTAs */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onDismiss}
                className="flex-1 py-3.5 border-2 border-slate-200 text-slate-700 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-colors"
              >
                Later
              </button>
              <button
                onClick={() => onAccept(lead)}
                disabled={slotsFull || expired}
                className="flex-1 py-3.5 bg-[#1B3068] text-white font-black text-sm rounded-2xl hover:bg-[#142550] transition-colors shadow-lg shadow-[#1B3068]/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {slotsFull ? 'Slots Full' : expired ? 'Closed' : (
                  <>Quote Now<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
