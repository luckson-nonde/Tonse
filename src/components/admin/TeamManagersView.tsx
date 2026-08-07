/**
 * Admin Team view — the PRIMARY admin creates and manages restricted
 * "User Manager" sub-admin accounts (role ADMIN + parentProviderId +
 * ADMIN_* permission codes). Rendered as the "Admin Team" tab inside
 * AdminDashboard; the whole tab is primary-admin-only (sub-admins never
 * see it, and the backend routes reject them regardless).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  UserPlus,
  RefreshCw,
  Loader2,
  X,
  Copy,
  Check,
  KeyRound,
  Share2,
  Trash2,
} from 'lucide-react';
import { adminService, AdminManagerUser } from '../../services/api/adminService';
import { ADMIN_PERMISSIONS } from '../../utils/rbac';
import ConfirmModal from '../ConfirmModal';

const PERMISSION_OPTIONS: { code: string; label: string; blurb: string }[] = [
  {
    code: ADMIN_PERMISSIONS.USERS,
    label: 'Users',
    blurb: 'Browse users, suspend & unsuspend (never delete)',
  },
  {
    code: ADMIN_PERMISSIONS.VERIFICATIONS,
    label: 'Verifications',
    blurb: 'Approve or reject onboarding documents',
  },
  {
    code: ADMIN_PERMISSIONS.REPORTS,
    label: 'Reports',
    blurb: 'Review and resolve user-submitted complaints',
  },
];

const permissionLabel = (code: string) =>
  PERMISSION_OPTIONS.find((p) => p.code === code)?.label ?? code;

export default function TeamManagersView() {
  const [managers, setManagers] = useState<AdminManagerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<AdminManagerUser | null>(null);
  const [deleting, setDeleting] = useState<AdminManagerUser | null>(null);
  const [resetting, setResetting] = useState<AdminManagerUser | null>(null);
  const [resetCreds, setResetCreds] = useState<{ email: string; password: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setManagers(await adminService.listManagers());
    } catch (e: any) {
      setError(e?.message || 'Failed to load User Managers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = async (m: AdminManagerUser) => {
    setBusyId(m.id);
    try {
      await adminService.updateManager(m.id, { isActive: !m.isActive });
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to update account');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReset = async () => {
    const target = resetting;
    if (!target) return;
    setBusyId(target.id);
    try {
      const res = await adminService.resetManagerPassword(target.id);
      if (res?.generatedPassword) {
        setResetCreds({ email: target.email || target.displayId || '', password: res.generatedPassword });
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to reset the password');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await adminService.deleteManager(deleting.id);
      setDeleting(null);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to remove account');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#C9973A] mb-2">
            Section 07 / Delegation
          </p>
          <h1 className="font-serif text-[34px] sm:text-[40px] font-black text-[#1a1a2e] leading-none">
            Admin Team
          </h1>
          <p className="mt-3 text-[14px] text-slate-500 max-w-xl leading-relaxed">
            User Managers handle day-to-day approvals and reports with a restricted console —
            they can never touch financials, categories, or other admin accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-[#C9973A] rounded-xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-[#b3852f] transition-all flex items-center gap-2 shadow-[0_8px_20px_-8px_rgba(201,151,58,0.55)]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            New User Manager
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_18px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
        {loading && (
          <div className="p-14 flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="p-10 text-center text-[13px] font-semibold text-rose-500">{error}</div>
        )}
        {!loading && !error && managers.length === 0 && (
          <div className="p-14 text-center">
            <p className="text-[14px] font-bold text-slate-500">No User Managers yet.</p>
            <p className="mt-1 text-[12px] text-slate-400">
              Create one to delegate approvals and report handling.
            </p>
          </div>
        )}
        {!loading && !error && managers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Account', 'Access', 'Status', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-[0.12em] text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {managers.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#1a1a2e]">{m.name || '—'}</p>
                      <p className="text-[11px] text-slate-400">{m.email || m.displayId}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(m.permissions ?? []).map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-full bg-[#fdf6e9] border border-[#ecd9b3] text-[10px] font-bold uppercase tracking-wider text-[#b07f24]"
                          >
                            {permissionLabel(p)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          m.isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-[#a7f3d0]'
                            : 'bg-slate-100 text-slate-500 border border-[#e2e8f0]'
                        }`}
                      >
                        {m.isActive ? 'Active' : 'Disabled'}
                      </span>
                      {m.mustChangePassword && (
                        <p className="mt-1 text-[10px] text-slate-400">Awaiting first login</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing(m)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200 hover:border-[#C9973A]/40 hover:text-[#1a1a2e] transition-all"
                        >
                          Edit access
                        </button>
                        <button
                          onClick={() => setResetting(m)}
                          disabled={busyId === m.id}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200 hover:border-[#C9973A]/40 hover:text-[#1a1a2e] transition-all disabled:opacity-50 flex items-center gap-1.5"
                          title="Generate a new one-time password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Reset password
                        </button>
                        <button
                          onClick={() => toggleActive(m)}
                          disabled={busyId === m.id}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 border border-slate-200 hover:border-[#C9973A]/40 hover:text-[#1a1a2e] transition-all disabled:opacity-50"
                        >
                          {m.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => setDeleting(m)}
                          disabled={busyId === m.id}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50"
                          title="Remove account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateManagerModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {editing && (
        <EditAccessModal
          manager={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      <ConfirmModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Remove User Manager?"
        message={`${deleting?.name || 'This account'} will lose all admin access immediately. This cannot be undone.`}
        confirmText="Remove account"
        variant="danger"
      />
      <ConfirmModal
        isOpen={!!resetting}
        onClose={() => setResetting(null)}
        onConfirm={confirmReset}
        title="Reset password?"
        message={`The current password for ${resetting?.name || 'this account'} stops working immediately. You'll get a new one-time password to copy or share.`}
        confirmText="Reset password"
        variant="warning"
      />
      {resetCreds && (
        <CredentialsModal
          title="New password ready"
          email={resetCreds.email}
          password={resetCreds.password}
          onClose={() => setResetCreds(null)}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function CreateManagerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<string[]>(
    PERMISSION_OPTIONS.map((p) => p.code)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Returned exactly once by the API — shown here, never retrievable again.
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState('');

  const togglePermission = (code: string) =>
    setPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (permissions.length === 0) {
      setError('Grant at least one permission.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminService.createManager({
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        permissions,
      });
      if (res?.generatedPassword) {
        setCreatedEmail(email.trim());
        setGeneratedPassword(res.generatedPassword);
        await onCreated();
      } else {
        onClose();
        await onCreated();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to create the account');
    } finally {
      setSubmitting(false);
    }
  };

  if (generatedPassword) {
    return (
      <CredentialsModal
        title="Account created"
        email={createdEmail}
        password={generatedPassword}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-serif text-[20px] font-black text-[#1a1a2e]">New User Manager</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
            <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Chanda Mwila" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="name@example.com" type="email" />
            <Field label="Phone (optional)" value={phone} onChange={setPhone} placeholder="+260…" />

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                Access
              </p>
              <div className="space-y-2">
                {PERMISSION_OPTIONS.map((p) => (
                  <label
                    key={p.code}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      permissions.includes(p.code)
                        ? 'border-[#C9973A] bg-[#fdf6e9]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(p.code)}
                      onChange={() => togglePermission(p.code)}
                      className="mt-0.5 w-4 h-4 accent-[#C9973A]"
                    />
                    <span>
                      <span className="block text-[13px] font-bold text-[#1a1a2e]">{p.label}</span>
                      <span className="block text-[11px] text-slate-400">{p.blurb}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-[12px] font-semibold text-rose-500">{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#C9973A] text-white text-[12px] font-black uppercase tracking-widest hover:bg-[#b3852f] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create account
            </button>
        </div>
      </div>
    </div>
  );
}

/**
 * One-time credentials modal — shown after account creation and after a
 * password reset. Copy puts ONLY the password on the clipboard (what the
 * label promises); Share hands the full sign-in details (console link,
 * email, temporary password) to the native share sheet, falling back to
 * copying those details where sharing isn't available.
 */
