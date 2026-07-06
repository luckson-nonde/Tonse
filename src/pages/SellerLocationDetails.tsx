import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LocationDetails from '../components/LocationDetails';
import { useAuth } from '../AuthContext';
import { useConsentGate } from '../hooks/useConsentGate';
import ConsentModal from '../components/consent/ConsentModal';

export default function SellerLocationDetails() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const consent = useConsentGate('location');

  const handleComplete = async (locationData: { 
    province: string; 
    city: string; 
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => {
    try {
      const locationStr = locationData.latitude && locationData.longitude 
        ? `GPS: ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
        : `${locationData.city}, ${locationData.province}${locationData.address ? ` (${locationData.address})` : ''}`;
      
      await updateUser({
        location: locationStr,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      });
      navigate('/seller/categories');
    } catch (err) {
      console.error('Failed to save location:', err);
      alert('Failed to save location. Please try again.');
    }
  };

  return (
    <>
      <ConsentModal
        open={consent.needsConsent}
        configKey="location"
        scope="screen"
        onConsent={consent.grant}
        onBack={() => { consent.dismiss(); navigate(`/register?role=${user?.role || 'SELLER'}`); }}
      />
      <AuthLayout
        title="Business Location"
        titleClassName="text-2xl font-normal"
        subtitle="Provide your physical business address to help buyers find you."
        headerSubtitle="Seller Onboarding"
        maxWidth="max-w-[700px]"
        footerText={
          <p className="text-[10px] font-normal text-brand-yellow/60">
            TONSE MARKETPLACE ONBOARDING © 2026
          </p>
        }
        onBack={() => navigate(`/register?role=${user?.role || 'SELLER'}`)}
      >
        <LocationDetails
          onComplete={handleComplete}
          submitLabel="Next: Categories →"
          showRadius={false}
          isStandalone={false}
        />
      </AuthLayout>
    </>
  );
}
