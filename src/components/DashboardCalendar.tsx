import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Event {
  date: Date;
  title: string;
  type: 'inquiry' | 'quote' | 'order' | 'meeting';
  color: 'amber' | 'purple' | 'emerald' | 'blue';
}

interface DashboardCalendarProps {
  events?: Event[];
  className?: string;
}

export default function DashboardCalendar({ events = [], className = '' }: DashboardCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());

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
    inquiry: '📋 Inquiry',
    quote: '📊 Quote',
    order: '📦 Order',
    meeting: '🎯 Meeting',
  };

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
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-amber-600">{events.length}</p>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-1">Total Events</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-blue-600">
              {events.filter((e) => e.date.getMonth() === currentDate.getMonth()).length}
            </p>
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mt-1">This Month</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
