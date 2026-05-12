import React, { useEffect, useMemo, useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  isToday,
  parseISO,
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  Bell,
  MoreVertical,
  Trash2,
  Edit2,
  Sparkles,
  Coins,
} from 'lucide-react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import { CalendarEvent } from '../types';
import Button from '../components/Button';
import {
  fetchBuyerOrders,
  fetchSellerOrders,
  type OrderRecord,
} from '../services/api/orderService';
import {
  deriveGigEventsFromOrders,
  type DerivedGigEvent,
} from '../services/derivedGigEvents';

const MANUAL_CATEGORIES = [
  { id: 'WORK',     label: 'Work',     dot: '#3399C9' },
  { id: 'PERSONAL', label: 'Personal', dot: '#8E6FD8' },
  { id: 'HEALTH',   label: 'Health',   dot: '#3FA98B' },
  { id: 'OTHER',    label: 'Other',    dot: '#64748B' },
];

interface MergedEvent {
  key: string;
  date: string;            // yyyy-MM-dd
  startTime: string;
  endTime: string;
  title: string;
  note?: string;
  /** Discriminator: 'gig' is read-only / system-derived; 'manual' is
   *  user-added via the FAB. */
  kind: 'gig' | 'manual';
  status: string;
  /** Gig-only metadata; undefined for manual events. */
  gig?: DerivedGigEvent;
  /** Manual-only metadata. */
  manual?: CalendarEvent;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const { setActiveTab } = useDashboard();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  React.useEffect(() => {
    setActiveTab('schedule');
  }, [setActiveTab]);

  // Manual notes (Dexie/IndexedDB) — buyer/provider personal reminders.
  const manualEvents = useLiveQuery(
    () =>
      db.calendarEvents
        .where('userId')
        .equals(user?.id || 0)
        .toArray(),
    [user?.id],
  );

