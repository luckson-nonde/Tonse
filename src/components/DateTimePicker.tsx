import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
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

const MORNING_SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const AFTERNOON_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

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
  // Day awaiting a time slot (datetime mode commits day+time together).
  const [pendingDay, setPendingDay] = useState<Date | null>(selectedDay);

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
    setPendingDay(day);
    if (selectedTime) onChange(`${format(day, 'yyyy-MM-dd')}T${selectedTime}`);
  };

  const commitTime = (slot: string) => {
    if (!pendingDay) return;
    onChange(`${format(pendingDay, 'yyyy-MM-dd')}T${slot}`);
    setOpen(false);
  };

  const label = selectedDay
    ? mode === 'datetime' && selectedTime
      ? `${format(selectedDay, 'EEE, d MMM yyyy')} · ${selectedTime}`
      : format(selectedDay, 'EEE, d MMM yyyy')
    : placeholder || (mode === 'datetime' ? 'Pick a day & time' : 'Pick a date');

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

              {/* Time slots */}
              {mode === 'datetime' && (
                <div
                  className={`mt-4 pt-4 border-t border-[#ecd9b3] transition-opacity ${pendingDay ? '' : 'opacity-40 pointer-events-none'}`}
                >
                  {!pendingDay && (
                    <p className="text-[11px] text-[#8a6118] italic mb-2">
                      Pick a day first, then choose a time.
                    </p>
                  )}
                  {[
                    { title: 'Morning', slots: MORNING_SLOTS },
                    { title: 'Afternoon', slots: AFTERNOON_SLOTS },
                  ].map(({ title, slots }) => (
                    <div key={title} className="mb-3 last:mb-0">
                      <p className="text-[10px] font-bold text-[#8a6118] uppercase tracking-widest mb-2">
                        {title}
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => commitTime(slot)}
                            className={`py-2 rounded-full text-[12px] transition-colors ${
                              selectedTime === slot &&
                              pendingDay &&
                              selectedDay &&
                              isSameDay(pendingDay, selectedDay)
                                ? 'bg-[#C9973A] text-white font-semibold shadow-[0_2px_8px_rgba(201,151,58,0.35)]'
                                : 'bg-white border-[1.5px] border-[#e2e8f0] text-[#64748b] font-medium hover:border-[#C9973A]'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
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
