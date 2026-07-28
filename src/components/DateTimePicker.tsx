import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import {
  addMonths,
  subMonths,
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns';

interface DateTimePickerProps {
  /** '' | 'yyyy-MM-dd' (mode="date") | 'yyyy-MM-ddTHH:mm' (mode="datetime") */
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
  error?: boolean;
  /** Earliest selectable day. Defaults to today. */
  minDate?: Date;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Wrapping add within [0, max]. */
const cycle = (n: number, delta: number, max: number) => (n + delta + max + 1) % (max + 1);

/* Stored value stays 24-hour ("yyyy-MM-ddTHH:mm" — the shape
   derivedGigEvents parses); everything the BUYER sees is 12-hour + AM/PM
   with a plain-words readout, so 15:10 never has to be decoded. */
const meridiemOf = (h: number) => (h < 12 ? 'AM' : 'PM');
const hour12Of = (h: number) => ((h + 11) % 12) + 1;
const periodWordOf = (h: number) =>
  h < 5 ? 'at night' : h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 21 ? 'in the evening' : 'at night';

/**
 * Themed calendar + time-slot input replacing the native browser pickers on
 * inquiry forms. Expands INLINE below the field row (a floating popover the
 * height of a month grid clips on mobile viewports; in-flow expansion just
 * pushes the form down — these fields are col-span-full anyway).
 *
 * Animations run through motion.* so App's MotionConfig (lite-motion +
 * prefers-reduced-motion) applies. All borders are opaque hexes — translucent
 * border strokes mis-rasterize on Mali-GPU Android phones.
 */
export default function DateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  placeholder,
  error,
  minDate,
}: DateTimePickerProps) {
  const parsed = value ? parseISO(value) : null;
  const selectedDay = parsed && isValid(parsed) ? parsed : null;
  const selectedTime = mode === 'datetime' && value.includes('T') ? value.slice(11, 16) : '';

  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(selectedDay ?? new Date());
  // Day awaiting a time (datetime mode commits day+time together).
  const [pendingDay, setPendingDay] = useState<Date | null>(selectedDay);
  // Free-form time — steppers + direct typing, NOT preset slots: the buyer
  // states when THEY want it (any minute, evenings included); provider
  // availability is negotiated in the quote, not encoded in the picker.
  const [pendingTime, setPendingTime] = useState<{ h: number; m: number } | null>(
    selectedTime
      ? { h: Number(selectedTime.slice(0, 2)), m: Number(selectedTime.slice(3, 5)) }
      : null,
  );

  const floor = startOfDay(minDate ?? new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  });

  const commitDay = (day: Date) => {
    if (mode === 'date') {
      onChange(format(day, 'yyyy-MM-dd'));
      setOpen(false);
      return;
    }
    // A day alone is a complete answer — time is optional detail on top.
    setPendingDay(day);
    onChange(
      pendingTime
        ? `${format(day, 'yyyy-MM-dd')}T${pad2(pendingTime.h)}:${pad2(pendingTime.m)}`
        : format(day, 'yyyy-MM-dd'),
    );
  };

  // Keep the committed value live with every time tweak (the buyer may close
  // the panel from the field button instead of Done).
  const setTime = (next: { h: number; m: number }) => {
    setPendingTime(next);
    if (pendingDay) onChange(`${format(pendingDay, 'yyyy-MM-dd')}T${pad2(next.h)}:${pad2(next.m)}`);
  };

  // First touch of an empty stepper just reveals the 09:00 baseline instead
  // of stepping past it.
  const adjustTime = (unit: 'h' | 'm', delta: number) => {
    if (!pendingTime) {
      setTime({ h: 9, m: 0 });
      return;
    }
    setTime(
      unit === 'h'
        ? { ...pendingTime, h: cycle(pendingTime.h, delta, 23) }
        : { ...pendingTime, m: cycle(pendingTime.m, delta, 59) },
    );
  };

  const typeTime = (unit: 'h' | 'm', raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(-2);
    if (!digits) return;
    const n = Number(digits);
    if (unit === 'm') {
      setTime({ h: pendingTime?.h ?? 9, m: Math.min(59, n) });
      return;
    }
    // Typed hour reads as 12-hour in the current AM/PM (13–23 still accepted
    // as explicit 24-hour input from users who think that way).
    let h: number;
    if (n >= 13 && n <= 23) {
      h = n;
    } else {
      const h12 = n === 0 ? 12 : Math.min(12, n);
      const isPm = (pendingTime?.h ?? 9) >= 12;
      h = (h12 % 12) + (isPm ? 12 : 0);
    }
    setTime({ h, m: pendingTime?.m ?? 0 });
  };

  const setMeridiem = (md: 'AM' | 'PM') => {
    if (!pendingTime) {
      setTime({ h: md === 'PM' ? 15 : 9, m: 0 });
      return;
    }
    if (meridiemOf(pendingTime.h) === md) return;
    setTime({ ...pendingTime, h: (pendingTime.h + 12) % 24 });
  };

  const confirmDateTime = () => {
    if (!pendingDay) return;
    onChange(
      pendingTime
        ? `${format(pendingDay, 'yyyy-MM-dd')}T${pad2(pendingTime.h)}:${pad2(pendingTime.m)}`
        : format(pendingDay, 'yyyy-MM-dd'),
    );
    setOpen(false);
  };

  const removeTime = () => {
    setPendingTime(null);
    if (pendingDay) onChange(format(pendingDay, 'yyyy-MM-dd'));
  };

  const label = selectedDay
    ? mode === 'datetime' && selectedTime
      ? `${format(selectedDay, 'EEE, d MMM yyyy')} · ${format(selectedDay, 'h:mm a')}`
      : format(selectedDay, 'EEE, d MMM yyyy')
    : placeholder || (mode === 'datetime' ? 'Pick a day (time optional)' : 'Pick a date');

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open && selectedDay) setViewMonth(selectedDay);
        }}
        className={`w-full flex items-center justify-between bg-white border-[1.5px] rounded-xl px-4 py-3.5 transition-all duration-200 ${
          error
            ? 'border-[#ef4444] shadow-[0_0_0_3px_rgba(239,68,68,0.08)]'
            : open
              ? 'border-[#C9973A] shadow-[0_0_0_3px_rgba(201,151,58,0.08)]'
              : 'border-[#e2e8f0]'
        }`}
      >
        <span
          className={`font-sans text-[15px] text-left ${selectedDay ? 'text-[#1a1a2e]' : 'text-[#94a3b8]'}`}
        >
          {label}
        </span>
        <CalendarDays className="w-4.5 h-4.5 text-[#C9973A] shrink-0" />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border-[1.5px] border-[#ecd9b3] bg-[#fdfaf2] p-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                  className="w-9 h-9 rounded-full bg-white border border-[#ecd9b3] flex items-center justify-center text-[#1a1a2e] active:scale-95 transition-transform"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="font-serif text-[16px] font-bold text-[#1a1a2e]">
                  {format(viewMonth, 'MMMM yyyy')}
                </p>
                <button
                  type="button"
                  onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                  className="w-9 h-9 rounded-full bg-white border border-[#ecd9b3] flex items-center justify-center text-[#1a1a2e] active:scale-95 transition-transform"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday header */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d, i) => (
                  <span
                    key={`${d}-${i}`}
                    className="text-center text-[10px] font-bold text-[#8a6118] uppercase tracking-widest py-1"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {days.map((day) => {
                  const disabled = isBefore(day, floor);
                  const outside = !isSameMonth(day, viewMonth);
                  const isPicked = pendingDay ? isSameDay(day, pendingDay) : false;
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => commitDay(day)}
                      className={`w-9 h-9 mx-auto rounded-full flex items-center justify-center text-[13px] transition-colors ${
                        isPicked
                          ? 'bg-[#C9973A] text-white font-bold shadow-[0_2px_8px_rgba(201,151,58,0.35)]'
                          : disabled
                            ? 'text-[#d1d5db]'
                            : isToday(day)
                              ? 'border-[1.5px] border-[#C9973A] text-[#C9973A] font-bold'
                              : outside
                                ? 'text-[#b8b0a0]'
                                : 'text-[#1a1a2e] font-medium hover:bg-[#f3e8ce]'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Time — free choice, 24-hour. Steppers for thumbs, direct
                  typing for exact minutes. No preset slots: availability is
                  the provider's side of the negotiation, not the picker's. */}
              {mode === 'datetime' && (
                <div
                  className={`mt-4 pt-4 border-t border-[#ecd9b3] transition-opacity ${pendingDay ? '' : 'opacity-40 pointer-events-none'}`}
                >
                  {!pendingDay && (
                    <p className="text-[11px] text-[#8a6118] italic mb-2">
                      Pick a day first — you can add a time after.
                    </p>
                  )}
                  <p className="text-[10px] font-bold text-[#8a6118] uppercase tracking-widest mb-2">
                    Time <span className="text-[#b8a06a] normal-case tracking-normal font-semibold">· optional</span>
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-start gap-2">
                      {(
                        [
                          { unit: 'h', label: 'Hour', step: 1, value: pendingTime ? String(hour12Of(pendingTime.h)) : '--' },
                          { unit: 'm', label: 'Min', step: 5, value: pendingTime ? pad2(pendingTime.m) : '--' },
                        ] as const
                      ).map(({ unit, label, step, value: display }, i) => (
                        <div key={unit} className="flex items-start gap-2">
                          {i === 1 && (
                            <span className="font-serif text-[24px] font-bold text-[#1a1a2e] leading-none mt-10">
                              :
                            </span>
                          )}
                          <div className="flex flex-col items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustTime(unit, step)}
                              className="w-10 h-7 rounded-lg bg-white border border-[#ecd9b3] flex items-center justify-center text-[#8a6118] hover:border-[#C9973A] active:scale-95 transition-all"
                              aria-label={`${label} up`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <input
                              inputMode="numeric"
                              value={display}
                              onChange={(e) => typeTime(unit, e.target.value)}
                              onFocus={(e) => e.currentTarget.select()}
                              aria-label={label}
                              className="w-14 text-center font-serif text-[24px] font-bold text-[#1a1a2e] bg-white border-[1.5px] border-[#e2e8f0] rounded-xl py-1.5 outline-none focus:border-[#C9973A] focus:shadow-[0_0_0_3px_rgba(201,151,58,0.08)] transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => adjustTime(unit, -step)}
                              className="w-10 h-7 rounded-lg bg-white border border-[#ecd9b3] flex items-center justify-center text-[#8a6118] hover:border-[#C9973A] active:scale-95 transition-all"
                              aria-label={`${label} down`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <span className="text-[9px] font-bold text-[#8a6118] uppercase tracking-widest">
                              {label}
                            </span>
                          </div>
                        </div>
                      ))}
                      {/* AM/PM — the morning-or-afternoon question answered
                          as an explicit choice, never as 24-hour decoding. */}
                      <div className="flex flex-col gap-1.5 ml-2 mt-8.5">
                        {(['AM', 'PM'] as const).map((md) => {
                          const active = !!pendingTime && meridiemOf(pendingTime.h) === md;
                          return (
                            <button
                              key={md}
                              type="button"
                              onClick={() => setMeridiem(md)}
                              className={`w-13 h-8 rounded-lg text-[12px] font-bold transition-all active:scale-95 ${
                                active
                                  ? 'bg-[#C9973A] text-white shadow-[0_2px_8px_rgba(201,151,58,0.35)]'
                                  : 'bg-white border border-[#ecd9b3] text-[#8a6118] hover:border-[#C9973A]'
                              }`}
                            >
                              {md}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-1" />
                    <button
                      type="button"
                      onClick={confirmDateTime}
                      disabled={!pendingDay}
                      className="px-5 py-2.5 rounded-full bg-[#C9973A] text-white text-[13px] font-semibold flex items-center gap-1.5 shadow-[0_2px_8px_rgba(201,151,58,0.35)] disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-transform self-center"
                    >
                      <Check className="w-4 h-4" />
                      Done
                    </button>
                  </div>
                  {pendingTime ? (
                    <p className="text-[12px] font-semibold text-[#8a6118] mt-2.5">
                      That's {hour12Of(pendingTime.h)}:{pad2(pendingTime.m)} {meridiemOf(pendingTime.h)}{' '}
                      {periodWordOf(pendingTime.h)}.{' '}
                      <button
                        type="button"
                        onClick={removeTime}
                        className="text-[11px] font-semibold text-[#94a3b8] underline underline-offset-2 hover:text-[#64748b]"
                      >
                        Remove time
                      </button>
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#94a3b8] italic mt-2.5">
                      Skip the time if any time of day works — set one only when the service must
                      happen at a specific hour.
                    </p>
                  )}
                </div>
              )}

              {/* Footer: clear */}
              {value && (
                <div className="mt-3 pt-3 border-t border-[#ecd9b3] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setPendingDay(null);
                      setPendingTime(null);
                    }}
                    className="text-[12px] font-semibold text-[#8a6118] underline underline-offset-2"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
