import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, UserPlus, Shield, Trash2, CheckCircle, FileText, QrCode } from 'lucide-react';
import { PERMISSIONS } from '../utils/rbac';
import { motion, AnimatePresence } from 'motion/react';

const ROLES = [
  {
    id: 'QUOTATION_ONLY',
    title: 'Quotation Manager',
    description: 'Read & Write on Quotations',
    icon: FileText,
    color: 'blue'
  },
  {
    id: 'COLLECTION_MANAGER',
    title: 'Collection Manager',
    description: 'Read, Write & Allow Collections',
    icon: QrCode,
    color: 'emerald'
  }
];

export default function TeamManagement() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [role, setRole] = useState('QUOTATION_ONLY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [lastRegisteredInfo, setLastRegisteredInfo] = useState<{ name: string, email: string, phone: string } | null>(null);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const teamMembers = useLiveQuery(
    async () => {
      if (!user?.id) return [];
      return await db.users.where('parentProviderId').equals(user.id).toArray();
    },
    [user]
  ) || [];

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratedPassword('');

    try {
      // Check if user already exists by phone or email
      const existingByPhone = await db.users.where('phone').equals(phoneNumber).first();
      const existingByEmail = await db.users.where('email').equals(staffEmail).first();
      
      if (existingByPhone || existingByEmail) {
        setErrorMessage('A user with this phone number or email already exists.');
        setIsSubmitting(false);
        return;
      }

      // Generate a unique password
      const newPassword = generatePassword();

      // Assign permissions based on role
      let permissions: string[] = [];
      if (role === 'QUOTATION_ONLY') {
        permissions = [PERMISSIONS.MANAGE_QUOTES];
      } else if (role === 'COLLECTION_MANAGER') {
        permissions = [PERMISSIONS.MANAGE_QUOTES, PERMISSIONS.MANAGE_COLLECTIONS];
      }

      // Create the new staff user
      await db.users.add({
        name: staffName,
        email: staffEmail,
        phone: phoneNumber,
        password: newPassword, // In a real app, this would be hashed
        role: 'PROVIDER_STAFF',
        parentProviderId: user!.id,
        permissions: permissions,
        createdAt: new Date().toISOString()
      });

      setGeneratedPassword(newPassword);
      setLastRegisteredInfo({ name: staffName, email: staffEmail, phone: phoneNumber });
      setSuccessMessage('Staff member registered successfully!');
      setPhoneNumber('');
      setStaffName('');
      setStaffEmail('');
    } catch (err) {
      setErrorMessage('Failed to register staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!lastRegisteredInfo || !generatedPassword) return;

    const shareText = `Welcome to TONSE! 🌟\n\nYou've been added as a staff member for ${user?.name}.\n\nLogin at: ${window.location.origin}\nUser: ${lastRegisteredInfo.phone} or ${lastRegisteredInfo.email}\nTemp Password: ${generatedPassword}\n\nPlease change your password after logging in.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TONSE Staff Credentials',
          text: shareText,
        });
      } catch (err) {
        // Fallback to clipboard
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  const handleRemoveStaff = async (staffId: number) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    
    try {
      await db.users.update(staffId, {
        role: 'BUYER', // Revert to default role or keep as is but remove linkage
        parentProviderId: undefined,
        permissions: []
      });
    } catch (err) {
      alert('Failed to remove staff member.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Add Staff Member</h2>
            <p className="text-sm text-slate-500">Onboard a collaborator to manage your shop.</p>
          </div>
        </div>

        <form onSubmit={handleAddStaff} className="space-y-4">
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3">
                <CheckCircle className="w-5 h-5" />
                {successMessage}
              </div>
              
              {generatedPassword && lastRegisteredInfo && (
                <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <div className="space-y-3 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Registered Email</p>
                      <p className="text-sm font-medium text-slate-900">{lastRegisteredInfo.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Temporary Password</p>
                      <p className="text-lg font-mono font-bold text-[#C9973A] tracking-widest">{generatedPassword}</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 bg-[#C9973A] text-white font-bold py-2.5 rounded-xl hover:bg-[#B08432] transition-colors shadow-sm"
                  >
                    <Users className="w-4 h-4" />
                    Share Credentials
                  </button>
                  
                  <p className="text-[10px] text-slate-400 mt-3 text-center italic">
                    Share these details with {lastRegisteredInfo.name} so they can access the portal.
                  </p>
                </div>
              )}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              {errorMessage}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="e.g., John Doe"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C9973A] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="e.g., john@example.com"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C9973A] focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., 0970000000"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C9973A] focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Role Assignment</label>
            <div className="grid grid-cols-1 gap-3">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isActive = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      isActive 
                        ? 'border-[#C9973A] bg-[#fdf8f0] shadow-sm' 
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-[#C9973A] text-white' : 'bg-white text-slate-400 border border-slate-100'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-bold text-sm ${isActive ? 'text-[#C9973A]' : 'text-slate-900'}`}>{r.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isActive ? 'border-[#C9973A] bg-[#C9973A]' : 'border-slate-200 bg-white'
                    }`}>
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !phoneNumber || !staffName || !staffEmail}
            className="w-full bg-[#1e293b] text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register Staff Member'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Your Team</h2>
            <p className="text-sm text-slate-500">Manage existing staff members.</p>
          </div>
        </div>

        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            No staff members added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <div className="font-bold text-slate-900">{member.name}</div>
                  <div className="text-sm text-slate-500">{member.phone}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs font-medium text-[#C9973A] bg-[#fdf8f0] px-2 py-0.5 rounded-full w-fit">
                    <Shield className="w-3 h-3" />
                    {member.permissions?.includes(PERMISSIONS.MANAGE_COLLECTIONS) ? 'Collection Manager' : 'Quotation Manager'}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveStaff(member.id!)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Remove Staff"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
