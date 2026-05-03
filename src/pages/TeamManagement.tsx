import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  CheckCircle,
  FileText,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { PERMISSIONS, hasPermission } from '../utils/rbac';
import { teamService, TeamMember } from '../services/api/teamService';
import { getBusinessTypes, BusinessType } from '../services/categories';

const ROLES = [
  {
    id: 'QUOTATION_ONLY',
    title: 'Quotation Manager',
    description: 'Read & Write on Quotations',
    icon: FileText,
    color: 'blue',
  },
  {
    id: 'COLLECTION_MANAGER',
    title: 'Collection Manager',
    description: 'Read, Write & Allow Collections',
    icon: QrCode,
    color: 'emerald',
  },
];

const permissionsForRole = (role: string): string[] => {
  if (role === 'COLLECTION_MANAGER') {
    return [
      PERMISSIONS.MANAGE_QUOTES,
      PERMISSIONS.MANAGE_COLLECTIONS,
      PERMISSIONS.VIEW_ANALYTICS,
    ];
  }
  // Default = QUOTATION_ONLY
  return [PERMISSIONS.MANAGE_QUOTES, PERMISSIONS.VIEW_ANALYTICS];
};

export default function TeamManagement() {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [role, setRole] = useState('QUOTATION_ONLY');
  const [assignedArchetype, setAssignedArchetype] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [lastRegisteredInfo, setLastRegisteredInfo] = useState<{
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

  const canManage = hasPermission(user, PERMISSIONS.MANAGE_TEAM);

  // Owner's archetype set drives the variant-assignment select. Single-
  // archetype owners (e.g. just RETAIL) don't see the select at all —
  // there's nothing to restrict to. Multi-archetype owners get a select
  // with one option per archetype plus "All variants".
  const ownerArchetypes: BusinessType[] = getBusinessTypes(user as any).filter(
    (a) => a !== 'BUYER' && a !== 'ADMIN' && a !== 'UNKNOWN' && a !== 'LABOUR',
  );
  const showVariantSelect = ownerArchetypes.length > 1;

  const loadTeam = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingTeam(true);
    try {
      const list = await teamService.list();
      setTeamMembers(list);
    } catch (err) {
      // Silent: most likely 403 (the page already gates on canManage).
    } finally {
      setIsLoadingTeam(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (canManage) loadTeam();
  }, [canManage, loadTeam]);

  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-4xl border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-2xl font-serif font-black text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-xs mx-auto">
          You do not have the required permissions to manage team members. Please contact your shop
          administrator.
        </p>
      </div>
    );
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratedPassword('');

    try {
      const created = await teamService.create({
        name: staffName,
        email: staffEmail,
        phone: phoneNumber,
        permissions: permissionsForRole(role),
        assignedArchetype: assignedArchetype || null,
      });

      setGeneratedPassword(created.generatedPassword || '');
      setLastRegisteredInfo({ name: staffName, email: staffEmail, phone: phoneNumber });
      setSuccessMessage('Staff member registered successfully!');
      setPhoneNumber('');
      setStaffName('');
      setStaffEmail('');
      setAssignedArchetype('');
      await loadTeam();
    } catch (err: any) {
      // Backend's ConflictException for duplicate email surfaces here as the
      // thrown Error's message. Generic catch-all keeps unexpected failures
      // from killing the form.
      setErrorMessage(err?.message || 'Failed to register staff member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!lastRegisteredInfo || !generatedPassword) return;

    const shareText = `Welcome to TONSE!\n\nYou've been added as a staff member for ${user?.name}.\n\nLogin at: ${window.location.origin}\nUser: ${lastRegisteredInfo.email}\nTemp Password: ${generatedPassword}\n\nPlease change your password after logging in.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TONSE Staff Credentials',
          text: shareText,
        });
      } catch (err) {
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

  const handleRemoveStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await teamService.remove(staffId);
      await loadTeam();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove staff member.');
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
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">
                        Registered Email
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {lastRegisteredInfo.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">
                        Temporary Password
                      </p>
                      <p className="text-lg font-mono font-bold text-[#C9973A] tracking-widest">
                        {generatedPassword}
                      </p>
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
                    Share these details with {lastRegisteredInfo.name} so they can access the
                    portal.
                  </p>
                </div>
              )}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{errorMessage}</div>
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
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive
                          ? 'bg-[#C9973A] text-white'
                          : 'bg-white text-slate-400 border border-slate-100'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`font-bold text-sm ${isActive ? 'text-[#C9973A]' : 'text-slate-900'}`}
                      >
                        {r.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isActive ? 'border-[#C9973A] bg-[#C9973A]' : 'border-slate-200 bg-white'
                      }`}
                    >
                      {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variant assignment — only shown to multi-archetype owners.
              Single-archetype owners have nothing to restrict to, so we
              hide the select entirely (the staff member will see all
              leads in the only archetype that exists). */}
          {showVariantSelect && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Variant Assignment
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Restrict this staff member to one variant of leads.
                Leave on "All variants" to give them access to every
                inquiry your shop handles.
              </p>
              <select
                value={assignedArchetype}
                onChange={(e) => setAssignedArchetype(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#C9973A] focus:border-transparent"
              >
                <option value="">All variants ({ownerArchetypes.join(', ')})</option>
                {ownerArchetypes.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !phoneNumber || !staffName || !staffEmail}
            className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
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

        {isLoadingTeam ? (
          <div className="text-center py-8 text-slate-400">Loading team…</div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            No staff members added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div>
                  <div className="font-bold text-slate-900">{member.name}</div>
                  <div className="text-sm text-slate-500">{member.email} · {member.phone}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-medium text-[#C9973A] bg-[#fdf8f0] px-2 py-0.5 rounded-full w-fit">
                      <Shield className="w-3 h-3" />
                      {member.permissions?.includes(PERMISSIONS.MANAGE_COLLECTIONS)
                        ? 'Collection Manager'
                        : 'Quotation Manager'}
                    </span>
                    {member.assignedArchetype && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {member.assignedArchetype} only
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveStaff(member.id)}
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
