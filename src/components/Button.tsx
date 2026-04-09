import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export default function Button({ children, className = '', variant = 'primary', ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-brand-yellow text-[#1a1612] shadow-md hover:brightness-95',
    secondary: 'bg-[#1e293b] text-white shadow-md hover:bg-black',
    outline: 'bg-transparent border-2 border-[#C9973A] text-[#C9973A] hover:bg-[#C9973A]/5',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100'
  };

  return (
    <button
      {...props}
      className={`${variants[variant]} rounded-2xl transition-all duration-300 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}
