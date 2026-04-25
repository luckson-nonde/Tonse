import React, { useEffect, useCallback } from 'react';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { db } from '../services/api/database';
import { useAuth } from '../AuthContext';
import { FileText, PackageOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../DashboardContext';

export default function ArchivedQuotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setActiveTab } = useDashboard();

  const handleTabClick = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const basePath = user?.role === 'BUYER' ? '/buyer' : '/provider';
      if (tab === 'home') {
        navigate(basePath);
      } else {
        navigate(`${basePath}/${tab}`);
      }
    },
    [setActiveTab, navigate, user?.role]
  );

  useEffect(() => {
    setActiveTab('archived');
  }, [setActiveTab]);

  const archivedQuotes =
    useLiveQuery(() => {
      if (!user) return [];
      return db.quotes.where('status').equals('ARCHIVED').toArray();
    }, [user]) || [];

  return (
    <div className="flex flex-col space-y-6 max-w-3xl mx-auto pb-6 pt-2">
      <div className="space-y-4">
        {archivedQuotes.length === 0 ? (
          <div className="bg-white rounded-4xl p-12 text-center border border-slate-100">
            <PackageOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No archived quotations found.</p>
          </div>
        ) : (
          archivedQuotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white rounded-4xl p-6 shadow-sm border border-slate-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{quote.inquiryTitle}</h3>
                  <p className="text-sm text-slate-500">Provider: {quote.providerName}</p>
                  {quote.expiryDuration && (
                    <p className="text-[10px] font-bold text-[#d49b35] uppercase tracking-wider mt-1">
                      Expired: {quote.expiryDuration}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900">
                    ZMW {quote.price.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">{quote.message}</p>
              <button
                onClick={() => navigate(`/buyer/quote-details?id=${quote.id}`)}
                className="text-sm font-bold text-[#d49b35] hover:underline"
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
