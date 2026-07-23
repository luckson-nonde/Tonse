import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useLiteMotion } from '../hooks/useLiteMotion';
import {
  Zap,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileCheck,
  GitBranch,
} from 'lucide-react';

interface ProcessSelectionProps {
  onBack: () => void;
  onComplete: (processType: 'express' | 'standard') => void;
}

interface ProcessOption {
  /** Internal id — the backend stores processType from this; display copy only
   *  ever uses `label`. */
  id: 'express' | 'standard';
  label: string;
  icon: React.ElementType;
  /** Kicker line shown beside the icon chip (rendered uppercase). */
  kicker: string;
  description: string;
  /** Journey steps shown as pill chips in the conveyor strip. */
  steps: string[];
  /** Loop duration — tuned per step count so both strips move at the same
   *  visual pace. */
  conveyorSeconds: number;
}

const PROCESS_OPTIONS: ProcessOption[] = [
  {
    id: 'express',
    label: 'Quick buy',
    icon: Zap,
    kicker: 'Quick & simple',
    description: 'Send an inquiry, get a quote, pay, and collect. The fastest way through.',
    steps: ['Inquiry', 'Quotation', 'Pay', 'Collect'],
    conveyorSeconds: 16,
  },
  {
    id: 'standard',
    label: 'Formal purchase',
    icon: FileText,
    kicker: 'For businesses',
    description: 'Everything in Quick buy, plus official purchase orders and a tax invoice.',
    steps: ['Inquiry', 'Quotation', 'Purchase order', 'Pay', 'Tax invoice'],
    conveyorSeconds: 20,
  },
];

