import React, { useState } from 'react';
import { MapPin, Clock, Calendar, AlertCircle } from 'lucide-react';
import Button from '../Button';

interface LabourJobsViewProps {
  jobRequests: any[];
  onAction: (actionId: string, payload?: any) => void;
}

export default function LabourJobsView({ jobRequests, onAction }: LabourJobsViewProps) {
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [proposalData, setProposalData] = useState({
    rate: '',
    availabilityDate: '',
    message: ''
  });

  const handleSendProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    
    onAction('send_proposal', {
      jobId: selectedJob.id,
      proposal: proposalData
    });
    
    setSelectedJob(null);
    setProposalData({ rate: '', availabilityDate: '', message: '' });
  };

  if (selectedJob) {
    return (
      <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100 max-w-2xl mx-auto">
        <div className="mb-8">
          <button 
            onClick={() => setSelectedJob(null)}
            className="text-[13px] font-medium text-slate-500 hover:text-[#1e293b] mb-4 inline-block"
          >
            ← Back to Job Requests
          </button>
          <h2 className="text-2xl font-serif font-bold text-[#1e293b]">Send Proposal</h2>
          <p className="text-slate-500 mt-1">For: {selectedJob.title || selectedJob.category}</p>
        </div>

        <form onSubmit={handleSendProposal} className="space-y-6">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Your Offered Rate (ZMW)
            </label>
            <input
              type="number"
              required
              value={proposalData.rate}
              onChange={(e) => setProposalData({ ...proposalData, rate: e.target.value })}
              className="w-full p-4 rounded-[16px] border border-slate-200 focus:border-[#C9973A] focus:ring-1 focus:ring-[#C9973A] outline-none transition-all"
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Earliest Availability Date
            </label>
            <input
              type="date"
              required
              value={proposalData.availabilityDate}
              onChange={(e) => setProposalData({ ...proposalData, availabilityDate: e.target.value })}
              className="w-full p-4 rounded-[16px] border border-slate-200 focus:border-[#C9973A] focus:ring-1 focus:ring-[#C9973A] outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Message to Employer
            </label>
            <textarea
              required
              value={proposalData.message}
              onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
              rows={4}
              className="w-full p-4 rounded-[16px] border border-slate-200 focus:border-[#C9973A] focus:ring-1 focus:ring-[#C9973A] outline-none transition-all resize-none"
              placeholder="Briefly explain why you are a good fit for this job..."
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setSelectedJob(null)}
              className="flex-1 py-4 rounded-[32px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 py-4 rounded-[32px]"
            >
              Send Proposal
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobRequests.length === 0 ? (
        <div className="bg-white rounded-[24px] p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#1e293b] mb-2">No Job Requests Yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            There are currently no open job requests matching your skills. Check back later or update your profile to include more skills.
          </p>
        </div>
      ) : (
        jobRequests.map((job) => (
          <div key={job.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 hover:border-[#C9973A]/30 transition-colors">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-[#C9973A]/10 text-[#C9973A] text-[11px] font-bold uppercase tracking-wider rounded-full">
                    {job.category}
                  </span>
                  {job.urgency === 'High' && (
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-[11px] font-bold uppercase tracking-wider rounded-full">
                      Urgent
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-serif font-bold text-[#1e293b] mb-2">
                  {job.title || job.category}
                </h3>
                <p className="text-slate-600 text-[14px] mb-4 line-clamp-2">
                  {job.description || 'No description provided.'}
                </p>
                
                <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {job.location || 'Location not specified'}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Duration: {job.duration || 'Not specified'}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-4 min-w-[200px]">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Budget / Rate</p>
                  <p className="text-lg font-serif font-bold text-[#1e293b]">
                    {job.budget ? `ZMW ${job.budget}` : 'Negotiable'}
                  </p>
                </div>
                <Button 
                  onClick={() => setSelectedJob(job)}
                  className="w-full py-3 rounded-full"
                >
                  Send Proposal
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
