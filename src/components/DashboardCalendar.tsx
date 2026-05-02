import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Event {
  date: Date;
  title: string;
  type: 'inquiry' | 'quote' | 'order' | 'meeting';
  color: 'amber' | 'purple' | 'emerald' | 'blue';
}

// Calendar copy tone — derived from getBusinessType in CalendarPanel and
// passed in. Lets the same calendar widget say "OPEN REPAIRS / THIS WEEK"
// for a repair shop and "TOTAL EVENTS / THIS MONTH" for an events provider
// without per-role component variants.
export type CalendarTone =
  | 'repair'
  | 'retail'
  | 'wholesale'
  | 'services'
  | 'events'
  | 'buyer'
  | 'generic';

interface DashboardCalendarProps {
  events?: Event[];
  className?: string;
  tone?: CalendarTone;
}

interface ToneConfig {
  primary: { label: string; bg: string; text: string };
  secondary: { label: string; bg: string; text: string; mode: 'this-week' | 'this-month' };
  inquiryEmoji: string;
  inquiryLabel: string;
  quoteLabel: string;
  orderLabel: string;
}

const TONE_CONFIG: Record<CalendarTone, ToneConfig> = {
  repair: {
    primary: { label: 'Open Repairs', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Week', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-week' },
    inquiryEmoji: '🔧',
    inquiryLabel: 'Repair Request',
    quoteLabel: 'Repair Quote',
    orderLabel: 'Active Repair',
  },
  retail: {
    primary: { label: 'Open Orders', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Month', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-month' },
    inquiryEmoji: '📋',
    inquiryLabel: 'Inquiry',
    quoteLabel: 'Quote',
    orderLabel: 'Order',
  },
  wholesale: {
    primary: { label: 'Open RFQs', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Month', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-month' },
    inquiryEmoji: '📦',
    inquiryLabel: 'Purchase Request',
    quoteLabel: 'Bulk Quote',
    orderLabel: 'Bulk Order',
  },
  services: {
    primary: { label: 'Active Engagements', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Month', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-month' },
    inquiryEmoji: '💼',
    inquiryLabel: 'Service Request',
    quoteLabel: 'Service Quote',
    orderLabel: 'Active Engagement',
  },
  events: {
    primary: { label: 'Total Events', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Month', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-month' },
    inquiryEmoji: '🎉',
    inquiryLabel: 'New Booking',
    quoteLabel: 'Event Quote',
    orderLabel: 'Confirmed Event',
  },
  buyer: {
    primary: { label: 'My Inquiries', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Month', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-month' },
    inquiryEmoji: '📋',
    inquiryLabel: 'My Inquiry',
    quoteLabel: 'Quote Received',
    orderLabel: 'My Order',
  },
  generic: {
    primary: { label: 'Total Events', bg: 'bg-amber-50', text: 'text-amber-600' },
    secondary: { label: 'This Month', bg: 'bg-blue-50', text: 'text-blue-600', mode: 'this-month' },
    inquiryEmoji: '📋',
    inquiryLabel: 'Inquiry',
    quoteLabel: 'Quote',
    orderLabel: 'Order',
  },
};

export default function DashboardCalendar({
  events = [],
  className = '',
  tone = 'generic',
}: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const toneCfg = TONE_CONFIG[tone] ?? TONE_CONFIG.generic;

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [currentDate]);

  const getEventForDate = (day: number | null) => {
    if (!day) return null;
    return events.find(
      (e) =>
        e.date.getDate() === day &&
        e.date.getMonth() === currentDate.getMonth() &&
        e.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const colorMap = {
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const typeLabel = {
    inquiry: `${toneCfg.inquiryEmoji} ${toneCfg.inquiryLabel}`,
    quote: `📊 ${toneCfg.quoteLabel}`,
    order: `📦 ${toneCfg.orderLabel}`,
    meeting: '🎯 Meeting',
  };

  // Secondary counter: events in the current calendar month, OR events
  // landing within the next 7 days for "this week" tones.
  const secondaryCount =
    toneCfg.secondary.mode === 'this-week'
      ? events.filter((e) => {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(end.getDate() + 7);
          return e.date >= start && e.date < end;
        }).length
      : events.filter((e) => e.date.getMonth() === currentDate.getMonth()).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`bg-white rounded-2xl border border-slate-100 p-6 h-fit ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 rounded-xl">
            <CalendarIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calendar</p>
            <h3 className="text-base font-bold text-brand-dark">{monthName}</h3>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={handleToday}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-100"
        >
          Today
        </motion.button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-5">
        <motion.button
          whileHover={{ scale: 0.95 }}
          onClick={handlePrevMonth}
          className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </motion.button>
        <span className="text-sm font-bold text-slate-700">{monthName}</span>
        <motion.button
          whileHover={{ scale: 0.95 }}
          onClick={handleNextMonth}
          className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </motion.button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {calendarDays.map((day, idx) => {
          const event = getEventForDate(day);
          const isToday =
            day &&
            new Date().getDate() === day &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <motion.div
              key={`${day}-${idx}`}
              whileHover={day ? { scale: 1.1 } : {}}
              className={`aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                !day
                  ? 'bg-transparent'
                  : isToday
                    ? 'bg-gradient-to-br from-[#C9973A] to-[#b8832a] text-white shadow-md'
                    : event
                      ? 'bg-amber-50 border-2 border-dashed border-[#C9973A]/40 text-brand-dark hover:border-[#C9973A] hover:bg-amber-100'
                      : 'hover:bg-slate-100 text-slate-600'
              }`}
              title={event ? event.title : ''}
            >
              {day}
            </motion.div>
          );
        })}
      </div>

      {/* Events List */}
      {events.length > 0 && (
        <div className="space-y-3 border-t border-slate-100 pt-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Upcoming Events
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
            {events
              .filter((e) => e.date >= new Date(new Date().setHours(0,0,0,0)))
              .sort((a, b) => a.date.getTime() - b.date.getTime())
              .slice(0, 5)
              .map((event, idx) => (
                <motion.div
                  key={`event-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border ${colorMap[event.color]} group cursor-pointer hover:shadow-md transition-all duration-300`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold truncate">{event.title}</span>
                    <span className="text-[10px] opacity-70 whitespace-nowrap shrink-0">
                      {event.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[10px] opacity-75 mt-0.5">{typeLabel[event.type]}</p>
                </motion.div>
              ))}
          </div>
          {events.filter((e) => e.date >= new Date(new Date().setHours(0,0,0,0))).length === 0 && (
            <p className="text-xs text-slate-400 italic text-center py-4">No upcoming events</p>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-3">
          <div className={`${toneCfg.primary.bg} rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-black ${toneCfg.primary.text}`}>{events.length}</p>
            <p className={`text-[10px] font-bold ${toneCfg.primary.text} uppercase tracking-wider mt-1`}>
              {toneCfg.primary.label}
            </p>
          </div>
          <div className={`${toneCfg.secondary.bg} rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-black ${toneCfg.secondary.text}`}>{secondaryCount}</p>
            <p className={`text-[10px] font-bold ${toneCfg.secondary.text} uppercase tracking-wider mt-1`}>
              {toneCfg.secondary.label}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
