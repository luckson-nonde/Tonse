import React from 'react';
import { Clock, MapPin, ChevronRight, X } from 'lucide-react';
import { uniqueKey } from '../../utils/keyUtils';
import emptyScheduleImage from '../../assets/images/empty-states/owl_reading.png';
import DashboardCalendar from '../DashboardCalendar';
import { getBusinessTypes } from '../../services/categories';

interface ProviderScheduleViewProps {
  user: any;
  schedules: any[];
  selectedSchedule: any | null;
  isRescheduleModalOpen: boolean;
  rescheduleDate: string;
  rescheduleTime: string;
  onSetSelectedSchedule: (schedule: any | null) => void;
  onSetRescheduleModalOpen: (open: boolean) => void;
  onSetRescheduleDate: (date: string) => void;
  onSetRescheduleTime: (time: string) => void;
  onReschedule: () => void;
}

export default function ProviderScheduleView({
  user,
  schedules,
  selectedSchedule,
  isRescheduleModalOpen,
  rescheduleDate,
  rescheduleTime,
  onSetSelectedSchedule,
  onSetRescheduleModalOpen,
  onSetRescheduleDate,
  onSetRescheduleTime,
  onReschedule,
}: ProviderScheduleViewProps) {
  // Set-check: a seller who serves EVENTS plus other archetypes still
  // gets the rental-specific copy on the schedule view.
  const isEventsBusiness = getBusinessTypes(user as any).includes('EVENTS');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold font-serif text-brand-dark">My Schedule</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isEventsBusiness
              ? 'Manage your upcoming equipment rentals and bookings'
              : 'Manage your upcoming bookings and events'}
          </p>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 sm:p-16 text-center flex flex-col items-center justify-center min-h-[50vh] shadow-sm">
          <img src={emptyScheduleImage} alt="No upcoming events" className="w-48 h-48 sm:w-56 sm:h-56 object-contain opacity-90 mb-8" />
          <h3 className="text-2xl font-serif font-bold text-slate-900 mb-3">
            {isEventsBusiness ? 'No Upcoming Rentals' : 'No Upcoming Events'}
          </h3>
          <p className="text-slate-500 text-lg">
            {isEventsBusiness
              ? "You don't have any scheduled rentals yet."
              : "You don't have any scheduled bookings yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DashboardCalendar
              events={schedules.map(s => ({
                date: new Date(s.date),
                title: s.title,
                type: s.type === 'RENTAL' ? 'order' : 'meeting',
                color: s.status === 'SCHEDULED' ? 'emerald' : 'amber'
              }))}
            />
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Upcoming</h3>
            {[...schedules]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((schedule, idx) => (
              <div
                key={uniqueKey('schedule', schedule.id, idx)}
                onClick={() => onSetSelectedSchedule(schedule)}
                className="bg-white rounded-2xl p-4 border border-[#f1f0ee] shadow-sm hover:border-[#d49b35]/30 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 w-full"
              >
                <div className="flex flex-col items-center justify-center bg-brand-white rounded-xl p-3 min-w-15 shrink-0 border border-[#f8f7f5] gap-0.5">
                  <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">
                    {new Date(schedule.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-black text-brand-dark">
                    {new Date(schedule.date).getDate()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[#1a1612] truncate font-serif">
                      {schedule.title}
                    </h3>
                    {schedule.status === 'SCHEDULED' && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[8px] font-bold tracking-wider uppercase shrink-0">
                        Confirmed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#d49b35]" />
                      <span>{schedule.startTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#d49b35]" />
                      <span className="truncate">{schedule.location}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Details Modal */}
      {selectedSchedule && !isRescheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Event Details</h3>
              <button
                onClick={() => onSetSelectedSchedule(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-1">{selectedSchedule.title}</h4>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                      selectedSchedule.status === 'RESCHEDULED'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {selectedSchedule.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Date
                  </span>
                  <span className="font-medium text-slate-900">
                    {new Date(selectedSchedule.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Time
                  </span>
                  <span className="font-medium text-slate-900">
                    {selectedSchedule.startTime} - {selectedSchedule.endTime}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Location
                  </span>
                  <span className="font-medium text-slate-900">{selectedSchedule.location}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => {
                    onSetRescheduleDate(selectedSchedule.date);
                    onSetRescheduleTime(selectedSchedule.startTime);
                    onSetRescheduleModalOpen(true);
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => onSetSelectedSchedule(null)}
                  className="flex-1 bg-brand-dark text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleModalOpen && selectedSchedule && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Reschedule Event</h3>
              <button
                onClick={() => onSetRescheduleModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  New Date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => onSetRescheduleDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/20 focus:border-[#C9973A]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                  New Start Time
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => onSetRescheduleTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/20 focus:border-[#C9973A]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => onSetRescheduleModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onReschedule}
                  className="flex-1 bg-[#C9973A] text-white font-bold py-3 rounded-xl hover:bg-[#b3822c] transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
