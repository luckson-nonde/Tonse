import React, { useState, useMemo } from 'react';
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
  parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  Bell,
  BellOff,
  MoreVertical,
  Trash2,
  Edit2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAuth } from '../AuthContext';
import { CalendarEvent } from '../types';
import Button from '../components/Button';

const CATEGORIES = [
  { id: 'WORK', label: 'Work', color: 'bg-blue-500' },
  { id: 'PERSONAL', label: 'Personal', color: 'bg-purple-500' },
  { id: 'HEALTH', label: 'Health', color: 'bg-green-500' },
  { id: 'OTHER', label: 'Other', color: 'bg-gray-500' },
];

export default function SchedulePage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const events = useLiveQuery(
    () => db.calendarEvents.where('userId').equals(user?.id || 0).toArray(),
    [user?.id]
  );

  const selectedDateEvents = useMemo(() => {
    if (!events) return [];
    return events
      .filter(event => isSameDay(parseISO(event.date), selectedDate))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [events, selectedDate]);

  const hasEventsOnDay = (day: Date) => {
    if (!events) return false;
    return events.some(event => isSameDay(parseISO(event.date), day));
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      await db.calendarEvents.delete(id);
    }
  };

  const handleToggleStatus = async (event: CalendarEvent) => {
    const nextStatus: Record<string, 'PENDING' | 'ACTIVE' | 'COMPLETED'> = {
      'PENDING': 'ACTIVE',
      'ACTIVE': 'COMPLETED',
      'COMPLETED': 'PENDING'
    };
    await db.calendarEvents.update(event.id!, { status: nextStatus[event.status] });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-[#8ba870] text-white p-6 pb-12 rounded-b-[40px] shadow-lg relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            <h1 className="text-2xl font-bold font-serif">
              {format(currentMonth, 'MMMM yyyy')}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => {}} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={goToToday}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-bold opacity-60 py-2">
              {day}
            </div>
          ))}
        </div>

        <motion.div 
          layout
          className="grid grid-cols-7 gap-1"
        >
          <CalendarGrid 
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            hasEventsOnDay={hasEventsOnDay}
            isCollapsed={isCollapsed}
          />
        </motion.div>

        {/* Collapse Handle */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-12 h-1.5 bg-white/40 rounded-full hover:bg-white/60 transition-colors"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 p-6 -mt-6 pt-12 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#1a1a1a]">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
          </h2>
          <span className="text-sm text-gray-500 font-medium">
            {selectedDateEvents.length} events
          </span>
        </div>

        {selectedDateEvents.length > 0 ? (
          <div className="space-y-6 relative">
            {/* Timeline Axis */}
            <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200" />
            
            {selectedDateEvents.map((event, index) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onDelete={() => handleDeleteEvent(event.id!)}
                onEdit={() => {
                  setEditingEvent(event);
                  setIsAddModalOpen(true);
                }}
                onToggleStatus={() => handleToggleStatus(event)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-400">No events scheduled</h3>
            <p className="text-gray-400 text-sm mt-1">Tap the + button to add your first event</p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={() => {
          setEditingEvent(null);
          setIsAddModalOpen(true);
        }}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#f0c05a] text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
      >
        <Plus className="w-8 h-8" strokeWidth={3} />
      </button>

      {/* Add/Edit Modal */}
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

function CalendarGrid({ currentMonth, selectedDate, onDateSelect, hasEventsOnDay, isCollapsed }: any) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = useMemo(() => {
    const selectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: selectedWeekStart,
      end: addDays(selectedWeekStart, 6)
    });
  }, [selectedDate]);

  const displayDays = isCollapsed ? weekDays : days;

  return (
    <>
      {displayDays.map((day, i) => {
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const hasEvents = hasEventsOnDay(day);
        const isCurrentDay = isToday(day);

        return (
          <button
            key={i}
            onClick={() => onDateSelect(day)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              isSelected ? 'bg-white text-[#8ba870] shadow-md scale-110 z-10' : 'hover:bg-white/10'
            }`}
          >
            <span className={`text-sm font-bold ${
              !isCurrentMonth && !isCollapsed ? 'opacity-30' : ''
            } ${isCurrentDay && !isSelected ? 'text-[#f0c05a]' : ''}`}>
              {format(day, 'd')}
            </span>
            {hasEvents && (
              <div className={`w-1 h-1 rounded-full mt-1 ${
                isSelected ? 'bg-[#8ba870]' : 'bg-white'
              }`} />
            )}
          </button>
        );
      })}
    </>
  );
}

function EventCard({ event, onDelete, onEdit, onToggleStatus }: { 
  event: CalendarEvent, 
  onDelete: () => void,
  onEdit: () => void,
  onToggleStatus: () => void
}) {
  const [showActions, setShowActions] = useState(false);

  const statusColors = {
    'PENDING': 'bg-gray-100 text-gray-500',
    'ACTIVE': 'bg-yellow-100 text-yellow-600',
    'COMPLETED': 'bg-orange-100 text-orange-600'
  };

  const categoryColor = CATEGORIES.find(c => c.id === event.category)?.color || 'bg-gray-500';

  return (
    <div className="flex gap-4 group">
      <div className="relative z-10 mt-1">
        <button 
          onClick={onToggleStatus}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            event.status === 'COMPLETED' ? 'bg-orange-500 text-white' : 'bg-white border-2 border-gray-200'
          }`}
        >
          {event.status === 'COMPLETED' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : event.status === 'ACTIVE' ? (
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          ) : (
            <Circle className="w-4 h-4 text-gray-200" />
          )}
        </button>
      </div>

      <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${categoryColor}`} />
        
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <h3 className={`font-bold text-lg ${event.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-[#1a1a1a]'}`}>
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-1">
              <Clock className="w-3 h-3" />
              {event.startTime} - {event.endTime}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg ${statusColors[event.status]}`}>
              {event.status.replace('_', ' ')}
            </span>
            <div className="relative">
              <button 
                onClick={() => setShowActions(!showActions)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              
              <AnimatePresence>
                {showActions && (
                  <>
                    <div 
                      className="fixed inset-0 z-20" 
                      onClick={() => setShowActions(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-30 py-1"
                    >
                      <button 
                        onClick={() => { onEdit(); setShowActions(false); }}
                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-600"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button 
                        onClick={() => { onDelete(); setShowActions(false); }}
                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {event.note && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-2 leading-relaxed">
            {event.note}
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${categoryColor}`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {event.category}
            </span>
          </div>
          {event.reminderEnabled && (
            <Bell className="w-3 h-3 text-[#f0c05a]" />
          )}
        </div>
      </div>
    </div>
  );
}

function AddEventModal({ onClose, selectedDate, editingEvent }: { 
  onClose: () => void, 
  selectedDate: Date,
  editingEvent: CalendarEvent | null
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [note, setNote] = useState(editingEvent?.note || '');
  const [startTime, setStartTime] = useState(editingEvent?.startTime || '09:00');
  const [endTime, setEndTime] = useState(editingEvent?.endTime || '10:00');
  const [category, setCategory] = useState<CalendarEvent['category']>(editingEvent?.category || 'WORK');
  const [reminderEnabled, setReminderEnabled] = useState(editingEvent?.reminderEnabled || false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const eventData: Omit<CalendarEvent, 'id'> = {
      userId: user.id!,
      title,
      note,
      date: format(selectedDate, 'yyyy-MM-dd'),
      startTime,
      endTime,
      category,
      reminderEnabled,
      status: editingEvent?.status || 'PENDING',
      createdAt: editingEvent?.createdAt || Date.now()
    };

    if (editingEvent?.id) {
      await db.calendarEvents.update(editingEvent.id, eventData);
    } else {
      await db.calendarEvents.add(eventData as CalendarEvent);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
        className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl"
      >
        <div className="bg-[#8ba870] p-8 text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold font-serif">
              {editingEvent ? 'Edit Event' : 'Add Note'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <Plus className="w-6 h-6 rotate-45" />
            </button>
          </div>
          <p className="opacity-80 text-sm">
            {format(selectedDate, 'EEEE, MMMM do')}
          </p>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Time Selection */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Time Range</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400">Start Time</span>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#8ba870] transition-all"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400">End Time</span>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#8ba870] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title</label>
            <input 
              type="text" 
              placeholder="Write the title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#8ba870] transition-all text-lg font-medium"
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Note</label>
            <textarea 
              placeholder="Write your important note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#8ba870] transition-all resize-none"
            />
          </div>

          {/* Category & Alarm */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color</label>
              <div className="flex gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`w-6 h-6 rounded-full transition-all ${cat.color} ${
                      category === cat.id ? 'ring-4 ring-gray-100 scale-125' : 'opacity-40 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alarm</label>
              <button
                type="button"
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`w-12 h-6 rounded-full relative transition-all ${
                  reminderEnabled ? 'bg-[#8ba870]' : 'bg-gray-200'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  reminderEnabled ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit"
              className="w-full py-5 bg-[#f0c05a] text-white text-xl font-bold rounded-2xl shadow-xl shadow-[#f0c05a]/20"
            >
              Save
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
