import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import Button from '../Button';
import DateTimePicker from '../DateTimePicker';
import {
  CalendarEvent,
  CalendarEventCategory,
  CalendarEventColor,
  CalendarEventRepeatRule,
} from '../../types';
import {
  createCalendarEvent,
  updateCalendarEvent,
  type UpdateCalendarEventPayload,
} from '../../services/api/calendarEventService';
import { notifyCalendarEventsChanged } from '../../hooks/useCalendarEvents';
import {
  CATEGORY_DEFAULT_COLOR,
  CATEGORY_OPTIONS,
  COLOR_META,
  COLOR_OPTIONS,
  REMINDER_OPTIONS,
  REPEAT_OPTIONS,
} from '../../services/scheduleMeta';

interface ScheduleEventModalProps {
  onClose: () => void;
  /** Prefill for the date field when creating. */
  defaultDate: Date;
  /** Pass the base event to edit; null/undefined = create. */
  editingEvent?: CalendarEvent | null;
  /** Fired after a successful save (the changed-event bus also fires). */
  onSaved?: (event: CalendarEvent) => void;
}

const inputClasses =
  'w-full p-3.5 bg-[#f5f2ed] border border-slate-200 rounded-xl outline-none focus:border-[#c9973a] transition-all font-sans text-brand-dark placeholder-slate-400';

const labelClasses = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest';

/**
 * "+ New Schedule" form — the upgraded, shared successor of SchedulePage's
 * old AddEventModal (which silently 404'd into the missing /calendar-events
 * backend). Bottom-sheet on mobile, centered card on desktop. All borders
 * opaque hexes (Mali-GPU Android rule).
 */
export default function ScheduleEventModal({
  onClose,
  defaultDate,
  editingEvent,
  onSaved,
}: ScheduleEventModalProps) {
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [description, setDescription] = useState(editingEvent?.description || '');
  const [date, setDate] = useState(editingEvent?.date || format(defaultDate, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(editingEvent?.startTime || '09:00');
  const [endTime, setEndTime] = useState(editingEvent?.endTime || '10:00');
  const [location, setLocation] = useState(editingEvent?.location || '');
  const [category, setCategory] = useState<CalendarEventCategory>(
    editingEvent?.category || 'MEETING',
  );
  // null = auto (derive from category); a value = explicit user override.
  const [colorOverride, setColorOverride] = useState<CalendarEventColor | null>(
    editingEvent?.color ?? null,
  );
  const [repeatRule, setRepeatRule] = useState<CalendarEventRepeatRule>(
    editingEvent?.repeatRule || 'NONE',
  );
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | null>(
    editingEvent?.reminderOffsetMinutes ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveColor = colorOverride ?? CATEGORY_DEFAULT_COLOR[category];

  const headerDate = useMemo(() => {
    try {
      return format(parseISO(date), 'EEEE, MMMM do');
    } catch {
      return '';
    }
  }, [date]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || saving) return;
    setSaving(true);
    setError(null);
    try {
      let saved: CalendarEvent;
      if (editingEvent?.id) {
        const changes: UpdateCalendarEventPayload = {
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          startTime: startTime || null,
          endTime: endTime || null,
          location: location.trim() || null,
          category,
          color: colorOverride,
          repeatRule,
          reminderOffsetMinutes,
        };
        saved = await updateCalendarEvent(editingEvent.id, changes);
      } else {
        saved = await createCalendarEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          location: location.trim() || undefined,
          category,
          color: colorOverride ?? undefined,
          repeatRule,
          reminderOffsetMinutes: reminderOffsetMinutes ?? undefined,
        });
      }
      notifyCalendarEventsChanged();
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the schedule. Please try again.');
    } finally {
      setSaving(false);
    }
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
                {editingEvent ? 'Edit schedule' : 'New schedule'}
              </p>
              <h2 className="mt-1 text-xl font-bold font-serif text-brand-dark tracking-tight">
                {editingEvent ? 'Edit schedule' : 'Create a schedule'}
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
          {headerDate && <p className="text-slate-500 text-[13px] font-sans">{headerDate}</p>}
        </div>

        <form onSubmit={handleSave} className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className={labelClasses}>Event title</label>
            <input
              type="text"
              placeholder="What's happening?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={`${inputClasses} text-base font-medium font-serif`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClasses}>Description</label>
            <textarea
              placeholder="Optional details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClasses} resize-none`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelClasses}>Date</label>
            <DateTimePicker
              value={date}
              onChange={setDate}
              mode="date"
              placeholder="Pick a date"
              minDate={new Date(2000, 0, 1)}
            />
          </div>

          <div className="space-y-3">
            <label className={labelClasses}>Time range</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className={labelClasses}>Location</label>
            <input
              type="text"
              placeholder="Optional — where is it?"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClasses}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarEventCategory)}
                className={inputClasses}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelClasses}>Repeat</label>
              <select
                value={repeatRule}
                onChange={(e) => setRepeatRule(e.target.value as CalendarEventRepeatRule)}
                className={inputClasses}
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={labelClasses}>Color</label>
              <div className="flex gap-2.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorOverride(c)}
                    aria-label={COLOR_META[c].label}
                    aria-pressed={effectiveColor === c}
                    title={COLOR_META[c].label}
                    className={`w-6 h-6 rounded-full transition-all ${
                      effectiveColor === c
                        ? 'ring-4 ring-[#f5f2ed] scale-110'
                        : 'opacity-40 hover:opacity-100'
                    }`}
                    style={{ background: COLOR_META[c].hex }}
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                {colorOverride ? 'Custom color' : 'Matches the category'}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className={labelClasses}>Reminder</label>
              <select
                value={reminderOffsetMinutes === null ? '' : String(reminderOffsetMinutes)}
                onChange={(e) =>
                  setReminderOffsetMinutes(e.target.value === '' ? null : Number(e.target.value))
                }
                className={inputClasses}
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value === null ? '' : String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-[#fecaca] rounded-xl p-3">
              {error}
            </p>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-[#f5f2ed] text-brand-dark text-base font-bold rounded-xl hover:bg-[#ece7de] transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-[#c9973a] text-white text-base font-bold rounded-xl shadow-lg shadow-[#c9973a]/30"
            >
              {saving ? 'Saving…' : editingEvent ? 'Save changes' : 'Save schedule'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
