import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../services/api/database';
import { User, Save, Loader2, CheckCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../DashboardContext';
import { getProfileSchema } from '../services/userSchemas';
import DynamicProfileForm from '../components/DynamicProfileForm';

export default function ShopProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { setActiveTab } = useDashboard();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab('profile');
  }, [setActiveTab]);

  const profileSchema = useMemo(() => {
    if (!user) return null;
    return getProfileSchema(user.role, user.subRole);
  }, [user]);

  const initialData = useMemo(() => {
    if (!user) return {};
    return {
      ...user,
      storePhotoFront: user.storePhotos?.front || '',
      storePhotoInterior: user.storePhotos?.interior || '',
      gps:
        user.latitude && user.longitude
          ? {
              latitude: user.latitude,
              longitude: user.longitude,
            }
          : undefined,
    };
  }, [user]);

  const handleProfileSubmit = async (data: any) => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updates = { ...data };

      // Handle GPS data
      if (data.gps) {
        updates.latitude = data.gps.latitude;
        updates.longitude = data.gps.longitude;
        delete updates.gps;
      }

      // Handle Store Photos mapping
      if (data.storePhotoFront || data.storePhotoInterior) {
        updates.storePhotos = {
          front: data.storePhotoFront || user?.storePhotos?.front || '',
          interior: data.storePhotoInterior || user?.storePhotos?.interior || '',
        };
        delete updates.storePhotoFront;
        delete updates.storePhotoInterior;
      }

      await updateUser(updates);

      // Update shop entry if it exists
      if (user?.role !== 'BUYER' && user?.role !== 'PROVIDER_STAFF' && user?.id) {
        const effectiveProviderId = user.parentProviderId || user.id;
        const shop = await db.shops.where('providerId').equals(effectiveProviderId).first();

        const shopUpdates = {
          name: updates.name || user.name,
          logo: updates.logo || user.logo,
          coverImage: updates.coverImage || user.coverImage,
          location: updates.location || user.location,
          latitude: updates.latitude || user.latitude,
          longitude: updates.longitude || user.longitude,
          facebookLink: updates.facebookLink || user.facebookLink,
          tiktokLink: updates.tiktokLink || user.tiktokLink,
          whatsappLink: updates.whatsappLink || user.whatsappLink,
        };

        if (shop && shop.id) {
          await db.shops.update(shop.id, shopUpdates);
        } else {
          await db.shops.add({
            providerId: typeof user.id === 'number' ? user.id : parseInt(user.id || '0', 10),
            ...shopUpdates,
            description: 'Shop on TONSE Marketplace',
            category: user.categories?.[0] || 'General',
            rating: 5,
            reviewCount: 0,
            isVerified: false,
            registrationDate: Date.now(),
            registrationDocuments: [],
            proofPhotos: [],
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      setIsUpdatingPassword(false);
      return;
    }

    try {
      await updateUser({ password: passwordData.newPassword });
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (!user || !profileSchema) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-[26px] font-serif font-bold text-brand-dark leading-tight">
          {user.role === 'BUYER'
            ? 'My Profile'
            : user.role === 'PROVIDER_STAFF'
              ? 'Personal Profile'
              : 'Shop Profile'}
        </h1>
        <p className="text-[14px] font-sans text-[#64748b] mt-1">
          {user.role === 'BUYER'
            ? 'Manage your account and personal details'
            : user.role === 'PROVIDER_STAFF'
              ? 'Manage your personal account details'
              : 'Manage your account and shop details'}
        </p>
      </div>

      <div className="space-y-8">
        {/* Profile Form */}
        <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-8 shadow-sm">
          <DynamicProfileForm
            schema={profileSchema}
            initialData={initialData}
            onSubmit={handleProfileSubmit}
            isSubmitting={isSaving}
          >
            <div className="pt-8 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-10 py-4 bg-[#C9973A] text-white rounded-full text-[15px] font-sans font-bold hover:bg-[#a37d35] transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </DynamicProfileForm>

          {saveSuccess && (
            <div className="mt-6 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle className="w-5 h-5" />
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-center justify-center gap-2 px-6 py-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl font-bold text-sm">
              <Loader2 className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>

        {/* Password Security Section */}
        <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#C9973A]/10 rounded-xl flex items-center justify-center text-[#C9973A]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-serif font-bold text-brand-dark">
                Security & Password
              </h2>
              <p className="text-[12px] text-[#9ca3af]">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="Enter new password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="submit"
                disabled={isUpdatingPassword || !passwordData.newPassword}
                className="w-full sm:w-auto px-8 py-3 bg-brand-dark text-white rounded-full text-[14px] font-sans font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdatingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Update Password
              </button>

              {passwordSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Password updated!
                </div>
              )}

              {passwordError && (
                <div className="text-rose-600 font-bold text-sm">{passwordError}</div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
