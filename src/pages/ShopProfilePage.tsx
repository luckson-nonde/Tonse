import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../db';
import { 
  User, Mail, Lock, Store, MapPin, Camera, 
  Save, Loader2, CheckCircle, Navigation, Image as ImageIcon,
  ArrowLeft, Phone, FileText, X, Facebook, Video, MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../DashboardContext';

export default function ShopProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const { setActiveTab } = useDashboard();

  const handleTabClick = useCallback((tab: string) => {
    setActiveTab(tab);
    const basePath = user?.role === 'BUYER' ? '/buyer' : '/provider';
    if (tab === 'home') {
      navigate(basePath);
    } else {
      navigate(`${basePath}/${tab}`);
    }
  }, [setActiveTab, navigate, user?.role]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isLocating, setIsLocating] = useState(false);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    password: '',
    confirmPassword: '',
    logo: user?.logo || '',
    coverImage: user?.coverImage || '',
    latitude: user?.latitude || 0,
    longitude: user?.longitude || 0,
    storePhotos: {
      front: user?.storePhotos?.front || '',
      interior: user?.storePhotos?.interior || ''
    },
    facebookLink: user?.facebookLink || '',
    tiktokLink: user?.tiktokLink || '',
    whatsappLink: user?.whatsappLink || ''
  });

  useEffect(() => {
    setActiveTab('profile');
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        password: '',
        confirmPassword: '',
        logo: user.logo || '',
        coverImage: user.coverImage || '',
        latitude: user.latitude || 0,
        longitude: user.longitude || 0,
        storePhotos: {
          front: user.storePhotos?.front || '',
          interior: user.storePhotos?.interior || ''
        },
        facebookLink: user.facebookLink || '',
        tiktokLink: user.tiktokLink || '',
        whatsappLink: user.whatsappLink || ''
      });
    }

    // Check GPS permission status
    const nav = navigator as any;
    if (nav.permissions) {
      nav.permissions.query({ name: 'geolocation' }).then((result: any) => {
        setGpsStatus(result.state);
        result.onchange = () => {
          setGpsStatus(result.state);
        };
      });
    } else if (!nav.geolocation) {
      setGpsStatus('unsupported');
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (field: 'logo' | 'coverImage' | 'front' | 'interior', value: string) => {
    if (field === 'front' || field === 'interior') {
      setFormData(prev => ({
        ...prev,
        storePhotos: { ...prev.storePhotos, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const requestLocation = () => {
    setShowGpsPrompt(false);
    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setGpsStatus('granted');
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        switch(err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Please enable GPS in your browser settings.");
            setGpsStatus('denied');
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable. Ensure your device GPS is on.");
            break;
          case err.TIMEOUT:
            setError("The request to get user location timed out.");
            break;
          default:
            setError("An unknown error occurred while retrieving location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setGpsStatus('unsupported');
      return;
    }

    if (gpsStatus === 'granted') {
      requestLocation();
    } else {
      setShowGpsPrompt(true);
    }
  };

  const handleBack = () => {
    handleTabClick('home');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsSaving(false);
      return;
    }

    try {
      const updates: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      if (user?.role !== 'BUYER' && !isStaff) {
        updates.location = formData.location;
        updates.coverImage = formData.coverImage;
        updates.latitude = formData.latitude;
        updates.longitude = formData.longitude;
        updates.storePhotos = formData.storePhotos;
        updates.facebookLink = formData.facebookLink;
        updates.tiktokLink = formData.tiktokLink;
        updates.whatsappLink = formData.whatsappLink;
      }

      // Logo is used as profile picture for buyers/staff and shop logo for others
      updates.logo = formData.logo;

      if (formData.password) {
        updates.password = formData.password;
      }

      await updateUser(updates);

      // Also update the shop entry in the shops table - Only for non-buyers and non-staff
      if (user?.role !== 'BUYER' && !isStaff && user.id) {
        const effectiveProviderId = user.parentProviderId || user.id;
        const shop = await db.shops.where('providerId').equals(effectiveProviderId).first();
        if (shop && shop.id) {
          await db.shops.update(shop.id, {
            name: formData.name,
            logo: formData.logo,
            coverImage: formData.coverImage,
            location: formData.location,
            latitude: formData.latitude,
            longitude: formData.longitude,
            facebookLink: formData.facebookLink,
            tiktokLink: formData.tiktokLink,
            whatsappLink: formData.whatsappLink,
          });
        } else {
          // Create shop entry if it doesn't exist
          await db.shops.add({
            providerId: user.id,
            name: formData.name,
            logo: formData.logo,
            coverImage: formData.coverImage || 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&q=80',
            description: 'Shop on TONSE Marketplace',
            category: user.categories?.[0] || 'General',
            location: formData.location,
            latitude: formData.latitude,
            longitude: formData.longitude,
            facebookLink: formData.facebookLink,
            tiktokLink: formData.tiktokLink,
            whatsappLink: formData.whatsappLink,
            rating: 5,
            reviewCount: 0,
            isVerified: false,
            registrationDate: Date.now(),
            registrationDocuments: [],
            proofPhotos: []
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const ImageUpload = ({ label, value, onChange, icon: Icon }: any) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit for base64 storage
          setError("Image size should be less than 2MB");
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="space-y-2">
        <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">{label}</label>
        <div className="relative group">
          <div 
            onClick={() => document.getElementById(`file-input-${label}`)?.click()}
            className="w-full h-32 rounded-[10px] bg-[#fffef9] border-2 border-dashed border-[#e8e0d0] flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-[#C9973A]/30 cursor-pointer"
          >
            {value ? (
              <img src={value} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>
                <Icon className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Click to upload image</span>
              </>
            )}
            <input
              id={`file-input-${label}`}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {value && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="absolute top-2 right-2 p-1 bg-white/80 backdrop-blur-sm rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const isStaff = user?.role === 'PROVIDER_STAFF';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[26px] font-serif font-bold text-[#1e293b] leading-tight">
          {user?.role === 'BUYER' ? 'My Profile' : isStaff ? 'Personal Profile' : 'Shop Profile'}
        </h1>
        <p className="text-[14px] font-sans text-[#64748b] mt-1">
          {user?.role === 'BUYER' ? 'Manage your account and personal details' : isStaff ? 'Manage your personal account details' : 'Manage your account and shop details'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GPS Prompt Modal */}
        {showGpsPrompt && (
          <div className="fixed inset-0 bg-[#1a1612]/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col">
              <div className="p-8 text-center overflow-y-auto flex-1 scrollbar-hide">
                <div className="w-16 h-16 bg-[#d49b35]/10 rounded-2xl flex items-center justify-center text-[#d49b35] mx-auto mb-6">
                  <Navigation className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1a1612] mb-2">Enable GPS Location</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  To automatically pinpoint your shop on the map, we need access to your device's GPS. This helps buyers find your shop more easily.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="w-full bg-[#1a1612] text-white py-4 rounded-2xl font-bold shadow-lg shadow-black/10 hover:bg-black transition-all"
                  >
                    Allow Location Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGpsPrompt(false)}
                    className="w-full bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-100 hover:text-[#1a1612] transition-all"
                  >
                    Enter Manually
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Photo */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
            <h2 className="text-[18px] font-serif font-bold text-[#1e293b]">
              {user?.role === 'BUYER' ? 'Profile Photo' : 'Shop Logo'}
            </h2>
          </div>
          
          <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm">
            <div className="max-w-xs">
              <ImageUpload
                label={user?.role === 'BUYER' ? 'Profile Picture' : 'Shop Logo'}
                value={formData.logo}
                onChange={(val: string) => handlePhotoChange('logo', val)}
                icon={User}
              />
              <p className="mt-3 text-[11px] text-[#9ca3af] font-medium leading-relaxed">
                {user?.role === 'BUYER' 
                  ? 'Upload a clear photo of yourself for better recognition.' 
                  : 'Upload your business logo to build brand trust.'}
              </p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
            <h2 className="text-[18px] font-serif font-bold text-[#1e293b]">Account Information</h2>
          </div>

          <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="+260..."
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Links - Only for Sellers/Suppliers (Not for Staff) */}
        {user?.role !== 'BUYER' && !isStaff && (
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 hover:border-[#d49b35]/30 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#d49b35]/10 rounded-xl flex items-center justify-center text-[#d49b35]">
                <Facebook className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1a1612]">Social Media & Contact</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Facebook Page/Profile</label>
                <div className="relative group">
                  <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#d49b35] transition-colors" />
                  <input
                    type="url"
                    name="facebookLink"
                    value={formData.facebookLink}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1612] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                    placeholder="https://facebook.com/yourbusiness"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TikTok Profile</label>
                <div className="relative group">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#d49b35] transition-colors" />
                  <input
                    type="url"
                    name="tiktokLink"
                    value={formData.tiktokLink}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1612] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                    placeholder="https://tiktok.com/@yourbusiness"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp Link/Number</label>
                <div className="relative group">
                  <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#d49b35] transition-colors" />
                  <input
                    type="text"
                    name="whatsappLink"
                    value={formData.whatsappLink}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1612] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                    placeholder="https://wa.me/260..."
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Security */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
            <h2 className="text-[18px] font-serif font-bold text-[#1e293b]">Security</h2>
          </div>

          <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">New Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="Leave blank to keep current"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shop Details - Only for Sellers/Suppliers (Not for Staff) */}
        {user?.role !== 'BUYER' && !isStaff && (
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 hover:border-[#d49b35]/30 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#d49b35]/10 rounded-xl flex items-center justify-center text-[#d49b35]">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#1a1612]">Shop Details</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shop Location (Text)</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#d49b35] transition-colors" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-[#1a1612] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                    placeholder="e.g. Lusaka, Zambia"
                    required
                  />
                </div>
              </div>

              <div className="space-y-6">
                <ImageUpload 
                  label="Cover Image" 
                  value={formData.coverImage} 
                  onChange={(val: string) => handlePhotoChange('coverImage', val)}
                  icon={Camera}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUpload 
                  label="Store Front Photo" 
                  value={formData.storePhotos.front} 
                  onChange={(val: string) => handlePhotoChange('front', val)}
                  icon={Store}
                />
                <ImageUpload 
                  label="Store Interior Photo" 
                  value={formData.storePhotos.interior} 
                  onChange={(val: string) => handlePhotoChange('interior', val)}
                  icon={FileText}
                />
              </div>
            </div>
          </section>
        )}

        {/* GPS Pinpointing - Only for Sellers/Suppliers (Not for Staff) */}
        {user?.role !== 'BUYER' && !isStaff && (
          <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200 hover:border-[#d49b35]/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#d49b35]/10 rounded-xl flex items-center justify-center text-[#d49b35]">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1a1612]">GPS Pinpointing</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      gpsStatus === 'granted' ? 'bg-emerald-500' : 
                      gpsStatus === 'denied' ? 'bg-rose-500' : 'bg-[#d49b35]'
                    }`}></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      GPS Status: {gpsStatus === 'granted' ? 'Active' : gpsStatus === 'denied' ? 'Disabled' : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isLocating}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                  gpsStatus === 'denied' 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100' 
                    : 'bg-[#1a1612] text-white hover:bg-black hover:shadow-md'
                } disabled:opacity-50`}
              >
                {isLocating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {gpsStatus === 'denied' ? 'Enable GPS Access' : isLocating ? 'Locating...' : 'Get Current Location'}
              </button>
            </div>

            {gpsStatus === 'denied' && (
               <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-900">Location Access Blocked</p>
                  <p className="text-xs text-rose-600 leading-relaxed mt-1">
                    To automatically obtain coordinates, please click the lock icon in your browser's address bar and set Location to "Allow".
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                <input
                  type="number"
                  step="any"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-[#1a1612] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                  placeholder="0.000000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                <input
                  type="number"
                  step="any"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-[#1a1612] focus:outline-none focus:ring-2 focus:ring-[#d49b35]/20 focus:border-[#d49b35] transition-all"
                  placeholder="0.000000"
                />
              </div>
            </div>

            {formData.latitude !== 0 && formData.longitude !== 0 && (
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Location Preview</p>
                <div className="aspect-video rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-200">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${formData.latitude},${formData.longitude}&hl=es&z=14&amp;output=embed`}
                  ></iframe>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-[#1a1612] text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-black/10 hover:bg-black hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
          
          {saveSuccess && (
            <div className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle className="w-5 h-5" />
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 px-6 py-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl font-bold text-sm">
              <Loader2 className="w-5 h-5" />
              {error}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
