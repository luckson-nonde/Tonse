import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

export default function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-brand-yellow text-white shadow-md hover:bg-brand-dark transition-all duration-300',
    secondary: 'bg-brand-dark text-white shadow-md hover:bg-brand-navy-dark transition-all duration-300',
    outline: 'bg-transparent border-2 border-[#C9973A] text-[#C9973A] hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-all duration-300',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 transition-all duration-300',
    danger: 'bg-transparent border-2 border-rose-500 text-rose-500 hover:bg-rose-50 transition-all duration-300',
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
