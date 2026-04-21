import React from 'react';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

interface LabourQuotesViewProps {
  quotes: any[];
  onAction: (actionId: string, payload?: any) => void;
}

export default function LabourQuotesView({ quotes, onAction }: LabourQuotesViewProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> Accepted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 text-[11px] font-bold uppercase tracking-wider rounded-full">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wider rounded-full">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {quotes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-serif font-bold text-brand-dark mb-2">No Proposals Sent</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            You haven't sent any proposals yet. Go to the Job Requests tab to find jobs and send
            proposals.
          </p>
        </div>
      ) : (
        quotes.map((quote) => (
          <div
            key={quote.id}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getStatusBadge(quote.status)}
                  <span className="text-[12px] text-slate-500">
                    Sent: {new Date(quote.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-serif font-bold text-brand-dark mb-1">
                  Proposal for Job #{quote.inquiryId}
                </h3>
                <p className="text-slate-600 text-[14px] line-clamp-2">
                  {quote.message || 'No message provided.'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 min-w-37.5">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Offered Rate
                  </p>
                  <p className="text-xl font-serif font-bold text-[#C9973A]">
                    ZMW {quote.totalAmount || quote.rate || '0'}
                  </p>
                </div>
                <button
                  onClick={() => onAction('view_quote', quote)}
                  className="text-xs font-medium text-brand-dark hover:text-[#C9973A] transition-colors mt-2"
                >
                  View Details →
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