  // Derived gig events from paid orders. We pull from BOTH perspectives so
  // a user who is sometimes the buyer and sometimes the seller (the
  // common multi-archetype case) sees every booking they're involved in.
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  useEffect(() => {
    const id = user?.id ? String(user.id) : '';
    if (!id) return;
    let cancelled = false;
    Promise.allSettled([fetchSellerOrders(id), fetchBuyerOrders(id)]).then((results) => {
      if (cancelled) return;
      const merged: OrderRecord[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const o of r.value) {
            if (!seen.has(o.id)) {
              seen.add(o.id);
              merged.push(o);
            }
          }
        }
      }
      setOrders(merged);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const derivedGigs = useMemo<DerivedGigEvent[]>(() => {
    const id = user?.id ? String(user.id) : '';
    return orders.flatMap((o) => {
      const perspective = o.sellerId === id ? 'seller' : 'buyer';
      return deriveGigEventsFromOrders([o], perspective);
    });
  }, [orders, user?.id]);

  const allEvents = useMemo<MergedEvent[]>(() => {
    const out: MergedEvent[] = [];
    if (manualEvents) {
      for (const e of manualEvents) {
        out.push({
          key: `m-${e.id}`,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          title: e.title,
          note: e.note,
          kind: 'manual',
          status: e.status,
          manual: e,
        });
      }
    }
    for (const g of derivedGigs) {
      out.push({
        key: g.id,
        date: g.date,
        startTime: g.startTime,
        endTime: g.endTime,
        title: g.title,
        note: g.note,
        kind: 'gig',
        status: g.status,
        gig: g,
      });
    }
    return out;
  }, [manualEvents, derivedGigs]);

  const selectedDateEvents = useMemo(() => {
    return allEvents
      .filter((event) => isSameDay(parseISO(event.date), selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [allEvents, selectedDate]);

  const eventBucketsByDay = useMemo(() => {
    const map = new Map<string, { gig: number; manual: number }>();
    for (const e of allEvents) {
      const bucket = map.get(e.date) ?? { gig: 0, manual: 0 };
      if (e.kind === 'gig') bucket.gig += 1;
      else bucket.manual += 1;
      map.set(e.date, bucket);
    }
    return map;
  }, [allEvents]);

  const dayMeta = (day: Date) => {
    const key = format(day, 'yyyy-MM-dd');
    return eventBucketsByDay.get(key) ?? { gig: 0, manual: 0 };
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm('Delete this note? Gig records cannot be deleted from the calendar.')) {
      await db.calendarEvents.delete(id);
    }
  };

  const handleToggleStatus = async (event: CalendarEvent) => {
    const nextStatus: Record<string, 'PENDING' | 'ACTIVE' | 'COMPLETED'> = {
      PENDING: 'ACTIVE',
      ACTIVE: 'COMPLETED',
      COMPLETED: 'PENDING',
    };
    await db.calendarEvents.update(event.id!, { status: nextStatus[event.status] });
  };

  const totalGigs = derivedGigs.length;
  const upcomingGigs = useMemo(() => {
    const now = new Date();
    return derivedGigs.filter((g) => parseISO(g.date) >= startOfMonth(now)).length;
  }, [derivedGigs]);

  return (
    <div className="flex flex-col font-sans w-full max-w-6xl mx-auto pb-20">
      {/* Calendar Card — restrained brand palette, replaces the dominant gold panel */}
      <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="w-9 h-9 rounded-xl bg-[#f5f2ed] text-brand-dark hover:bg-[#c9973a] hover:text-white transition-colors flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-brand-dark tracking-tight">
              {format(currentMonth, 'MMMM yyyy')}
            </h1>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="w-9 h-9 rounded-xl bg-[#f5f2ed] text-brand-dark hover:bg-[#c9973a] hover:text-white transition-colors flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-[#f5f2ed] hover:bg-[#c9973a]/10 text-brand-dark border border-slate-200 rounded-lg text-[12px] font-bold transition-colors"
          >
            Today
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-2 mb-5 text-[11px]">
          <Stat icon={Sparkles} label="Total gigs" value={totalGigs} />
          <Stat icon={CalendarIcon} label="This month" value={upcomingGigs} />
          <Stat icon={Coins} label="Notes" value={manualEvents?.length ?? 0} />
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div
              key={`${day}-${i}`}
              className="text-center text-[10px] font-extrabold text-slate-400 tracking-[0.2em] py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <motion.div layout className="grid grid-cols-7 gap-1">
          <CalendarGrid
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dayMeta={dayMeta}
            isCollapsed={isCollapsed}
          />
        </motion.div>

        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand calendar' : 'Collapse to current week'}
            className="w-12 h-1.5 bg-slate-200 hover:bg-[#c9973a]/60 rounded-full transition-colors"
          />
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-brand-dark font-serif tracking-tight">
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {selectedDateEvents.length === 0
                ? 'No events'
                : `${selectedDateEvents.length} ${selectedDateEvents.length === 1 ? 'event' : 'events'}`}
            </p>
          </div>
          <Legend />
        </div>

        {selectedDateEvents.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {selectedDateEvents.map((event) => (
              <EventCard
                key={event.key}
                event={event}
                onDelete={
                  event.kind === 'manual' && event.manual?.id
                    ? () => handleDeleteEvent(event.manual!.id!)
                    : undefined
                }
                onEdit={
                  event.kind === 'manual' && event.manual
                    ? () => {
                        setEditingEvent(event.manual!);
                        setIsAddModalOpen(true);
                      }
                    : undefined
                }
                onToggleStatus={
                  event.kind === 'manual' && event.manual
                    ? () => handleToggleStatus(event.manual!)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-[#f5f2ed] rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-500">No events scheduled</h3>
            <p className="text-slate-400 text-[13px] mt-1">
              Paid bookings appear here automatically. Tap + to add a personal note.
            </p>
          </div>
        )}
      </div>

      {/* Upcoming Gigs — explicit chronological list of every paid gig
          on or after today. Lets the provider see every booking they
          owe service on, regardless of which day is currently selected
          on the grid. The grid's gold ring + count badge shows where;
          this list shows when, what, and how much. */}
      <UpcomingGigsList
        gigs={derivedGigs}
        onJumpToDate={(date) => {
          setSelectedDate(date);
          setCurrentMonth(date);
        }}
      />

      {/* FAB — manual notes only */}
      <button
        onClick={() => {
          setEditingEvent(null);
          setIsAddModalOpen(true);
        }}
        aria-label="Add personal note"
        className="fixed bottom-24 right-8 w-14 h-14 sm:w-16 sm:h-16 bg-[#c9973a] text-white rounded-2xl shadow-lg shadow-[#c9973a]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus className="w-7 h-7" strokeWidth={3} />
      </button>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddEventModal
            onClose={() => setIsAddModalOpen(false)}
            selectedDate={selectedDate}
            editingEvent={editingEvent}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="bg-[#f5f2ed] rounded-xl px-3 py-2.5 flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-white text-[#c9973a] flex items-center justify-center">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold truncate">{label}</div>
        <div className="text-sm font-extrabold text-brand-dark leading-tight">{value}</div>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden sm:flex items-center gap-3 text-[10px]">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#c9973a]" />
        <span className="font-bold text-slate-500 uppercase tracking-wider">Gig</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span className="font-bold text-slate-500 uppercase tracking-wider">Note</span>
      </div>
    </div>
  );
}

function UpcomingGigsList({
  gigs,
  onJumpToDate,
}: {
  gigs: DerivedGigEvent[];
  onJumpToDate: (d: Date) => void;
}) {
  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return gigs
      .filter((g) => parseISO(g.date) >= today)
      .sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
      });
  }, [gigs]);

  if (upcoming.length === 0) return null;

  const fmtDateChip = (iso: string) => {
    const d = parseISO(iso);
    return {
      day: format(d, 'd'),
      month: format(d, 'MMM').toUpperCase(),
      weekday: format(d, 'EEE').toUpperCase(),
      isToday: isToday(d),
    };
  };

  return (
    <div className="mt-8">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-brand-dark font-serif tracking-tight">
            Upcoming Gigs
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Every paid booking on or after today — sorted by date.
          </p>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c9973a] bg-[#fdf6e9] px-2 py-1 rounded-md">
          {upcoming.length} {upcoming.length === 1 ? 'gig' : 'gigs'}
        </span>
      </div>

      <div className="space-y-2.5">
        {upcoming.map((g) => {
          const chip = fmtDateChip(g.date);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onJumpToDate(parseISO(g.date))}
              className="w-full flex items-center gap-3 sm:gap-4 bg-white rounded-2xl border border-slate-200 hover:border-[#c9973a]/50 hover:shadow-md transition-all p-3 sm:p-4 text-left"
            >
              <div
                className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex flex-col items-center justify-center ${
                  chip.isToday
                    ? 'bg-[#c9973a] text-white shadow-md shadow-[#c9973a]/30'
                    : 'bg-[#fdf6e9] text-[#c9973a] border border-[#c9973a]/20'
                }`}
              >
                <span className="text-[9px] font-extrabold tracking-wider opacity-80">{chip.month}</span>
                <span className="text-xl sm:text-2xl font-black leading-none">{chip.day}</span>
                <span className="text-[8px] font-bold tracking-wider opacity-70 mt-0.5">{chip.weekday}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-brand-dark text-[14px] truncate tracking-tight">
                    {g.title}
                  </h3>
                  {chip.isToday && (
                    <span className="text-[9px] uppercase tracking-[0.18em] font-extrabold px-2 py-0.5 rounded-md bg-[#c9973a]/10 text-[#c9973a]">
                      Today
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {g.startTime} – {g.endTime}
                  </span>
                  {g.counterparty && (
                    <span className="text-slate-400 truncate">· {g.counterparty}</span>
                  )}
                  <span className="text-slate-400">· #{g.orderNumber}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-[14px] sm:text-[15px] font-extrabold text-brand-dark whitespace-nowrap">
                  K{g.amountZmw.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                  {g.status === 'PENDING' ? 'Awaiting' : g.status.toLowerCase()}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarGrid({
  currentMonth,
  selectedDate,
  onDateSelect,
  dayMeta,
  isCollapsed,
}: {
  currentMonth: Date;
  selectedDate: Date;
  onDateSelect: (d: Date) => void;
  dayMeta: (d: Date) => { gig: number; manual: number };
  isCollapsed: boolean;
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = useMemo(() => {
    const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: selectedWeekStart,
      end: addDays(selectedWeekStart, 6),
    });
  }, [selectedDate]);

  const displayDays = isCollapsed ? weekDays : days;

  return (
    <>
      {displayDays.map((day) => {
        const isSelected     = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const meta           = dayMeta(day);
        const isCurrentDay   = isToday(day);
        const hasGig         = meta.gig > 0;
        const hasManual      = meta.manual > 0;

        // Days with gigs get a gold ring + tinted background so the
        // provider can scan the month at a glance and immediately see
        // which dates need them on stage. Tiny dots are still rendered
        // for granularity; the ring + tint is the at-a-glance signal.
        const baseClass =
          'relative flex flex-col items-center justify-center py-2 rounded-xl transition-all border-[1.5px]';
        const stateClass = isSelected
          ? 'bg-[#c9973a] text-white shadow-lg shadow-[#c9973a]/30 scale-105 z-10 border-[#c9973a]'
          : hasGig
            ? 'bg-[#fdf6e9] text-brand-dark border-[#c9973a]/55 hover:border-[#c9973a]'
            : isCurrentDay
              ? 'bg-[#f5f2ed] text-brand-dark border-transparent'
              : 'text-brand-dark hover:bg-[#f5f2ed] border-transparent';

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDateSelect(day)}
            className={`${baseClass} ${stateClass}`}
            aria-label={
              hasGig
                ? `${format(day, 'PPPP')} — ${meta.gig} ${meta.gig === 1 ? 'gig' : 'gigs'}`
                : format(day, 'PPPP')
            }
          >
            <span
              className={[
                'text-sm font-bold',
                !isCurrentMonth && !isCollapsed ? 'opacity-30' : '',
                isCurrentDay && !isSelected ? 'text-[#c9973a]' : '',
              ].join(' ')}
            >
              {format(day, 'd')}
            </span>
            {(hasGig || hasManual) && (
              <div className="flex gap-0.5 mt-1 items-center">
                {hasGig && (
                  <span
                    className={`min-w-[14px] h-[14px] rounded-full text-[9px] font-extrabold flex items-center justify-center px-1 ${
                      isSelected ? 'bg-white text-[#c9973a]' : 'bg-[#c9973a] text-white'
                    }`}
                  >
                    {meta.gig}
                  </span>
                )}
                {hasManual && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: isSelected ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}
                  />
                )}
              </div>
            )}
          </button>
        );
      })}
    </>
  );
}

function EventCard({
  event,
  onDelete,
  onEdit,
  onToggleStatus,
}: {
  event: MergedEvent;
  onDelete?: () => void;
  onEdit?: () => void;
  onToggleStatus?: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const isGig = event.kind === 'gig';

  const statusPill = (() => {
    if (isGig) {
      const map: Record<string, { label: string; bg: string; fg: string }> = {
        PENDING:   { label: 'Awaiting',  bg: 'bg-amber-100',  fg: 'text-amber-600' },
        CONFIRMED: { label: 'Confirmed', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
        SHIPPED:   { label: 'In Transit', bg: 'bg-blue-50',   fg: 'text-blue-600' },
        DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
        COMPLETED: { label: 'Done',      bg: 'bg-slate-100',  fg: 'text-slate-500' },
      };
      return map[event.status] ?? { label: event.status, bg: 'bg-slate-100', fg: 'text-slate-500' };
    }
    const map: Record<string, { label: string; bg: string; fg: string }> = {
      PENDING:   { label: 'Pending',   bg: 'bg-slate-100', fg: 'text-slate-500' },
      ACTIVE:    { label: 'Active',    bg: 'bg-amber-100', fg: 'text-amber-600' },
      COMPLETED: { label: 'Done',      bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    };
    return map[event.status] ?? { label: event.status, bg: 'bg-slate-100', fg: 'text-slate-500' };
  })();

  const accent = isGig ? '#c9973a' : (MANUAL_CATEGORIES.find((c) => c.id === event.manual?.category)?.dot ?? '#64748B');

  return (
    <div className="flex gap-3 group">
      <div className="relative z-10 mt-1">
        <button
          onClick={onToggleStatus}
          disabled={!onToggleStatus}
          className={[
            'w-6 h-6 rounded-full flex items-center justify-center transition-all',
            isGig
              ? 'bg-[#c9973a] text-white cursor-default'
              : event.manual?.status === 'COMPLETED'
                ? 'bg-emerald-500 text-white'
                : 'bg-white border-2 border-slate-200',
          ].join(' ')}
        >
          {isGig ? (
            <Sparkles className="w-3 h-3" />
          ) : event.manual?.status === 'COMPLETED' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : event.manual?.status === 'ACTIVE' ? (
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          ) : (
            <Circle className="w-4 h-4 text-slate-200" />
          )}
        </button>
      </div>

      <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-200 hover:shadow-md transition-all relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />

        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="flex flex-col min-w-0">
            <h3 className="font-bold text-[15px] text-brand-dark tracking-tight truncate">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-1">
              <Clock className="w-3 h-3" />
              {event.startTime} - {event.endTime}
              {isGig && event.gig?.counterparty && (
                <span className="text-slate-400">· {event.gig.counterparty}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isGig && (
              <span className="text-[9px] uppercase tracking-[0.18em] font-extrabold px-2 py-1 rounded-md bg-[#c9973a]/10 text-[#c9973a]">
                Gig
              </span>
            )}
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${statusPill.bg} ${statusPill.fg}`}>
              {statusPill.label}
            </span>
            {(onEdit || onDelete) && (
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-1 hover:bg-[#f5f2ed] rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-slate-400" />
                </button>
                <AnimatePresence>
                  {showActions && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowActions(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-slate-200 z-30 py-1"
                      >
                        {onEdit && (
                          <button
                            onClick={() => { onEdit(); setShowActions(false); }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#f5f2ed] text-slate-600"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => { onDelete(); setShowActions(false); }}
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#f5f2ed] text-red-500"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {(event.note || (isGig && event.gig?.amountZmw)) && (
          <div className="mt-2 flex items-center gap-3 text-[12px] text-slate-500">
            {event.note && <span className="line-clamp-2 leading-relaxed">{event.note}</span>}
            {isGig && event.gig && (
              <span className="ml-auto font-extrabold text-brand-dark whitespace-nowrap">
                K{event.gig.amountZmw.toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isGig ? `Order #${event.gig?.orderNumber ?? ''}` : event.manual?.category ?? 'NOTE'}
            </span>
          </div>
          {event.manual?.reminderEnabled && <Bell className="w-3 h-3 text-[#c9973a]" />}
        </div>
      </div>
    </div>
  );
}

function AddEventModal({
  onClose,
  selectedDate,
  editingEvent,
}: {
  onClose: () => void;
  selectedDate: Date;
  editingEvent: CalendarEvent | null;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [note, setNote] = useState(editingEvent?.note || '');
  const [startTime, setStartTime] = useState(editingEvent?.startTime || '09:00');
  const [endTime, setEndTime] = useState(editingEvent?.endTime || '10:00');
  const [category, setCategory] = useState<CalendarEvent['category']>(
    editingEvent?.category || 'WORK',
  );
  const [reminderEnabled, setReminderEnabled] = useState(editingEvent?.reminderEnabled || false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const eventData: Omit<CalendarEvent, 'id'> = {
      userId: typeof user.id === 'number' ? user.id : parseInt(user.id || '0', 10),
      title,
      note,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      category,
      reminderEnabled,
      status: editingEvent?.status || 'PENDING',
      createdAt: editingEvent?.createdAt || Date.now(),
    };

    if (editingEvent?.id) {
      await db.calendarEvents.update(editingEvent.id, eventData);
    } else {
      await db.calendarEvents.add(eventData as CalendarEvent);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-xl border border-slate-200"
      >
        <div className="px-7 pt-7 pb-5 border-b border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#c9973a]">
                Personal note
              </p>
              <h2 className="mt-1 text-xl font-bold font-serif text-brand-dark tracking-tight">
                {editingEvent ? 'Edit note' : 'New note'}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 hover:bg-[#f5f2ed] rounded-full transition-colors text-slate-500"
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
          <p className="text-slate-500 text-[13px] font-sans">
            {format(selectedDate, 'EEEE, MMMM do')}
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto"
        >
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Time range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400">Start</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400">End</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-brand-dark"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Title
            </label>
            <input
              type="text"
              placeholder="What's the note about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-3.5 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all text-base font-medium font-serif text-brand-dark placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Notes
            </label>
            <textarea
              placeholder="Optional details"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full p-3.5 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all resize-none font-sans text-brand-dark placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Category
              </label>
              <div className="flex gap-2.5">
                {MANUAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    aria-label={cat.label}
                    className={`w-6 h-6 rounded-full transition-all ${
                      category === cat.id
                        ? 'ring-4 ring-[#f5f2ed] scale-110'
                        : 'opacity-40 hover:opacity-100'
                    }`}
                    style={{ background: cat.dot }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Reminder
              </label>
              <button
                type="button"
                onClick={() => setReminderEnabled(!reminderEnabled)}
                aria-pressed={reminderEnabled}
                className={`w-12 h-6 rounded-full relative transition-all ${
                  reminderEnabled ? 'bg-[#c9973a]' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                    reminderEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full py-4 bg-[#c9973a] text-white text-base font-bold rounded-xl shadow-lg shadow-[#c9973a]/30"
            >
              {editingEvent ? 'Save changes' : 'Save note'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
