import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X } from 'lucide-react';
import ConfettiBurst from './ConfettiBurst';

export interface MilestoneUnlockedPayload {
  milestoneTitle: string;
  sharesAwarded: number;
  totalEquityShares: number;
}

/**
 * Celebratory full-screen moment when a promoter's referral milestone
 * unlocks (MILESTONE_UNLOCKED over SSE). Pattern-reuse of
 * IncomingLeadAlert's structure — overlay + WebAudio-synthesized chime
 * (no audio asset) — with confetti instead of a countdown, since there's
 * nothing to race here, only something to enjoy.
 */

// Rising major-arpeggio chime — same synth approach as IncomingLeadAlert's
// playIncomingChime, retuned to read as "achievement" rather than "urgent".
function playCelebrationChime() {
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx: AudioContext = new Ctor();
    const beep = (atSec: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + atSec);
      gain.gain.setValueAtTime(0, ctx.currentTime + atSec);
      gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + atSec + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + atSec + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + atSec);
      osc.stop(ctx.currentTime + atSec + 0.42);
    };
    beep(0, 659.25); // E5
    beep(0.14, 830.61); // G#5
    beep(0.28, 987.77); // B5
    beep(0.42, 1318.51); // E6
  } catch {
    /* audio is a nicety — never block the moment */
  }
}

export default function MilestoneUnlockedAlert({
  payload,
  onDismiss,
}: {
  payload: MilestoneUnlockedPayload | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!payload) return;
    playCelebrationChime();
    try {
      (navigator as any).vibrate?.([120, 80, 120]);
    } catch {
      /* ignore */
    }
  }, [payload]);

  return (
    <AnimatePresence>
      {payload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center px-4 bg-[#0f1023]/70 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <ConfettiBurst active />
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-8 text-center shadow-[0_30px_80px_-20px_rgba(15,16,35,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-[#1a1a2e] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shadow-gold-glow animate-pulse">
              <Trophy className="w-8 h-8" />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
              Milestone Unlocked
            </p>
            <h2 className="font-serif text-2xl font-black text-[#1a1a2e] leading-tight mb-3">
              {payload.milestoneTitle}
            </h2>

            <div className="grid grid-cols-2 gap-3 my-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="font-serif text-[26px] font-black text-[#1a1a2e] leading-none">
                  +{payload.sharesAwarded}
                </p>
                <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">
                  Shares Awarded
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="font-serif text-[26px] font-black text-[#1a1a2e] leading-none">
                  {payload.totalEquityShares}
                </p>
                <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#C9973A]">
                  Total Shares
                </p>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="w-full py-3.5 bg-[#C9973A] hover:bg-[#b8852f] rounded-full font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16px_rgba(201,151,58,0.35)] transition-all active:scale-95"
            >
              Keep promoting
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
