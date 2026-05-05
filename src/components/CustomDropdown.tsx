import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface CustomDropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select option',
  disabled = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (isOpen && options.length >= 10 && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, options.length]);

  // Detect viewport edge and flip dropdown if needed
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;

    const button = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = filteredOptions.length * 44 + (options.length >= 10 ? 60 : 0);
    const spaceBelow = window.innerHeight - button.bottom;
    const spaceAbove = button.top;

    // Flip to top if not enough space below
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      setDropdownPosition('top');
    } else {
      setDropdownPosition('bottom');
    }
  }, [isOpen, filteredOptions.length, options.length]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      // Open dropdown with arrow keys or space/enter
      if (['ArrowDown', 'ArrowUp', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev === 0 ? filteredOptions.length - 1 : prev - 1));
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (filteredOptions.length > 0) {
          const selected = filteredOptions[highlightedIndex];
          onChange(selected.value);
          setIsOpen(false);
          setSearchQuery('');
          setHighlightedIndex(0);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(0);
        break;

      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setHighlightedIndex(Math.max(0, filteredOptions.length - 1));
        break;

      case 'Tab':
        // Close on tab
        setIsOpen(false);
        setSearchQuery('');
        break;

      default:
        // Allow typing in search
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const highlightedElement = listRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full h-11 px-4 py-2 rounded-lg border-2 text-[15px] text-[#1a1a2e] bg-white 
                     flex items-center justify-between gap-3
                     transition-all duration-150 ease-out
                     ${isOpen ? 'border-[#C9973A] bg-[rgba(201,151,58,0.02)] shadow-[0_0_0_3px_rgba(201,151,58,0.1)]' : 'border-[#e2e8f0]'}
                     ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#C9973A]/50 cursor-pointer'}
                     focus:outline-none focus:ring-2 focus:ring-[#C9973A] focus:ring-offset-0`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={placeholder}
      >
        <span
          className={`flex-1 text-left truncate ${!selectedOption ? 'text-[#94a3b8]' : ''}`}
          title={displayLabel}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#C9973A] transition-transform duration-150 ease-out shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-full mt-2 bg-white rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.12)] 
                       border border-[#f1f5f9] overflow-hidden
                       animate-in fade-in duration-150 ease-out
                       ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
          role="listbox"
        >
          {/* Search input - show if 10+ items */}
          {options.length >= 10 && (
            <div className="border-b border-[#f1f5f9] p-3 bg-[#fafafa]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#e2e8f0] rounded-md text-[14px] 
                             focus:outline-none focus:ring-1 focus:ring-[#C9973A] focus:border-[#C9973A]"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div ref={listRef} className="max-h-[280px] overflow-y-auto" role="presentation">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-[#94a3b8] text-[14px]">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  data-index={index}
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearchQuery('');
                    setHighlightedIndex(0);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full h-11 px-4 py-2 text-left text-[15px] font-medium 
                              transition-colors duration-100 ease-out
                              flex items-center justify-between
                              ${
                                highlightedIndex === index
                                  ? 'bg-[rgba(201,151,58,0.12)] text-[#C9973A]'
                                  : value === option.value
                                    ? 'bg-[rgba(201,151,58,0.08)] text-[#C9973A]'
                                    : 'text-[#1a1a2e] hover:bg-[#f5f5f5]'
                              }`}
                >
                  <span>{option.label}</span>
                  {value === option.value && <span className="text-[#C9973A] font-bold">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
