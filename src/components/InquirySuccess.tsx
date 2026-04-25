import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface InquirySuccessProps {
  onGoToDashboard: () => void;
}

export default function InquirySuccess({ onGoToDashboard }: InquirySuccessProps) {
  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center px-6 text-center py-12">
      {/* Success Icon */}
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-[#C9973A]/20 rounded-full animate-ping" />
        <div className="relative w-28 h-28 bg-[#C9973A] rounded-full flex items-center justify-center shadow-2xl shadow-[rgba(201,151,58,0.4)]">
          <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <h2 className="font-serif text-[32px] font-bold text-[#1a1a2e] mb-4 leading-tight">
        Inquiry Sent Successfully!
      </h2>
      <p className="font-sans text-[#94a3b8] text-[16px] max-w-[320px] mb-12 leading-relaxed font-medium">
        Your request has been delivered to the selected shops. You will be notified as soon as you
        receive quotations.
      </p>

      {/* Inquiry Details Card */}
      <div className="w-full bg-white rounded-3xl p-8 shadow-sm border border-[#f1f5f9] mb-12">
        <div className="flex justify-between items-center mb-5">
          <span className="font-sans text-[10px] font-bold text-[#94a3b8] tracking-[0.1em] uppercase">
            Inquiry ID
          </span>
          <span className="font-sans font-bold text-[#1a1a2e] text-[14px]">#INQ-8829</span>
        </div>
        <div className="h-px bg-[#f1f5f9] w-full mb-5"></div>
        <div className="flex justify-between items-center">
          <span className="font-sans text-[10px] font-bold text-[#94a3b8] tracking-[0.1em] uppercase">
            Status
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-sans font-bold text-[#1a1a2e] text-[14px]">Active & Pending</span>
          </div>
        </div>
      </div>

      {/* Dashboard Button */}
      <div className="w-full pt-4 pb-12 flex justify-center">
        <button
          onClick={onGoToDashboard}
          className="w-full sm:w-auto sm:px-16 h-13.5 bg-[#C9973A] rounded-[50px] flex items-center justify-center gap-2.5 font-sans text-[15px] font-semibold text-white tracking-[0.02em] shadow-[0_4px_16_rgba(201,151,58,0.35)] transition-all active:scale-[0.98]"
        >
          Go to Dashboard <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
