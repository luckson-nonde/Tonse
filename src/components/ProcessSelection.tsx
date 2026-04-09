import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, ClipboardList, Check, ArrowRight, ChevronLeft } from 'lucide-react';
import Button from './Button';

interface ProcessOption {
  id: 'express' | 'standard';
  label: string;
  icon: React.ElementType;
  description: string;
  steps: string[];
  badge?: string;
}

const PROCESS_OPTIONS: ProcessOption[] = [
  {
    id: 'express',
    label: 'Express',
    icon: Zap,
    description: 'Fast-track your inquiry. Receive a quotation and pay directly via your virtual account.',
    steps: ['Inquiry', 'Quotation', 'Payment'],
    badge: 'Quick & Simple'
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: ClipboardList,
    description: 'Full procurement workflow with purchase orders, confirmations, delivery tracking, and invoicing.',
    steps: ['Inquiry', 'Quotation', 'Purchase Order', 'Order Confirmation', 'Delivery', 'Invoice', 'Payment'],
    badge: 'Full Process'
  }
];

interface ProcessSelectionProps {
  onBack: () => void;
  onComplete: (processType: 'express' | 'standard') => void;
}

export default function ProcessSelection({ onBack, onComplete }: ProcessSelectionProps) {
  const [selectedProcess, setSelectedProcess] = useState<'express' | 'standard' | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1e293b]">
            Select Your Inquiry Process
          </h1>
          <p className="text-slate-500 mt-1">
            Choose the process that best fits your procurement needs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {PROCESS_OPTIONS.map((option) => {
          const isSelected = selectedProcess === option.id;
          const Icon = option.icon;

          return (
            <motion.button
              key={option.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedProcess(option.id)}
              className={`relative p-8 rounded-[32px] border-2 text-left transition-all flex flex-col h-full ${
                isSelected 
                  ? 'border-[#C9973A] bg-[#C9973A]/5 shadow-lg shadow-[#C9973A]/10' 
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
              }`}
            >
              {option.badge && (
                <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isSelected ? 'bg-[#C9973A] text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {option.badge}
                </div>
              )}

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                isSelected ? 'bg-[#C9973A] text-white' : 'bg-[#fffaf5] text-[#C9973A]'
              }`}>
                <Icon className="w-7 h-7" strokeWidth={1.5} />
              </div>

              <h3 className="text-xl font-serif font-bold text-[#1e293b] mb-3">
                {option.label} Process
              </h3>
              
              <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-grow">
                {option.description}
              </p>

              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Process Steps</p>
                <div className="flex flex-wrap gap-2">
                  {option.steps.map((step, idx) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${
                        isSelected ? 'bg-[#C9973A]/20 text-[#C9973A]' : 'bg-slate-50 text-slate-500'
                      }`}>
                        {step}
                      </span>
                      {idx < option.steps.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-6 right-6 -mt-1 -mr-1">
                  <div className="bg-[#C9973A] rounded-full p-1 shadow-sm">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="w-full sm:w-auto px-8"
        >
          Cancel
        </Button>
        <Button 
          onClick={() => selectedProcess && onComplete(selectedProcess)}
          disabled={!selectedProcess}
          className="w-full sm:w-auto px-12 py-4 text-lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
