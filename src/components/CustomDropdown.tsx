import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select option',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 rounded-xl border-[1.5px] border-[#f1f5f9] text-[15px] text-[#1a1a2e] bg-white flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#C9973A]/10 focus:border-[#C9973A] transition-all"
      >
        <span className={!selectedOption ? 'text-[#94a3b8]' : ''}>{displayLabel}</span>
        <ChevronDown
          className={`w-4.5 h-4.5 text-[#C9973A] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-[#f1f5f9] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${
                value === option.value
                  ? 'bg-[rgba(201,151,58,0.08)] text-[#C9973A]'
                  : 'text-[#1a1a2e] hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
