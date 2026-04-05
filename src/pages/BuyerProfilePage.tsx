import React, { useState, useEffect } from 'react';
import { User, Bell, Camera, Eye, EyeOff, Check, X, ChevronRight, MapPin, Globe, Shield, BellRing, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../components/Button';

export default function BuyerProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { setActiveTab } = useDashboard();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    setActiveTab('profile');
  }, [setActiveTab]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: '1990-01-01', // Placeholder as not in User type yet
    country: 'Zambia',
    province: 'Lusaka',
    city: 'Lusaka',
    area: 'Central Business District'
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: true
  });

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'LC';

  const handleToggleNotification = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUser({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      location: `${formData.city}, ${formData.country}`
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-serif font-bold text-[#1e293b] leading-tight">My Profile</h1>
        <p className="text-[14px] font-sans text-[#64748b] mt-1">Manage your personal information and preferences</p>
      </div>

      {/* Section 1 — PROFILE CARD */}
      <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-[84px] h-[84px] rounded-full bg-[#1e293b] flex items-center justify-center border-4 border-[#fdfaf6] shadow-md overflow-hidden">
            {user?.logo ? (
              <img src={user.logo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-[28px] font-serif font-bold text-white">{initials}</span>
            )}
          </div>
          <button className="text-[12px] font-sans font-medium text-[#C9973A] hover:underline">Change Photo</button>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
            <h2 className="text-[22px] font-serif font-bold text-[#1e293b]">{user?.name || 'Luckson C Nonde'}</h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#fdf3e3] text-[#C9973A] text-[11px] font-sans font-bold uppercase tracking-wider mx-auto md:mx-0">
              Buyer Account
            </span>
          </div>
          <p className="text-[13px] font-sans text-[#9ca3af] mb-6">Member since March 2025</p>
          
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="px-6 py-2.5 border border-[#C9973A] text-[#C9973A] rounded-full text-[13px] font-sans font-medium hover:bg-[#fdf3e3] transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>

      {/* Section 2 — PERSONAL INFORMATION */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
          <h3 className="text-[18px] font-serif font-bold text-[#1e293b]">Personal Information</h3>
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <InfoField label="Full Name" value={user?.name || 'Luckson C Nonde'} />
            <InfoField label="Email Address" value={user?.email || 'luckson@example.com'} />
            <InfoField label="Phone Number" value={user?.phone || '+260 971 234 567'} />
            <InfoField label="Date of Birth" value="January 12, 1990" />
          </div>
        </div>
      </div>

      {/* Section 3 — LOCATION DETAILS */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
          <h3 className="text-[18px] font-serif font-bold text-[#1e293b]">Location Details</h3>
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <InfoField label="Country" value="Zambia" />
            <InfoField label="Province" value="Lusaka" />
            <InfoField label="City" value="Lusaka" />
            <InfoField label="Area" value="Central Business District" />
          </div>
        </div>
      </div>

      {/* Section 4 — SECURITY */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
          <h3 className="text-[18px] font-serif font-bold text-[#1e293b]">Security</h3>
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-6 shadow-sm">
          <div className="max-w-md space-y-5">
            <PasswordField 
              label="Current Password" 
              show={showCurrentPassword} 
              onToggle={() => setShowCurrentPassword(!showCurrentPassword)} 
            />
            <PasswordField 
              label="New Password" 
              show={showNewPassword} 
              onToggle={() => setShowNewPassword(!showNewPassword)} 
            />
            <PasswordField 
              label="Confirm New Password" 
              show={showConfirmPassword} 
              onToggle={() => setShowConfirmPassword(!showConfirmPassword)} 
            />
            
            <div className="pt-4 flex justify-end">
              <button className="px-8 py-3 bg-[#C9973A] text-white rounded-full text-[14px] font-sans font-medium hover:bg-[#a37d35] transition-colors shadow-md">
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5 — NOTIFICATION PREFERENCES */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pl-3 border-l-[3px] border-[#C9973A]">
          <h3 className="text-[18px] font-serif font-bold text-[#1e293b]">Notification Preferences</h3>
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[12px] overflow-hidden shadow-sm">
          <NotificationToggle 
            label="Email Notifications" 
            subLabel="Receive updates about your inquiries and quotes via email" 
            active={notificationPrefs.email}
            onToggle={() => handleToggleNotification('email')}
          />
          <NotificationToggle 
            label="Push Notifications" 
            subLabel="Get real-time alerts on your device for new messages" 
            active={notificationPrefs.push}
            onToggle={() => handleToggleNotification('push')}
          />
          <NotificationToggle 
            label="SMS Notifications" 
            subLabel="Receive critical updates via text message" 
            active={notificationPrefs.sms}
            onToggle={() => handleToggleNotification('sms')}
          />
          <NotificationToggle 
            label="Marketing Communications" 
            subLabel="Stay informed about new features and promotions" 
            active={notificationPrefs.marketing}
            onToggle={() => handleToggleNotification('marketing')}
            isLast
          />
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[560px] max-h-[90vh] bg-white rounded-[12px] shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 pb-4 border-b border-[#f1f5f9] flex items-center justify-between shrink-0">
                <h2 className="text-[20px] font-serif font-bold text-[#1e293b]">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 text-[#9ca3af] hover:text-[#1e293b] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto flex-1">
                <form id="edit-profile-form" onSubmit={handleSaveChanges} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputGroup 
                      label="Full Name" 
                      value={formData.name} 
                      onChange={(val) => setFormData({...formData, name: val})} 
                    />
                    <InputGroup 
                      label="Email Address" 
                      value={formData.email} 
                      onChange={(val) => setFormData({...formData, email: val})} 
                    />
                    <InputGroup 
                      label="Phone Number" 
                      value={formData.phone} 
                      onChange={(val) => setFormData({...formData, phone: val})} 
                    />
                    <InputGroup 
                      label="Date of Birth" 
                      type="date"
                      value={formData.dob} 
                      onChange={(val) => setFormData({...formData, dob: val})} 
                    />
                    <InputGroup 
                      label="Country" 
                      value={formData.country} 
                      onChange={(val) => setFormData({...formData, country: val})} 
                    />
                    <InputGroup 
                      label="Province" 
                      value={formData.province} 
                      onChange={(val) => setFormData({...formData, province: val})} 
                    />
                    <InputGroup 
                      label="City" 
                      value={formData.city} 
                      onChange={(val) => setFormData({...formData, city: val})} 
                    />
                    <InputGroup 
                      label="Area" 
                      value={formData.area} 
                      onChange={(val) => setFormData({...formData, area: val})} 
                    />
                  </div>
                </form>
              </div>

              {/* Footer */}
              <div className="p-6 pt-4 border-t border-[#f1f5f9] flex items-center justify-end gap-4 shrink-0 bg-white">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-8 py-3 border border-[#e8e0d0] text-[#64748b] rounded-full text-[14px] font-sans font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  form="edit-profile-form"
                  className="px-8 py-3 bg-[#C9973A] text-white rounded-full text-[14px] font-sans font-medium hover:bg-[#a37d35] transition-colors shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoField({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1 pb-3 border-b border-[#f1f5f9] last:border-0 last:pb-0">
      <span className="block text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">{label}</span>
      <span className="block text-[14px] font-sans font-medium text-[#1e293b]">{value}</span>
    </div>
  );
}

function PasswordField({ label, show, onToggle }: { label: string, show: boolean, onToggle: () => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">{label}</label>
      <div className="relative">
        <input 
          type={show ? "text" : "password"} 
          className="w-full h-[44px] px-4 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
          placeholder="••••••••"
        />
        <button 
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#C9973A] transition-colors"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

function NotificationToggle({ label, subLabel, active, onToggle, isLast }: { label: string, subLabel: string, active: boolean, onToggle: () => void, isLast?: boolean }) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${!isLast ? 'border-b border-[#f1f5f9]' : ''}`}>
      <div className="flex-1 pr-3">
        <h4 className="text-[14px] font-sans font-medium text-[#1e293b] leading-tight tracking-tight">{label}</h4>
        <p className="text-[11.5px] font-sans font-normal text-[#9ca3af] mt-0.5 leading-tight tracking-tight">{subLabel}</p>
      </div>
      
      <button 
        onClick={onToggle}
        className={`relative w-[48px] h-[26px] rounded-full transition-colors duration-200 flex-shrink-0 focus:outline-none ${active ? 'bg-[#C9973A]' : 'bg-[#e8e0d0]'}`}
      >
        <div className={`absolute top-[2px] left-[2px] w-[22px] h-[22px] bg-white rounded-full shadow-sm transition-transform duration-200 ${active ? 'translate-x-[22px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function InputGroup({ label, value, onChange, type = "text" }: { label: string, value: string, onChange: (val: string) => void, type?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-[44px] px-4 bg-[#fffef9] border border-[#e8e0d0] rounded-[10px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
      />
    </div>
  );
}
