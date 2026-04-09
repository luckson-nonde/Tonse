import React, { useState } from 'react';
import { ChevronDown, Check, Navigation, Settings, Clock, Building2, Store, ChevronLeft } from 'lucide-react';

interface InquiryPreferencesProps {
  onBack: () => void;
  onNext: (preferences: {
    destination: string;
    validity: string;
    maxQuotes: string;
    isConfidential: boolean;
    leadTime: string;
  }) => void;
}

export default function InquiryPreferences({ onBack, onNext }: InquiryPreferencesProps) {
  const [destination, setDestination] = useState<'chain' | 'local' | 'service'>('chain');
  const [validity, setValidity] = useState<'7' | '15' | '30'>('7');
  const [maxQuotes, setMaxQuotes] = useState('10');
  const [isConfidential, setIsConfidential] = useState(false);
  const [leadTime, setLeadTime] = useState('1-2 weeks');

  const handleNext = () => {
    onNext({
      destination,
      validity: `${validity} Days`,
      maxQuotes,
      isConfidential,
      leadTime
    });
  };

  const labelClasses = "block text-[10px] font-bold text-[#94a3b8] tracking-[0.1em] uppercase mb-2 ml-1 font-sans";

  return (
    <div className="max-w-[480px] mx-auto w-full bg-[#f5f2ed] min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-[#f5f2ed] z-20 px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="w-10 h-10 -ml-2 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" />
          </button>
          <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-[#C9973A] font-bold">STEP 2</p>
        </div>
        
        <div className="mt-2">
          <h1 className="font-serif text-[22px] font-bold text-[#1a1a2e] leading-tight">
            Preferences
          </h1>
        </div>
      </div>

      <div className="p-[20px_16px_140px_16px] flex flex-col gap-6">
        {/* Destination */}
        <div className="flex flex-col gap-5">
          <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
              <Navigation className="w-4 h-4 text-[#C9973A]" />
            </div>
            Target Destination
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div 
              onClick={() => setDestination('chain')}
              className={`p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all relative flex flex-col items-center gap-2 text-center ${destination === 'chain' ? 'border-[#C9973A] bg-[rgba(201,151,58,0.03)]' : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'}`}
            >
              {destination === 'chain' && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-[#C9973A] rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                </div>
              )}
              <Building2 className={`w-6 h-6 transition-colors ${destination === 'chain' ? 'text-[#C9973A]' : 'text-[#94a3b8]'}`} />
              <p className={`font-sans font-bold text-[11px] leading-tight transition-colors ${destination === 'chain' ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}>Chain Stores</p>
            </div>
            <div 
              onClick={() => setDestination('local')}
              className={`p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all relative flex flex-col items-center gap-2 text-center ${destination === 'local' ? 'border-[#C9973A] bg-[rgba(201,151,58,0.03)]' : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'}`}
            >
              {destination === 'local' && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-[#C9973A] rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                </div>
              )}
              <Store className={`w-6 h-6 transition-colors ${destination === 'local' ? 'text-[#C9973A]' : 'text-[#94a3b8]'}`} />
              <p className={`font-sans font-bold text-[11px] leading-tight transition-colors ${destination === 'local' ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}>Local Shops</p>
            </div>
            <div 
              onClick={() => setDestination('service')}
              className={`p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all relative flex flex-col items-center gap-2 text-center ${destination === 'service' ? 'border-[#C9973A] bg-[rgba(201,151,58,0.03)]' : 'border-[#f1f5f9] bg-white hover:border-[#C9973A]/30'}`}
            >
              {destination === 'service' && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-[#C9973A] rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                </div>
              )}
              <Settings className={`w-6 h-6 transition-colors ${destination === 'service' ? 'text-[#C9973A]' : 'text-[#94a3b8]'}`} />
              <p className={`font-sans font-bold text-[11px] leading-tight transition-colors ${destination === 'service' ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}>Service Providers</p>
            </div>
          </div>
          <p className="text-[11px] font-medium text-[#94a3b8] ml-1 leading-relaxed font-sans">Choose between major retailers, independent local businesses, or specialized service providers.</p>
        </div>

        {/* Quote Settings */}
        <div className="flex flex-col gap-5">
          <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
              <Settings className="w-4 h-4 text-[#C9973A]" />
            </div>
            Quote Parameters
          </h3>
          <div className="space-y-5">
            <div>
              <label className={labelClasses}>Maximum Quotations</label>
              <div className="relative">
                <select 
                  value={maxQuotes}
                  onChange={(e) => setMaxQuotes(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-[#f1f5f9] rounded-xl appearance-none font-sans font-bold text-[14px] text-[#1a1a2e] focus:border-[#C9973A]/50 outline-none transition-all"
                >
                  <option value="5">Up to 5 quotes</option>
                  <option value="10">Up to 10 quotes</option>
                  <option value="20">Up to 20 quotes</option>
                  <option value="50">Up to 50 quotes</option>
                  <option value="unlimited">Unlimited quotes</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A] pointer-events-none" />
              </div>
            </div>
            <div 
              onClick={() => setIsConfidential(!isConfidential)}
              className="flex items-center justify-between p-4 bg-white border border-[#f1f5f9] rounded-xl cursor-pointer hover:bg-[#f1f5f9] transition-all"
            >
              <span className="font-sans font-bold text-[#1a1a2e] text-[13px]">Confidential Inquiry</span>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${isConfidential ? 'bg-[#C9973A]' : 'bg-[#e2e8f0]'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isConfidential ? 'left-6' : 'left-1'}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex flex-col gap-5">
          <h3 className="font-sans font-bold text-[#1a1a2e] text-[13px] tracking-[0.05em] uppercase flex items-center gap-3 ml-1">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,151,58,0.08)] flex items-center justify-center">
              <Clock className="w-4 h-4 text-[#C9973A]" />
            </div>
            Timeline & Validity
          </h3>
          <div className="space-y-5">
            <div>
              <label className={labelClasses}>Required Lead Time</label>
              <div className="relative">
                <select 
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white border border-[#f1f5f9] rounded-xl appearance-none font-sans font-bold text-[14px] text-[#1a1a2e] focus:border-[#C9973A]/50 outline-none transition-all"
                >
                  <option value="immediate">Immediate (ASAP)</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="3 months">3 months</option>
                  <option value="flexible">Flexible</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9973A] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={labelClasses}>Quote Validity Period</label>
              <div className="flex gap-2">
                {['7', '15', '30'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setValidity(val as any)}
                    className={`flex-1 py-3.5 rounded-xl font-sans font-bold border-[1.5px] transition-all text-[13px] ${validity === val ? 'border-[#C9973A] bg-[rgba(201,151,58,0.05)] text-[#C9973A]' : 'border-[#f1f5f9] bg-white text-[#94a3b8] hover:border-[#C9973A]/30'}`}
                  >
                    {val} Days
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 pb-12">
          <button 
            onClick={handleNext}
            className="w-full h-[54px] bg-[#C9973A] rounded-[50px] flex flex-col items-center justify-center gap-[2px] font-sans text-white shadow-[0_4px_16_rgba(201,151,58,0.35)] transition-all active:scale-[0.98]"
          >
            <span className="text-[15px] font-bold leading-none">Confirm & Continue</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] opacity-70">Finalize Inquiry Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