export default function ProcessSelection({ onBack, onComplete }: ProcessSelectionProps) {
  const [selectedProcess, setSelectedProcess] = useState<'express' | 'standard' | null>(null);
  // Android-GPU ghosting guard (see useLiteMotion.ts): on touch devices drop
  // the transform-based hover lift.
  const lite = useLiteMotion();
  const hasProceededRef = useRef(false);

  // Below lg (1024px) the Continue footer is hidden, so a tap must both select
  // and advance in one gesture. Breakpoint is resolved at click time (mirrors
  // RoleSelection) so tablet rotation between mount and tap can't go stale.
  const handleSelect = (id: 'express' | 'standard') => {
    setSelectedProcess(id);
    const isDesktop =
      typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (!isDesktop) {
      if (hasProceededRef.current) return;
      hasProceededRef.current = true;
      onComplete(id);
    }
  };

  const selectedOption = selectedProcess
    ? PROCESS_OPTIONS.find((o) => o.id === selectedProcess)
    : null;
  const SelectedIcon = selectedOption?.icon ?? GitBranch;

  return (
    <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Conveyor strip: plain CSS keyframes (no framer-motion transforms — see
          android-gpu-ghosting skill). Pauses on card hover; under OS
          reduced-motion it degrades to a static wrapped row with the duplicate
          copy and the edge mask removed. */}
      <style>{`
        @keyframes tonse-conveyor-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .tonse-conveyor { animation: tonse-conveyor-slide 16s linear infinite; }
        .tonse-card:hover .tonse-conveyor { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) {
          .tonse-conveyor { animation: none; flex-wrap: wrap; }
          .tonse-conveyor-dup { display: none; }
          .tonse-conveyor-wrap { mask-image: none; -webkit-mask-image: none; }
        }
      `}</style>

      {/* Mobile-only sticky header */}
      <div className="lg:hidden sticky top-0 z-30 px-4 pt-4 pb-4 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            HOW TO BUY
          </p>
        </div>
        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            Procurement Path
          </h1>
          <p className="mt-1 text-[12px] text-[#1a1a2e]/60 font-medium leading-snug">
            Pick how you want to buy. You can switch anytime before you pay.
          </p>
          <div className="h-px bg-gradient-to-r from-[#C9973A] to-transparent mt-3" />
        </div>
      </div>

      <div className="p-3 lg:p-10 xl:p-12">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
          {/* Desktop left explainer — sticky */}
          <div className="hidden lg:flex flex-col gap-6 w-full lg:w-[320px] xl:w-[400px] shrink-0 lg:sticky lg:top-12">
            <div className="bg-white/40 backdrop-blur-sm border border-white rounded-[32px] p-7 shadow-sm">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider mb-7 hover:gap-3 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="space-y-4">
                <div className="w-14 h-14 bg-[#FAF5EB] rounded-2xl flex items-center justify-center text-[#C9973A]">
                  <GitBranch className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
                  How to Buy
                </p>
                <h1 className="font-serif text-[28px] lg:text-[32px] font-bold text-[#1a1a2e] leading-[1.1]">
                  Choose Your <span className="text-[#C9973A]">Procurement</span> Path
                </h1>
                <p className="text-[13px] text-[#1a1a2e]/60 leading-relaxed font-medium">
                  Pick how you want to buy. You can switch anytime before you pay.
                </p>
              </div>
            </div>

            {/* Why this matters */}
            <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#F7EFE1] rounded-[32px] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-0.5">
                    ProQuote Tip
                  </p>
                  <h3 className="font-serif text-[16px] font-bold text-[#1a1a2e] leading-snug">
                    Pick the right pace
                  </h3>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <Zap className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/75 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Quick buy</span> skips paperwork — quote, pay, done. Best for urgent or low-value buys.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/75 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Formal purchase</span> adds official purchase orders and a tax invoice for company records.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/75 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Either path</span> uses the same provider network and escrow protection.
                  </p>
                </li>
              </ul>
            </div>
          </div>

          {/* Right content — no panel: cards sit directly on the cream
              background as raised, tappable surfaces (per mockup) */}
          <div className="flex-1 w-full min-w-0">
            <div>
              {/* Option cards — the card IS the button; on mobile a tap
                  proceeds immediately, on desktop selection arms Continue */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-5">
                {PROCESS_OPTIONS.map((option) => {
                  const isSelected = selectedProcess === option.id;
                  const Icon = option.icon;

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option.id)}
                      {...(lite ? {} : { whileHover: { y: -3 } })}
                      className={`tonse-card group relative text-left p-4 lg:p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 active:scale-[0.99] ${
                        isSelected
                          ? 'border-[#C9973A] bg-[#FAF3E3] shadow-[0_8px_28px_-14px_rgba(201,151,58,0.45)]'
                          : 'border-[#e8e4dc] bg-[#FDF9F0] hover:border-[#E9D5B0] shadow-[0_12px_28px_-18px_rgba(107,86,43,0.4)]'
                      }`}
                    >
                      {/* Icon chip · kicker · arrow (the selection cue: gold → navy) */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            option.id === 'express'
                              ? 'bg-[#C9973A] text-white'
                              : 'bg-white border border-[#C9973A] text-[#C9973A]'
                          }`}
                        >
                          <Icon className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C9973A] truncate">
                          {option.kicker}
                        </p>
                        <div
                          className={`ml-auto w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white transition-colors duration-300 ${
                            isSelected ? 'bg-[#1B3068]' : 'bg-[#C9973A]'
                          }`}
                        >
                          <ArrowRight className="w-4 h-4" strokeWidth={2.25} />
                        </div>
                      </div>

                      <h3 className="font-serif text-[19px] lg:text-[20px] font-bold text-[#1a1a2e] mb-1.5">
                        {option.label}
                      </h3>

                      <p className="text-[12px] lg:text-[13px] text-[#1a1a2e]/60 font-medium leading-relaxed">
                        {option.description}
                      </p>

                      {/* Step conveyor — a slow looping train of the journey.
                          Two identical copies make the -50% translate seamless;
                          the second is aria-hidden and dropped under
                          reduced-motion. */}
                      <div className="tonse-conveyor-wrap relative mt-3.5 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
                        <div
                          className="tonse-conveyor flex w-max items-center"
                          style={{ animationDuration: `${option.conveyorSeconds}s` }}
                        >
                          {[0, 1].map((copy) => (
                            <div
                              key={copy}
                              aria-hidden={copy === 1}
                              className={`flex items-center gap-1.5 pr-1.5 ${
                                copy === 1 ? 'tonse-conveyor-dup' : ''
                              }`}
                            >
                              {option.steps.map((step) => (
                                <React.Fragment key={step}>
                                  <span className="px-2.5 py-1 rounded-full bg-white border border-[#e8e4dc] text-[10px] font-bold text-[#1a1a2e] whitespace-nowrap shadow-sm">
                                    {step}
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-[#C9973A] shrink-0" />
                                </React.Fragment>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Plain-language nudge — mobile only; desktop has the footer */}
              <p className="lg:hidden mt-4 px-2 text-center text-[11px] text-[#1a1a2e]/60 font-medium leading-relaxed">
                Tap a path to continue. Not sure?{' '}
                <span className="font-bold text-[#1a1a2e]">Quick buy</span> covers most orders — pick{' '}
                <span className="font-bold text-[#1a1a2e]">Formal purchase</span> if you need company or tax paperwork.
              </p>

              {/* Footer — desktop-only; below lg a tap on a card proceeds
                  directly and Back lives in the sticky mobile header */}
              <div className="hidden lg:flex mt-6 p-4 bg-white border border-[#e8e4dc] rounded-[24px] lg:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedProcess
                        ? 'bg-[#FAF5EB] text-[#C9973A]'
                        : 'bg-[#f1f5f9] text-[#94a3b8]'
                    }`}
                  >
                    <SelectedIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#94a3b8] mb-0.5">
                      Selection
                    </p>
                    <p className="text-[14px] font-serif font-bold text-[#1a1a2e] truncate">
                      {selectedOption ? selectedOption.label : 'Awaiting selection'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={onBack}
                    className="px-6 py-3 bg-white border border-[#f1f5f9] text-[#94a3b8] rounded-full font-bold text-[11px] uppercase tracking-[0.15em] hover:bg-[#f8fafc] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => selectedProcess && onComplete(selectedProcess)}
                    disabled={!selectedProcess}
                    className={`px-8 py-3 rounded-full font-bold text-[11px] uppercase tracking-[0.15em] transition-all ${
                      selectedProcess
                        ? 'bg-[#C9973A] text-white shadow-[0_8px_24px_-8px_rgba(201,151,58,0.45)] hover:bg-[#b8861e] active:scale-[0.98]'
                        : 'bg-[#f1f5f9] text-[#cbd5e1] cursor-not-allowed'
                    }`}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
