import React from 'react';

interface LogoProps {
  variant?: 'auth' | 'dashboard' | 'sidebar' | 'light';
  className?: string;
}

export default function Logo({ variant = 'dashboard', className = '' }: LogoProps) {
  return (
    <span className={`font-serif leading-none tracking-[-0.06em] ${className}`}>
      <span className="text-brand-dark">TON</span>
      <span className="text-brand-yellow -ml-[0.04em]">SE</span>
    </span>
  );
}
