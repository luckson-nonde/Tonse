import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  ClipboardList,
  Check,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Clock,
  FileCheck,
  Truck,
  Receipt,
  CreditCard,
  MessageSquare,
  GitBranch,
} from 'lucide-react';

interface ProcessSelectionProps {
  onBack: () => void;
  onComplete: (processType: 'express' | 'standard') => void;
}

interface ProcessOption {
  id: 'express' | 'standard';
  label: string;
  icon: React.ElementType;
  description: string;
  benefits: string[];
  steps: { label: string; icon: React.ElementType }[];
  badge?: string;
  estimate: string;
}

const PROCESS_OPTIONS: ProcessOption[] = [
  {
    id: 'express',
    label: 'Express',
    icon: Zap,
    description:
      'Fast-track your procurement for immediate needs. Ideal for urgent repairs or simple product orders.',
    benefits: ['Real-time responses', 'One-click payments', 'Instant activation'],
    steps: [
      { label: 'Inquiry', icon: MessageSquare },
      { label: 'Quotation', icon: Sparkles },
      { label: 'Payment', icon: CreditCard },
    ],
    badge: 'Quick & Simple',
    estimate: '30m – 2h',
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: ClipboardList,
    description:
      'Full enterprise procurement workflow. Best for complex projects requiring formal approvals and documentation.',
    benefits: ['Formal PO generation', 'Milestone tracking', 'Tax-ready invoicing'],
    steps: [
      { label: 'Inquiry', icon: MessageSquare },
      { label: 'Quotation', icon: Sparkles },
      { label: 'PO', icon: FileCheck },
      { label: 'Confirmation', icon: ShieldCheck },
      { label: 'Delivery', icon: Truck },
      { label: 'Invoice', icon: Receipt },
      { label: 'Payment', icon: CreditCard },
    ],
    badge: 'Enterprise Flow',
    estimate: '1 – 3 Days',
  },
];

