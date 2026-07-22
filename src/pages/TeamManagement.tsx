import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  CheckCircle,
  FileText,
  ShieldAlert,
  Crown,
  XCircle,
  ShieldCheck,
  Landmark,
  Power,
  Ban,
  Camera,
} from 'lucide-react';
import { PERMISSIONS, hasPermission } from '../utils/rbac';
import { teamService, TeamMember } from '../services/api/teamService';
import { getEffectiveBusinessType } from '../services/categories';
import { useActiveProfileContext } from '../hooks/useActiveProfileContext';

interface RolePreset {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  /** When set, the preset only shows for that department's persona. */
  businessType?: string;
}

const ROLES: RolePreset[] = [
  {
    id: 'QUOTATION_ONLY',
    title: 'Quotation Manager',
    description: 'Read & Write on Quotations',
    icon: FileText,
    color: 'blue',
  },
  {
    id: 'COLLECTION_OFFICER',
    title: 'Collection Officer',
    description: 'Collections only — QR handover & completion',
    icon: ShieldCheck,
    color: 'amber',
  },
  {
    id: 'LOAN_OFFICER',
    title: 'Loan Officer',
    description: 'Loans only — review requests & make offers',
    icon: Landmark,
    color: 'emerald',
    // Only shown to lending departments (persona-as-department filter below).
    businessType: 'LENDING',
  },
  {
    id: 'TECHNICIAN',
    title: 'Technician',
    description: 'Assigned jobs only — before/after photos & video evidence',
    icon: Camera,
    color: 'purple',
  },
];

