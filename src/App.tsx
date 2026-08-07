import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider, useAuth } from './AuthContext';
import { useLiteMotion } from './hooks/useLiteMotion';
import { useLandingPageEnabled } from './hooks/useLandingPageEnabled';
import { getHomePathForRole } from './utils/roleHome';
import { resolveRootDestination } from './utils/rootDestination';
import { DashboardProvider } from './DashboardContext';
import { BackgroundModeProvider } from './BackgroundModeContext';
import { CategoryAvailabilityProvider } from './services/categories/availability';
import { ErrorBoundary } from './components/ErrorBoundary';
import PageTransition from './components/PageTransition';
import FloatingHub from './components/FloatingHub';
import InstallAppBanner from './components/InstallAppBanner';
import OfflineBanner from './components/OfflineBanner';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import RoleSelection from './pages/RoleSelection';
import Register from './pages/Register';
import LabourRegister from './pages/LabourRegister';
import PromoterSignup from './pages/PromoterSignup';
import PromoterDashboard from './pages/PromoterDashboard';
// Phase 2: LabourDashboard import removed — /labour/* now redirects to /provider.
import BusinessVerification from './pages/BusinessVerification';
import SellerCategorySelection from './pages/SellerCategorySelection';
import SellerLocationDetails from './pages/SellerLocationDetails';
import BuyerLocationDetails from './pages/BuyerLocationDetails';
import CompanyDocuments from './pages/CompanyDocuments';
import StoreVerification from './pages/StoreVerification';
import VerificationPending from './pages/VerificationPending';
import DashboardLayout from './components/DashboardLayout';
import SchedulePage from './pages/SchedulePage';
import BuyerDashboard from './pages/BuyerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import FinancialPage from './pages/FinancialPage';
import QuoteDetailsPage from './pages/QuoteDetailsPage';
import CollectionCodePage from './pages/CollectionCodePage';
import FinancingRequestPage from './pages/FinancingRequestPage';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import ArchivedQuotesPage from './pages/ArchivedQuotesPage';
import ShopDetailsPage from './pages/ShopDetailsPage';
import ShopProductsPage from './pages/ShopProductsPage';
import SuppliersPage from './pages/SuppliersPage';
import ShopProfilePage from './pages/ShopProfilePage';
import BuyerProfilePage from './pages/BuyerProfilePage';
import VenueSpacesManager from './pages/VenueSpacesManager';
import ForcePasswordChange from './pages/ForcePasswordChange';
import AuditTrailPage from './pages/AuditTrailPage';
import ArchivedLeadsPage from './pages/ArchivedLeadsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import DiscoverPage from './pages/DiscoverPage';
import PublicShopProfile from './pages/PublicShopProfile';

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && window.location.pathname !== '/force-password-change')
    return <Navigate to="/force-password-change" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  // Consulted for EVERY visitor now, signed in or not — the landing page is
  // the front door whenever an admin has it switched on.
  const { enabled: landingEnabled, isLoading: landingLoading } = useLandingPageEnabled();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let onboarded = false;
  try {
    if (typeof window !== 'undefined') {
      onboarded = localStorage.getItem('tonse_onboarded') === 'true';
    }
  } catch (e) {
    console.error('LocalStorage access failed', e);
  }

  // The policy itself lives in resolveRootDestination — one readable rule list
  // that can be exercised without a browser. Headline: when an admin has the
  // landing page on, "/" is the landing page for everyone, every time.
  const destination = resolveRootDestination({
    authLoading: isLoading,
    user,
    landingEnabled,
    landingLoading,
    isMobile,
    onboarded,
  });

  if (destination.kind === 'wait')
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );

  return <Navigate to={destination.to} replace />;
}

/**
 * Gates /discover and /discover/:id on the same landingPageEnabled switch
 * RootRedirect checks — so direct navigation to either URL is blocked too
 * when an admin has turned the feature off, not just the "/" entry point.
 * Checks ONLY the flag, not auth state: a logged-in user can freely browse
 * Discover while the flag is on (see HeaderProfileMenu's "Browse Shops").
 * When the flag is off, a logged-in visitor bounces to their own dashboard
 * (never to /login — they already have a session); a guest bounces to
 * /login exactly as today.
 */
function LandingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { enabled, isLoading: landingLoading } = useLandingPageEnabled();

  // Render as soon as we know it's on — same asymmetry as RootRedirect. Waiting
  // on the flag here too would put a spinner in front of the landing page on
  // every single visit, which is exactly the sluggishness that made it feel
  // like it wasn't reliably there.
  if (enabled) return <>{children}</>;

  if (isLoading || landingLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );

  return <Navigate to={user ? getHomePathForRole(user) : '/login'} replace />;
}

export default function App() {
  // Touch devices get instant (non-transform) animations app-wide: budget
  // Android GPUs ghost stale raster tiles under framer-motion's composited
  // transforms. See src/hooks/useLiteMotion.ts for the full rationale.
  // Elsewhere 'user' defers to the OS prefers-reduced-motion setting. Note
  // this only strips positional/transform keys, never opacity — full
  // disabling of the page transitions is handled inside PageTransition.
  const lite = useLiteMotion();
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
        <DashboardProvider>
          <CategoryAvailabilityProvider>
          <MotionConfig reducedMotion={lite ? 'always' : 'user'}>
          <BackgroundModeProvider>
          <Router>
            <Routes>
              {/* Every route's PageTransition carries a unique static
                  transitionKey: React Router reuses same-typed elements
                  across sibling routes (no keying), so without it the
                  motion.div never remounts and no enter animation plays. */}
              <Route path="/onboarding" element={<PageTransition transitionKey="onboarding"><Onboarding /></PageTransition>} />
              <Route path="/login" element={<PageTransition transitionKey="login"><Login /></PageTransition>} />
              <Route path="/role-selection" element={<PageTransition transitionKey="role-selection"><RoleSelection /></PageTransition>} />
              <Route path="/register" element={<PageTransition transitionKey="register"><Register /></PageTransition>} />
              <Route path="/register/labour" element={<PageTransition transitionKey="register-labour"><LabourRegister /></PageTransition>} />
              {/* Promoter programme. /promote is deliberately UNLISTED — it
                  appears in no nav, sitemap, or link; the URL travels
                  privately to NDA'd artists (the invite key is the real
                  gate, validated server-side). */}
              <Route path="/promote" element={<PageTransition transitionKey="promote"><PromoterSignup /></PageTransition>} />
              <Route path="/promoter" element={<Navigate to="/promoter/dashboard" replace />} />
              <Route
                path="/promoter/:tab"
                element={
                  <ProtectedRoute allowedRoles={['PROMOTER']}>
                    {/* Tab switches animate inside the shell (same reasoning as
                        /admin/:tab) — PageTransition would remount the whole
                        sidebar on every tab click. */}
                    <PromoterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/register/company-documents" element={<PageTransition transitionKey="company-documents"><CompanyDocuments /></PageTransition>} />
              <Route path="/business-verification" element={<PageTransition transitionKey="business-verification"><BusinessVerification /></PageTransition>} />
              <Route path="/seller/categories" element={<PageTransition transitionKey="seller-categories"><SellerCategorySelection /></PageTransition>} />
              <Route path="/seller/location" element={<PageTransition transitionKey="seller-location"><SellerLocationDetails /></PageTransition>} />
              <Route path="/store-verification" element={<PageTransition transitionKey="store-verification"><StoreVerification /></PageTransition>} />
              <Route path="/verification-pending" element={<PageTransition transitionKey="verification-pending"><VerificationPending /></PageTransition>} />
              <Route
                path="/force-password-change"
                element={
                  <ProtectedRoute>
                    <PageTransition transitionKey="force-password-change">
                      <ForcePasswordChange />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              {/* Public shop directory — gated by LandingGate on the
                  site_settings.landingPageEnabled admin switch. Reachable by
                  guests AND logged-in users (see HeaderProfileMenu's "Browse
                  Shops"); ProtectedRoute is deliberately NOT used here. */}
              <Route
                path="/discover"
                element={
                  <LandingGate>
                    <PageTransition transitionKey="discover">
                      <DiscoverPage />
                    </PageTransition>
                  </LandingGate>
                }
              />
              <Route
                path="/discover/:id"
                element={
                  <LandingGate>
                    <PageTransition transitionKey="discover-shop">
                      <PublicShopProfile />
                    </PageTransition>
                  </LandingGate>
                }
              />
              <Route path="/" element={<RootRedirect />} />
              <Route path="/buyer" element={<Navigate to="/buyer/dashboard" replace />} />
              <Route
                path="/buyer/:tab/:inquiryId"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <BuyerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/:tab"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <BuyerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/quote-details"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <PageTransition transitionKey="quote-details">
                      <QuoteDetailsPage />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/financing"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="financing">
                        <FinancingRequestPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/collection-code/:id"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <PageTransition transitionKey="collection-code">
                      <CollectionCodePage />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/payment"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <PageTransition transitionKey="payment">
                      <PaymentPage />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/payment-success"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <PageTransition transitionKey="payment-success">
                      <PaymentSuccessPage />
                    </PageTransition>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/archived"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="buyer-archived">
                        <ArchivedQuotesPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/shop-details"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="shop-details">
                        <ShopDetailsPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/shop-products"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="shop-products">
                        <ShopProductsPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/suppliers"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="buyer-suppliers">
                        <SuppliersPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buyer/profile"
                element={
                  <ProtectedRoute allowedRoles={['BUYER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="buyer-profile">
                        <BuyerProfilePage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schedule"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <PageTransition transitionKey="schedule">
                        <SchedulePage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/provider" element={<Navigate to="/provider/home" replace />} />
              <Route
                path="/provider/:tab"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'SELLER',
                      'SUPPLIER',
                      'SERVICE_PROVIDER',
                      'ENTERTAINMENT',
                      'EVENTS',
                      'PROVIDER_STAFF',
                    ]}
                  >
                    <DashboardLayout>
                      {/* No PageTransition here on purpose: every provider
                          view funnels through DynamicAccountRenderer, whose
                          own wrapper animates on mount and per tab switch —
                          and /provider/:tab must keep ProviderDashboard
                          mounted across tab param changes. */}
                      <ProviderDashboard />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/suppliers"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'SELLER',
                      'SUPPLIER',
                      'SERVICE_PROVIDER',
                      'ENTERTAINMENT',
                      'EVENTS',
                      'PROVIDER_STAFF',
                    ]}
                  >
                    <DashboardLayout>
                      <PageTransition transitionKey="provider-suppliers">
                        <SuppliersPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/provider/profile"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'SELLER',
                      'SUPPLIER',
                      'SERVICE_PROVIDER',
                      'ENTERTAINMENT',
                      'EVENTS',
                      'PROVIDER_STAFF',
                    ]}
                  >
                    <DashboardLayout>
                      <PageTransition transitionKey="provider-profile">
                        <ShopProfilePage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/venue-spaces"
                element={
                  // Phase 2: gate by SELLER role — businessType-driven UI
                  // (the venue-spaces nav item already filters by
                  // businessTypes: ['EVENTS'] + categoryFilter: ['event venues'])
                  // does the per-business filtering downstream.
                  <ProtectedRoute allowedRoles={['SELLER']}>
                    <DashboardLayout>
                      <PageTransition transitionKey="venue-spaces">
                        <VenueSpacesManager />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/audit-trail"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'SELLER',
                      'SUPPLIER',
                      'SERVICE_PROVIDER',
                      'ENTERTAINMENT',
                      'EVENTS',
                      'PROVIDER_STAFF',
                    ]}
                  >
                    <DashboardLayout>
                      <PageTransition transitionKey="audit-trail">
                        <AuditTrailPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/archived-leads"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'SELLER',
                      'SUPPLIER',
                      'SERVICE_PROVIDER',
                      'ENTERTAINMENT',
                      'EVENTS',
                      'PROVIDER_STAFF',
                    ]}
                  >
                    <DashboardLayout>
                      <PageTransition transitionKey="archived-leads">
                        <ArchivedLeadsPage />
                      </PageTransition>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              {/* Phase 2: LABOUR is no longer a role — labour users now land
                  in the SERVICE_PROVIDER bucket and use /provider. /labour/*
                  redirects keep any old links / bookmarks alive. */}
              <Route path="/labour" element={<Navigate to="/provider" replace />} />
              <Route path="/labour/:tab" element={<Navigate to="/provider" replace />} />
              <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
              <Route
                path="/admin/:tab"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
            <OfflineBanner />
            {/* Outside <Routes> so the install offer reaches VISITORS on the
                login/register/discover pages too — FloatingHub's copy of it
                only ever appears once signed in and minimized. */}
            <InstallAppBanner />
            <FloatingHub />
          </Router>
          </BackgroundModeProvider>
          </MotionConfig>
          </CategoryAvailabilityProvider>
        </DashboardProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  );
}
