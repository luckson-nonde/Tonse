import React from 'react';
import { LucideIcon, AlertCircle } from 'lucide-react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  rightElement?: React.ReactNode;
  error?: string;
  hint?: string;
  /** Background tone of the input fill and the floating-label chip.
   *  Must match the surrounding pane — when the pane is cream
   *  (`bg-brand-white`, default for Register and the rest), the label
   *  chip uses cream too; when the pane is white (Login's premium
   *  treatment), the label uses white. A mismatch produces a visible
   *  colour seam at the label's left/right padding when the label
   *  sits in its resting position over the input border. */
  tone?: 'cream' | 'white';
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  icon: Icon,
  rightElement,
  className = '',
  error,
  hint,
  tone = 'cream',
  ...props
}) => {
  const hasError = !!error;
  const fillBg = tone === 'white' ? 'bg-white' : 'bg-brand-white';

  return (
    <div className="relative w-full group">
      <div className="relative">
        {/* Left-edge accent — gold on focus, red on error */}
        <div
          className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full origin-center transition-all duration-300 z-10 ${
            hasError
              ? 'bg-rose-500 opacity-100 scale-y-100'
              : 'bg-[#C9973A] opacity-0 scale-y-0 group-focus-within:opacity-100 group-focus-within:scale-y-100'
          }`}
        />

        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
            <Icon
              className={`h-5 w-5 transition-colors duration-200 ${
                hasError
                  ? 'text-rose-400'
                  : 'text-[#C9973A]/55 group-focus-within:text-[#C9973A]'
              }`}
              strokeWidth={2}
            />
          </div>
        )}

        <input
          {...props}
          placeholder=" "
          aria-invalid={hasError || undefined}
          className={`peer block w-full ${Icon ? 'pl-[52px]' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} h-[58px]
                     ${fillBg} border
                     rounded-2xl text-[15px] text-brand-dark
                     shadow-[inset_0_1px_2px_rgba(26,22,18,0.04)]
                     outline-none transition-all duration-200 font-medium placeholder:text-transparent
                     ${
                       hasError
                         ? 'border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                         : 'border-[#e8e0d0] hover:border-[#d6c8a8] focus:border-[#C9973A] focus:shadow-[0_0_0_4px_rgba(201,151,58,0.1),inset_0_1px_2px_rgba(26,22,18,0.02)]'
                     }
                     ${className}`}
        />

        <label
          className={`absolute duration-200 transform -translate-y-1/2 top-1/2 ${
            Icon ? 'left-[48px]' : 'left-[14px]'
          } z-10 origin-[0] px-1.5
                     ${fillBg} pointer-events-none
                     peer-focus:top-0 peer-focus:scale-[0.78] peer-focus:-translate-y-1/2 peer-focus:left-[16px]
                     peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:scale-[0.78] peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:left-[16px]
                     font-sans font-bold text-[12px] uppercase tracking-[0.08em]
                     ${
                       hasError
                         ? 'text-rose-500 peer-focus:text-rose-500'
                         : 'text-[#1a1612]/45 peer-focus:text-[#C9973A]'
                     }`}
        >
          {label}
        </label>

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center z-20">
            {rightElement}
          </div>
        )}
      </div>

      {(error || hint) && (
        <p
          className={`text-[11px] mt-1.5 ml-1 leading-snug flex items-center gap-1.5 ${
            hasError ? 'text-rose-500 font-medium' : 'text-[#1a1612]/45'
          }`}
        >
          {hasError && <AlertCircle className="w-3 h-3 shrink-0" strokeWidth={2.5} />}
          {error || hint}
        </p>
      )}
    </div>
  );
};

export default FloatingInput;
