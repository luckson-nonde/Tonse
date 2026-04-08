import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  headerSubtitle?: string;
  variant?: 'blue' | 'light';
  footerText?: React.ReactNode;
  align?: 'center' | 'left';
  titleClassName?: string;
  maxWidth?: string;
  onBack?: () => void;
}

export default function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  headerSubtitle, 
  variant = 'light', 
  footerText,
  align = 'center',
  titleClassName = "text-3xl",
  maxWidth = "max-w-[440px]",
  onBack
}: AuthLayoutProps) {
  // We'll force light theme for this redesign as per user request
  const isLight = true;
  
  return (
    <div className="min-h-screen relative font-sans flex flex-col bg-[#fdfaf6] noise-bg">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-brand-yellow/20"></div>
      
      {/* Sticky Header / Title */}
      <div className="sticky top-6 z-0 flex justify-center mt-[6vh] sm:mt-10 pointer-events-none">
        <div className="text-center">
          <h1 className="text-[3.5rem] tracking-tight px-8 py-4 inline-block">
            <Logo />
          </h1>
          <p className="mt-2 font-normal text-[12px] text-[#1a1612]/60 uppercase tracking-[0.4em]">
            {headerSubtitle || "The Gold Standard of Trade"}
          </p>
        </div>
      </div>

      {/* Scrollable Form Layer */}
      <div className="relative z-10 flex flex-col items-center px-4 mt-1 sm:mt-2 pb-12 flex-grow">
        {/* Content Card */}
        <div className={`bg-brand-white w-full ${maxWidth} rounded-[2rem] shadow-[0_25px_60px_rgba(26,22,18,0.12)] p-8 sm:p-12 relative overflow-hidden`}>
          {/* Subtle background gradient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute top-8 left-8 sm:top-10 sm:left-10 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-[#f5f2ee] text-[#1a1612]/60 hover:bg-brand-yellow hover:text-white transition-all duration-300 shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2} />
            </button>
          )}

          <div className={`${align === 'center' ? 'text-center' : 'text-left'} mb-10 relative z-10 ${onBack ? 'mt-12' : ''}`}>
            <h2 className={`${titleClassName} font-serif font-normal text-[#1a1612] tracking-tight`}>{title}</h2>
            <div className="mt-3 text-[#1a1612]/60 text-[15px] leading-relaxed">{subtitle}</div>
          </div>
          
          <div className="relative z-10">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-12 text-center">
          {footerText || (
            <p className="text-[11px] font-normal text-[#1a1612]/30 uppercase tracking-[0.2em]">
              © 2026 <span className="text-brand-yellow">TONSE</span> Marketplace. All rights reserved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
