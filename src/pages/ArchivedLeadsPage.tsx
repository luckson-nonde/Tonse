import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useOpenInquiries } from '../hooks/useInquiries';
import { PackageOpen, MapPin, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { getCategoryNature } from '../services/categories';
import { CATEGORIES_DB } from '../services/categories';
import Notification from '../components/Notification';
import ConfirmModal from '../components/ConfirmModal';

export default function ArchivedLeadsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveProviderId = user?.parentProviderId || user?.id;
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [deleteInquiryId, setDeleteInquiryId] = useState<string | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch open inquiries from PostgreSQL backend
  const { inquiries: allLeads } = useOpenInquiries();

  const archivedLeads = React.useMemo(() => {
    let filtered = allLeads;

    // TODO: Implement quote filtering from backend
    // const quotedIds = new Set(myQuotes.map((q) => q.inquiryId));
    // filtered = filtered.filter((lead) => !quotedIds.has(lead.id!));

    // Filter by Role/SubRole Nature
    if (user?.role === 'SELLER' && user?.subRole) {
      filtered = filtered.filter((lead) => {
        if (!lead.category) return true;
        const leadCats = (lead.category || '').split(',').map((c) => c.trim());
        const leadCatIds = leadCats
          .map((name) => CATEGORIES_DB.find((c) => c.name === name)?.id)
          .filter(Boolean) as string[];
        const natures = leadCatIds.map((id) => getCategoryNature(id));

        if (user.subRole === 'PRODUCT_SELLER') {
          return natures.some((n) => n === 'PRODUCT' || n === 'BOTH');
        }
        if (user.subRole === 'SERVICE_SELLER') {
          return natures.some((n) => n === 'SERVICE' || n === 'BOTH');
        }
        return true;
      });
    }

    return filtered;
  }, [allLeads, effectiveProviderId, user]);

  const handleRestoreInquiry = async (id: string) => {
    try {
      // TODO: Implement restore inquiry endpoint on backend
      // POST /api/inquiries/:id/restore
      console.log('Restore inquiry:', id);
      showNotification('Lead restored to active list');
    } catch (error) {
      console.error('Error restoring inquiry:', error);
      showNotification('Failed to restore lead', 'error');
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    setDeleteInquiryId(id);
  };

  const confirmDeleteInquiry = async () => {
    if (!deleteInquiryId) return;
    try {
      // TODO: Implement delete inquiry endpoint on backend
      // DELETE /api/inquiries/:id (soft delete or mark as deleted)
      console.log('Delete inquiry:', deleteInquiryId);
      showNotification('Lead deleted from your view');
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      showNotification('Failed to delete lead', 'error');
    } finally {
      setDeleteInquiryId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/provider')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Archived Leads</h1>
          <p className="text-slate-500">Manage inquiries you've set aside for later.</p>
        </div>
      </div>

      <div className="space-y-6">
        {archivedLeads.length === 0 ? (
          <div className="bg-white rounded-4xl p-12 text-center border border-slate-100 shadow-sm">
            <PackageOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">No Archived Leads</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You haven't archived any inquiries yet. Archived leads will appear here.
            </p>
          </div>
        ) : (
          archivedLeads.map((lead, idx) => (
            <div
              key={lead.id || `archived-${idx}`}
              className="bg-white rounded-4xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#fdf6e9] flex items-center justify-center text-[#d49b35] font-bold text-sm overflow-hidden border border-[#d49b35]/20">
                    <img
                      src={`https://picsum.photos/seed/${lead.buyerId}/100/100`}
                      alt={lead.buyerName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {lead.buyerName}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Matched Inquiry
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[11px] text-slate-400 font-bold">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {lead.location}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {(lead.category || '').split(', ').map((cat: string, catIdx: number) => (
                    <span
                      key={`${lead.id}-${cat}-${catIdx}`}
                      className="px-2 py-0.5 bg-[#fdf6e9] text-[#d49b35] text-[10px] font-bold rounded uppercase tracking-wider"
                    >
                      {cat}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">
                    Archived
                  </span>
                </div>

                <h4 className="text-xl font-serif font-bold text-slate-900 mb-2">{lead.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed mb-6 line-clamp-2">
                  {lead.description}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                    <Eye className="w-3.5 h-3.5" />
                    {lead.viewCount || 0} Views
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleRestoreInquiry(lead.id!)}
                      className="rounded-xl"
                    >
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteInquiry(lead.id!)}
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </Button>
                    <Button
                      onClick={() => navigate(`/provider`)}
                      className="bg-[#d49b35] hover:bg-[#a37d35] text-white rounded-xl"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={!!notification}
          onClose={() => setNotification(null)}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteInquiryId}
        onClose={() => setDeleteInquiryId(null)}
        onConfirm={confirmDeleteInquiry}
        title="Delete Inquiry"
        message="Are you sure you want to permanently delete this inquiry from your view? You won't be able to see or attend to this inquiry anymore."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </div>
  );
}
