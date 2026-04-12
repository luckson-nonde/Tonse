import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, CheckCircle, Clock } from 'lucide-react';

interface LabourHomeViewProps {
  user: any;
  jobRequests: any[];
  quotes: any[];
  schedules: any[];
  availableBalance: number;
  onAction: (actionId: string, payload?: any) => void;
}

export default function LabourHomeView({
  user,
  jobRequests,
  quotes,
  schedules,
  availableBalance,
  onAction
}: LabourHomeViewProps) {
  const navigate = useNavigate();
  const [isAvailable, setIsAvailable] = useState(user?.availabilityStatus !== 'NOT_AVAILABLE');

  const handleToggleAvailability = () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    onAction('toggle_availability', { isAvailable: newStatus });
  };

  const activeProposals = quotes.filter(q => q.status === 'PENDING').length;
  const confirmedJobs = schedules.length;

  return (
    <div className="space-y-6">
      {/* Availability Toggle */}
      <div className="bg-white rounded-[16px] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-serif font-bold text-[#1e293b]">Availability Status</h3>
          <p className="text-[13px] text-slate-500 mt-1">
            {isAvailable ? 'You are currently visible to employers and can receive job requests.' : 'You are hidden from employers and will not receive new requests.'}
          </p>
        </div>
        <button
          onClick={handleToggleAvailability}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9973A] focus:ring-offset-2 ${
            isAvailable ? 'bg-[#10b981]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              isAvailable ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Virtual Account Card */}
      <div className="bg-[#1e293b] rounded-[16px] p-[28px] shadow-sm text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/20 to-transparent rounded-bl-full -z-0 opacity-50"></div>
        <div className="relative z-10 min-w-0">
          <p className="text-[#C9973A] text-[11px] font-bold font-sans uppercase tracking-wider mb-2 truncate">AVAILABLE BALANCE</p>
          <h2 className="text-[42px] font-bold mb-6 truncate font-serif text-white leading-none" title={`ZMW ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
            ZMW {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <button 
            onClick={() => {}}
            className="border border-[#C9973A] text-[#C9973A] bg-transparent font-medium font-sans py-2.5 px-6 rounded-[8px] text-[13px] hover:bg-[#C9973A]/10 transition-colors"
          >
            Withdraw Funds
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[16px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Job Requests</p>
            <p className="text-2xl font-serif font-bold text-[#1e293b]">{jobRequests.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-[16px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Proposals</p>
            <p className="text-2xl font-serif font-bold text-[#1e293b]">{activeProposals}</p>
          </div>
        </div>
        <div className="bg-white rounded-[16px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Jobs</p>
            <p className="text-2xl font-serif font-bold text-[#1e293b]">{confirmedJobs}</p>
          </div>
        </div>
      </div>

      {/* Recent Job Requests */}
      <div className="bg-white rounded-[16px] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[16px] font-serif font-bold text-[#1e293b]">Recent Job Requests</h3>
          <button onClick={() => onAction('navigate', 'job_requests')} className="text-[13px] font-medium text-[#C9973A] hover:underline">View All</button>
        </div>
        
        {jobRequests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-[14px]">No recent job requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobRequests.slice(0, 3).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 rounded-[12px] border border-slate-100 hover:border-[#C9973A]/30 transition-colors">
                <div>
                  <h4 className="font-medium text-[#1e293b]">{job.title || job.category}</h4>
                  <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{job.location || 'Location not specified'}</span>
                  </div>
                </div>
                <button 
                  onClick={() => onAction('view_job', job)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#1e293b] text-[13px] font-medium rounded-full transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
