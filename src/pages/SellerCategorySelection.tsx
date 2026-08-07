import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import CategorySelection from '../components/CategorySelection';
import { useAuth } from '../AuthContext';
import Button from '../components/Button';

export default function SellerCategorySelection() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isViewingSubcategories, setIsViewingSubcategories] = useState(false);
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
      title={isViewingSubcategories ? null : "Business Categories"}
      titleClassName="text-2xl font-normal"
      subtitle={isViewingSubcategories ? null : "Select the categories that best describe your business products or services."}
      headerSubtitle="Seller Onboarding"
      maxWidth="max-w-[700px]"
      footerText={
        <p className="text-[10px] font-normal text-brand-yellow/60 uppercase tracking-[0.2em]">
          NYUWE ZAMBIA MARKETPLACE ONBOARDING © 2026
        </p>
      }
      onBack={isViewingSubcategories ? undefined : () => navigate('/seller/location')}
    >
      <CategorySelection 
        onComplete={handleComplete} 
        onChange={setSelectedCategories}
        submitLabel="Next: Verification →"
        hideHeader={isViewingSubcategories}
        hideSubmitButton={isViewingSubcategories}
        role={user?.role}
        initialSelectedIds={user?.categories}
        isStandalone={false}
        onSubcategoryViewChange={setIsViewingSubcategories}
      />
      {!isViewingSubcategories && (
        <div className="mt-10 flex justify-center">
          <Button
            onClick={() => handleComplete(selectedCategories)}
            disabled={selectedCategories.length === 0}
            className="w-full max-w-md py-4 text-lg font-bold"
          >
            Continue to Registration
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
