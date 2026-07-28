import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { addDays, format, isSameDay, isToday, parseISO } from 'date-fns';
import { CalendarPlus, Clock, MapPin, Repeat, Sparkles } from 'lucide-react';
import { CalendarEvent } from '../../types';
import {
  getSelectedScheduleDate,
  subscribeToScheduleDate,
} from '../../services/scheduleSelection';
import { useMergedScheduleEvents, type MergedEvent } from '../../hooks/useMergedScheduleEvents';
import { CATEGORY_LABELS, COLOR_META, eventColor } from '../../services/scheduleMeta';
import ScheduleEventModal from './ScheduleEventModal';

/** Days shown at once: the selected day + the following week-window. */
const WINDOW_DAYS = 7;
/** Rows shown per day before the "show more" fold. */
const COLLAPSE_AFTER = 3;

function formatTime12(t?: string | null): string {
  if (!t) return 'All day';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

/** Gig rows render in the brand gold family; manual rows use their swatch. */
function rowMeta(event: MergedEvent) {
  if (event.kind === 'manual' && event.manual) {
    const meta = COLOR_META[eventColor(event.manual)];
    return { dot: meta.marker, chipBg: meta.chipBg, chipText: meta.chipText, hex: meta.hex };
  }
  return {
    dot: 'bg-[#C9973A]',
    chipBg: 'bg-[#fdf6e9]',
    chipText: 'text-[#8a6118]',
    hex: '#C9973A',
  };
}

interface DayGroup {
  day: Date;
  key: string;
  events: MergedEvent[];
}

/**
 * The main-content schedule: a vertical timeline of the selected day plus
 * the following days, grouped per-day under a "27 July / Monday" heading
 * (date primary, weekday secondary — deliberately NOT "MON/TUE" style).
 * Fed by the same merged stream (manual entries + derived gigs) as the
 * /schedule page; the selected day arrives over the schedule-date bus from
 * the right-rail calendar. Borders are opaque hexes (Mali-GPU rule).
 */
export default function ScheduleTimelineCard({ className = '' }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(() => getSelectedScheduleDate());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(
    () =>
      subscribeToScheduleDate((date) => {
        setSelectedDate(date);
        // Scroll after the new day's content commits so the card lands in
        // view at its final height.
        requestAnimationFrame(() => {
          rootRef.current?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'start',
          });
        });
      }),
    [reducedMotion],
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, WINDOW_DAYS - 1);
    end.setHours(23, 59, 59, 999);
    return { rangeStart: start, rangeEnd: end };
  }, [selectedDate.getTime()]);

  const { events, loading } = useMergedScheduleEvents(rangeStart, rangeEnd);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups: DayGroup[] = [];
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const day = addDays(rangeStart, i);
      const key = format(day, 'yyyy-MM-dd');
      const dayEvents = events.filter((e) => e.date === key);
      if (dayEvents.length > 0) groups.push({ day, key, events: dayEvents });
    }
    return groups;
  }, [events, rangeStart.getTime()]);

  const selectedKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayHasEvents = dayGroups.some((g) => g.key === selectedKey);
  const windowEmpty = dayGroups.length === 0;

  const openCreate = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  const openEdit = (event: MergedEvent) => {
    if (event.kind !== 'manual' || !event.manual) return;
    setEditingEvent(event.manual);
    setIsModalOpen(true);
  };

  const toggleExpanded = (key: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const motionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22, ease: 'easeOut' as const },
      };

  return (
    <div
      ref={rootRef}
      id="schedule-timeline"
      className={`bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 scroll-mt-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c9973a]">
            Schedule
          </p>
          <h3 className="mt-1 text-xl sm:text-2xl font-serif font-bold text-brand-dark tracking-tight">
            {isToday(selectedDate) ? "Today's Schedule" : format(selectedDate, 'd MMMM')}
          </h3>
          <p className="text-slate-500 text-[13px] mt-0.5">
            {format(selectedDate, 'EEEE')} · next {WINDOW_DAYS} days
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c9973a] text-white text-sm font-bold shadow-md hover:bg-[#b8832a] transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          <span className="hidden sm:inline">New Schedule</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selectedKey} {...motionProps}>
          {windowEmpty ? (
            /* Elegant empty state — whole window has nothing */
            <div className="border-2 border-dashed border-slate-200 rounded-2xl py-12 px-6 text-center">
              <div className="w-16 h-16 bg-[#f5f2ed] rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-[#c9973a]" />
              </div>
              <h4 className="font-serif font-bold text-brand-dark text-lg">
                No schedules for this date
              </h4>
              <p className="text-slate-500 text-sm mt-1">
                Create your first schedule to get started.
              </p>
            </div>
          ) : (
            <div>
              {!selectedDayHasEvents && (
                <p className="text-sm text-slate-400 italic mb-5">
                  Nothing on {format(selectedDate, 'd MMMM')} — here's what's coming up.
                </p>
              )}

              {/* Vertical timeline: spine + circular day markers */}
              <div className="relative pl-9 sm:pl-10">
                <div
                  aria-hidden
                  className="absolute left-[13px] sm:left-[15px] top-2 bottom-2 w-0.5 bg-[#eee7d8] rounded-full"
                />
                <div className="space-y-8">
                  {dayGroups.map((group, groupIdx) => {
                    const isExpanded = expandedDays.has(group.key);
                    const visibleEvents = isExpanded
                      ? group.events
                      : group.events.slice(0, COLLAPSE_AFTER);
                    const hiddenCount = group.events.length - visibleEvents.length;
                    const markerHex = rowMeta(group.events[0]).hex;
                    const isSelectedDay = isSameDay(group.day, selectedDate);

                    return (
                      <motion.div
                        key={group.key}
                        className="relative"
                        {...(reducedMotion
                          ? {}
                          : {
                              initial: { opacity: 0, x: 14 },
                              animate: { opacity: 1, x: 0 },
                              transition: { delay: groupIdx * 0.06, duration: 0.22 },
                            })}
                      >
                        {/* Day marker on the spine */}
                        <div
                          className="absolute -left-9 sm:-left-10 top-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 flex items-center justify-center"
                          style={{ borderColor: markerHex }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: markerHex }}
                          />
                        </div>

                        {/* Date heading: date primary, weekday secondary */}
                        <div className="mb-3">
                          <h4 className="text-lg sm:text-xl font-serif font-bold text-brand-dark leading-tight">
                            {format(group.day, 'd MMMM')}
                            {isToday(group.day) && (
                              <span className="ml-2 align-middle text-[10px] font-sans font-extrabold uppercase tracking-widest text-[#c9973a] bg-[#fdf6e9] px-2 py-0.5 rounded-full">
                                Today
                              </span>
                            )}
                          </h4>
                          <p className="text-xs sm:text-[13px] font-medium text-slate-400">
                            {format(group.day, 'EEEE')}
                          </p>
                        </div>

                        {/* One rounded card per day, events divided inside */}
                        <div
                          className={`rounded-2xl border bg-[#fbfaf7] overflow-hidden ${
                            isSelectedDay ? 'border-[#ecd9b3]' : 'border-slate-200'
                          }`}
                        >
                          {visibleEvents.map((event, idx) => {
                            const meta = rowMeta(event);
                            const clickable = event.kind === 'manual';
                            return (
                              <div
                                key={event.key}
                                onClick={() => openEdit(event)}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onKeyDown={(e) => {
                                  if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    openEdit(event);
                                  }
                                }}
                                className={`px-4 sm:px-5 py-3.5 flex items-start gap-3 ${
                                  idx > 0 ? 'border-t border-[#efece5]' : ''
                                } ${clickable ? 'cursor-pointer hover:bg-white transition-colors' : ''}`}
                              >
                                <span
                                  aria-hidden
                                  className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-[13px] font-bold text-slate-500 tabular-nums inline-flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                                      {formatTime12(event.startTime)}
                                      {event.endTime ? ` – ${formatTime12(event.endTime)}` : ''}
                                    </span>
                                    {event.kind === 'manual' && event.manual && (
                                      <span
                                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.chipBg} ${meta.chipText}`}
                                      >
                                        {CATEGORY_LABELS[event.manual.category] ?? 'Other'}
                                      </span>
                                    )}
                                    {event.kind === 'gig' && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fdf6e9] text-[#8a6118]">
                                        Booking
                                      </span>
                                    )}
                                    {event.isRecurringOccurrence && (
                                      <Repeat className="w-3 h-3 text-slate-400" />
                                    )}
                                  </div>
                                  <p className="mt-0.5 font-semibold text-brand-dark text-[15px] truncate">
                                    {event.title}
                                  </p>
                                  {event.kind === 'manual' && event.manual?.location && (
                                    <p className="mt-0.5 text-xs text-slate-500 inline-flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-slate-400" />
                                      {event.manual.location}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {(hiddenCount > 0 || isExpanded) && group.events.length > COLLAPSE_AFTER && (
                            <button
                              onClick={() => toggleExpanded(group.key)}
                              className="w-full text-center text-xs font-bold text-[#8a6118] py-2.5 border-t border-[#efece5] hover:bg-white transition-colors"
                            >
                              {isExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {loading && windowEmpty && (
            <p className="text-xs text-slate-400 text-center mt-3">Loading your schedule…</p>
          )}
        </motion.div>
      </AnimatePresence>

      {isModalOpen && (
        <ScheduleEventModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingEvent(null);
          }}
          defaultDate={selectedDate}
          editingEvent={editingEvent}
        />
      )}
    </div>
  );
}
