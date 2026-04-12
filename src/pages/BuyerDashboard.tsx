import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import { db } from '../db';
import { ViewType, MASTER_BUYER_ACCOUNT_SCHEMA } from '../services/buyerAccountSchema';
import DynamicAccountRenderer from '../components/DynamicAccountRenderer';
import CategorySelection from '../components/CategorySelection';
import ProcessSelection from '../components/ProcessSelection';
import DynamicInquiryForm from '../components/DynamicInquiryForm';
import InquiryPreferences from '../components/InquiryPreferences';
import LocationDetails from '../components/LocationDetails';
import InquirySuccess from '../components/InquirySuccess';
import ConfirmationModal from '../components/ConfirmationModal';
import { CATEGORIES_DB, GENERIC_FALLBACK_SCHEMA } from '../services/categories';
import { Inquiry, InquiryItem } from '../types';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { activeTab, setActiveTab } = useDashboard();
  const navigate = useNavigate();
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<any | null>(null);

  // Data Fetching
  const inquiries = useLiveQuery(
    () => (user?.id) ? db.inquiries.where('buyerId').equals(user.id).reverse().sortBy('createdAt') : [],
    [user]
  ) || [];

  const quotes = useLiveQuery(
    () => {
      if (!user?.id) return [];
      return db.inquiries.where('buyerId').equals(user.id).toArray().then(userInquiries => {
        const inquiryIds = userInquiries.map(i => i.id!).filter(id => id !== undefined);
        if (inquiryIds.length === 0) return [];
        return db.quotes.where('inquiryId').anyOf(inquiryIds).sortBy('createdAt').then(arr => arr.reverse());
      });
    },
    [user]
  ) || [];

  const orders = useMemo(() => quotes.filter(q => ['PAID', 'COMPLETED'].includes(q.status)), [quotes]);
  
  const transactions = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      return await db.transactions
        .where('userId')
        .equals(user.id)
        .toArray();
    },
    [user]
  ) || [];

  const balance = useMemo(() => {
    return transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => t.type === 'IN' ? sum + t.amount : sum - t.amount, 0);
  }, [transactions]);

  const escrowBalance = useMemo(() => {
    return transactions
      .filter(t => t.status === 'ESCROW')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inquiry Flow State
  const [pendingInquiry, setPendingInquiry] = useState<{ 
    items: InquiryItem[]; 
    categories?: string[];
    preferences?: any;
    location?: string;
    attributes?: Record<string, any>;
    processType?: 'EXPRESS' | 'STANDARD';
  }>({ items: [] });

  const dashboardData = useMemo(() => ({
    inquiries,
    quotes,
    orders,
    balance,
    escrowBalance,
    selectedInquiry: inquiries.find(i => i.id === selectedInquiryId),
    selectedQuote: quotes.find(q => q.id === selectedQuoteId),
    selectedOrder: orders.find(o => o.id === selectedOrderId),
    recentActivity: [
      ...inquiries.slice(0, 2).map(i => ({ id: `i-${i.id}`, title: i.title, subtitle: 'Inquiry Created', time: 'Recently', icon: 'MessageSquare' })),
      ...quotes.slice(0, 2).map(q => ({ id: `q-${q.id}`, title: `Quote from ${q.providerName}`, subtitle: `K${q.price.toLocaleString()}`, time: 'Recently', icon: 'FileText' }))
    ]
  }), [inquiries, quotes, orders, selectedInquiryId, selectedQuoteId, selectedOrderId]);

  const handleAction = async (actionId: string, payload?: any) => {
    switch (actionId) {
      case 'new_inquiry':
        setActiveTab('process-selection');
        break;
      case 'delete_inquiry':
        setInquiryToDelete(payload);
        break;
      case 'view_financial':
        navigate('/buyer/financial');
        break;
      case 'view_details':
        if (payload?.id) {
          setSelectedInquiryId(payload.id);
          setActiveTab('inquiry_details');
        }
        break;
      case 'view_quote':
        if (payload?.id) {
          setSelectedQuoteId(payload.id);
          setActiveTab('quote_details');
          // Mark as read
          await db.quotes.update(payload.id, { isRead: true });
        }
        break;
      case 'view_order':
        if (payload?.id) {
          setSelectedOrderId(payload.id);
          setActiveTab('order_details');
        }
        break;
      case 'archive_quote':
        if (payload?.id) {
          await db.quotes.update(payload.id, { status: 'ARCHIVED' });
        }
        break;
      case 'print_quote':
        // Print logic would go here, maybe a helper function
        console.log('Printing quote:', payload);
        break;
      case 'save_profile':
        if (user?.id) {
          await db.users.update(user.id, payload);
          // The auth context should ideally pick this up if it's watching the DB
        }
        break;
      default:
        console.log('Unhandled action:', actionId, payload);
    }
  };

  const handleInquiryComplete = (selectedCategories: string[]) => {
    setPendingInquiry(prev => ({ ...prev, categories: selectedCategories }));
    setActiveTab('create-inquiry');
  };

  const handleLocationComplete = async (locationData: any) => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const categoryName = pendingInquiry.categories?.[pendingInquiry.categories.length - 1] || 'Inquiry';
      const title = pendingInquiry.attributes?.brand 
        ? `${pendingInquiry.attributes.brand} ${pendingInquiry.attributes.model || ''} Request`
        : `${categoryName} Request`;

      // Check for duplicate inquiry for the same product
      const existingInquiry = await db.inquiries
        .where('buyerId').equals(user.id)
        .and(i => i.title === title)
        .first();

      if (existingInquiry) {
        alert('You already have an active inquiry for this product.');
        setIsSubmitting(false);
        return;
      }

      const newInquiry: Inquiry = {
        title,
        description: pendingInquiry.attributes?.description || 'No description provided.',
        items: [],
        category: pendingInquiry.categories?.join(', ') || '',
        location: `${locationData.city}, ${locationData.province}`,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        radius: locationData.radius,
        buyerName: user.name,
        buyerId: user.id!,
        createdAt: Date.now(),
        status: 'OPEN',
        viewCount: 0,
        preferences: pendingInquiry.preferences,
        attributes: pendingInquiry.attributes,
        processType: pendingInquiry.processType
      };

      await db.inquiries.add(newInquiry);
      setPendingInquiry({ items: [] });
      setActiveTab('inquiry-success');
    } catch (error) {
      console.error('Error creating inquiry:', error);
      alert('Failed to create inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInquiryFlow = () => {
    switch (activeTab) {
      case 'process-selection':
        return (
          <ProcessSelection 
            onComplete={(processType) => {
              setPendingInquiry(prev => ({ ...prev, processType: processType.toUpperCase() as 'EXPRESS' | 'STANDARD' }));
              setActiveTab('category-selection');
            }}
            onBack={() => setActiveTab('dashboard')}
          />
        );
      case 'category-selection':
        return <CategorySelection onBack={() => setActiveTab('process-selection')} onComplete={handleInquiryComplete} />;
      case 'create-inquiry':
        const rawCategoryName = pendingInquiry.categories?.[0] || 'Inquiry';
        const selectedCategory = CATEGORIES_DB.find(cat => cat.name === rawCategoryName);
        let schema = selectedCategory?.formSchema ?? GENERIC_FALLBACK_SCHEMA;
        
        // If express, filter to core fields only to make it faster
        if (pendingInquiry.processType === 'EXPRESS') {
          const coreFieldNames = ['title', 'brand', 'model', 'quantity', 'budget_limit', 'urgency', 'images', 'problemCategory', 'itemType', 'eventType'];
          schema = schema.filter(f => f.required || coreFieldNames.includes(f.name));
        }

        return (
          <DynamicInquiryForm
            schema={schema}
            categoryName={rawCategoryName}
            processType={pendingInquiry.processType}
            isLoading={isSubmitting}
            onSubmit={(data) => {
              setPendingInquiry(prev => ({ ...prev, attributes: data }));
              if (pendingInquiry.processType === 'EXPRESS') {
                setActiveTab('location-details');
              } else {
                setActiveTab('inquiry-preferences');
              }
            }}
            onBack={() => setActiveTab('category-selection')}
          />
        );
      case 'inquiry-preferences':
        return <InquiryPreferences onBack={() => setActiveTab('create-inquiry')} onNext={(prefs) => {
          setPendingInquiry(prev => ({ ...prev, preferences: prefs }));
          setActiveTab('location-details');
        }} />;
      case 'location-details':
        return <LocationDetails onBack={() => pendingInquiry.processType === 'EXPRESS' ? setActiveTab('create-inquiry') : setActiveTab('inquiry-preferences')} onComplete={handleLocationComplete} />;
      case 'inquiry-success':
        return <InquirySuccess onGoToDashboard={() => setActiveTab('dashboard')} />;
      default:
        return null;
    }
  };

  const isFlowTab = ['process-selection', 'category-selection', 'create-inquiry', 'inquiry-preferences', 'location-details', 'inquiry-success'].includes(activeTab);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <ConfirmationModal
        isOpen={!!inquiryToDelete}
        title="Delete Inquiry"
        message="Are you sure you want to delete this inquiry? This action cannot be undone."
        onConfirm={async () => {
          if (inquiryToDelete?.id) {
            await db.inquiries.delete(inquiryToDelete.id);
          }
          setInquiryToDelete(null);
        }}
        onCancel={() => setInquiryToDelete(null)}
      />
      <AnimatePresence mode="wait">
        {isFlowTab ? (
          <motion.div
            key="flow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderInquiryFlow()}
          </motion.div>
        ) : (
          <DynamicAccountRenderer
            key={activeTab}
            schema={MASTER_BUYER_ACCOUNT_SCHEMA}
            view={(activeTab === 'home' ? 'dashboard' : activeTab)}
            data={dashboardData}
            onAction={handleAction}
            onNavigate={(viewId) => setActiveTab(viewId)}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
