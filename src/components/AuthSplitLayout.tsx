import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Logo from './Logo';
import { HeroContent } from '../types';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  onBack?: () => void;
  stepper?: { current: number; total: number; labels: string[] };
  hero?: HeroContent;
}

const DEFAULT_HERO: HeroContent = {
  title: "The Gold Standard of Trade.",
  image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1920&h=1080",
  bullets: [
    "Efficient Procurement",
    "Direct Messaging",
    "Verified Suppliers"
  ]
};

export default function AuthSplitLayout({ 
  children, 
  title, 
  subtitle, 
  onBack,
  stepper,
  hero = DEFAULT_HERO
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-brand-white">
      {/* Left Pane (Hero Section) */}
      <div className="hidden lg:flex lg:w-[40%] relative bg-brand-dark overflow-hidden">
        {/* Background Image / Gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-brand-dark to-[#C9973A]/20"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 transition-all duration-700"
          style={{ backgroundImage: `url('${hero.image}')` }}
        ></div>
        
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-16 w-full">
          <div className="text-white">
            <Logo variant="light" className="text-4xl lg:text-5xl mb-6 lg:mb-8" />
          </div>
          
          <div className="text-white space-y-4 lg:space-y-6">
            <h1 className="text-3xl lg:text-5xl font-serif font-black tracking-tight transition-all duration-500">{hero.title}</h1>
            <ul className="space-y-3 lg:space-y-4 text-base lg:text-lg text-slate-300">
              {hero.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                  <div className="w-2 h-2 rounded-full bg-[#C9973A]"></div>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
          
          <p className="text-slate-500 text-xs lg:text-sm mt-8 lg:mt-0">© 2026 TONSE Marketplace.</p>
        </div>
      </div>
      {/* Right Pane (Form) */}
      <div className="w-full lg:w-[60%] flex flex-col justify-center items-center pt-6 lg:pt-0 px-5 md:px-8 lg:px-12 bg-brand-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-110 md:max-w-130 lg:max-w-140">
          {/* Mobile Header (Logo + Back) */}
          <div className="lg:hidden flex items-center justify-center relative mb-10">
            {onBack && (
              <button 
                onClick={onBack}
                className="absolute left-0 p-1 text-slate-400 hover:text-[#C9973A] transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Logo className="text-3xl" />
          </div>

          {/* Desktop Logo */}
          <div className="hidden lg:block mb-8">
            <Logo className="text-4xl" />
          </div>

          {/* Stepper */}
          {stepper && (
            <div className="mb-8 lg:mb-10 flex items-center gap-2">
              {stepper.labels.map((label, idx) => (
                <React.Fragment key={label}>
                  <div className={`flex items-center gap-2 ${idx + 1 === stepper.current ? 'text-[#C9973A]' : idx + 1 < stepper.current ? 'text-slate-800' : 'text-slate-400'}`}>
                    <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center text-[10px] lg:text-[12px] font-bold ${idx + 1 === stepper.current ? 'bg-[#C9973A] text-white' : idx + 1 < stepper.current ? 'bg-slate-800 text-white' : 'bg-slate-200'}`}>
                      {idx + 1 < stepper.current ? '✓' : idx + 1}
                    </div>
                    <span className="text-[10px] lg:text-[12px] font-bold uppercase tracking-widest">{label}</span>
                  </div>
                  {idx < stepper.labels.length - 1 && <div className="h-px w-6 lg:w-8 bg-slate-200"></div>}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Header Section: Back Button + Title/Subtitle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 lg:mb-10 gap-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-12">
                {onBack && (
                  <button 
                    onClick={onBack}
                    className="hidden lg:flex items-center text-slate-400 hover:text-[#C9973A] transition-colors text-base group"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back
                  </button>
                )}
                <h2 className="text-[28px] lg:text-[26px] font-serif font-bold text-brand-dark leading-tight text-center lg:text-left">
                  {title}
                </h2>
              </div>
              <div className="text-[#C9973A] font-sans font-normal text-xs lg:text-sm leading-relaxed opacity-80 text-center lg:text-right italic">
                {subtitle}
              </div>
            </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}
