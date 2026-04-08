import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import CategorySelection from '../components/CategorySelection';
import { useAuth } from '../AuthContext';

export default function SellerCategorySelection() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const handleComplete = async (selectedCategories: string[]) => {
    try {
      await updateUser({
        categories: selectedCategories
      });
      navigate('/business-verification');
    } catch (err) {
      console.error('Failed to save categories:', err);
      alert('Failed to save categories. Please try again.');
    }
  };

  return (
    <AuthLayout 
      title="Business Categories" 
      titleClassName="text-2xl font-normal"
      subtitle="Select the categories that best describe your business products or services."
      headerSubtitle="Seller Onboarding"
      maxWidth="max-w-[700px]"
      footerText={
        <p className="text-[10px] font-normal text-brand-yellow/60 uppercase tracking-[0.2em]">
          TONSE MARKETPLACE ONBOARDING © 2026
        </p>
      }
      onBack={() => navigate('/seller/location')}
    >
      <CategorySelection 
        onComplete={handleComplete} 
        submitLabel="Next: Verification →"
        hideHeader
        role={user?.role}
        initialSelectedIds={user?.categories}
        isStandalone={false}
      />
    </AuthLayout>
  );
}
