import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Home, Search, FileSearch } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function VerificationPending() {
  const navigate = useNavigate();

  return (
    <AuthLayout 
      title="Verification in Progress" 
      titleClassName="text-2xl font-normal"
      subtitle={
        <span className="block max-w-[280px] mx-auto">
          We are currently reviewing your documents and store photos. This usually takes <span className="font-bold text-slate-900">24-48 hours</span>.
        </span>
      }
      headerSubtitle="TONSE Marketplace"
    >
      <div className="flex flex-col items-center">
        {/* Animated/Styled Icon Container */}
        <div className="w-48 h-48 rounded-full border-4 border-brand-yellow/5 flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 rounded-full border-4 border-brand-yellow/10 animate-pulse"></div>
          <div className="relative">
            <div className="relative">
              <FileSearch className="w-20 h-20 text-[#d49b35]/40" strokeWidth={1.5} />
              <Search className="w-10 h-10 text-[#d49b35] absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="w-full bg-[#fdf6e9] rounded-2xl p-4 flex items-center justify-center gap-3 mb-4 border border-[#d49b35]/10">
          <div className="w-8 h-8 bg-[#d49b35] rounded-full flex items-center justify-center shadow-sm">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-[#1a1612]">Status: Pending Review</span>
        </div>

        {/* Home Button */}
        <button 
          onClick={() => navigate('/')}
          className="w-full py-4 px-4 bg-white border border-[#e8e4dc] hover:border-[#d49b35]/30 text-[#d49b35] text-[15px] font-bold rounded-2xl transition-all flex items-center justify-center gap-3 group"
        >
          <Home className="w-5 h-5 text-[#d49b35]/60 group-hover:text-[#d49b35] transition-colors" />
          Go to Home
        </button>
      </div>
    </AuthLayout>
  );
}
