import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, type LucideIcon } from 'lucide-react';

export interface InlineFilterOption {
  value: string;
  label: string;
}

/**
 * Compact dropdown filter that lives INSIDE a search bar's right-end
 * control cluster (the Choose-Specialty bar pattern). Deliberately
 * separate from CustomDropdown, whose two form consumers depend on its
 * full-width panel; this one has a pill trigger and a right-aligned
 * fixed-width panel. A11y ported from CustomDropdown: listbox/option
 * roles, keyboard nav, click-outside — plus focus return to the trigger
 * on close.
 *
 * Opaque border hexes only — translucent borders on rounded elements
 * mis-rasterize on Mali-GPU Android phones.
 */
export default function InlineFilterDropdown({
  icon: Icon,
  shortLabel,
  fullLabel,
  options,
  value,
  onChange,
}: {
  icon: LucideIcon;
  /** Always-visible compact label, e.g. "Industry". */
  shortLabel: string;
  /** Descriptive label, e.g. "Choose Industry Category" — aria/title + panel heading. */
  fullLabel: string;
  options: InlineFilterOption[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // "All" sits at index 0; real options are offset by one.
  const items: InlineFilterOption[] = [{ value: '', label: `All` }, ...options];

  const close = (refocus = true) => {
    setIsOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false); // outside click: don't steal focus back
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const idx = Math.max(0, items.findIndex((o) => (o.value || null) === value));
    setHighlighted(idx);
    // Keep the highlighted row visible as arrows move it.
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelectorAll('[role="option"]')
        [idx]?.scrollIntoView({ block: 'nearest' });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const pick = (idx: number) => {
    const opt = items[idx];
    onChange(opt.value || null);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted((h) => Math.min(items.length - 1, h + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((h) => Math.max(0, h - 1));
        break;
      case 'Home':
        e.preventDefault();
        setHighlighted(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlighted(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(highlighted);
        break;
      case 'Escape':
      case 'Tab':
        close(e.key === 'Escape');
        break;
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelectorAll('[role="option"]')
      [highlighted]?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  const active = !!value;
  const activeLabel = options.find((o) => o.value === value)?.label;

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={fullLabel}
        title={activeLabel ? `${fullLabel}: ${activeLabel}` : fullLabel}
        onClick={() => setIsOpen((o) => !o)}
        className={`flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-[7px] text-[11px] font-bold transition-all duration-150 w-full ${
          active
            ? 'bg-white text-[#8a6118] shadow-[0_1px_3px_rgba(30,41,59,0.12)]'
            : 'bg-transparent text-slate-500 hover:text-brand-dark'
        }`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.9} />
        <span className="truncate max-w-24">{activeLabel || shortLabel}</span>
        <ChevronDown
          className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-label={fullLabel}
          className="absolute right-0 left-0 sm:left-auto mt-2 sm:w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.25)] z-50 overflow-hidden"
        >
          <p className="px-4 pt-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {fullLabel}
          </p>
          <div className="max-h-64 overflow-y-auto pb-1.5">
            {items.map((opt, idx) => {
              const selected = (opt.value || null) === value;
              return (
                <button
                  key={opt.value || '__all'}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(idx)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-[12.5px] font-semibold transition-colors ${
                    highlighted === idx ? 'bg-[#fdf6e9]' : 'bg-white'
                  } ${selected ? 'text-[#8a6118]' : 'text-slate-600'}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selected && <Check className="w-3.5 h-3.5 shrink-0 text-[#C9973A]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
