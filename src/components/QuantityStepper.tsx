import React from 'react';
import { motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}

/**
 * The on-brand quantity stepper — extracted from DynamicInquiryForm's
 * `counter` field renderer so Buy-Now and other flows reuse one component
 * instead of hand-rolling Minus/Plus rows.
 */
export default function QuantityStepper({ value, onChange, min = 1, max }: QuantityStepperProps) {
  const clamped = Math.max(min, Math.min(max ?? Infinity, Number(value) || min));
  return (
    <div className="flex items-center bg-white border-[1.5px] border-[#e2e8f0] rounded-xl overflow-hidden w-fit min-w-40">
      <motion.button
        whileTap={{ scale: 0.88 }}
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, clamped - 1))}
        disabled={clamped <= min}
        className="px-4 py-3 text-slate-500 disabled:text-slate-200 hover:bg-slate-50 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </motion.button>
      <div className="flex-1 text-center px-4 font-serif text-[22px] font-bold text-[#C9973A]">
        {clamped}
      </div>
      <motion.button
        whileTap={{ scale: 0.88 }}
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max ?? Infinity, clamped + 1))}
        disabled={max !== undefined && clamped >= max}
        className="px-4 py-3 text-slate-500 disabled:text-slate-200 hover:bg-slate-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
