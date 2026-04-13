import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Bell, Camera, Eye, EyeOff, Check, X, ChevronRight, 
  MapPin, Globe, Shield, BellRing, LogOut, Loader2, 
  AlertCircle, Lock, Mail, Phone, Calendar, CreditCard,
  Settings, Smartphone, MailQuestion
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useDashboard } from '../DashboardContext';
import { motion, AnimatePresence } from 'motion/react';
import Button from '../components/Button';
import { getProfileSchema, ProfileSection } from '../services/userSchemas';
import DynamicProfileForm from '../components/DynamicProfileForm';

export default function BuyerProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { setActiveTab } = useDashboard();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const schema = useMemo(() => getProfileSchema(user?.role, user?.subRole), [user?.role, user?.subRole]);

  useEffect(() => {
    setActiveTab('profile');
  }, [setActiveTab]);

  // Password state
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Notification state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: true
  });

  const handleToggleNotification = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChanges = async (data: Record<string, any>) => {
    setIsSaving(true);
    try {
      await updateUser(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!passwords.new || !passwords.confirm) {
      setPasswordError("New password fields are required");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setPasswordError("New passwords do not match");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({ password: passwords.new });
      setPasswordSuccess(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      setPasswordError("Failed to update password");
    } finally {
      setIsSaving(false);
    }
  };

  const renderIdentitySection = (section: ProfileSection) => {
    const initials = (user?.name || '')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'LC';
    
    return (
      <div key={section.title} className="bg-white border border-[#f1f5f9] rounded-[24px] p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }} />
        
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-[100px] h-[100px] rounded-full bg-[#1e293b] flex items-center justify-center border-[6px] border-[#fdfaf6] shadow-xl overflow-hidden group relative">
            {user?.logo ? (
              <img src={user.logo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-[32px] font-serif font-bold text-white">{initials}</span>
            )}
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-sans font-bold text-[#C9973A] uppercase tracking-[0.2em]">Member ID</span>
            <span className="text-[12px] font-mono font-medium text-[#1e293b]">#TN-{user?.id?.toString().substring(0, 6).toUpperCase()}</span>
          </div>
        </div>

        <div className="flex-1 text-center md:text-left relative z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
            <h2 className="text-[28px] font-serif font-bold text-[#1e293b] tracking-tight">{user?.name || 'Luckson C Nonde'}</h2>
            <div className="flex items-center gap-2 mx-auto md:mx-0">
              <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#fdf3e3] text-[#C9973A] text-[11px] font-sans font-bold uppercase tracking-wider border border-[#C9973A]/10">
                {user?.subRole?.startsWith('COMPANY_') ? 'Corporate Buyer' : 'Individual Buyer'}
              </span>
              {user?.verificationStatus === 'VERIFIED' && (
                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-sm" title="Verified Account">
                  <Check className="w-3 h-3" strokeWidth={4} />
                </div>
              )}
            </div>
          </div>
          
          <p className="text-[14px] font-sans text-[#64748b] mb-8 max-w-md leading-relaxed">
            {section.description || "Welcome to your TONSE professional account. Manage your identity and preferences below."}
          </p>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="px-8 py-3 bg-[#C9973A] text-white rounded-full text-[14px] font-sans font-bold hover:bg-[#a37d35] transition-all shadow-lg shadow-[#C9973A]/20"
            >
              Edit Profile
            </button>
            <button 
              onClick={() => logout()}
              className="px-8 py-3 border border-[#f1f5f9] text-[#ef4444] rounded-full text-[14px] font-sans font-medium hover:bg-rose-50 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFieldsSection = (section: ProfileSection) => {
    return (
      <div key={section.title} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-[#f1f5f9]" />
          <h3 className="text-[14px] font-serif font-bold text-[#1e293b] uppercase tracking-[0.15em] px-4 py-1 bg-[#fdfaf6] border border-[#f1f5f9] rounded-full">
            {section.title}
          </h3>
          <div className="h-[1px] flex-1 bg-[#f1f5f9]" />
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
            {section.fields?.filter(f => f.name !== 'logo').map((field, fIdx) => (
              <div key={fIdx} className="group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest group-hover:text-[#C9973A] transition-colors">
                    {field.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#fdfaf6] border border-[#f1f5f9] flex items-center justify-center text-[#1e293b]/40">
                    {getFieldIcon(field.name)}
                  </div>
                  <span className="text-[15px] font-sans font-medium text-[#1e293b]">
                    {renderFieldValue(field, (user as any)?.[field.name])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSecuritySection = (section: ProfileSection) => {
    return (
      <div key={section.title} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-[#f1f5f9]" />
          <h3 className="text-[14px] font-serif font-bold text-[#1e293b] uppercase tracking-[0.15em] px-4 py-1 bg-[#fdfaf6] border border-[#f1f5f9] rounded-full">
            {section.title}
          </h3>
          <div className="h-[1px] flex-1 bg-[#f1f5f9]" />
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[24px] p-8 shadow-sm">
          <div className="max-w-xl space-y-6">
            <p className="text-[13px] text-[#64748b] leading-relaxed mb-4">
              {section.description || "Ensure your account is protected with a strong, unique password."}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords.new ? "text" : "password"} 
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="w-full h-[48px] px-4 bg-[#fffef9] border border-[#e8e0d0] rounded-[12px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                    placeholder="••••••••"
                  />
                  <button onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#C9973A]">
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-sans font-bold text-[#9ca3af] uppercase tracking-widest">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPasswords.confirm ? "text" : "password"} 
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full h-[48px] px-4 bg-[#fffef9] border border-[#e8e0d0] rounded-[12px] text-[14px] font-sans text-[#1e293b] focus:outline-none focus:border-[#C9973A] transition-colors"
                    placeholder="••••••••"
                  />
                  <button onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#C9973A]">
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <div className="flex-1">
                {passwordError && <p className="text-[12px] text-[#ef4444] font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" />{passwordError}</p>}
                {passwordSuccess && <p className="text-[12px] text-emerald-600 font-medium flex items-center gap-1"><Check className="w-4 h-4" />Password updated!</p>}
              </div>
              <button 
                onClick={handleUpdatePassword}
                disabled={isSaving || !passwords.new}
                className="px-8 py-3 bg-[#1e293b] text-white rounded-full text-[13px] font-sans font-bold hover:bg-black transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotificationsSection = (section: ProfileSection) => {
    return (
      <div key={section.title} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-[1px] flex-1 bg-[#f1f5f9]" />
          <h3 className="text-[14px] font-serif font-bold text-[#1e293b] uppercase tracking-[0.15em] px-4 py-1 bg-[#fdfaf6] border border-[#f1f5f9] rounded-full">
            {section.title}
          </h3>
          <div className="h-[1px] flex-1 bg-[#f1f5f9]" />
        </div>
        
        <div className="bg-white border border-[#f1f5f9] rounded-[24px] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-[#f1f5f9]">
            <p className="text-[13px] text-[#64748b] leading-relaxed">
              {section.description || "Choose how you want to stay informed about your activity on the platform."}
            </p>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            <NotificationToggle 
              icon={<Mail className="w-4 h-4" />}
              label="Email Notifications" 
              subLabel="Quotes, inquiry updates, and account alerts" 
              active={notificationPrefs.email}
              onToggle={() => handleToggleNotification('email')}
            />
            <NotificationToggle 
              icon={<Smartphone className="w-4 h-4" />}
              label="Push Notifications" 
              subLabel="Instant alerts on your mobile device" 
              active={notificationPrefs.push}
              onToggle={() => handleToggleNotification('push')}
            />
            <NotificationToggle 
              icon={<BellRing className="w-4 h-4" />}
              label="Marketing & News" 
              subLabel="New features, promotions, and tips" 
              active={notificationPrefs.marketing}
              onToggle={() => handleToggleNotification('marketing')}
            />
          </div>
        </div>
      </div>
    );
  };

  const getFieldIcon = (name: string) => {
    switch (name) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'dob': return <Calendar className="w-4 h-4" />;
      case 'nrc': return <Shield className="w-4 h-4" />;
      case 'tpin': return <CreditCard className="w-4 h-4" />;
      case 'companyName': return <Settings className="w-4 h-4" />;
      case 'location':
      case 'city':
      case 'province': return <MapPin className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const renderFieldValue = (field: any, value: any) => {
    if (!value) return 'Not specified';
    if (field.type === 'image_upload' && typeof value === 'string' && value.startsWith('data:image')) {
      return (
        <div className="w-24 h-16 rounded-lg overflow-hidden border border-[#f1f5f9] shadow-sm">
          <img src={value} alt={field.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
      );
    }
    return value;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-serif font-bold text-[#1e293b] leading-tight tracking-tight">Account Settings</h1>
          <p className="text-[14px] font-sans text-[#64748b] mt-1">Refine your professional presence and security</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#fdfaf6] border border-[#f1f5f9] rounded-full">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[11px] font-sans font-bold text-[#1e293b]/60 uppercase tracking-widest">System Active</span>
        </div>
      </div>

      {/* Dynamic Sections Loop */}
      <div className="space-y-12">
        {schema.sections.map(section => {
          switch (section.type) {
            case 'identity': return renderIdentitySection(section);
            case 'fields': return renderFieldsSection(section);
            case 'security': return renderSecuritySection(section);
            case 'notifications': return renderNotificationsSection(section);
            default: return null;
          }
        })}
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
              className="absolute inset-0 bg-[#1e293b]/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[640px] max-h-[90vh] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-white/20"
            >
              <div className="p-8 pb-4 border-b border-[#f1f5f9] flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-[24px] font-serif font-bold text-[#1e293b]">Refine Profile</h2>
                  <p className="text-[12px] text-[#64748b]">Update your personal or business details</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-[#f1f5f9] flex items-center justify-center text-[#9ca3af] hover:text-[#1e293b] transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                <DynamicProfileForm 
                  schema={{ sections: schema.sections.filter(s => s.type === 'fields') }}
                  initialData={user || {}}
                  onSubmit={handleSaveChanges}
                  isSubmitting={isSaving}
                />
              </div>

              <div className="p-8 pt-4 border-t border-[#f1f5f9] flex items-center justify-end gap-4 shrink-0 bg-[#fdfaf6]/50">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-8 py-3 text-[#64748b] rounded-full text-[14px] font-sans font-medium hover:bg-white transition-colors"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  form="dynamic-profile-form"
                  disabled={isSaving}
                  className="px-10 py-3 bg-[#C9973A] text-white rounded-full text-[14px] font-sans font-bold hover:bg-[#a37d35] transition-all shadow-lg shadow-[#C9973A]/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationToggle({ icon, label, subLabel, active, onToggle }: { icon: React.ReactNode, label: string, subLabel: string, active: boolean, onToggle: () => void }) {
  return (
    <div className="p-6 flex items-center justify-between hover:bg-[#fdfaf6] transition-colors group">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-[#C9973A]/10 text-[#C9973A]' : 'bg-[#f1f5f9] text-[#9ca3af] group-hover:bg-white'}`}>
          {icon}
        </div>
        <div>
          <h4 className="text-[15px] font-sans font-bold text-[#1e293b] leading-tight">{label}</h4>
          <p className="text-[12px] font-sans text-[#9ca3af] mt-0.5">{subLabel}</p>
        </div>
      </div>
      
      <button 
        onClick={onToggle}
        className={`relative w-[52px] h-[28px] rounded-full transition-all duration-300 flex-shrink-0 focus:outline-none border-2 ${active ? 'bg-[#C9973A] border-[#C9973A]' : 'bg-[#e8e0d0] border-[#e8e0d0]'}`}
      >
        <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-md transition-transform duration-300 ${active ? 'translate-x-[24px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
