import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { type Inquiry, type Quote } from '../types';
import { useDashboard } from '../DashboardContext';
import { 
  TrendingUp, FileText, MessageSquare, Truck, Star, Search, 
  PackageOpen, Plus, MapPin, Clock, User, Check, ChevronDown, 
  ChevronUp, Eye, ArrowRight, Settings, Loader2, Archive, X, Printer,
  ChevronRight, MoreHorizontal, Zap, Calendar, CheckCircle, Music, Heart
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { isRelatedCategory } from '../services/categories';
import CollectionPage from './CollectionPage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ProductManagement from './ProductManagement';

const renderSpecifications = (data: any, title: string = "Specifications") => {
  if (!data || Object.keys(data).length === 0) return null;
  
  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        {title}
      </h5>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, value]) => {
          if (!value || (Array.isArray(value) && value.length === 0)) return null;
          
          if (key === 'equipment' && Array.isArray(value)) {
            return (
              <div key={key} className="col-span-1 sm:col-span-2 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Equipment Needed</span>
                <div className="flex flex-wrap gap-2">
                  {value.map((eq: any, i: number) => (
                    <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">
                      {eq.quantity}x {eq.type}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 truncate">{formatKey(key)}</span>
              <span className="text-sm font-bold text-[#1a1612] capitalize break-words whitespace-pre-wrap">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function ProviderDashboard() {
  const { activeTab, setActiveTab } = useDashboard();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isBookingBased = user?.role === 'ENTERTAINMENT' || user?.role === 'EVENTS';
  
  const isServiceOrEvent = (inquiry: Inquiry) => {
    return !!inquiry.entertainmentData || (inquiry.attributes && (inquiry.attributes.eventType || inquiry.attributes.eventName || inquiry.attributes.performanceType));
  };
  
  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'profile') {
      navigate('/provider/profile');
    } else if (tab === 'home') {
      navigate('/provider');
    }
  }, [setActiveTab, navigate]);
  
  const products = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      return await db.products.where('providerId').equals(user.id).reverse().limit(5).toArray();
    },
    [user]
  ) || [];

  const myQuotes = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      const quotes = await db.quotes.where('providerId').equals(user.id).reverse().sortBy('createdAt');
      const enrichedQuotes = await Promise.all(quotes.map(async (quote) => {
        const inquiry = await db.inquiries.get(quote.inquiryId);
        return { ...quote, inquiry };
      }));
      return enrichedQuotes;
    },
    [user]
  ) || [];

  const schedules = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      return await db.schedules.where('providerId').equals(user.id).toArray();
    },
    [user]
  ) || [];

  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const displayQuotes = myQuotes;

  const chartData = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(now.getDate() - (6 - i));
        return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          date: d.setHours(0, 0, 0, 0),
          sales: 0
        };
      });

      const completedQuotes = await db.quotes
        .where('providerId').equals(user.id)
        .filter(q => q.status === 'COMPLETED' || q.status === 'PAID')
        .toArray();

      completedQuotes.forEach(quote => {
        const quoteDate = new Date(quote.createdAt).setHours(0, 0, 0, 0);
        const day = last7Days.find(d => d.date === quoteDate);
        if (day) {
          day.sales += quote.price;
        }
      });

      return last7Days;
    },
    [user, myQuotes]
  ) || [];

  const allLeads = useLiveQuery(
    async () => {
      const inquiries = await db.inquiries.where('status').equals('OPEN').toArray();
      return inquiries.sort((a, b) => b.createdAt - a.createdAt);
    },
    []
  ) || [];

  const availableBalance = displayQuotes
    .filter(q => q.status === 'COMPLETED' || q.status === 'PAID')
    .reduce((sum, q) => sum + q.price, 0);

  const pendingClearance = displayQuotes
    .filter(q => q.status === 'ACCEPTED')
    .reduce((sum, q) => sum + q.price, 0);

  const [leads, setLeads] = useState<Inquiry[]>([]);
  const [quotingInquiryId, setQuotingInquiryId] = useState<number | null>(null);
  const [expandedInquiryId, setExpandedInquiryId] = useState<number | null>(null);
  const [quoteSort, setQuoteSort] = useState<'recent' | 'expensive'>('recent');
  const [isUpdating, setIsUpdating] = useState(false);
  const [itemPrices, setItemPrices] = useState<{ [key: string]: string }>({});
  
  const [quoteData, setQuoteData] = useState({
    price: '',
    condition: 'Brand New',
    message: '',
    expiryDuration: '1 Month',
    requirements: [] as { item: string; description: string }[],
    venueSpaceId: '',
    damageDeposit: '',
    cleaningFee: ''
  });

  const venueSpaces = useLiveQuery(
    async () => {
      if (!user?.id || user.role !== 'EVENTS') return [];
      return await db.venueSpaces.where('providerId').equals(user.id).toArray();
    },
    [user]
  ) || [];

  const [newRequirement, setNewRequirement] = useState({ item: '', description: '' });

  useEffect(() => {
    // Filter leads by provider categories AND exclude already quoted ones
    let filtered = allLeads;
    
    // Exclude already quoted
    const quotedIds = new Set(myQuotes.map(q => q.inquiryId));
    filtered = filtered.filter(lead => !quotedIds.has(lead.id!));

    if (user?.categories && user.categories.length > 0) {
      filtered = filtered.filter(lead => {
        if (!lead.category) return true; // Show uncategorized leads to everyone
        
        const leadCats = lead.category.split(',').map(c => c.trim());
        
        const isMatch = user.categories?.some(providerCat => 
          leadCats.some(leadCat => isRelatedCategory(providerCat, leadCat))
        );
        return isMatch;
      });
    }
    
    setLeads(filtered);
  }, [user, allLeads, myQuotes, isBookingBased]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const handleConfirmCollection = async (quoteId: number) => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const quote = await db.quotes.get(quoteId);
      if (!quote) return;

      await db.quotes.update(quoteId, { status: 'COMPLETED' });

      const escrowTx = await db.transactions
        .where('quoteId').equals(quoteId)
        .filter(tx => tx.userId === user.id && tx.status === 'ESCROW')
        .first();
      
      if (escrowTx && escrowTx.id) {
        await db.transactions.update(escrowTx.id, { 
          status: 'COMPLETED',
          description: `Funds released for Quote #${quoteId} (Booking Completed)`,
          category: 'ESCROW_RELEASE',
          createdAt: Date.now()
        });
      }

      alert('Collection confirmed! Funds have been released to your account.');
    } catch (error) {
      console.error('Failed to confirm collection:', error);
      alert('Failed to confirm collection. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingInquiryId || !user) return;

    const lead = leads.find(l => l.id === quotingInquiryId);
    const isEntertainmentInquiry = lead ? isServiceOrEvent(lead) : false;
    
    // Calculate total from item prices if they exist, otherwise use the manual price
    const itemPricesArray = lead?.items.map((item, idx) => ({
      itemId: item.id || idx,
      price: Number(itemPrices[`${quotingInquiryId}-${idx}`] || 0)
    })).filter(ip => ip.price > 0);

    const totalPrice = itemPricesArray && itemPricesArray.length > 0 
      ? itemPricesArray.reduce((sum, ip) => sum + ip.price, 0)
      : Number(quoteData.price);

    const newQuote = {
      inquiryId: quotingInquiryId,
      inquiryTitle: lead?.title || 'Inquiry',
      price: totalPrice,
      condition: isEntertainmentInquiry ? 'N/A' : quoteData.condition,
      message: quoteData.message,
      expiryDuration: quoteData.expiryDuration,
      status: 'PENDING' as const,
      providerId: user.id!,
      providerName: user.name,
      createdAt: Date.now(),
      itemPrices: itemPricesArray && itemPricesArray.length > 0 ? itemPricesArray : undefined,
      requirements: quoteData.requirements,
      ...(quoteData.venueSpaceId ? {
        venueSpaceId: Number(quoteData.venueSpaceId),
        venueSpaceName: venueSpaces.find(v => v.id === Number(quoteData.venueSpaceId))?.name,
        damageDeposit: quoteData.damageDeposit ? Number(quoteData.damageDeposit) : undefined,
        cleaningFee: quoteData.cleaningFee ? Number(quoteData.cleaningFee) : undefined,
      } : {})
    };

    console.log('ProviderDashboard: Adding new quote:', newQuote);
    await db.quotes.add(newQuote);
    console.log('ProviderDashboard: Quote added successfully');
    setQuoteData({ price: '', condition: 'Brand New', message: '', expiryDuration: '1 Month', requirements: [], venueSpaceId: '', damageDeposit: '', cleaningFee: '' });
    setItemPrices({});
    handleTabClick('my-quotes');
  };

  const toggleExpand = async (id: number) => {
    if (expandedInquiryId === id) {
      setExpandedInquiryId(null);
    } else {
      setExpandedInquiryId(id);
      const inquiry = await db.inquiries.get(id);
      if (inquiry) {
        await db.inquiries.update(id, { viewCount: (inquiry.viewCount || 0) + 1 });
      }
    }
  };

  const addRequirement = () => {
    if (newRequirement.item && newRequirement.description) {
      setQuoteData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement]
      }));
      setNewRequirement({ item: '', description: '' });
    }
  };

  const removeRequirement = (index: number) => {
    setQuoteData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const handleArchiveQuote = async (quoteId: number) => {
    try {
      await db.quotes.update(quoteId, { status: 'ARCHIVED' });
    } catch (error) {
      console.error('Error archiving quote:', error);
    }
  };

    const handlePrintQuote = (quote: Quote, inquiry: Inquiry) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const itemsHtml = inquiry.items.map((item, idx) => {
        const itemPrice = quote.itemPrices?.find(ip => ip.itemId === (item.id || idx))?.price;
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <div style="display: flex; gap: 12px; align-items: center;">
                ${item.images && item.images[0] ? `<img src="${item.images[0]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #eee;" />` : ''}
                <div>
                  <div style="font-weight: bold; color: #1e293b;">${item.title}</div>
                  <div style="font-size: 12px; color: #64748b;">${item.description || ''}</div>
                </div>
              </div>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #1e293b;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #d49b35; font-weight: bold;">${itemPrice ? `K${itemPrice.toLocaleString()}` : 'N/A'}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quotation #${quote.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; background: #fff; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 4px solid #d49b35; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: 900; color: #d49b35; text-transform: uppercase; letter-spacing: -1.5px; }
              .quote-title { font-size: 36px; font-weight: 900; color: #1e293b; margin: 0; letter-spacing: -1px; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
              .info-box { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { text-align: left; padding: 14px; background: #f1f5f9; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
              .total-section { display: flex; justify-content: space-between; border-top: 4px solid #d49b35; padding-top: 24px; margin-top: 40px; }
              .total-label { font-size: 16px; font-weight: 900; color: #64748b; margin-right: 24px; align-self: center; }
              .total-amount { font-size: 32px; font-weight: 900; color: #d49b35; }
              .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 30px; }
              .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; font-weight: 900; color: rgba(212, 155, 53, 0.03); z-index: -1; white-space: nowrap; }
              .qr-code { width: 100px; height: 100px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px; background: #fff; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
                .info-box { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
                th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
            <div class="watermark">MARKETPLACE</div>
            <div class="header">
              <div>
                <div class="logo">Marketplace</div>
                <p style="margin: 4px 0 0; font-size: 14px; color: #64748b; font-weight: 600;">Digital Quotation System</p>
              </div>
              <div style="text-align: right;">
                <h1 class="quote-title">QUOTATION</h1>
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: 900; color: #d49b35;">#QT-${quote.id?.toString().padStart(4, '0')}</p>
              </div>
            </div>

            <div class="details-grid">
              <div class="info-box">
                <div class="section-title">From (Provider)</div>
                <div style="font-weight: 900; font-size: 20px; color: #0f172a;">${quote.providerName}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 8px; font-weight: 500;">
                  <div style="display: flex; align-items: center; gap: 6px;">📍 ${inquiry.location}</div>
                </div>
              </div>
              <div class="info-box">
                <div class="section-title">To (Buyer)</div>
                <div style="font-weight: 900; font-size: 20px; color: #0f172a;">${inquiry.buyerName}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 8px; font-weight: 500;">
                  Date: <span style="color: #0f172a; font-weight: 700;">${new Date(quote.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            <div class="info-box" style="margin-bottom: 40px; background: #fff; border-left: 4px solid #d49b35;">
              <div class="section-title">Inquiry Reference</div>
              <div style="font-weight: 800; font-size: 16px; color: #0f172a;">${inquiry.title}</div>
              <div style="font-size: 14px; color: #475569; margin-top: 6px;">${inquiry.description}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #fdf6e9; padding: 24px; border-radius: 20px; border: 1px solid #d49b35/10; margin-bottom: 40px;">
              <div class="section-title" style="color: #d49b35; border-bottom-color: #d49b35/10;">Seller Message & Terms</div>
              <div style="font-size: 15px; color: #1e293b; font-style: italic; font-weight: 500; line-height: 1.6;">"${quote.message}"</div>
              <div style="margin-top: 16px; display: flex; gap: 30px;">
                <div>
                  <span style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Condition:</span>
                  <span style="font-size: 13px; font-weight: 800; color: #d49b35; margin-left: 6px; background: #fff; padding: 2px 8px; border-radius: 6px;">${quote.condition}</span>
                </div>
                <div>
                  <span style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Validity:</span>
                  <span style="font-size: 13px; font-weight: 800; color: #d49b35; margin-left: 6px; background: #fff; padding: 2px 8px; border-radius: 6px;">${quote.expiryDuration || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div class="total-section">
              <div class="qr-code-container">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=QT-${quote.id}" class="qr-code" alt="Quote QR Code" />
                <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-align: center; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Verify Quote</p>
              </div>
              <div style="text-align: right;">
                <span class="total-label">GRAND TOTAL (ZMW)</span>
                <div class="total-amount">K${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div class="footer">
              <p style="font-weight: 700; color: #64748b;">This is a computer-generated quotation. No signature is required.</p>
              <p style="margin-top: 6px;">Generated via Marketplace Digital Platform • ${new Date().toLocaleString()}</p>
              <div style="margin-top: 20px; font-size: 10px; color: #cbd5e1;">&copy; ${new Date().getFullYear()} Marketplace Digital Quotation System. All rights reserved.</div>
            </div>

            <script>
              window.onload = () => {
                window.print();
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    };

  const renderEventsHome = () => (
    <div className="space-y-6">
      {/* Virtual Account Card */}
      <div className="bg-[#1e293b] rounded-[16px] p-[28px] shadow-sm text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/20 to-transparent rounded-bl-full -z-0 opacity-50"></div>
        <div className="relative z-10 min-w-0">
          <p className="text-[#C9973A] text-[11px] font-bold font-sans uppercase tracking-wider mb-2 truncate">AVAILABLE BALANCE</p>
          <h2 className="text-[42px] font-bold mb-2 truncate font-serif text-white leading-none" title={`ZMW ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
            ZMW {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[#94a3b8] text-[13px] font-sans mb-6 truncate">
            {pendingClearance > 0 ? `ZMW ${pendingClearance.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending clearance` : 'No pending clearance'}
          </p>
          <button 
            onClick={() => navigate('/provider/financial')}
            className="border border-[#C9973A] text-[#C9973A] bg-transparent font-medium font-sans py-2.5 px-6 rounded-[8px] text-[13px] hover:bg-[#C9973A]/10 transition-colors"
          >
            My Account 425*******12
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            UPCOMING EVENTS
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-slate-900 leading-none truncate">{schedules.length}</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Confirmed bookings
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            NEW REQUESTS
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-emerald-600 leading-none truncate">
              {leads.length}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Awaiting your quote
          </p>
        </div>

        {user?.categories?.some(c => c.toLowerCase().includes('equipment rental')) && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
              <PackageOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
              INVENTORY ITEMS
            </p>
            <div className="flex items-end gap-3 mb-1 min-w-0">
              <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate" title={products.length.toString()}>
                {products.length}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Active equipment
            </p>
          </div>
        )}
      </div>

      {/* Recent Inventory Items - Only for Equipment Rental */}
      {user?.categories?.some(c => c.toLowerCase().includes('equipment rental')) && (
        <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-serif font-black text-slate-900">Recent Equipment</h3>
            <button onClick={() => handleTabClick('products')} className="text-[#d49b35] text-xs font-bold hover:underline">Manage All</button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-medium italic">No items in inventory.</p>
              </div>
            ) : products.slice(0, 3).map((product, i) => (
              <div key={i} className="group cursor-pointer" onClick={() => handleTabClick('products')}>
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-2 border border-slate-100">
                  <img 
                    src={product.images[0]} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                <p className="text-[10px] font-black text-[#d49b35]">K{product.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming Booking Requests Section */}
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
          <h3 className="text-lg font-serif font-black text-slate-900">
            {user?.role === 'EVENTS' ? 'Incoming Rental Requests' : 'Incoming Booking Requests'}
          </h3>
          <button onClick={() => handleTabClick('leads')} className="text-[#d49b35] text-xs font-bold hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 text-center border border-slate-100">
              <p className="text-slate-400 text-xs font-medium italic">
                No booking requests found.
              </p>
            </div>
          ) : leads.slice(0, 3).map((lead, i) => {
            const hasQuoted = myQuotes.some(q => q.inquiryId === lead.id);
            const isViewed = (lead.viewCount || 0) > 0;
            
            return (
              <div key={i} className="bg-white rounded-2xl sm:rounded-[24px] p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start gap-4 cursor-pointer hover:border-[#d49b35]/30 transition-colors" onClick={() => handleTabClick('leads')}>
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#fdf6e9] text-[#d49b35] flex items-center justify-center flex-shrink-0 font-black overflow-hidden border border-[#d49b35]/10`}>
                    <img 
                      src={`https://picsum.photos/seed/${lead.buyerId}/100/100`} 
                      alt={lead.buyerName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{lead.buyerName}</h4>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {Math.floor((Date.now() - lead.createdAt) / 60000) < 60 
                          ? `${Math.floor((Date.now() - lead.createdAt) / 60000)}m ago`
                          : `${Math.floor((Date.now() - lead.createdAt) / 3600000)}h ago`}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-[#d49b35] text-[10px] font-bold uppercase tracking-widest mb-1">{lead.category || 'General Entertainment'}</p>
                      <p className="text-slate-500 text-xs italic truncate">"{lead.description}"</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <MapPin className="w-3 h-3 text-[#d49b35]" />
                        {lead.location}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Calendar className="w-3 h-3 text-[#d49b35]" />
                        {new Date(lead.createdAt + 86400000 * 7).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button className="flex-1 sm:w-28 py-2 bg-[#fdf6e9] text-[#d49b35] text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#d49b35]/20 hover:bg-[#d49b35] hover:text-white transition-all">
                    View Details
                  </button>
                  <button className="flex-1 sm:w-28 py-2 bg-[#d49b35] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-[#d49b35]/20 hover:bg-[#a37d35] transition-all">
                    Send Quote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderHome = () => {
    if (user?.role === 'EVENTS') return renderEventsHome();
    
    return (
    <div className="space-y-6">
      {/* Virtual Account Card */}
      <div className="bg-[#1e293b] rounded-[16px] p-[28px] shadow-sm text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#C9973A]/20 to-transparent rounded-bl-full -z-0 opacity-50"></div>
        <div className="relative z-10 min-w-0">
          <p className="text-[#C9973A] text-[11px] font-bold font-sans uppercase tracking-wider mb-2 truncate">AVAILABLE BALANCE</p>
          <h2 className="text-[42px] font-bold mb-2 truncate font-serif text-white leading-none" title={`ZMW ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>
            ZMW {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-[#94a3b8] text-[13px] font-sans mb-6 truncate">
            {pendingClearance > 0 ? `ZMW ${pendingClearance.toLocaleString(undefined, { minimumFractionDigits: 2 })} pending clearance` : 'No pending clearance'}
          </p>
          <button 
            onClick={() => navigate('/provider/financial')}
            className="border border-[#C9973A] text-[#C9973A] bg-transparent font-medium font-sans py-2.5 px-6 rounded-[8px] text-[13px] hover:bg-[#C9973A]/10 transition-colors"
          >
            My Account 425*******12
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            {isBookingBased ? 'INCOMING BOOKING REQUESTS' : 'INQUIRIES RECEIVED'}
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-slate-900 leading-none truncate" title={leads.length.toString()}>{leads.length}</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            New requests available
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <Check className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            QUOTES SENT
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-emerald-600 leading-none truncate" title={displayQuotes.length.toString()}>
              {displayQuotes.length}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Track your submissions
          </p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fdf6e9] rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#d49b35]" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-1">
            {isBookingBased ? 'PENDING COMPLETION' : 'PENDING COLLECTION'}
          </p>
          <div className="flex items-end gap-3 mb-1 min-w-0">
            <h2 className="text-[clamp(1.25rem,5vw,2.25rem)] font-black text-[#d49b35] leading-none truncate" title={displayQuotes.filter(q => q.status === 'PAID' || q.status === 'PENDING').length.toString()}>
              {displayQuotes.filter(q => q.status === 'PAID' || q.status === 'PENDING').length}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Awaiting event date
          </p>
        </div>
      </div>


      {/* Sales Summary Card - Only for Sellers */}
      {!isBookingBased && (
        <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-8 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6 sm:mb-8">
            <h3 className="text-xl font-serif font-black text-slate-900">Sales Summary</h3>
            <div className="bg-[#fdf6e9] text-[#d49b35] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Weekly
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 min-w-0">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">Today's Sales</p>
              <h4 className="text-[clamp(1rem,4vw,1.5rem)] font-black text-slate-900 mb-1 truncate" title="$1,240.00">$1,240.00</h4>
              <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                <TrendingUp className="w-3 h-3" />
                12.5%
              </div>
            </div>
            <div className="bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 min-w-0">
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 truncate">Active Quotes</p>
              <h4 className="text-[clamp(1rem,4vw,1.5rem)] font-black text-slate-900 mb-1 truncate" title="18">18</h4>
              <div className="flex items-center gap-1 text-[#d49b35] text-[10px] font-bold">
                <Zap className="w-3 h-3" />
                4 pending
              </div>
            </div>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d49b35" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#d49b35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 800, color: '#1e293b' }}
                  formatter={(value: number) => [`ZMW ${value.toLocaleString()}`, 'Sales']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#d49b35" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Incoming Booking Requests Section */}
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
          <h3 className="text-lg font-serif font-black text-slate-900">
            {isBookingBased ? 'Incoming Booking Requests' : 'Incoming Leads'}
          </h3>
          <button onClick={() => handleTabClick('leads')} className="text-[#d49b35] text-xs font-bold hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 text-center border border-slate-100">
              <p className="text-slate-400 text-xs font-medium italic">
                No booking requests found.
              </p>
            </div>
          ) : leads.slice(0, 3).map((lead, i) => {
            const hasQuoted = myQuotes.some(q => q.inquiryId === lead.id);
            const isViewed = (lead.viewCount || 0) > 0;
            
            return (
              <div key={i} className="bg-white rounded-2xl sm:rounded-[24px] p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-start gap-4 cursor-pointer hover:border-[#d49b35]/30 transition-colors" onClick={() => handleTabClick('leads')}>
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#fdf6e9] text-[#d49b35] flex items-center justify-center flex-shrink-0 font-black overflow-hidden border border-[#d49b35]/10`}>
                    <img 
                      src={`https://picsum.photos/seed/${lead.buyerId}/100/100`} 
                      alt={lead.buyerName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{lead.buyerName}</h4>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {Math.floor((Date.now() - lead.createdAt) / 60000) < 60 
                          ? `${Math.floor((Date.now() - lead.createdAt) / 60000)}m ago`
                          : `${Math.floor((Date.now() - lead.createdAt) / 3600000)}h ago`}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-[#d49b35] text-[10px] font-bold uppercase tracking-widest mb-1">{lead.category || 'General Entertainment'}</p>
                      <p className="text-slate-500 text-xs italic truncate">"{lead.description}"</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <MapPin className="w-3 h-3 text-[#d49b35]" />
                        {lead.location}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Calendar className="w-3 h-3 text-[#d49b35]" />
                        {new Date(lead.createdAt + 86400000 * 7).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!hasQuoted && !isViewed && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                          New
                        </span>
                      )}
                      {isViewed && !hasQuoted && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[#fdf6e9] text-[#d49b35] border border-[#d49b35]/20">
                          Viewed
                        </span>
                      )}
                      {hasQuoted && (
                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-[#fdf6e9] text-[#d49b35] border border-[#d49b35]/20">
                          Quote Sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button className="flex-1 sm:w-28 py-2 bg-[#fdf6e9] text-[#d49b35] text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#d49b35]/20 hover:bg-[#d49b35] hover:text-white transition-all">
                    View Details
                  </button>
                  <button className="flex-1 sm:w-28 py-2 bg-[#d49b35] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md shadow-[#d49b35]/20 hover:bg-[#a37d35] transition-all">
                    Send Quote
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* My Quotes Section */}
      <div>
        <div className="flex justify-between items-center mb-3 sm:mb-4 px-1">
          <h3 className="text-lg font-serif font-black text-slate-900">My Quotes</h3>
          <button onClick={() => handleTabClick('my-quotes')} className="text-[#d49b35] text-xs font-bold hover:underline">View All</button>
        </div>
        <div className="space-y-3">
          {displayQuotes.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-[24px] p-6 sm:p-8 text-center border border-slate-100">
              <p className="text-slate-400 text-xs font-medium italic">No quotes sent yet.</p>
            </div>
          ) : displayQuotes.slice(0, 3).map((quote, i) => (
            <div key={i} className="bg-white rounded-2xl sm:rounded-[24px] p-4 shadow-sm border border-slate-100 flex items-center justify-between gap-4 cursor-pointer hover:border-[#d49b35]/30 transition-colors" onClick={() => handleTabClick('my-quotes')}>
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#fdf6e9] flex items-center justify-center text-[#d49b35] flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{quote.inquiryTitle}</h4>
                  <p className="text-[#d49b35] font-black text-xs mt-0.5">ZMW {quote.price.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                  quote.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600' :
                  quote.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                  'bg-[#fdf6e9] text-[#d49b35]'
                }`}>
                  {quote.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  const renderLeads = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col px-0 sm:px-0">
        <h2 className="text-2xl font-serif font-bold text-slate-900">Incoming Booking Requests</h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
          Based on your categories: <span className="text-[#d49b35]">{user?.categories?.join(', ') || 'All Categories'}</span>
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-slate-100">
            <PackageOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No active leads at the moment.</p>
          </div>
        ) : leads.map(lead => (
          <div key={lead.id} className="bg-white rounded-2xl sm:rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
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
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{lead.buyerName}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Matched Inquiry</p>
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

            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {lead.category.split(', ').map((cat, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#fdf6e9] text-[#d49b35] text-[10px] font-bold rounded uppercase tracking-wider">
                    {cat}
                  </span>
                ))}
              </div>
              
              <h4 className="text-xl font-serif font-bold text-slate-900 mb-2 break-words">{lead.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 break-words whitespace-pre-wrap">{lead.description}</p>

              {lead.preferences && (
                <div className="flex flex-wrap gap-3 mb-6">
                  {Object.entries(lead.preferences).map(([key, value]) => value && (
                    <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{key}:</span>
                      <span className="text-[11px] font-bold text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {lead.attributes && (
                <div className="mb-6">
                  {renderSpecifications(lead.attributes, "Inquiry Details")}
                </div>
              )}

              {lead.entertainmentData && (
                <div className="mb-6">
                  {renderSpecifications(lead.entertainmentData, "Event Specifications")}
                </div>
              )}

              {lead.repairData && (
                <div className="mb-6">
                  {renderSpecifications(lead.repairData, "Repair Specifications")}
                </div>
              )}

              {lead.items && lead.items.length > 0 && (
                <div className="space-y-4">
                  <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Requested Items ({lead.items.length})
                  </h5>
                <div className="grid grid-cols-1 gap-4">
                  {lead.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`bg-slate-50/50 rounded-2xl p-4 border transition-all ${quotingInquiryId === lead.id ? 'cursor-pointer hover:border-[#d49b35]/30' : 'border-slate-100'}`}
                      onClick={() => {
                        if (quotingInquiryId === lead.id) {
                          document.getElementById(`item-price-${lead.id}-${idx}`)?.focus();
                        }
                      }}
                    >
                      <div className="flex gap-4">
                        {item.images && item.images.length > 0 && (
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h6 className="font-bold text-slate-900 text-sm">{item.title}</h6>
                            <span className="text-[10px] font-bold text-[#d49b35] bg-[#fdf6e9] px-2 py-0.5 rounded border border-[#d49b35]/10">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {item.brand && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Brand:</span> {item.brand}</div>}
                            {item.material && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Material:</span> {item.material}</div>}
                            {item.dimensions && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Size:</span> {item.dimensions}</div>}
                            {item.finish && <div className="text-[10px]"><span className="text-slate-400 font-bold uppercase tracking-wider mr-1">Finish:</span> {item.finish}</div>}
                          </div>
                        </div>
                      </div>
                      {item.images && item.images.length > 1 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          {item.images.slice(1).map((img, imgIdx) => (
                            <div key={imgIdx} className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 bg-white">
                              <img src={img} alt={`Ref ${imgIdx + 2}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      {quotingInquiryId === lead.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Price (ZMW)</label>
                            <input 
                              id={`item-price-${lead.id}-${idx}`}
                              type="number"
                              placeholder="0.00"
                              value={itemPrices[`${lead.id}-${idx}`] || ''}
                              onChange={(e) => setItemPrices({
                                ...itemPrices,
                                [`${lead.id}-${idx}`]: e.target.value
                              })}
                              onClick={(e) => e.stopPropagation()}
                              className="w-32 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold text-[#d49b35] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                  <Eye className="w-3.5 h-3.5" />
                  {lead.viewCount || 0} Views
                </div>
                <button 
                  onClick={() => setQuotingInquiryId(lead.id!)}
                  className="px-8 py-3 bg-[#d49b35] text-white text-sm font-bold rounded-2xl hover:bg-[#a37d35] transition-all shadow-lg shadow-[#d49b35]/20 active:scale-95"
                >
                  Submit Quote
                </button>
              </div>

              {quotingInquiryId === lead.id && (
                <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <h5 className="font-bold text-slate-900 mb-4">Submit Your Quotation</h5>
                  <form onSubmit={handleSubmitQuote} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                        {lead.items.some((_, idx) => itemPrices[`${lead.id}-${idx}`]) ? 'Calculated Total Price (ZMW)' : 'Price (ZMW)'}
                      </label>
                      <input 
                        type="number" required 
                        value={
                          lead.items.some((_, idx) => itemPrices[`${lead.id}-${idx}`])
                            ? lead.items.reduce((sum, _, idx) => sum + Number(itemPrices[`${lead.id}-${idx}`] || 0), 0)
                            : quoteData.price
                        }
                        onChange={e => setQuoteData({...quoteData, price: e.target.value})}
                        readOnly={lead.items.some((_, idx) => itemPrices[`${lead.id}-${idx}`])}
                        placeholder="0.00" 
                        className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] ${lead.items.some((_, idx) => itemPrices[`${lead.id}-${idx}`]) ? 'bg-slate-100 font-bold text-[#d49b35]' : ''}`}
                      />
                    </div>
                    {!isServiceOrEvent(lead) && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Equipment / Item Condition</label>
                        <select 
                          required value={quoteData.condition}
                          onChange={e => setQuoteData({...quoteData, condition: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] bg-white"
                        >
                          <option value="Brand New">Brand New</option>
                          <option value="Used - Like New">Used - Like New</option>
                          <option value="Used - Good">Used - Good</option>
                          <option value="Refurbished">Refurbished</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Message to Buyer (e.g., Terms, availability, extra details)</label>
                      <textarea 
                        required value={quoteData.message}
                        onChange={e => setQuoteData({...quoteData, message: e.target.value})}
                        placeholder="Describe your offer, delivery time, and any other important details..." rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Quotation Validity Period (How long is this quote valid?)</label>
                      <select 
                        required value={quoteData.expiryDuration}
                        onChange={e => setQuoteData({...quoteData, expiryDuration: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] bg-white"
                      >
                        <option value="1 Week">1 Week</option>
                        <option value="2 Weeks">2 Weeks</option>
                        <option value="1 Month">1 Month</option>
                        <option value="2 Months">2 Months</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                      </select>
                    </div>

                    {user?.role === 'EVENTS' && venueSpaces.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Select Venue Space to Quote (Optional)</label>
                          <select 
                            value={quoteData.venueSpaceId}
                            onChange={e => setQuoteData({...quoteData, venueSpaceId: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] bg-white"
                          >
                            <option value="">No specific space / General quote</option>
                            {venueSpaces.map(space => (
                              <option key={space.id} value={space.id}>{space.name} (Cap: {space.capacityStanding} / {space.capacitySeating})</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Refundable Damage Deposit (ZMW)</label>
                            <input 
                              type="number"
                              value={quoteData.damageDeposit}
                              onChange={e => setQuoteData({...quoteData, damageDeposit: e.target.value})}
                              placeholder="e.g., 1000"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase mb-2">Post-Event Cleaning Fee (ZMW)</label>
                            <input 
                              type="number"
                              value={quoteData.cleaningFee}
                              onChange={e => setQuoteData({...quoteData, cleaningFee: e.target.value})}
                              placeholder="e.g., 500"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35]"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {isServiceOrEvent(lead) && (
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <label className="block text-[11px] font-bold text-slate-500 tracking-wider uppercase">Additional Requirements (e.g., Logistics, Rider)</label>
                        {quoteData.requirements.map((req, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-900">{req.item}</p>
                              <p className="text-[10px] text-slate-500">{req.description}</p>
                            </div>
                            <button type="button" onClick={() => removeRequirement(index)} className="text-red-500 hover:text-red-700">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input 
                            type="text" placeholder="Requirement (e.g., Logistics)" value={newRequirement.item}
                            onChange={e => setNewRequirement({...newRequirement, item: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                          />
                          <input 
                            type="text" placeholder="Description" value={newRequirement.description}
                            onChange={e => setNewRequirement({...newRequirement, description: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm"
                          />
                          <button type="button" onClick={addRequirement} className="px-3 py-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="flex-1 py-3 bg-[#d49b35] text-white text-sm font-bold rounded-xl hover:bg-[#a37d35] transition-colors shadow-sm">Send Quote</button>
                      <button type="button" onClick={() => setQuotingInquiryId(null)} className="px-6 py-3 bg-white text-slate-600 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPaidOrders = () => (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-2xl font-serif font-bold text-slate-900 px-0 sm:px-0">{isBookingBased ? 'Paid Bookings' : 'Paid Orders (Escrow)'}</h2>
      <div className="space-y-4 sm:space-y-6">
        {displayQuotes.filter(q => q.status === 'PAID').length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-slate-100">
            <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No paid orders awaiting collection.</p>
          </div>
        ) : displayQuotes.filter(q => q.status === 'PAID').map(quote => {
          const lead = (quote as any).inquiry as Inquiry;
          if (!lead) return null;
          return (
            <div key={quote.id} className="bg-white rounded-2xl sm:rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-emerald-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm overflow-hidden border border-emerald-200">
                    <img src={`https://picsum.photos/seed/${lead.buyerId}/100/100`} alt={lead.buyerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{lead.buyerName}</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-1">
                      <Check className="w-3 h-3" /> Paid - Awaiting Completion
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-emerald-600">ZMW {quote.price.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <h4 className="text-lg font-bold text-slate-900 mb-2">{lead.title}</h4>
                <div className="bg-slate-50 rounded-2xl p-3 sm:p-4 border border-slate-100 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Buyer Contact</p>
                      <p className="text-sm font-bold text-slate-900">{quote.buyerContact?.name || lead.buyerName}</p>
                      <p className="text-sm text-slate-500">{quote.buyerContact?.phone || 'No phone provided'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-bold text-slate-900">{lead.location}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <input 
                    type="text" placeholder="Enter Digital Collection Code"
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#d49b35]"
                    value={(quote as any).tempCode || ''}
                    onChange={(e) => {
                      (quote as any).tempCode = e.target.value;
                      // Force re-render to update input value
                      setIsUpdating(isUpdating);
                    }}
                  />
                  <button 
                    onClick={() => {
                      const code = (quote as any).tempCode;
                      if (code !== quote.collectionCode) {
                        alert('Invalid collection code.');
                        return;
                      }
                      handleConfirmCollection(quote.id!);
                    }}
                    disabled={isUpdating}
                    className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Confirm Booking Completion
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMyQuotes = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center px-0 sm:px-0">
        <h2 className="text-2xl font-serif font-bold text-slate-900">My Submitted Quotes</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setQuoteSort('recent')} className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${quoteSort === 'recent' ? 'bg-[#d49b35] text-white border-[#d49b35]' : 'bg-white text-slate-500 border-slate-200'}`}>Recent</button>
          <button onClick={() => setQuoteSort('expensive')} className={`px-3 sm:px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${quoteSort === 'expensive' ? 'bg-[#d49b35] text-white border-[#d49b35]' : 'bg-white text-slate-500 border-slate-200'}`}>Price</button>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {displayQuotes.filter(q => q.status !== 'ARCHIVED').length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-center border border-slate-100">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No active quotes submitted yet.</p>
          </div>
        ) : [...displayQuotes]
            .filter(q => q.status !== 'ARCHIVED')
            .sort((a, b) => quoteSort === 'recent' ? b.createdAt - a.createdAt : b.price - a.price)
            .map(quote => {
              const lead = (quote as any).inquiry as Inquiry;
              if (!lead) return null;
              const isExpanded = expandedInquiryId === lead.id;
              
              return (
                <div key={quote.id} className="bg-white rounded-2xl sm:rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#fdf6e9] flex items-center justify-center text-[#d49b35] font-bold text-sm overflow-hidden border border-[#d49b35]/20">
                        <img src={`https://picsum.photos/seed/${lead.buyerId}/100/100`} alt={lead.buyerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">{lead.buyerName}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Quote Submitted</p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[11px] text-slate-400 font-bold">{new Date(quote.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {lead.location}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <h4 className="text-lg font-serif font-bold text-slate-900 break-words">{lead.title}</h4>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2 break-words whitespace-pre-wrap">{lead.description}</p>
                    
                    <div className="mt-6 p-4 bg-[#fdf6e9]/50 rounded-2xl border border-[#d49b35]/10">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Your Price</p>
                          <p className="text-[10px] font-black text-[#d49b35]">k{quote.price.toLocaleString()}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                          quote.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          quote.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-[#fdf6e9] text-[#d49b35] border border-[#d49b35]/20'
                        }`}>
                          {quote.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Condition:</span>
                        <span className="text-[10px] font-bold text-[#d49b35] bg-white px-2 py-0.5 rounded border border-[#d49b35]/10 uppercase tracking-wider">{quote.condition}</span>
                      </div>
                      {quote.venueSpaceName && (
                        <div className="flex flex-col gap-1 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Venue Space:</span>
                            <span className="text-[10px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{quote.venueSpaceName}</span>
                          </div>
                          {(quote.damageDeposit || quote.cleaningFee) && (
                            <div className="flex items-center gap-3 mt-1">
                              {quote.damageDeposit && (
                                <span className="text-[10px] text-slate-500"><span className="font-bold text-slate-400 uppercase tracking-widest">Deposit:</span> K{quote.damageDeposit.toLocaleString()}</span>
                              )}
                              {quote.cleaningFee && (
                                <span className="text-[10px] text-slate-500"><span className="font-bold text-slate-400 uppercase tracking-widest">Cleaning:</span> K{quote.cleaningFee.toLocaleString()}</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 italic">"{quote.message}"</p>
                    </div>

                    {isExpanded && (
                      <div className="mt-6 space-y-6 border-t border-slate-100 pt-6">
                        {lead.attributes && (
                          <div className="mb-6">
                            {renderSpecifications(lead.attributes, "Inquiry Details")}
                          </div>
                        )}

                        {lead.entertainmentData && (
                          <div className="mb-6">
                            {renderSpecifications(lead.entertainmentData, "Event Specifications")}
                          </div>
                        )}

                        {lead.repairData && (
                          <div className="mb-6">
                            {renderSpecifications(lead.repairData, "Repair Specifications")}
                          </div>
                        )}

                        {lead.items && lead.items.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Breakdown</h5>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price (ZMW)</span>
                            </div>
                            {lead.items.map((item, idx) => {
                              const itemPrice = quote.itemPrices?.find(ip => ip.itemId === (item.id || idx))?.price;
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-200">{idx + 1}</span>
                                    <span className="text-xs font-bold text-slate-700">{item.title}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-xs font-black text-[#d49b35]">K{itemPrice?.toLocaleString() || 'N/A'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                          <Eye className="w-3.5 h-3.5" /> {lead.viewCount || 0} Views
                        </div>
                        <button onClick={() => toggleExpand(lead.id!)} className="flex items-center gap-1.5 text-[#d49b35] hover:underline text-[11px] font-bold">
                          <PackageOpen className="w-3.5 h-3.5" /> 
                          {lead.items && lead.items.length > 0 ? `${lead.items.length} Items` : 'View Details'}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handlePrintQuote(quote, lead)}
                          className="p-2 text-slate-400 hover:text-[#d49b35] hover:bg-[#fdf6e9] rounded-xl transition-all"
                          title="Print Quotation"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleArchiveQuote(quote.id!)}
                          className="p-2 text-slate-400 hover:text-[#d49b35] hover:bg-[#fdf6e9] rounded-xl transition-all"
                          title="Archive Quote"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && lead.items && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                        {lead.items.map((item, idx) => (
                          <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex justify-between items-start mb-2">
                              <h6 className="font-bold text-slate-900 text-sm">{item.title}</h6>
                              <span className="text-[10px] font-bold text-[#d49b35] bg-[#fdf6e9] px-2 py-0.5 rounded border border-[#d49b35]/10">Qty: {item.quantity}</span>
                            </div>
                            <p className="text-xs text-slate-600">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex flex-col px-0 sm:px-0">
        <h2 className="text-2xl font-serif font-bold text-slate-900">
          {user?.role === 'EVENTS' ? 'Inventory Management' : 'Product Management'}
        </h2>
        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">
          {user?.role === 'EVENTS' ? 'Manage your event equipment and services' : "Manage your shop's listed products"}
        </p>
      </div>
      <ProductManagement />
    </div>
  );

  const handleReschedule = async () => {
    if (!selectedSchedule || !rescheduleDate || !rescheduleTime) return;
    
    await db.schedules.update(selectedSchedule.id, {
      date: rescheduleDate,
      startTime: rescheduleTime,
      status: 'RESCHEDULED',
      updatedAt: Date.now()
    });
    
    setIsRescheduleModalOpen(false);
    setSelectedSchedule(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  const renderSchedule = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold font-serif text-[#1e293b]">My Schedule</h2>
            <p className="text-sm text-slate-500 mt-1">
              {user?.role === 'EVENTS' ? 'Manage your upcoming equipment rentals and bookings' : 'Manage your upcoming bookings and events'}
            </p>
          </div>
        </div>

        {schedules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {user?.role === 'EVENTS' ? 'No Upcoming Rentals' : 'No Upcoming Events'}
            </h3>
            <p className="text-slate-500">
              {user?.role === 'EVENTS' ? "You don't have any scheduled rentals yet." : "You don't have any scheduled bookings yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 px-3 sm:px-6 lg:px-8 items-center">
            {schedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((schedule) => (
              <div 
                key={schedule.id}
                onClick={() => setSelectedSchedule(schedule)}
                className="bg-white rounded-2xl p-4 border border-[#f1f0ee] shadow-sm hover:border-[#d49b35]/30 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 w-full"
              >
                <div className="flex flex-col items-center justify-center bg-[#fffaf5] rounded-xl p-3 min-w-[60px] shrink-0 border border-[#f8f7f5] gap-0.5">
                  <span className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-widest">{new Date(schedule.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-black text-[#1e293b]">{new Date(schedule.date).getDate()}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[#1a1612] truncate font-serif">{schedule.title}</h3>
                    {schedule.status === 'SCHEDULED' && (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[8px] font-bold tracking-wider uppercase shrink-0">Confirmed</span>
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
        )}

        {/* Schedule Details Modal */}
        {selectedSchedule && !isRescheduleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Event Details</h3>
                <button onClick={() => setSelectedSchedule(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 mb-1">{selectedSchedule.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                      selectedSchedule.status === 'RESCHEDULED' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {selectedSchedule.status}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</span>
                    <span className="font-medium text-slate-900">{new Date(selectedSchedule.date).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time</span>
                    <span className="font-medium text-slate-900">{selectedSchedule.startTime} - {selectedSchedule.endTime}</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</span>
                    <span className="font-medium text-slate-900">{selectedSchedule.location}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button 
                    onClick={() => {
                      setRescheduleDate(selectedSchedule.date);
                      setRescheduleTime(selectedSchedule.startTime);
                      setIsRescheduleModalOpen(true);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button 
                    onClick={() => setSelectedSchedule(null)}
                    className="flex-1 bg-[#1e293b] text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors"
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
                <button onClick={() => setIsRescheduleModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">New Date</label>
                  <input 
                    type="date" 
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/20 focus:border-[#C9973A]"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">New Start Time</label>
                  <input 
                    type="time" 
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#C9973A]/20 focus:border-[#C9973A]"
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsRescheduleModalOpen(false)}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReschedule}
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
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-24 px-0 sm:px-0">
      {activeTab === 'collection' ? <CollectionPage /> :
       activeTab === 'home' ? renderHome() :
       activeTab === 'leads' ? renderLeads() :
       activeTab === 'paid-orders' ? renderPaidOrders() :
       activeTab === 'my-quotes' ? renderMyQuotes() :
       activeTab === 'products' ? renderProducts() :
       activeTab === 'schedule' ? renderSchedule() :
       renderHome()}
    </div>
  );
}
