import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  rightElement?: React.ReactNode;
}

const FloatingInput: React.FC<FloatingInputProps> = ({ label, icon: Icon, rightElement, className = '', ...props }) => {
  return (
    <div className="relative w-full mb-6 group">
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-[12px] flex items-center pointer-events-none z-20">
            <Icon className="h-4 w-4 text-[#C9973A]/40 group-focus-within:text-[#C9973A] transition-colors" strokeWidth={2} />
          </div>
        )}
        <input
          {...props}
          placeholder=" " // Crucial: A single space allows the peer-placeholder-shown logic to work
          className={`peer block w-full ${Icon ? 'pl-[36px]' : 'pl-[12px]'} ${rightElement ? 'pr-[36px]' : 'pr-[12px]'} h-[56px] bg-[#fffef9] border border-[#e8e0d0] rounded-[12px] text-[15px] text-[#1e293b] focus:ring-2 focus:ring-[#C9973A]/20 focus:border-[#C9973A] outline-none transition-all font-medium ${className}`}
        />
        <label
          className={`absolute text-[#1a1612]/40 duration-200 transform -translate-y-1/2 top-1/2 ${Icon ? 'left-[32px]' : 'left-[10px]'} z-10 origin-[0] px-2 
                     bg-[#fdfaf6] pointer-events-none
                     peer-focus:top-0 peer-focus:scale-90 peer-focus:-translate-y-1/2 peer-focus:text-[#C9973A] peer-focus:left-[10px]
                     peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-90 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:left-[10px]
                     font-sans font-bold text-[11px] uppercase tracking-[0.05em]`}
        >
          {label}
        </label>
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-[12px] flex items-center z-20">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingInput;
