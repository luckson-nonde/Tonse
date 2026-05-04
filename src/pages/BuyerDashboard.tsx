import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import {
  createInquiry,
  fetchUserInquiries,
  deleteInquiry,
  type CreateInquiryPayload,
} from '../services/api/inquiryService';
import { useUserInquiries } from '../hooks/useInquiries';
import { useUserQuotes } from '../hooks/useQuotes';
import { markQuoteAsRead, archiveQuote, deleteQuote } from '../services/api/quoteService';
import { ViewType, MASTER_BUYER_ACCOUNT_SCHEMA } from '../services/buyerAccountSchema';
import DynamicAccountRenderer from '../components/DynamicAccountRenderer';
import CategorySelection from '../components/CategorySelection';
import ProcessSelection from '../components/ProcessSelection';
import DynamicInquiryForm from '../components/DynamicInquiryForm';
import InquiryPreferences from '../components/InquiryPreferences';
import LocationDetails from '../components/LocationDetails';
import InquiryPayment, { type InquiryPaymentResult } from '../components/InquiryPayment';
import InquirySuccess from '../components/InquirySuccess';
import ConfirmationModal from '../components/ConfirmationModal';
import DashboardLayout from '../components/DashboardLayout';
import { CATEGORIES_DB, getCategorySchema } from '../services/categories';
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
  const [quoteToDelete, setQuoteToDelete] = useState<any | null>(null);

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
    location?: {
      province: string;
      city: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      radius?: number;
    };
    attributes?: Record<string, any>;
    processType?: 'EXPRESS' | 'STANDARD';
  }>({ items: [] });

  const categoryType = useMemo(() => {
    if (pendingInquiry.isLabour) return 'LABOR';
    const cats = pendingInquiry.categories || [];
    const lowerCats = cats.map(c => c.toLowerCase());
    const pathStr = lowerCats.join(' > ');
    
    if (pathStr.includes('venues') || pathStr.includes('clubs')) return 'VENUES';
    if (pathStr.includes('rental') || pathStr.includes('catering') || pathStr.includes('planning') || pathStr.includes('management') || pathStr.includes('decor') || pathStr.includes('repair') || pathStr.includes('recovery') || pathStr.includes('services')) return 'SERVICES';
    
    return 'PRODUCTS';
  }, [pendingInquiry.categories, pendingInquiry.isLabour]);

  const dashboardData = useMemo(
    () => ({
      inquiries,
      quotes: quotes.filter((q) => !['PAID', 'COMPLETED'].includes(q.status) && !q.isArchived),
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
        ...quotes.slice(0, 2).filter(q => !q.isArchived).map((q) => ({
          id: `q-${q.id}`,
          title: `Quote from ${q.providerName}`,
          subtitle: `K${(q.price || 0).toLocaleString()}`,
          time: 'Recently',
          icon: 'FileText',
        })),
      ],
    }),
    [inquiries, quotes, orders, selectedInquiryId, selectedQuoteId, selectedOrderId, balance, escrowBalance]
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
      case 'delete_quote':
        setQuoteToDelete(payload);
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
      case 'delete_quote_silent': // Silent version of delete that just archives
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
      case 'accept_quote':
        // Refresh quotes and inquiries after acceptance/payment
        refreshQuotes();
        refreshInquiries();
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

  const handleLocationComplete = (locationData: any) => {
    // Stash location alongside the rest of the pending inquiry; payment step
    // owns the actual create-inquiry call so we don't publish until the buyer
    // has paid the service fee.
    setPendingInquiry((prev) => ({ ...prev, location: locationData }));
    handleTabChange('inquiry-payment');
  };

  const handlePaymentComplete = async (payment: InquiryPaymentResult) => {
    if (!user) return;
    const locationData = pendingInquiry.location;
    if (!locationData) {
      alert('Missing location data. Please go back and re-enter your location.');
      return;
    }
    if (!locationData.province || !locationData.city) {
      alert('Province and city are required. Please go back and complete the location step.');
      return;
    }
    // Coordinates are optional. When they're absent, the inquiry
    // broadcasts to every provider in the chosen city; when present,
    // matching narrows to providers within `radius` km of the point.
    setIsSubmitting(true);

    try {
      const isLabour = pendingInquiry.isLabour === true;

      // Resolve the category string the backend will store. Fall through
      // multiple sources because the inquiry flow has two shapes:
      //   - non-labour passes an array into categories
      //   - labour passes a singular category
      // and either could be missing if the user took an unusual path
      // (deep-link, quick-action, etc.). Empty strings inside the array
      // are filtered before joining.
      // Phase: matching — send stable category IDs to the backend.
      // CategorySelection now emits IDs into pendingInquiry.categories;
      // the labour branch still carries singular categoryId for the
      // chosen labour subType.
      const categoryIds: string[] = isLabour
        ? pendingInquiry.categoryId
          ? [pendingInquiry.categoryId]
          : []
        : pendingInquiry.categories?.filter(Boolean) || [];

      if (categoryIds.length === 0) {
        alert(
          "We couldn't read a category for this inquiry. Go back to the categories step, pick what you're inquiring about, then try again."
        );
        setIsSubmitting(false);
        return;
      }

      // Title uses the human-readable name of the most-specific picked
      // category. Resolved from CATEGORIES_DB by id; falls back to the
      // labour display label or a generic 'Inquiry' if the lookup fails.
      const lastCategoryId = categoryIds[categoryIds.length - 1];
      const lastCategoryName =
        CATEGORIES_DB.find((c) => c.id === lastCategoryId)?.name ||
        (isLabour ? pendingInquiry.category : null) ||
        'Inquiry';
      const title = pendingInquiry.attributes?.brand
        ? `${pendingInquiry.attributes.brand} ${pendingInquiry.attributes.model || ''} Request`
        : `${lastCategoryName} Request`;

      // Merge the payment receipt back into preferences so the backend can
      // bill, audit, and enforce the auto-close cap.
      const preferencesWithPayment = {
        ...(pendingInquiry.preferences || {}),
        payment: {
          method: payment.method,
          provider: payment.provider,
          amount: payment.amount,
          paidAt: new Date().toISOString(),
        },
      };

      const hasCoords =
        locationData.latitude != null && locationData.longitude != null;
      const inquiryData: CreateInquiryPayload = {
        title,
        description: pendingInquiry.attributes?.description || 'No description provided.',
        items: JSON.stringify([]),
        categoryIds,
        location: `${locationData.city}, ${locationData.province}`,
        province: locationData.province,
        city: locationData.city,
        status: 'OPEN',
        preferences: JSON.stringify(preferencesWithPayment),
        attributes: JSON.stringify(pendingInquiry.attributes || {}),
        processType: pendingInquiry.processType || 'STANDARD',
        ...(hasCoords && {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          radius: locationData.radius ?? 5,
        }),
      };

      await createInquiry(inquiryData);
      console.log('✅ Inquiry created after payment:', inquiryData.title, payment);
      refreshInquiries();

      setPendingInquiry({ items: [] });
      handleTabChange('inquiry-success');
    } catch (error) {
      console.error('Error creating inquiry:', error);
      alert('Payment cleared but the inquiry failed to publish. Please contact support.');
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
          // pendingInquiry.categories[0] is the stable category ID
          // (e.g. 'mobile-phones-repair'), not the display name. The
          // previous strict `cat.name === rawCategoryName` match
          // never resolved repair / variant categories and silently
          // fell through to GENERIC_FALLBACK_SCHEMA — which is the
          // buy-flavoured form, wrong for repair inquiries.
          // getCategorySchema accepts both id and name.
          schema = getCategorySchema(rawCategoryName || '');
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
            categoryType={categoryType as any}
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
      case 'inquiry-payment': {
        const fee = Number(pendingInquiry.preferences?.quoteFee ?? 10);
        const quoteCount = Number(pendingInquiry.preferences?.quoteCount ?? 5);
        return (
          <InquiryPayment
            amount={fee}
            quoteCount={quoteCount}
            onBack={() => handleTabChange('location-details')}
            onComplete={handlePaymentComplete}
            onTopUp={() => handleTabChange('financial')}
          />
        );
      }
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
    'inquiry-payment',
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
                refreshQuotes();
              } catch (error) {
                alert('Failed to delete inquiry');
              }
            }
            setInquiryToDelete(null);
          }}
          onCancel={() => setInquiryToDelete(null)}
        />
        <ConfirmationModal
          isOpen={!!quoteToDelete}
          title="Delete Quotation"
          message="Are you sure you want to delete this quotation? This action will hide it from your dashboard."
          onConfirm={async () => {
            if (quoteToDelete?.id) {
              try {
                // Use archive instead of delete to avoid 403 Forbidden errors
                // as the backend restricts deletion to the quote owner (provider)
                await archiveQuote(quoteToDelete.id);
                refreshQuotes();
                if (activeTab === 'quote_details') {
                  handleTabChange('home');
                }
              } catch (error) {
                alert('Failed to delete quotation');
              }
            }
            setQuoteToDelete(null);
          }}
          onCancel={() => setQuoteToDelete(null)}
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
