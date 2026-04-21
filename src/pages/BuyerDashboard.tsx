import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import { createInquiry, fetchUserInquiries, deleteInquiry } from '../services/api/inquiryService';
import { useUserInquiries } from '../hooks/useInquiries';
import { useUserQuotes } from '../hooks/useQuotes';
import { markQuoteAsRead, archiveQuote } from '../services/api/quoteService';
import { ViewType, MASTER_BUYER_ACCOUNT_SCHEMA } from '../services/buyerAccountSchema';
import DynamicAccountRenderer from '../components/DynamicAccountRenderer';
import CategorySelection from '../components/CategorySelection';
import ProcessSelection from '../components/ProcessSelection';
import DynamicInquiryForm from '../components/DynamicInquiryForm';
import InquiryPreferences from '../components/InquiryPreferences';
import LocationDetails from '../components/LocationDetails';
import InquirySuccess from '../components/InquirySuccess';
import ConfirmationModal from '../components/ConfirmationModal';
import DashboardLayout from '../components/DashboardLayout';
import { CATEGORIES_DB, GENERIC_FALLBACK_SCHEMA } from '../services/categories';
import { Inquiry, InquiryItem, Quote } from '../types';
import { getLabourInquirySchema } from '../services/labourSchemaRegistry';
import FinancialPage from './FinancialPage';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { activeTab, setActiveTab } = useDashboard();
  const navigate = useNavigate();
  const { tab, inquiryId } = useParams<{ tab: string; inquiryId?: string }>();

  // Synchronize URL tab parameter with Dashboard Context
  useEffect((): void => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab, activeTab, setActiveTab]);

  // Redirect if not buyer
  React.useEffect(() => {
    if (user && user.role !== 'BUYER') {
      navigate('/');
    }
  }, [user, navigate]);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(inquiryId || null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | number | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<any | null>(null);

  // Update selectedInquiryId when URL changes
  useEffect(() => {
    if (inquiryId) {
      setSelectedInquiryId(inquiryId);
    }
  }, [inquiryId]);

  // Fetch inquiries from PostgreSQL backend (NO IndexedDB)
  const {
    inquiries,
    loading: inquiriesLoading,
    refresh: refreshInquiries,
  } = useUserInquiries(user?.id);

  // Fetch quotes from PostgreSQL backend (NO IndexedDB)
  const { quotes, loading: quotesLoading, refresh: refreshQuotes } = useUserQuotes(user?.id);

  const orders = useMemo(
    () => quotes.filter((q) => ['PAID', 'COMPLETED'].includes(q.status)),
    [quotes]
  );


  // TODO: Transactions endpoint not yet implemented on backend
  // const transactions = useLiveQuery(
  //   async () => {
  //     if (!user?.id) return [];
  //     return await db.transactions
  //       .where('userId')
  //       .equals(user.id)
  //       .toArray();
  //   },
  //   [user]
  // ) || [];

  const transactions: any[] = []; // Empty until transactions endpoint is available

  const balance = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'COMPLETED')
      .reduce((sum, t) => (t.type === 'IN' ? sum + t.amount : sum - t.amount), 0);
  }, [transactions]);

  const escrowBalance = useMemo(() => {
    return transactions.filter((t) => t.status === 'ESCROW').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inquiry Flow State
  const [pendingInquiry, setPendingInquiry] = useState<{
    items: InquiryItem[];
    categories?: string[];
    category?: string;
    categoryId?: string;
    isLabour?: boolean;
    labourGroup?: string;
    inquirySchemaKey?: string;
    preferences?: any;
    location?: string;
    attributes?: Record<string, any>;
    processType?: 'EXPRESS' | 'STANDARD';
  }>({ items: [] });

  const dashboardData = useMemo(
    () => ({
      inquiries,
      quotes,
      orders,
      balance,
      escrowBalance,
      selectedInquiry: inquiries.find((i) => i.id === selectedInquiryId),
      selectedQuote: quotes.find((q) => q.id === selectedQuoteId),
      selectedOrder: orders.find((o) => o.id === selectedOrderId),
      recentActivity: [
        ...inquiries.slice(0, 2).map((i) => ({
          id: `i-${i.id}`,
          title: i.title,
          subtitle: 'Inquiry Created',
          time: 'Recently',
          icon: 'MessageSquare',
        })),
        ...quotes.slice(0, 2).map((q) => ({
          id: `q-${q.id}`,
          title: `Quote from ${q.providerName}`,
          subtitle: `K${(q.price || 0).toLocaleString()}`,
          time: 'Recently',
          icon: 'FileText',
        })),
      ],
    }),
    [inquiries, quotes, orders, selectedInquiryId, selectedQuoteId, selectedOrderId]
  );

  const handleTabChange = (tab: string, id?: string) => {
    setActiveTab(tab);
    const basePath = '/buyer';
    // Include inquiry ID in URL for details pages
    const path = id
      ? `${basePath}/${tab}/${id}`
      : tab === 'dashboard'
        ? basePath
        : `${basePath}/${tab}`;
    navigate(path);
  };

  const handleAction = async (actionId: string, payload?: any) => {
    switch (actionId) {
      case 'new_inquiry':
        handleTabChange('process-selection');
        break;
      case 'delete_inquiry':
        setInquiryToDelete(payload);
        break;
      case 'view_financial':
        handleTabChange('financial');
        break;
      case 'view_details':
        if (payload?.id) {
          setSelectedInquiryId(payload.id);
          handleTabChange('inquiries', payload.id);
        }
        break;
      case 'view_quote':
        if (payload?.id) {
          setSelectedQuoteId(payload.id);
          handleTabChange('quote_details');
          // Mark quote as read via API
          try {
            await markQuoteAsRead(payload.id);
            refreshQuotes();
          } catch (error) {
            console.error('Failed to mark quote as read:', error);
          }
        }
        break;
      case 'view_order':
        if (payload?.id) {
          setSelectedOrderId(payload.id);
          handleTabChange('order_details');
        }
        break;
      case 'archive_quote':
        if (payload?.id) {
          // Archive quote via API
          try {
            await archiveQuote(payload.id);
            refreshQuotes();
          } catch (error) {
            console.error('Failed to archive quote:', error);
          }
        }
        break;
      case 'print_quote':
        // Print logic would go here, maybe a helper function
        console.log('Printing quote:', payload);
        break;
      case 'save_profile':
        if (user?.id) {
          // TODO: Update user profile via API
          // await apiClient.patch(`/users/${user.id}`, payload);
        }
        break;
      default:
        console.log('Unhandled action:', actionId, payload);
    }
  };

  const handleInquiryComplete = (selectedCategories: any) => {
    if (selectedCategories.isLabour) {
      setPendingInquiry((prev) => ({ ...prev, ...selectedCategories }));
    } else {
      setPendingInquiry((prev) => ({ ...prev, categories: selectedCategories }));
    }
    handleTabChange('create-inquiry');
  };

  const handleLocationComplete = async (locationData: any) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const isLabour = pendingInquiry.isLabour === true;
      const categoryName = isLabour
        ? pendingInquiry.category
        : pendingInquiry.categories?.[pendingInquiry.categories.length - 1] || 'Inquiry';
      const title = pendingInquiry.attributes?.brand
        ? `${pendingInquiry.attributes.brand} ${pendingInquiry.attributes.model || ''} Request`
        : `${categoryName} Request`;

      // TODO: Check for duplicate inquiry via API
      // const response = await apiClient.get('/inquiries', { params: { title, buyerId: user.id } });
      // const existingInquiry = response.data.data?.[0];

      // if (existingInquiry) {
      //   alert('You already have an active inquiry for this product.');
      //   setIsSubmitting(false);
      //   return;
      // }

      // Prepare inquiry data - backend expects specific format
      const inquiryData = {
        title,
        description: pendingInquiry.attributes?.description || 'No description provided.',
        items: JSON.stringify([]), // Backend wants JSON string
        category: isLabour
          ? pendingInquiry.category || ''
          : pendingInquiry.categories?.join(', ') || '',
        location: `${locationData.city}, ${locationData.province}`,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        radius: locationData.radius,
        status: 'OPEN',
        preferences: JSON.stringify(pendingInquiry.preferences || {}), // Backend wants JSON string
        attributes: JSON.stringify(pendingInquiry.attributes || {}), // Backend wants JSON string
        processType: pendingInquiry.processType || 'STANDARD',
      };

      // Create inquiry via API (will also sync to local DB)
      await createInquiry(inquiryData);
      console.log('✅ Inquiry created:', inquiryData.title);
      refreshInquiries();

      // Force a data refresh
      setPendingInquiry({ items: [] });
      handleTabChange('inquiry-success');
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
              setPendingInquiry((prev) => ({
                ...prev,
                processType: processType.toUpperCase() as 'EXPRESS' | 'STANDARD',
              }));
              handleTabChange('category-selection');
            }}
            onBack={() => handleTabChange('dashboard')}
          />
        );
      case 'category-selection':
        return (
          <CategorySelection
            onBack={() => handleTabChange('process-selection')}
            onComplete={handleInquiryComplete}
          />
        );
      case 'create-inquiry':
        const isLabour = pendingInquiry.isLabour === true;
        const rawCategoryName = isLabour
          ? pendingInquiry.category
          : pendingInquiry.categories?.[0] || 'Inquiry';

        let schema: any[] = [];
        if (isLabour) {
          const labourSchema = getLabourInquirySchema(pendingInquiry.inquirySchemaKey || 'generic');
          schema = labourSchema?.fields || [];
        } else {
          const selectedCategory = CATEGORIES_DB.find((cat) => cat.name === rawCategoryName);
          schema = selectedCategory?.formSchema ?? GENERIC_FALLBACK_SCHEMA;
        }

        // If express, filter to core fields only to make it faster
        if (pendingInquiry.processType === 'EXPRESS' && !isLabour) {
          const coreFieldNames = [
            'title',
            'brand',
            'model',
            'quantity',
            'budget_limit',
            'urgency',
            'images',
            'problemCategory',
            'itemType',
            'eventType',
          ];
          schema = schema.filter((f: any) => f.required || coreFieldNames.includes(f.name));
        }

        return (
          <DynamicInquiryForm
            schema={schema}
            categoryName={rawCategoryName || 'Inquiry'}
            processType={pendingInquiry.processType}
            isLoading={isSubmitting}
            onSubmit={(data) => {
              setPendingInquiry((prev) => ({ ...prev, attributes: data }));
              handleTabChange('inquiry-preferences');
            }}
            onBack={() => handleTabChange('category-selection')}
          />
        );
      case 'inquiry-preferences':
        return (
          <InquiryPreferences
            onBack={() => handleTabChange('create-inquiry')}
            onNext={(prefs) => {
              setPendingInquiry((prev) => ({ ...prev, preferences: prefs }));
              handleTabChange('location-details');
            }}
          />
        );
      case 'location-details':
        return (
          <LocationDetails
            onBack={() =>
              pendingInquiry.processType === 'EXPRESS'
                ? handleTabChange('create-inquiry')
                : handleTabChange('inquiry-preferences')
            }
            onComplete={handleLocationComplete}
          />
        );
      case 'inquiry-success':
        return <InquirySuccess onGoToDashboard={() => handleTabChange('dashboard')} />;
      case 'financial':
        return <FinancialPage isInsideDashboard={true} />;
      default:
        return null;
    }
  };

  const isFlowTab = [
    'process-selection',
    'category-selection',
    'create-inquiry',
    'inquiry-preferences',
    'location-details',
    'inquiry-success',
    'financial',
  ].includes(activeTab);

  return (
    <DashboardLayout onTabChange={handleTabChange} externalActiveTab={activeTab}>
      <div className="w-full">
        <ConfirmationModal
          isOpen={!!inquiryToDelete}
          title="Delete Inquiry"
          message="Are you sure you want to delete this inquiry? This action cannot be undone."
          onConfirm={async () => {
            if (inquiryToDelete?.id) {
              try {
                await deleteInquiry(inquiryToDelete.id);
                refreshInquiries();
              } catch (error) {
                alert('Failed to delete inquiry');
              }
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
              view={
                activeTab === 'home'
                  ? 'dashboard'
                  : activeTab === 'inquiries' && selectedInquiryId
                    ? 'inquiry_details'
                    : activeTab
              }
              data={dashboardData}
              onAction={handleAction}
              onNavigate={handleTabChange}
              user={user}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
