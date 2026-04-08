import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import Register from './pages/Register';
import BusinessVerification from './pages/BusinessVerification';
import SellerCategorySelection from './pages/SellerCategorySelection';
import SellerLocationDetails from './pages/SellerLocationDetails';
import StoreVerification from './pages/StoreVerification';
import VerificationPending from './pages/VerificationPending';
import DashboardLayout from './components/DashboardLayout';
import SchedulePage from './pages/SchedulePage';
import BuyerDashboard from './pages/BuyerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';
import FinancialPage from './pages/FinancialPage';
import QuoteDetailsPage from './pages/QuoteDetailsPage';
import CollectionCodePage from './pages/CollectionCodePage';
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

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword && window.location.pathname !== '/force-password-change') return <Navigate to="/force-password-change" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/force-password-change" replace />;
  if (user.role === 'BUYER') return <Navigate to="/buyer" replace />;
  return <Navigate to="/provider" replace />;
}

import { DashboardProvider } from './DashboardContext';

export default function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/register" element={<Register />} />
            <Route path="/business-verification" element={<BusinessVerification />} />
            <Route path="/seller/categories" element={<SellerCategorySelection />} />
            <Route path="/seller/location" element={<SellerLocationDetails />} />
            <Route path="/store-verification" element={<StoreVerification />} />
            <Route path="/verification-pending" element={<VerificationPending />} />
            <Route path="/force-password-change" element={
              <ProtectedRoute>
                <ForcePasswordChange />
              </ProtectedRoute>
            } />
            <Route path="/" element={<RootRedirect />} />
            <Route path="/buyer" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <DashboardLayout>
                  <BuyerDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buyer/financial" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <FinancialPage />
              </ProtectedRoute>
            } />
            <Route path="/buyer/quote-details" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <QuoteDetailsPage />
              </ProtectedRoute>
            } />
            <Route path="/buyer/collection-code/:id" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <CollectionCodePage />
              </ProtectedRoute>
            } />
            <Route path="/buyer/payment" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <PaymentPage />
              </ProtectedRoute>
            } />
            <Route path="/buyer/payment-success" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <PaymentSuccessPage />
              </ProtectedRoute>
            } />
            <Route path="/buyer/archived" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <DashboardLayout>
                  <ArchivedQuotesPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buyer/shop-details" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <DashboardLayout>
                  <ShopDetailsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buyer/shop-products" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <DashboardLayout>
                  <ShopProductsPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buyer/suppliers" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <DashboardLayout>
                  <SuppliersPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buyer/profile" element={
              <ProtectedRoute allowedRoles={['BUYER']}>
                <DashboardLayout>
                  <BuyerProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/schedule" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SchedulePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/provider" element={
              <ProtectedRoute allowedRoles={['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS', 'PROVIDER_STAFF']}>
                <DashboardLayout>
                  <ProviderDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/provider/suppliers" element={
              <ProtectedRoute allowedRoles={['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS', 'PROVIDER_STAFF']}>
                <DashboardLayout>
                  <SuppliersPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/provider/financial" element={
              <ProtectedRoute allowedRoles={['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS', 'PROVIDER_STAFF']}>
                <FinancialPage />
              </ProtectedRoute>
            } />
            <Route path="/provider/profile" element={
              <ProtectedRoute allowedRoles={['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS', 'PROVIDER_STAFF']}>
                <DashboardLayout>
                  <ShopProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/provider/venue-spaces" element={
              <ProtectedRoute allowedRoles={['EVENTS', 'PROVIDER_STAFF']}>
                <DashboardLayout>
                  <VenueSpacesManager />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/provider/audit-trail" element={
              <ProtectedRoute allowedRoles={['SELLER', 'SUPPLIER', 'SERVICE_PROVIDER', 'ENTERTAINMENT', 'EVENTS', 'PROVIDER_STAFF']}>
                <DashboardLayout>
                  <AuditTrailPage />
                </DashboardLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
}
