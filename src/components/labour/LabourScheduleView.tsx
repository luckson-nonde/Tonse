import React from 'react';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface LabourScheduleViewProps {
  schedules: any[];
  onAction: (actionId: string, payload?: any) => void;
}

export default function LabourScheduleView({ schedules, onAction }: LabourScheduleViewProps) {
  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-serif font-bold text-brand-dark mb-2">
            No Confirmed Jobs Yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            When your proposals are accepted by employers, they will appear here in your schedule.
          </p>
        </div>
      ) : (
        schedules.map((schedule) => (
          <div
            key={schedule.id}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6"
          >
            {/* Date Block */}
            <div className="shrink-0 w-24 h-24 bg-[#f8f9fa] rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {new Date(schedule.date || schedule.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                })}
              </span>
              <span className="text-3xl font-serif font-black text-brand-dark">
                {new Date(schedule.date || schedule.createdAt).getDate()}
              </span>
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col justify-center">
              <h3 className="text-lg font-serif font-bold text-brand-dark mb-2">
                {schedule.title || `Job #${schedule.inquiryId}`}
              </h3>

              <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {schedule.time || 'Time not specified'}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {schedule.location || 'Location not specified'}
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="flex flex-col justify-center items-end min-w-30">
              <button
                onClick={() => onAction('view_schedule', schedule)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-brand-dark text-[13px] font-medium rounded-full transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