function CredentialsModal({
  title,
  email,
  password,
  onClose,
}: {
  title: string;
  email: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sharedCopied, setSharedCopied] = useState(false);

  const details = [
    'Nyuwe Admin Console',
    `Sign in: ${window.location.origin}/login`,
    `Email: ${email}`,
    `Temporary password: ${password}`,
    "(You'll be asked to set a new password at first login.)",
  ].join('\n');

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the password stays on screen to copy by hand */
    }
  };

  const shareDetails = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Nyuwe Admin Console', text: details });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // share sheet dismissed — not an error
        /* share failed — fall through to the clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(details);
      setSharedCopied(true);
      setTimeout(() => setSharedCopied(false), 2000);
    } catch {
      /* clipboard unavailable — details remain visible on screen */
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h3 className="font-serif text-[20px] font-black text-[#1a1a2e]">{title}</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#fdf6e9] border border-[#ecd9b3]">
            <KeyRound className="w-5 h-5 text-[#b07f24] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#8a6118]">
                One-time password — save it now
              </p>
              <p className="text-[12px] text-[#a3782a] mt-0.5 leading-snug">
                It is never shown again. {email} must change it at first sign-in.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[16px] font-bold text-[#1a1a2e] tracking-wider text-center select-all">
              {password}
            </code>
            <button
              onClick={copyPassword}
              title="Copy the password only"
              className="px-4 py-3 bg-[#C9973A] text-white rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-[#b3852f] transition-all flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div>
            <button
              onClick={shareDetails}
              className="w-full py-3 rounded-xl bg-[#fdf6e9] border border-[#ecd9b3] text-[12px] font-black uppercase tracking-wider text-[#8a6118] hover:bg-[#f8ecd5] transition-all flex items-center justify-center gap-2"
            >
              {sharedCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {sharedCopied ? 'Details copied — paste anywhere' : 'Share sign-in details'}
            </button>
            <p className="mt-1.5 text-[11px] text-slate-400 text-center leading-snug">
              Sends the sign-in link, email and password together.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-500 hover:text-[#1a1a2e] hover:border-[#C9973A]/40 transition-all"
          >
            Done — I've saved the password
          </button>
        </div>
      </div>
    </div>
  );
}

function EditAccessModal({
  manager,
  onClose,
  onSaved,
}: {
  manager: AdminManagerUser;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [permissions, setPermissions] = useState<string[]>(manager.permissions ?? []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (code: string) =>
    setPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );

  const submit = async () => {
    if (permissions.length === 0) {
      setError('Grant at least one permission — or disable the account instead.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await adminService.updateManager(manager.id, { permissions });
      await onSaved();
    } catch (e: any) {
      setError(e?.message || 'Failed to update access');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-serif text-[18px] font-black text-[#1a1a2e]">
            Access — {manager.name || manager.email}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            {PERMISSION_OPTIONS.map((p) => (
              <label
                key={p.code}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  permissions.includes(p.code)
                    ? 'border-[#C9973A] bg-[#fdf6e9]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(p.code)}
                  onChange={() => toggle(p.code)}
                  className="mt-0.5 w-4 h-4 accent-[#C9973A]"
                />
                <span>
                  <span className="block text-[13px] font-bold text-[#1a1a2e]">{p.label}</span>
                  <span className="block text-[11px] text-slate-400">{p.blurb}</span>
                </span>
              </label>
            ))}
          </div>
          {error && <p className="text-[12px] font-semibold text-rose-500">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#C9973A] text-white text-[12px] font-black uppercase tracking-widest hover:bg-[#b3852f] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save access
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-medium focus:bg-white focus:border-[#C9973A]/40 outline-none"
      />
    </div>
  );
}