const permissionsForRole = (role: string): string[] => {
  // Collection-only: the officer sees/does nothing but the handover flow.
  if (role === 'COLLECTION_OFFICER') {
    return [PERMISSIONS.MANAGE_COLLECTIONS];
  }
  // Loan-only: review loan requests, make/track offers.
  if (role === 'LOAN_OFFICER') {
    return [PERMISSIONS.MANAGE_LOANS];
  }
  // Technician: evidence capture on assigned jobs only.
  if (role === 'TECHNICIAN') {
    return [PERMISSIONS.MANAGE_JOBS];
  }
  // Default = QUOTATION_ONLY
  return [PERMISSIONS.MANAGE_QUOTES, PERMISSIONS.VIEW_ANALYTICS];
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { context: activeContext } = useActiveProfileContext();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [role, setRole] = useState('QUOTATION_ONLY');
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
  // Per-row promotion panel state — keyed by staff id so multiple rows
  // can hold their own draft autonomy without colliding.
  const [promotionDraft, setPromotionDraft] = useState<{
    staffId: string;
    autonomy: 'INDEPENDENT' | 'MANAGED';
  } | null>(null);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);
  // On-demand access switch — which staff row is mid-toggle (spinner + disable).
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const canManage = hasPermission(user, PERMISSIONS.MANAGE_TEAM);

  // Persona-as-department: the active profile is the department. All
  // team management is scoped to that archetype — list filter on read,
  // auto-fill on create. Personal persona has no department to manage.
  const activeArchetype = useMemo(
    () => getEffectiveBusinessType(user, activeContext),
    [user, activeContext],
  );
  const isPersonalPersona = activeContext.type === 'personal';

  // Presets are scoped to the department: a lending department offers the Loan
  // Officer role; every other department offers Quotation/Collection roles.
  const visibleRoles = useMemo(
    () =>
      ROLES.filter((r) =>
        (r as any).businessType
          ? activeArchetype === (r as any).businessType
          : activeArchetype !== 'LENDING',
      ),
    [activeArchetype],
  );

  // Keep the selected role valid for the visible set (e.g. a lender's default
  // 'QUOTATION_ONLY' isn't offered → fall back to the first lending preset).
  useEffect(() => {
    if (visibleRoles.length && !visibleRoles.some((r: { id: string }) => r.id === role)) {
      setRole(visibleRoles[0].id);
    }
  }, [visibleRoles, role]);

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
      // Auto-pin to the active persona's archetype. The variant
      // dropdown is gone; persona = department, so the seller's
      // current mode dictates which department they're staffing.
      const created = await teamService.create({
        name: staffName,
        email: staffEmail,
        phone: phoneNumber,
        permissions: permissionsForRole(role),
        assignedArchetype: activeArchetype,
      });

      setGeneratedPassword(created.generatedPassword || '');
      setLastRegisteredInfo({ name: staffName, email: staffEmail, phone: phoneNumber });
      setSuccessMessage('Staff member registered successfully!');
      setPhoneNumber('');
      setStaffName('');
      setStaffEmail('');
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

    const shareText = `Welcome to ProQuote!\n\nYou've been added as a staff member for ${user?.name}.\n\nLogin at: ${window.location.origin}\nUser: ${lastRegisteredInfo.email}\nTemp Password: ${generatedPassword}\n\nPlease change your password after logging in.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ProQuote Staff Credentials',
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

  const handlePromote = async (staffId: string, autonomy: 'INDEPENDENT' | 'MANAGED') => {
    setIsSavingPromotion(true);
    try {
      await teamService.update(staffId, {
        isDepartmentHead: true,
        departmentAutonomy: autonomy,
      });
      setPromotionDraft(null);
      await loadTeam();
    } catch (err: any) {
      // Backend ConflictException (409) for "second head per archetype"
      // surfaces here. The thrown Error.message comes from apiClient.
      alert(err?.message || 'Failed to promote staff member.');
    } finally {
      setIsSavingPromotion(false);
    }
  };

  // Switch a team member's access off / on. Suspending (isActive=false)
  // revokes ALL their functionality immediately — the backend rejects their
  // next request, next login, and token refresh — until re-activated.
  const handleToggleActive = async (member: TeamMember) => {
    const next = !member.isActive;
    if (
      !next &&
      !window.confirm(
        `Switch off ${member.name}? They will lose all access and be signed out immediately. You can switch them back on any time.`,
      )
    ) {
      return;
    }
    setTogglingId(member.id);
    try {
      await teamService.update(member.id, { isActive: next });
      await loadTeam();
    } catch (err: any) {
      alert(err?.message || 'Failed to update team member access.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDemote = async (staffId: string) => {
    if (!window.confirm('Demote this department head back to a regular staff member? Their per-PIN finance access will be revoked.')) return;
    setIsSavingPromotion(true);
    try {
      await teamService.update(staffId, { isDepartmentHead: false });
      await loadTeam();
    } catch (err: any) {
      alert(err?.message || 'Failed to demote department head.');
    } finally {
      setIsSavingPromotion(false);
    }
  };

  // Persona-as-department: list scope. Personal mode has nothing to
  // manage (it's the owner's identity surface). Business mode shows
  // only staff pinned to the active archetype.
  const visibleMembers = isPersonalPersona
    ? []
    : teamMembers.filter((m) => m.assignedArchetype === activeArchetype);

  if (isPersonalPersona) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-4xl border border-slate-100 shadow-sm">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-blue-500" />
        </div>
        <h2 className="text-2xl font-serif font-black text-slate-900 mb-2">
          Switch to a department to manage staff
        </h2>
        <p className="text-slate-500 max-w-sm mx-auto">
          Team management is scoped to a department. Use the Profile menu in the sidebar
          to switch into the department you want to staff.
        </p>
      </div>
    );
  }

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
              {visibleRoles.map((r) => {
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

          {/* Variant select removed — persona-as-department auto-fills
              assignedArchetype on creation. The persona indicator at
              the top of the page already tells the owner which
              department they're staffing. */}

          <button
            type="submit"
            disabled={isSubmitting || !phoneNumber || !staffName || !staffEmail}
            className="w-full bg-brand-dark text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? `Registering ${activeArchetype} staff...` : `Register ${activeArchetype} Staff Member`}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">
              {activeArchetype} Team
            </h2>
            <p className="text-sm text-slate-500">
              Staff scoped to your {activeArchetype} department. Switch persona to manage other departments.
            </p>
          </div>
        </div>

        {isLoadingTeam ? (
          <div className="text-center py-8 text-slate-400">Loading team…</div>
        ) : visibleMembers.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            No staff in {activeArchetype} yet.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMembers.map((member) => {
              const isHead = !!member.isDepartmentHead;
              const draftOpen = promotionDraft?.staffId === member.id;
              return (
                <div
                  key={member.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    member.isActive
                      ? 'bg-slate-50 border-slate-100'
                      : 'bg-rose-50/40 border-rose-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {member.name}
                        {isHead && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Crown className="w-3 h-3" />
                            Department Head · {member.departmentAutonomy}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">{member.email} · {member.phone}</div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-medium text-[#C9973A] bg-[#fdf8f0] px-2 py-0.5 rounded-full w-fit">
                          <Shield className="w-3 h-3" />
                          {member.permissions?.includes(PERMISSIONS.MANAGE_COLLECTIONS)
                            ? 'Collection Officer'
                            : member.permissions?.includes(PERMISSIONS.MANAGE_LOANS)
                              ? 'Loan Officer'
                              : 'Quotation Manager'}
                        </span>
                        <span
                          className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
                            member.isActive
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {member.isActive ? 'Active' : 'Switched off'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isHead && !draftOpen && (
                        <button
                          onClick={() =>
                            setPromotionDraft({ staffId: member.id, autonomy: 'MANAGED' })
                          }
                          className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
                          title="Promote to Department Head"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          Promote
                        </button>
                      )}
                      {isHead && (
                        <button
                          onClick={() => handleDemote(member.id)}
                          disabled={isSavingPromotion}
                          className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                          title="Demote to regular staff"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Demote
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(member)}
                        disabled={togglingId === member.id}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 ${
                          member.isActive
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                        title={member.isActive ? 'Switch off access on demand' : 'Switch access back on'}
                      >
                        {member.isActive ? (
                          <Ban className="w-3.5 h-3.5" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        {togglingId === member.id
                          ? 'Saving…'
                          : member.isActive
                            ? 'Switch Off'
                            : 'Switch On'}
                      </button>
                      <button
                        onClick={() => handleRemoveStaff(member.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove Staff"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Promotion panel — autonomy picker */}
                  {draftOpen && promotionDraft && (
                    <div className="mt-4 p-3 bg-white border border-emerald-200 rounded-xl">
                      <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Autonomy for {activeArchetype} Department Head
                      </p>
                      <div className="space-y-2 mb-3">
                        {(['MANAGED', 'INDEPENDENT'] as const).map((opt) => {
                          const isPicked = promotionDraft.autonomy === opt;
                          return (
                            <label
                              key={opt}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer ${
                                isPicked
                                  ? 'border-[#C9973A] bg-[#fdf8f0]'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`autonomy-${member.id}`}
                                checked={isPicked}
                                onChange={() =>
                                  setPromotionDraft({ staffId: member.id, autonomy: opt })
                                }
                                className="mt-0.5"
                              />
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  {opt === 'MANAGED' ? 'Managed' : 'Independent'}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {opt === 'MANAGED'
                                    ? 'Can view balance + transactions with their PIN. Cannot move money out.'
                                    : 'Full autonomy — view AND withdraw from the company virtual account.'}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setPromotionDraft(null)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                          disabled={isSavingPromotion}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handlePromote(member.id, promotionDraft.autonomy)}
                          disabled={isSavingPromotion}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                        >
                          {isSavingPromotion ? 'Saving...' : 'Confirm Promotion'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