const ProcessIllustration = ({ processId }: { processId: 'express' | 'standard' | null }) => {
  if (!processId) {
    return (
      <div className="bg-[#f8fafc] rounded-2xl border border-dashed border-[#e2e8f0] p-5 text-center">
        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[0.18em]">
          Hover or select a workflow to preview the process
        </p>
      </div>
    );
  }

  const option = PROCESS_OPTIONS.find((o) => o.id === processId)!;

  return (
    <div className="bg-white rounded-2xl border border-[#f1f5f9] p-5 shadow-sm shadow-[#1a1a2e]/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A]">
            Live Preview
          </p>
          <span className="text-[#e2e8f0]">·</span>
          <p className="text-[11px] font-bold text-[#1a1a2e]">{option.label} Workflow</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f8fafc] rounded-full">
          <Clock className="w-3 h-3 text-[#94a3b8]" />
          <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-wider">
            {option.estimate}
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-5 left-2 right-2 h-0.5 bg-[#f1f5f9]" />
        <motion.div
          key={processId}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="absolute top-5 left-2 right-2 h-0.5 bg-gradient-to-r from-[#C9973A] to-[#1B3068] origin-left"
        />

        <div
          className={`grid gap-2 relative ${
            option.steps.length <= 3
              ? 'grid-cols-3'
              : 'grid-cols-4 sm:grid-cols-7'
          }`}
        >
          {option.steps.map((step, idx) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#f1f5f9] shadow-sm relative z-10">
                <step.icon className="w-4 h-4 text-[#C9973A]" strokeWidth={1.75} />
              </div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-[#1a1a2e] mt-2 leading-tight">
                {step.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function ProcessSelection({ onBack, onComplete }: ProcessSelectionProps) {
  const [selectedProcess, setSelectedProcess] = useState<'express' | 'standard' | null>(null);
  const [hoveredProcess, setHoveredProcess] = useState<'express' | 'standard' | null>(null);

  const activeProcess = hoveredProcess || selectedProcess;

  return (
    <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full min-h-screen bg-[#f5f2ed]">
      {/* Mobile-only sticky header */}
      <div className="md:hidden sticky top-0 z-30 px-4 pt-4 pb-5 bg-[#f5f2ed]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">
            STEP 04 / WORKFLOW
          </p>
        </div>
        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            Procurement Path
          </h1>
        </div>
      </div>

      <div className="p-4 md:p-8 lg:p-10 xl:p-12">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Desktop left explainer — sticky */}
          <div className="hidden md:flex flex-col gap-6 w-full md:w-[320px] lg:w-[400px] shrink-0 md:sticky md:top-12">
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-[32px] p-7 shadow-sm">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider mb-7 hover:gap-3 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <div className="space-y-4">
                <div className="w-14 h-14 bg-[#C9973A]/10 rounded-2xl flex items-center justify-center text-[#C9973A]">
                  <GitBranch className="w-7 h-7" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#C9973A]">
                  Step 04 / Workflow
                </p>
                <h1 className="font-serif text-[28px] lg:text-[32px] font-bold text-[#1a1a2e] leading-[1.1]">
                  Choose Your <span className="text-[#C9973A]">Procurement</span> Path
                </h1>
                <p className="text-[13px] text-[#1a1a2e]/60 leading-relaxed font-medium">
                  From lightning-fast individual requests to comprehensive enterprise workflows, select the process that aligns with your needs.
                </p>
              </div>
            </div>

            {/* Why this matters */}
            <div className="bg-gradient-to-br from-[#fdf6e9]/70 to-[#fdf6e9]/30 border border-[#C9973A]/15 rounded-[32px] p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#fdf6e9] to-[#f3e3bd] text-[#C9973A] flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#C9973A] mb-0.5">
                    Tonse Tip
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
                    <span className="font-bold text-[#1a1a2e]">Express</span> skips paperwork — quote, pay, done. Best for urgent or low-value buys.
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-[#C9973A] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[#1a1a2e]/75 leading-relaxed">
                    <span className="font-bold text-[#1a1a2e]">Standard</span> generates POs, delivery notes and invoices for tax-ready records.
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

          {/* Right content */}
          <div className="flex-1 w-full min-w-0">
            <div className="bg-white border border-[#f1f5f9] rounded-[32px] p-5 md:p-7 xl:p-8 shadow-sm shadow-[#1a1a2e]/[0.02]">
              {/* Options grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {PROCESS_OPTIONS.map((option) => {
                  const isSelected = selectedProcess === option.id;
                  const Icon = option.icon;

                  return (
                    <motion.button
                      key={option.id}
                      type="button"
                      onMouseEnter={() => setHoveredProcess(option.id)}
                      onMouseLeave={() => setHoveredProcess(null)}
                      onClick={() => setSelectedProcess(option.id)}
                      whileHover={{ y: -3 }}
                      className={`group relative text-left p-5 lg:p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'border-[#C9973A] bg-[#C9973A]/5 shadow-lg shadow-[#C9973A]/10'
                          : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                              isSelected
                                ? 'bg-[#C9973A] text-white'
                                : 'bg-[#f8fafc] text-[#94a3b8] group-hover:bg-[#C9973A]/10 group-hover:text-[#C9973A]'
                            }`}
                          >
                            <Icon className="w-6 h-6" strokeWidth={1.75} />
                          </div>
                          {option.badge && (
                            <span
                              className={`text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-lg ${
                                isSelected
                                  ? 'bg-[#C9973A] text-white'
                                  : 'bg-[#f8fafc] text-[#94a3b8]'
                              }`}
                            >
                              {option.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="text-[18px] lg:text-[20px] font-serif font-bold text-[#1a1a2e] mb-2">
                          {option.label} Workflow
                        </h3>

                        <p className="text-[12px] text-[#1a1a2e]/60 font-medium leading-relaxed mb-4">
                          {option.description}
                        </p>

                        <div className="space-y-2 mt-auto">
                          {option.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-[#f1f5f9] text-[#94a3b8]'
                                }`}
                              >
                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                              </div>
                              <span className="text-[10px] font-bold text-[#1a1a2e]/70 uppercase tracking-wider">
                                {benefit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div
                          layoutId="selectedIndicator"
                          className="absolute -top-2 -right-2 w-8 h-8 bg-[#C9973A] rounded-xl flex items-center justify-center shadow-lg shadow-[#C9973A]/30 rotate-12"
                        >
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Compact illustration */}
              <div className="mt-5">
                <ProcessIllustration processId={activeProcess} />
              </div>

              {/* Footer */}
              <div className="mt-6 pt-5 border-t border-[#f1f5f9] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedProcess
                        ? 'bg-[#C9973A]/10 text-[#C9973A]'
                        : 'bg-[#f1f5f9] text-[#94a3b8]'
                    }`}
                  >
                    {selectedProcess === 'express' ? (
                      <Zap className="w-5 h-5" />
                    ) : selectedProcess === 'standard' ? (
                      <ClipboardList className="w-5 h-5" />
                    ) : (
                      <GitBranch className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#94a3b8] mb-0.5">
                      Selection
                    </p>
                    <p className="text-[14px] font-serif font-bold text-[#1a1a2e] truncate">
                      {selectedProcess
                        ? `${selectedProcess.charAt(0).toUpperCase() + selectedProcess.slice(1)} Workflow`
                        : 'Awaiting selection'}
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
