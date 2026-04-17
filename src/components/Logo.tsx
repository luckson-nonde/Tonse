import React from 'react';

interface LogoProps {
  variant?: 'auth' | 'dashboard' | 'sidebar' | 'light';
  className?: string;
}

export default function Logo({ variant = 'dashboard', className = '' }: LogoProps) {
  const isLight = variant === 'light';
  
  return (
    <span className={`font-serif font-black leading-none tracking-[-0.04em] ${className}`}>
      <span className={isLight ? "text-white" : "text-brand-dark"}>TON</span>
      <span className="text-[#C9973A] -ml-[0.02em]">SE</span>
    </span>
  );
}
