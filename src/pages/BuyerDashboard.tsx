import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, FileText, MessageSquare, Truck, Star, Search, PackageOpen, Plus, X, ArrowRight, MapPin, SlidersHorizontal, Check, Eye, ChevronLeft, Calendar, Settings, Archive, Printer, ShoppingBag, QrCode, Clock, Music, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import DynamicInquiryForm from '../components/DynamicInquiryForm';
import CategorySelection from '../components/CategorySelection';
import InquiryPreferences from '../components/InquiryPreferences';
import LocationDetails from '../components/LocationDetails';
import InquirySuccess from '../components/InquirySuccess';
import Button from '../components/Button';
import { type Inquiry, type Quote, type InquiryItem } from '../types';
import { CATEGORIES_DB, GENERIC_FALLBACK_SCHEMA } from '../services/categories';
import InquiryCard from '../components/InquiryCard';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import { db } from '../db';

export default function BuyerDashboard() {
  const { activeTab, setActiveTab } = useDashboard();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
  const shopsScrollRef = useRef<HTMLDivElement>(null);
  const [activeShopIndex, setActiveShopIndex] = useState(0);
  
  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
    if (tab === 'suppliers') {
      navigate('/buyer/suppliers');
    } else if (tab === 'archived') {
      navigate('/buyer/archived');
    } else if (tab === 'profile') {
      navigate('/buyer/profile');
    } else if (tab === 'home') {
      navigate('/buyer');
    }
  }, [setActiveTab, navigate]);

  const handleShopScroll = useCallback(() => {
    if (!shopsScrollRef.current) return;
    const scrollPosition = shopsScrollRef.current.scrollLeft;
    const width = shopsScrollRef.current.clientWidth;
    const index = Math.round(scrollPosition / width);
    setActiveShopIndex(index);
  }, []);

  const scrollToShop = useCallback((index: number) => {
    if (!shopsScrollRef.current) return;
    const width = shopsScrollRef.current.clientWidth;
    shopsScrollRef.current.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
  }, []);
  
  const inquiries = useLiveQuery(
    () => (user && user.id) ? db.inquiries.where('buyerId').equals(user.id).reverse().sortBy('createdAt') : [],
    [user]
  ) || [];

  const quotes = useLiveQuery(
    () => {
      if (!user || !user.id) return [];
      console.log('BuyerDashboard: Fetching quotes for user:', user.id);
      return db.inquiries.where('buyerId').equals(user.id).toArray().then(userInquiries => {
        console.log('BuyerDashboard: Found inquiries:', userInquiries);
        const inquiryIds = userInquiries.map(i => i.id!).filter(id => id !== undefined);
        if (inquiryIds.length === 0) return [];
        return db.quotes.where('inquiryId').anyOf(inquiryIds).sortBy('createdAt').then(arr => {
          console.log('BuyerDashboard: Found quotes:', arr);
          return arr.reverse();
        });
      });
    },
    [user]
  ) || [];

  const awaitingPaymentQuotes = quotes.filter(q => q.status === 'ACCEPTED');
  const awaitingPaymentTotal = awaitingPaymentQuotes.reduce((sum, q) => sum + q.price, 0);
  
  const paidOrders = quotes.filter(q => q.status === 'PAID' || q.status === 'PENDING_COLLECTION' || q.status === 'AWAITING_PICKUP' || q.status === 'COMPLETED');
  const completedOrdersCount = paidOrders.length;

  const [loading, setLoading] = useState(false);
  const [pendingInquiry, setPendingInquiry] = useState<{ 
    items: InquiryItem[]; 
    categories?: string[];
    preferences?: any;
    location?: string;
    entertainmentData?: any;
    repairData?: any;
    attributes?: Record<string, any>;
  }>({ items: [] });

  const shops = useLiveQuery(() => db.shops.toArray()) || [];

  useEffect(() => {
    const seedShops = async () => {
      const count = await db.shops.count();
      if (count === 0) {
        await db.shops.bulkAdd([
          {
            providerId: 0,
            name: 'Luxury Boutique',
            logo: '',
            coverImage: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80',
            description: 'Exclusive high-end fashion boutique offering the latest trends from international designers. We pride ourselves on quality and authenticity.',
            category: 'High-end Fashion',
            location: 'Lusaka, Zambia',
            rating: 5,
            reviewCount: 41,
            isVerified: true,
            registrationDate: Date.now() - 1000 * 60 * 60 * 24 * 365,
            registrationDocuments: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
            proofPhotos: [
              'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&q=80',
              'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
              'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&q=80'
            ]
          },
          {
            providerId: 0,
            name: 'Modern Craft',
            logo: '',
            coverImage: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80',
            description: 'Bespoke furniture and home decor crafted with passion and precision. Transforming spaces into homes.',
            category: 'Furniture',
            location: 'Kitwe, Zambia',
            rating: 4.9,
            reviewCount: 128,
            isVerified: true,
            registrationDate: Date.now() - 1000 * 60 * 60 * 24 * 180,
            registrationDocuments: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
            proofPhotos: [
              'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=400&q=80',
              'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80'
            ]
          },
          {
            providerId: 0,
            name: 'Tech Haven',
            logo: '',
            coverImage: 'https://images.unsplash.com/photo-1531297172868-9f140cece067?w=1200&q=80',
            description: 'Your one-stop shop for the latest gadgets, home appliances, and smart technology solutions.',
            category: 'Electronics',
            location: 'Lusaka, Zambia',
            rating: 4.8,
            reviewCount: 256,
            isVerified: true,
            registrationDate: Date.now() - 1000 * 60 * 60 * 24 * 730,
            registrationDocuments: ['https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'],
            proofPhotos: [
              'https://images.unsplash.com/photo-1531297172868-9f140cece067?w=400&q=80',
              'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80'
            ]
          }
        ]);
      }
    };
    seedShops();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [user]);

  const handleCompleteInquiry = async (selectedCategories: string[]) => {
    if (!user) return;
    
    // Store selected categories in state
    setPendingInquiry(prev => ({ ...prev, categories: selectedCategories }));
    
    // Transition to InquiryForm
    handleTabClick('create-inquiry');
  };

  const handlePreferencesComplete = (preferences: any) => {
    setPendingInquiry(prev => ({ ...prev, preferences }));
    handleTabClick('location-details');
  };

  const handleLocationComplete = async (locationData: { 
    province: string; 
    city: string; 
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => {
    if (!user) return;
    
    let title = 'New Inquiry';
    let description = '';

    if (pendingInquiry.attributes) {
      const attrs = pendingInquiry.attributes;
      const categoryName = pendingInquiry.categories?.[pendingInquiry.categories.length - 1] || 'Inquiry';
      
      if (attrs.brand && attrs.model) {
        title = `${attrs.brand} ${attrs.model} - Repair Request`;
      } else if (attrs.eventName) {
        title = `${attrs.eventName} - ${attrs.eventType || 'Event'} Booking`;
      } else if (attrs.eventType && attrs.performanceType) {
        title = `${attrs.eventType} - ${attrs.performanceType} Booking`;
      } else {
        title = `${categoryName} Request`;
      }
      
      description = attrs.description || attrs.issueDescription || 'Please see attributes for details.';
    } else if (pendingInquiry.items.length > 0) {
      title = pendingInquiry.items[0].title;
      description = pendingInquiry.items[0].description;
    }

    const locationStr = locationData.latitude && locationData.longitude 
      ? `GPS: ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}${locationData.radius ? ` (${locationData.radius}km radius)` : ''}`
      : `${locationData.city}, ${locationData.province}${locationData.address ? ` (${locationData.address})` : ''}`;
    
    const newInquiry: Inquiry = {
      title: title,
      description: description,
      items: pendingInquiry.items,
      category: pendingInquiry.categories?.join(', ') || '',
      location: locationStr,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      radius: locationData.radius,
      buyerName: user.name,
      buyerId: user.id!,
      createdAt: Date.now(),
      status: 'OPEN',
      viewCount: 0,
      preferences: pendingInquiry.preferences,
      attributes: pendingInquiry.attributes
    };

    console.log('BuyerDashboard: Adding new inquiry:', newInquiry);
    await db.inquiries.add(newInquiry);
    console.log('BuyerDashboard: Inquiry added successfully');
    setPendingInquiry({ items: [] });
    handleTabClick('inquiry-success');
  };

  useEffect(() => {
    console.log('BuyerDashboard activeTab changed to:', activeTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'view-inquiry') {
      if (!selectedInquiryId) {
        handleTabClick('inquiries');
        return;
      }
      const inquiry = inquiries.find(i => i.id === selectedInquiryId);
      if (!inquiry) {
        handleTabClick('inquiries');
      }
    }
  }, [activeTab, selectedInquiryId, inquiries, handleTabClick]);

  if (activeTab === 'create-inquiry') {
    const rawCategoryName = pendingInquiry.categories?.[0] || 'Inquiry';
    // Handle cases like "Electronics (Repair)" or "Electronics (Buy New)"
    const cleanCategoryName = rawCategoryName.split(' (')[0];
    
    const selectedCategory = CATEGORIES_DB.find(
      cat => cat.name === cleanCategoryName || cat.name === rawCategoryName
    );

    const schema = selectedCategory?.formSchema ?? GENERIC_FALLBACK_SCHEMA;

    return (
      <DynamicInquiryForm
        schema={schema}
        categoryName={rawCategoryName}
        onSubmit={(data) => {
          setPendingInquiry(prev => ({
            ...prev,
            attributes: data
          }));
          setActiveTab('inquiry-preferences');
        }}
        onBack={() => setActiveTab('category-selection')}
      />
    );
  }

  const handleCreateInquiry = () => {
    setPendingInquiry({ items: [] });
    handleTabClick('category-selection');
  };

  if (activeTab === 'inquiries') {
    const displayInquiries = inquiries.filter(inquiry => {
      const inquiryQuotes = quotes.filter(q => q.inquiryId === inquiry.id);
      return inquiryQuotes.length === 0;
    });

    return (
      <div className="flex flex-col space-y-6 max-w-3xl mx-auto pb-6 px-0 sm:px-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-bold text-[#1a1612]">My Inquiries</h2>
          <button 
            onClick={handleCreateInquiry}
            className="text-sm font-bold text-[#d49b35] hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Create Inquiry
          </button>
        </div>

        <div className="space-y-4">
          {displayInquiries.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-12 text-center border border-slate-200 shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium mb-6">You haven't created any inquiries yet.</p>
              <Button 
                onClick={handleCreateInquiry}
                className="px-6 py-3"
              >
                Create Your First Inquiry
              </Button>
            </div>
          ) : (
            displayInquiries.map((inquiry) => (
              <InquiryCard
                key={inquiry.id}
                inquiry={inquiry}
                state="open"
                onAction={() => {
                  setSelectedInquiryId(inquiry.id!);
                  handleTabClick('view-inquiry');
                }}
              />
            ))
          )}
        </div>
      </div>
    );
  }



  if (activeTab === 'category-selection') {
    return <CategorySelection onBack={() => handleTabClick('inquiries')} onComplete={handleCompleteInquiry} submitLabel="Continue" />;
  }

  if (activeTab === 'inquiry-preferences') {
    return <InquiryPreferences 
      onBack={() => handleTabClick('create-inquiry')} 
      onNext={(prefs) => handlePreferencesComplete(prefs)} 
    />;
  }

  if (activeTab === 'view-inquiry' && selectedInquiryId) {
    const inquiry = inquiries.find(i => i.id === selectedInquiryId);
    if (!inquiry) {
      return null;
    }

    return (
      <div className="flex flex-col space-y-6 max-w-3xl mx-auto pb-24 px-0 sm:px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => handleTabClick('inquiries')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-[#1a1612]">Inquiry Details</h2>
        </div>

        {/* Main Info Card */}
        <div className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-8 shadow-sm border border-slate-200 relative overflow-hidden">
          {/* Decorative accent */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#d49b35]/5 to-transparent rounded-bl-full -z-0 opacity-50"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${
                    inquiry.status === 'OPEN' ? 'bg-[#d49b35]/10 text-[#d49b35] border border-[#d49b35]/20' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {inquiry.status}
                  </span>
                  <p className="text-xs font-bold text-[#d49b35] uppercase tracking-widest">{inquiry.category}</p>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1a1612] mb-2">{inquiry.title}</h3>
              </div>
              <div className="text-right bg-slate-50 rounded-2xl p-4 border border-slate-100 min-w-[80px] flex flex-col items-center justify-center shadow-sm">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1 justify-center">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Views</span>
                </div>
                <p className="font-serif text-3xl font-black text-[#1a1612] leading-none">{inquiry.viewCount || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Location</p>
                <div className="flex items-center gap-2 text-[#1a1612] font-bold text-sm">
                  <MapPin className="w-4 h-4 text-[#d49b35]" />
                  {inquiry.location}
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Created On</p>
                <div className="flex items-center gap-2 text-[#1a1612] font-bold text-sm">
                  <Calendar className="w-4 h-4 text-[#d49b35]" />
                  {new Date(inquiry.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-[#1a1612] uppercase tracking-widest text-xs">Description</h4>
              <p className="text-slate-600 leading-relaxed text-sm">{inquiry.description}</p>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        {inquiry.preferences && (
          <div className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-8 shadow-sm border border-slate-200">
            <h4 className="font-bold text-[#1a1612] mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Settings className="w-4 h-4 text-[#d49b35]" /> Preferences
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(inquiry.preferences).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-sm font-bold text-[#1a1612] capitalize">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attributes Section */}
        {inquiry.attributes && (
          <div className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-8 shadow-sm border border-slate-200">
            <h4 className="font-bold text-[#1a1612] mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
              <FileText className="w-4 h-4 text-[#d49b35]" /> Inquiry Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(inquiry.attributes).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                return (
                  <div key={key} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-bold text-[#1a1612] capitalize break-words whitespace-pre-wrap">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Entertainment Data Section */}
        {inquiry.entertainmentData && (
          <div className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-8 shadow-sm border border-slate-200">
            <h4 className="font-bold text-[#1a1612] mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Music className="w-4 h-4 text-[#d49b35]" /> Performance Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(inquiry.entertainmentData).map(([key, value]) => (
                <div key={key} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-sm font-bold text-[#1a1612] capitalize">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Repair Data Section */}
        {inquiry.repairData && (
          <div className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-8 shadow-sm border border-slate-200">
            <h4 className="font-bold text-[#1a1612] mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
              <Settings className="w-4 h-4 text-[#d49b35]" /> Repair Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(inquiry.repairData).map(([key, value]) => {
                if (key === 'images') return null; // Skip images for now
                return (
                  <div key={key} className="flex flex-col p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-sm font-bold text-[#1a1612] capitalize">{String(value)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Items Section */}
        <div className="space-y-4">
          <h4 className="font-bold text-[#1a1612] px-2 uppercase tracking-widest text-xs">Items ({inquiry.items.length})</h4>
          {inquiry.items.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl sm:rounded-[32px] p-3 sm:p-6 shadow-sm border border-slate-200 hover:border-[#d49b35]/30 transition-colors">
              <div className="flex gap-4 sm:gap-5">
                {item.images && item.images.length > 0 && (
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
                    <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 py-1">
                  <h5 className="font-serif text-lg sm:text-xl font-bold text-[#1a1612] mb-2">{item.title}</h5>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.brand && <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest">Brand: {item.brand}</span>}
                    {item.quantity && <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 uppercase tracking-widest">Qty: {item.quantity}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="mt-8 mb-4">
          <Button 
            onClick={() => handleTabClick('quotes')}
            className="w-full py-4 flex items-center justify-center gap-2 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            View Received Quotes
          </Button>
        </div>
      </div>
    );
  }

  if (activeTab === 'location-details') {
    return <LocationDetails onBack={() => handleTabClick('inquiry-preferences')} onComplete={handleLocationComplete} />;
  }

  if (activeTab === 'inquiry-success') {
    return <InquirySuccess onGoToDashboard={() => handleTabClick('home')} />;
  }

  if (activeTab === 'quotes') {
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

      const itemsHtml = inquiry.items.map(item => `
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
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #1e293b;">${item.brand || 'N/A'}</td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quotation #${quote.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
              body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; background: #fff; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 4px solid #0052cc; padding-bottom: 20px; }
              .logo { font-size: 28px; font-weight: 900; color: #0052cc; text-transform: uppercase; letter-spacing: -1.5px; }
              .quote-title { font-size: 36px; font-weight: 900; color: #1e293b; margin: 0; letter-spacing: -1px; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
              .info-box { background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #f1f5f9; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              th { text-align: left; padding: 14px; background: #f1f5f9; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
              .total-section { display: flex; justify-content: space-between; border-top: 4px solid #0052cc; padding-top: 24px; margin-top: 40px; }
              .total-label { font-size: 16px; font-weight: 900; color: #64748b; margin-right: 24px; align-self: center; }
              .total-amount { font-size: 32px; font-weight: 900; color: #0052cc; }
              .footer { margin-top: 80px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 30px; }
              .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; font-weight: 900; color: rgba(0, 82, 204, 0.03); z-index: -1; white-space: nowrap; }
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
                <p style="margin: 4px 0 0; font-size: 18px; font-weight: 900; color: #0052cc;">#QT-${quote.id?.toString().padStart(4, '0')}</p>
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

            <div class="info-box" style="margin-bottom: 40px; background: #fff; border-left: 4px solid #0052cc;">
              <div class="section-title">Inquiry Reference</div>
              <div style="font-weight: 800; font-size: 16px; color: #0f172a;">${inquiry.title}</div>
              <div style="font-size: 14px; color: #475569; margin-top: 6px;">${inquiry.description}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Spec/Brand</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="background: #f0f7ff; padding: 24px; border-radius: 20px; border: 1px solid #dbeafe; margin-bottom: 40px;">
              <div class="section-title" style="color: #0052cc; border-bottom-color: #dbeafe;">Seller Message & Terms</div>
              <div style="font-size: 15px; color: #1e293b; font-style: italic; font-weight: 500; line-height: 1.6;">"${quote.message}"</div>
              <div style="margin-top: 16px; display: flex; gap: 30px;">
                <div>
                  <span style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Condition:</span>
                  <span style="font-size: 13px; font-weight: 800; color: #0052cc; margin-left: 6px; background: #fff; padding: 2px 8px; border-radius: 6px;">${quote.condition}</span>
                </div>
                <div>
                  <span style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Validity:</span>
                  <span style="font-size: 13px; font-weight: 800; color: #0052cc; margin-left: 6px; background: #fff; padding: 2px 8px; border-radius: 6px;">${quote.expiryDuration || 'N/A'}</span>
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

    const filteredQuotes = (selectedInquiryId 
      ? quotes.filter(q => q.inquiryId === selectedInquiryId)
      : quotes).filter(q => {
        const inquiryHasPaidQuote = quotes.some(otherQ => 
          otherQ.inquiryId === q.inquiryId && 
          ['PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED'].includes(otherQ.status)
        );
        return (q.status === 'PENDING' || q.status === 'ACCEPTED') && !inquiryHasPaidQuote;
      });

    const inquiriesWithQuotes = inquiries.filter(inquiry => {
      const inquiryQuotes = quotes.filter(q => q.inquiryId === inquiry.id);
      const hasPaidQuote = inquiryQuotes.some(q => ['PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED'].includes(q.status));
      const hasPendingOrAccepted = inquiryQuotes.some(q => q.status === 'PENDING' || q.status === 'ACCEPTED');
      return !hasPaidQuote && hasPendingOrAccepted;
    });

    return (
      <div className="space-y-6">
        {/* Header with Clear Filter */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-bold text-[#1a1612]">
            {selectedInquiryId ? 'Inquiry Quotes' : 'My Quotes'}
          </h2>
          {selectedInquiryId && (
            <button 
              onClick={() => setSelectedInquiryId(null)}
              className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <X className="w-4 h-4" /> Back to Inquiries
            </button>
          )}
        </div>

        {!selectedInquiryId ? (
          <div className="space-y-4">
            {inquiriesWithQuotes.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 text-center border border-slate-200 shadow-sm">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No quotes received yet. Send an inquiry to get started!</p>
              </div>
            ) : (
              inquiriesWithQuotes.map((inquiry) => {
                const inquiryQuotes = quotes.filter(q => q.inquiryId === inquiry.id && (q.status === 'PENDING' || q.status === 'ACCEPTED'));
                return (
                  <InquiryCard
                    key={inquiry.id}
                    inquiry={inquiry}
                    state="quoted"
                    quoteCount={inquiryQuotes.length}
                    onAction={() => setSelectedInquiryId(inquiry.id)}
                  />
                );
              })
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-2">
              {['Lowest Price', 'Top Rated', 'Nearest'].map((filter, i) => (
                <button key={filter} className={`flex-1 py-2 px-2 rounded-full text-xs font-bold border ${i === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'} flex items-center justify-center gap-1`}>
                  {i === 0 && <TrendingUp className="w-3 h-3" />}
                  {i === 1 && <Star className="w-3 h-3" />}
                  {i === 2 && <Truck className="w-3 h-3" />}
                  {filter}
                </button>
              ))}
            </div>

            {/* Quotes List */}
            <div className="space-y-4">
              {filteredQuotes.length === 0 ? (
                <div className="bg-white rounded-[32px] p-12 text-center border border-slate-200 shadow-sm">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No quotes received yet. Send an inquiry to get started!</p>
                </div>
              ) : (
                filteredQuotes.map((quote, index) => (
              <div key={quote.id} className="group bg-white rounded-[24px] p-5 shadow-sm border border-slate-200 relative hover:shadow-md hover:border-[#d49b35]/30 transition-all duration-300 flex flex-col gap-4">
                
                {/* Unread Indicator */}
                {!quote.isRead && (
                  <div className="absolute top-6 left-0 w-1.5 h-8 bg-[#d49b35] rounded-r-full"></div>
                )}

                {/* Header: Shop Info & Price */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg shadow-inner shrink-0">
                      {(quote.providerName || 'P').charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#1a1612] leading-tight">{quote.providerName || 'Provider'}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-0.5 bg-[#fdf6e9] px-1.5 py-0.5 rounded text-[#d49b35]">
                          <Star className="w-3 h-3" fill="currentColor" />
                          <span className="text-[10px] font-bold">4.9</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">(120 reviews)</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Quote</p>
                    <div className="flex items-start justify-end">
                      <span className="text-sm font-bold text-slate-400 mt-1 mr-0.5">k</span>
                      <span className="text-2xl font-black text-[#1a1612] tracking-tight leading-none">
                        {quote.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-gradient-to-r from-slate-100 via-slate-100 to-transparent"></div>

                {/* Offer Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 bg-[#d49b35]/10 rounded-lg text-[#d49b35]">
                      <PackageOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Condition</p>
                      <p className="text-xs font-bold text-[#1a1612]">{quote.condition}</p>
                    </div>
                  </div>
                  
                  {quote.expiryDuration && (
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 p-1.5 bg-rose-50 rounded-lg text-rose-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Expires In</p>
                        <p className="text-xs font-bold text-rose-600">{quote.expiryDuration}</p>
                      </div>
                    </div>
                  )}
                </div>

                {quote.venueSpaceName && (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Venue Space</p>
                    <p className="text-sm font-bold text-slate-700 mb-2">{quote.venueSpaceName}</p>
                    {(quote.damageDeposit || quote.cleaningFee) && (
                      <div className="flex items-center gap-4 border-t border-slate-200 pt-2 mt-2">
                        {quote.damageDeposit && (
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Deposit</p>
                            <p className="text-xs font-bold text-slate-600">K{quote.damageDeposit.toLocaleString()}</p>
                          </div>
                        )}
                        {quote.cleaningFee && (
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cleaning</p>
                            <p className="text-xs font-bold text-slate-600">K{quote.cleaningFee.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Seller Message */}
                {quote.message && (
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3.5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#d49b35]/30"></div>
                    <div className="flex gap-2.5">
                      <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 italic leading-relaxed">"{quote.message}"</p>
                    </div>
                  </div>
                )}

                {/* Status Banner */}
                {(quote.status === 'PAID' || quote.status === 'COMPLETED') && (
                  <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-2 text-emerald-700 border border-emerald-100">
                    <Check className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {quote.status === 'PAID' ? 'Paid - Awaiting Collection' : 'Collection Confirmed - Funds Released'}
                    </span>
                  </div>
                )}

                {/* Footer: Meta & Actions */}
                <div className="flex justify-between items-center pt-1 mt-1">
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    QID-{quote.id}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const inquiry = inquiries.find(i => i.id === quote.inquiryId);
                        if (inquiry) handlePrintQuote(quote, inquiry);
                      }}
                      className="p-2.5 text-slate-400 hover:text-[#d49b35] hover:bg-[#d49b35]/10 rounded-xl transition-all"
                      title="Print Quotation"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (quote.id) handleArchiveQuote(quote.id);
                      }}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Archive Quote"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (quote.id) {
                          await db.quotes.update(quote.id, { isRead: true });
                        }
                        navigate(`/buyer/quote-details?id=${quote.id}`);
                      }}
                      className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
                        !quote.isRead 
                          ? 'bg-[#1a1612] text-white hover:bg-black shadow-md hover:shadow-lg hover:-translate-y-0.5' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      View Offer
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </>
        )}
      </div>
    );
  }

  if (activeTab === 'shops') {
    return (
      <div className="flex flex-col space-y-8 max-w-3xl mx-auto pb-6">
        {/* Header & Search */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-3xl font-serif font-bold text-[#1a1612]">Discover Shops</h2>
          </div>
          
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#d49b35] transition-colors" />
              <input 
                type="text" 
                placeholder="Search premium retailers and boutiques..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] text-sm font-medium text-[#1a1612] placeholder:text-slate-400 transition-all"
              />
            </div>
            <button className="w-14 h-[54px] bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-[#1a1612] hover:border-slate-300 transition-all flex-shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex overflow-x-auto gap-8 pb-2 scrollbar-hide border-b border-slate-100">
          {['All', 'Chain Stores', 'Fashion', 'Electronics', 'Hardware'].map((cat, i) => (
            <button 
              key={cat} 
              className={`pb-4 text-sm font-bold whitespace-nowrap relative transition-colors ${i === 0 ? 'text-[#1a1612]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {cat}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d49b35] rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>

        {/* Shop Cards */}
        <div className="space-y-8">
          {shops.map((shop) => (
            <div 
              key={shop.id} 
              className="bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:border-[#d49b35]/30 group relative cursor-pointer"
              onClick={() => navigate(`/buyer/shop-details?id=${shop.id}`)}
            >
              {/* Cover Image & Anchored Logo */}
              <div className="h-48 sm:h-64 w-full relative overflow-hidden">
                <img src={shop.coverImage} alt={shop.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80"></div>
                
                {/* Rating Badge */}
                <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                  <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-white/20">
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#d49b35] fill-[#d49b35]" />
                    <span className="text-xs font-bold text-[#1a1612]">{shop.rating}</span>
                    <span className="text-[10px] font-bold text-slate-400">({shop.reviewCount})</span>
                  </div>
                </div>

                {/* Overlapping Logo - Extruding up into the cover image */}
                <div className="absolute -bottom-4 left-4 sm:-bottom-6 sm:left-6 z-10">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 shadow-md border border-slate-100 group-hover:ring-2 ring-[#d49b35]/50 transition-all duration-300">
                    {shop.logo ? (
                      <img src={shop.logo} alt={shop.name} className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-slate-50 flex items-center justify-center text-[#d49b35] font-serif font-bold text-xl sm:text-2xl tracking-widest border border-slate-100">
                        {shop.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Content Section - Stacked Layout */}
              <div className="px-5 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-6 relative flex flex-col gap-4">
                {/* Shop Info */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1a1612] line-clamp-1 group-hover:text-[#d49b35] transition-colors">{shop.name}</h3>
                    {shop.isVerified && (
                      <div className="bg-emerald-50 text-emerald-600 p-1 rounded-full border border-emerald-100 shrink-0" title="Verified Shop">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500">
                    <span className="font-bold text-[#d49b35] text-[10px] sm:text-xs uppercase tracking-widest shrink-0">{shop.category}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{shop.location}</span>
                    </div>
                  </div>
                </div>

                {/* Description Snippet */}
                <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                  {shop.description}
                </p>

                {/* Action Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tap to view details</span>
                  <button className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#d49b35] text-[#1a1612] hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors group/btn">
                    Visit Shop
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'paid-orders') {
    return (
      <div className="flex flex-col space-y-6 max-w-3xl mx-auto pb-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-2xl font-bold text-[#1a1612]">Paid Orders (Escrow)</h2>
        </div>

        <div className="space-y-4">
          {paidOrders.length === 0 ? (
            <div className="bg-white rounded-[32px] p-12 text-center border border-slate-200 shadow-sm">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">You don't have any paid orders yet.</p>
            </div>
          ) : (
            paidOrders.map((quote) => {
              const inquiry = inquiries.find(i => i.id === quote.inquiryId);
              if (!inquiry) return null;
              
              return (
                <InquiryCard
                  key={quote.id}
                  inquiry={inquiry}
                  state="paid"
                  paidQuote={quote}
                  onAction={() => {
                    navigate(`/buyer/collection-code/${quote.id}`);
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (activeTab !== 'home') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        {/* Illustration */}
        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-50 rounded-full border border-slate-100"></div>
          <Search className="w-24 h-24 text-slate-300 relative z-10" strokeWidth={3} />
          <div className="absolute bottom-4 right-4 bg-white p-3 rounded-2xl shadow-lg border border-slate-100 z-20">
            <div className="bg-[#d49b35] p-2 rounded-xl">
              <PackageOpen className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1612] mb-4">
          No Active Inquiries
        </h2>
        
        <p className="text-slate-500 text-[16px] max-w-sm mb-10 leading-relaxed">
          Send your first inquiry to start receiving quotations from top sellers.
        </p>

        <Button 
          onClick={handleCreateInquiry}
          className="w-full max-w-[320px] py-4 px-6 text-[16px] shadow-lg"
        >
          Create Inquiry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-7xl pb-6 pt-2 sm:pt-5 px-0 sm:px-0">
      {/* Verification Warning Banner */}
      {user?.verificationStatus === 'INCOMPLETE' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#1a1612]">Complete your verification</h4>
              <p className="text-[13px] text-[#1a1612]/60">Upload your PACRA Certificate to unlock all business features.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/register/company-documents')}
            className="px-6 py-2.5 bg-brand-yellow text-[#1a1612] font-bold text-[13px] rounded-xl hover:bg-brand-yellow/90 transition-colors shrink-0"
          >
            Complete Now
          </button>
        </div>
      )}

      {/* Awaiting Payment Card */}
      <div className="bg-[#1e293b] rounded-[32px] p-6 sm:p-[28px] shadow-sm text-white relative overflow-hidden">
        <div className="relative z-10 min-w-0">
          <p className="text-[#C9973A] text-[11px] font-bold font-sans uppercase tracking-wider mb-2 truncate">AWAITING PAYMENT</p>
          <h2 className="text-[42px] font-bold mb-2 truncate font-serif text-white leading-none" title={`ZMW ${awaitingPaymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}>ZMW {awaitingPaymentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          <p className="text-[#94a3b8] text-[13px] font-sans mb-6 truncate">{awaitingPaymentQuotes.length} Orders pending payment</p>
          <button 
            onClick={() => navigate('/buyer/financial')}
            className="border border-[#C9973A] text-[#C9973A] bg-transparent font-medium font-sans py-2.5 px-6 rounded-[8px] text-[13px] hover:bg-[#C9973A]/10 transition-colors"
          >
            My Account 425*******12
          </button>
        </div>
      </div>

      {/* Popular Shops Section */}
      <div className="mt-6 sm:mt-[32px] mb-6">
        <h3 className="text-[22px] font-bold font-serif text-[#1e293b] px-0 mb-4">Popular Shops</h3>
        <div className="relative">
          <div 
            ref={shopsScrollRef}
            onScroll={handleShopScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-[20px] scrollbar-hide pb-2"
          >
            {shops.length > 0 ? (
              shops.map((shop, i) => (
                <div 
                  key={shop.id || i} 
                  onClick={() => navigate(`/buyer/shop-details?id=${shop.id}`)}
                  className="w-full sm:w-[600px] snap-center bg-white rounded-[32px] p-6 border border-[#f1f0ee] shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden cursor-pointer hover:border-[#C9973A]/30 hover:shadow-lg transition-all duration-300 group shrink-0"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-[64px] h-[64px] rounded-[20px] bg-[#fffaf5] border border-[#f8f7f5] flex items-center justify-center text-[#C9973A] overflow-hidden shrink-0 shadow-sm">
                      {shop.logo ? (
                        <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="font-serif font-bold text-xl tracking-widest">{shop.name.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    {shop.isVerified && (
                      <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  
                  <h4 className="font-serif font-bold text-[24px] text-[#1e293b] mb-1 leading-tight tracking-tight">{shop.name}</h4>
                  <p className="text-[11px] font-bold font-sans text-[#C9973A] uppercase tracking-[0.15em] mb-4">{shop.category}</p>
                  
                  <p className="text-[14px] font-sans text-[#64748b] line-clamp-3 mb-8 leading-relaxed opacity-90">
                    {shop.description}
                  </p>
                  
                  <div className="flex items-center gap-8 pt-5 border-t border-[#f1f0ee]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-3.5 h-3.5 ${star <= Math.round(shop.rating) ? 'text-[#C9973A] fill-[#C9973A]' : 'text-slate-200 fill-slate-200'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-bold font-sans text-[14px] text-[#1e293b] ml-1">{shop.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-4 h-4 text-[#94a3b8]" />
                      <span className="truncate font-sans text-[15px] text-[#64748b]">{shop.location.split(',')[0]}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full py-8 text-center bg-[#fdfaf6] rounded-[14px] border border-dashed border-[#f1f5f9]">
                <p className="text-[#64748b] font-medium font-sans">No shops found</p>
              </div>
            )}
          </div>
          
          {/* Pagination Dots */}
          {shops.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {[0, 1, 2].map((i) => {
                const sectionSize = Math.ceil(shops.length / 3);
                const isActive = Math.floor(activeShopIndex / sectionSize) === i;
                return (
                  <button
                    key={i}
                    onClick={() => scrollToShop(Math.min(i * sectionSize, shops.length - 1))}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-[#1e293b]' : 'bg-[#e2e8f0]'
                    }`}
                    aria-label={`Go to section ${i + 1}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Card One: My Purchases */}
        <div className="bg-white rounded-[32px] p-7 sm:p-8 border border-[#f1f0ee] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex justify-between items-center relative overflow-hidden group">
          <div className="z-10">
            <p className="text-[11px] font-bold font-sans text-[#94a3b8] tracking-[0.1em] uppercase mb-4">MY PURCHASES</p>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-[42px] font-bold text-[#1e293b] font-serif leading-none">{completedOrdersCount}</h2>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-[11px] font-bold">
                <TrendingUp className="w-3 h-3" />
                <span>100%</span>
              </div>
            </div>
            <p className="text-[16px] font-bold text-[#64748b] font-sans opacity-80">Products Bought</p>
          </div>
          <div className="flex -space-x-5 pr-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] overflow-hidden border-2 border-white shadow-md rotate-[-8deg] transform transition-transform group-hover:rotate-0">
              <img src="https://picsum.photos/seed/shop1/200/200" alt="Item" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] overflow-hidden border-2 border-white shadow-md z-10">
              <img src="https://picsum.photos/seed/shop2/200/200" alt="Item" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[20px] overflow-hidden border-2 border-white shadow-md rotate-[8deg] transform transition-transform group-hover:rotate-0">
              <img src="https://picsum.photos/seed/shop3/200/200" alt="Item" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        </div>

        {/* Card Two: My Inquiries */}
        <div 
          onClick={() => handleTabClick('inquiries')}
          className="bg-white rounded-[32px] p-8 border border-[#f1f0ee] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 group"
        >
          <p className="text-[11px] font-bold font-sans text-[#94a3b8] tracking-[0.2em] uppercase mb-6">MY INQUIRIES</p>
          <div className="w-full h-px bg-[#f1f0ee] mb-8"></div>
          <div className="flex items-end gap-4">
            <h2 className="text-[84px] font-bold text-[#1e293b] font-serif leading-none">
              {inquiries.filter(inquiry => quotes.filter(q => q.inquiryId === inquiry.id).length === 0).length}
            </h2>
            <div className="mb-2">
              <p className="text-[14px] font-bold text-[#1e293b] font-sans tracking-widest uppercase">ACTIVE</p>
              <p className="text-[12px] text-[#94a3b8] font-sans">Pending Responses</p>
            </div>
          </div>
        </div>

        {/* Card Three: Quotes Received */}
        <div 
          onClick={() => quotes.length > 0 && handleTabClick('quotes')}
          className="bg-white rounded-[32px] p-8 border border-[#f1f0ee] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 group"
        >
          <p className="text-[11px] font-bold font-sans text-[#94a3b8] tracking-[0.2em] uppercase mb-6">QUOTES RECEIVED</p>
          <div className="w-full h-px bg-[#f1f0ee] mb-8"></div>
          <div className="flex items-end gap-4">
            <h2 className="text-[84px] font-bold text-[#94a3b8]/30 font-serif leading-none">
              {quotes.filter(q => {
                const inquiryHasPaidQuote = quotes.some(otherQ => 
                  otherQ.inquiryId === q.inquiryId && 
                  ['PAID', 'PENDING_COLLECTION', 'AWAITING_PICKUP', 'COMPLETED'].includes(otherQ.status)
                );
                return (q.status === 'PENDING' || q.status === 'ACCEPTED') && !inquiryHasPaidQuote;
              }).length}
            </h2>
            <div className="mb-2">
              <p className="text-[14px] font-bold text-[#94a3b8] font-sans tracking-widest uppercase">VERIFIED</p>
              <p className="text-[12px] text-[#94a3b8] font-sans">From Suppliers</p>
            </div>
          </div>
        </div>

        {/* Card Four: Archived Quotations */}
        <div 
          onClick={() => handleTabClick('archived')}
          className="bg-white rounded-[32px] p-8 border border-[#f1f0ee] shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col cursor-pointer hover:shadow-lg transition-all duration-300 group"
        >
          <p className="text-[11px] font-bold font-sans text-[#94a3b8] tracking-[0.2em] uppercase mb-6">ARCHIVED QUOTATIONS</p>
          <div className="w-full h-px bg-[#f1f0ee] mb-8"></div>
          <div className="flex items-center">
            <div className="flex items-end gap-4">
              <h2 className="text-[84px] font-bold text-[#94a3b8]/30 font-serif leading-none">{quotes.filter(q => q.status === 'ARCHIVED').length}</h2>
              <div className="mb-2">
                <p className="text-[14px] font-bold text-[#94a3b8] font-sans tracking-widest uppercase">IN ARCHIVE</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <p className="text-[11px] font-bold font-sans text-[#C9973A] tracking-[0.2em] uppercase mb-2 px-0">TIMELINE</p>
        <div className="flex justify-between items-center mb-6 px-0">
          <h3 className="text-[28px] font-serif font-bold text-[#1e293b] tracking-tight">Recent Activity</h3>
          <button 
            onClick={() => handleTabClick('inquiries')}
            className="text-[11px] font-bold text-[#C9973A] font-sans hover:underline tracking-widest uppercase"
          >
            SEE ALL
          </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4">
          {inquiries.length > 0 ? (
            inquiries.slice(0, 3).map(inquiry => (
              <motion.div 
                key={inquiry.id} 
                whileHover={{ x: 4 }}
                className="bg-white rounded-xl sm:rounded-[24px] p-3 sm:p-6 border border-[#f1f5f9] flex items-center gap-3 sm:gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[#1e293b] truncate font-sans">Inquiry: {inquiry.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Status: {inquiry.status}</p>
                    {quotes.filter(q => q.inquiryId === inquiry.id && !q.isRead && q.status === 'PENDING').length > 0 && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-[#C9973A] bg-[#fdf6e9] px-2 py-0.5 rounded uppercase tracking-wider">
                        New Quote
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-[#C9973A] uppercase tracking-widest bg-[#fdf6e9] px-4 py-2 rounded-xl border border-[#C9973A]/10">
                  Active
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-white rounded-[24px] p-16 text-center border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
              <Clock className="w-16 h-16 text-slate-200 mb-6" strokeWidth={1.5} />
              <h4 className="text-[16px] font-bold text-slate-400 font-sans mb-1">No recent activity to display</h4>
              <p className="text-[13px] text-slate-300 font-sans">Your interactions will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
