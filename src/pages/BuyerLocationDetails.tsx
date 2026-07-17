import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import LocationDetails from '../components/LocationDetails';
import { useAuth } from '../AuthContext';

export default function BuyerLocationDetails() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const handleComplete = async (locationData: {
    province: string;
    city: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  }) => {
    try {
      const locationStr =
        locationData.latitude && locationData.longitude
          ? `GPS: ${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
          : `${locationData.city}, ${locationData.province}${locationData.address ? ` (${locationData.address})` : ''}`;

      await updateUser({
        location: locationStr,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        country: 'Zambia',
        province: locationData.province,
        city: locationData.city,
        area: locationData.address,
      });
      navigate('/buyer');
    } catch (err) {
      console.error('Failed to save location:', err);
      alert('Failed to save location. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Your Location"
      titleClassName="text-2xl font-normal"
      subtitle="Help us understand where you are located so we can connect you with the best providers near you."
      headerSubtitle="Complete Your Profile"
      maxWidth="max-w-[700px]"
      footerText={
        <p className="text-[10px] font-normal text-brand-yellow/60">TONSE MARKETPLACE © 2026</p>
      }
      onBack={() => navigate(`/register?role=BUYER`)}
    >
      <LocationDetails
        onComplete={handleComplete}
        submitLabel="Complete Registration →"
        showRadius={false}
        showGps={false}
        isStandalone={false}
      />
    </AuthLayout>
  );
}
