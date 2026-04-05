import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`bg-brand-yellow text-[#1a1612] rounded-2xl transition-all duration-300 hover:brightness-95 active:scale-[0.98] shadow-md ${className}`}
    >
      {children}
    </button>
  );
}
