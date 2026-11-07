'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  Filter,
  Shield,
  KeyRound,
  RotateCcw,
  LogOut,
  Trash2,
  Copy,
  Check,
  Lock,
  X,
  Mail,
  Calendar,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Clock,
  Sliders,
} from 'lucide-react';
import { ReauthModal } from '@/components/admin/reauth-modal';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface UserRecord {
  id: string;
  name: string | null;
  email: string;
  role: string;
  roleName: string;
  status: 'active' | 'disabled';
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
  mustSetup2Fa: boolean;
  customPermissions: string[];
  leadScope: {
    statuses?: string[];
    assignedToMe?: boolean;
    sources?: string[];
    maxAgeDays?: number;
  } | null;
  expiresAt: number | null;
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
  activeSessionsCount: number;
}

interface RoleRecord {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  permissions: string[];
}

export default function AdminUsersPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  const cached = getCachedData<UserRecord[]>('users_list');
  const [users, setUsers] = useState<UserRecord[]>(cached || []);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(!cached);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    email: string;
    temporaryPassword?: string;
    inviteUrl?: string;
  } | null>(null);

  // Reauth Guard state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [actionTitle, setActionTitle] = useState('Vault Authorization Required');
  const [actionDesc, setActionDesc] = useState('');

  // Form states for New User
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('manager');
  const [newStatus, setNewStatus] = useState<'active' | 'disabled'>('active');
  const [newCreateInvite, setNewCreateInvite] = useState(false);
  const [newScopeStatuses, setNewScopeStatuses] = useState<string[]>([]);
  const [newScopeAssignedOnly, setNewScopeAssignedOnly] = useState(false);
  const [newScopeMaxAge, setNewScopeMaxAge] = useState<number | ''>('');
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Escape key closes open modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tempPasswordResult) setTempPasswordResult(null);
        if (createModalOpen) setCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tempPasswordResult, createModalOpen]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&role=${roleFilter}&status=${statusFilter}`);
      if (res.status === 403) {
        window.location.href = `/${adminPath}/403`;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setCachedData('users_list', data.users || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [adminPath, search, roleFilter, statusFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const executeWithReauth = (action: () => Promise<void>, title: string, desc: string) => {
    setActionTitle(title);
    setActionDesc(desc);
    setPendingAction(() => action);
    setReauthOpen(true);
  };

  const handleReauthSuccess = async () => {
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
    fetchUsers();
  };

  // Submit Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    executeWithReauth(
      async () => {
        try {
          setFormSubmitting(true);
          const leadScopePayload: Record<string, any> = {};
          if (newScopeStatuses.length > 0) leadScopePayload.statuses = newScopeStatuses;
          if (newScopeAssignedOnly) leadScopePayload.assignedToMe = true;
          if (typeof newScopeMaxAge === 'number') leadScopePayload.maxAgeDays = newScopeMaxAge;

          const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newName,
              email: newEmail,
              role: newRole,
              status: newStatus,
              createInvite: newCreateInvite,
              leadScope: Object.keys(leadScopePayload).length > 0 ? leadScopePayload : undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setFormError(data.error || 'Failed to create user');
          } else {
            setCreateModalOpen(false);
            setTempPasswordResult({
              email: newEmail,
              temporaryPassword: data.temporaryPassword,
              inviteUrl: data.inviteUrl,
            });
            // Reset form
            setNewName('');
            setNewEmail('');
            setNewRole('manager');
            setNewScopeStatuses([]);
            setNewScopeAssignedOnly(false);
            setNewScopeMaxAge('');
            fetchUsers();
          }
        } catch {
          setFormError('Network failure creating user');
        } finally {
          setFormSubmitting(false);
        }
      },
      'Confirm User Creation',
      `Authorization required to provision administrative credentials for ${newEmail}.`
    );
  };

  // Reset Password Action
  const handleResetPassword = (user: UserRecord) => {
    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.temporaryPassword) {
          setTempPasswordResult({
            email: user.email,
            temporaryPassword: data.temporaryPassword,
          });
          fetchUsers();
        } else {
          alert(data.error || 'Password reset failed');
        }
      },
      'Reset User Password',
      `Confirm generating a new single-use temporary password for ${user.email}. All existing sessions will be terminated.`
    );
  };

  // Reset 2FA Action
  const handleReset2Fa = (user: UserRecord) => {
    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}/reset-2fa`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          alert(`2FA reset successful. ${user.email} will be required to re-configure 2FA upon next login.`);
          fetchUsers();
        } else {
          alert(data.error || '2FA reset failed');
        }
      },
      'Reset Two-Factor Authentication',
      `Confirm revoking the 2FA secret for ${user.email}.`
    );
  };

  // Revoke Sessions Action
  const handleRevokeSessions = (user: UserRecord) => {
    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}/revoke-sessions`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          fetchUsers();
        } else {
          alert(data.error || 'Failed to revoke sessions');
        }
      },
      'Force Log Out User',
      `Confirm instantly killing all active sessions for ${user.email}.`
    );
  };

  // Generate Invite Link Action
  const handleGenerateInvite = (user: UserRecord) => {
    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}/invite`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.inviteUrl) {
          setTempPasswordResult({
            email: user.email,
            inviteUrl: data.inviteUrl,
          });
        } else {
          alert(data.error || 'Failed to generate invite');
        }
      },
      'Generate Single-Use Invite Link',
      `Confirm generating a 24-hour onboarding link for ${user.email}.`
    );
  };

  // Soft Delete Action
  const handleDeleteUser = (user: UserRecord) => {
    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          fetchUsers();
        } else {
          alert(data.error || 'Failed to delete user');
        }
      },
      'Confirm User Deletion',
      `Confirm permanently revoking access for ${user.email}. Account will be soft-deleted and all sessions terminated.`
    );
  };

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
      <ReauthModal
        isOpen={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onSuccess={handleReauthSuccess}
        title={actionTitle}
        description={actionDesc}
      />

      {/* ================= TOP ACTION BAR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
            Team & User Access
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Super Admin control over team members, custom permissions, and granular lead scopes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="h-9 px-3.5 rounded-[12px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 px-4 rounded-[12px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* ================= FILTER & SEARCH BAR ================= */}
      <div className="p-3 rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5a6265] dark:text-[#a09d93]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team members by name or email..."
            className="w-full h-9 pl-9 pr-4 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] text-xs border border-transparent focus:border-[#ff4f31] outline-none text-[#12110b] dark:text-[#f4efea]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] text-xs border border-transparent outline-none text-[#12110b] dark:text-[#f4efea] font-medium"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] text-xs border border-transparent outline-none text-[#12110b] dark:text-[#f4efea] font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* ================= USERS TABLE ================= */}
      <div className="rounded-[16px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.015] text-[11px] font-semibold text-[#5a6265] dark:text-[#a09d93] uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role & Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">2FA State</th>
                <th className="py-3 px-4">Active Sessions</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.05] text-xs">
              {users.map((u) => {
                const isSuper = u.role === 'superadmin';
                return (
                  <tr key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#ff4f31] to-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                          {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#12110b] dark:text-[#f4efea] leading-tight">
                            {u.name || 'Unnamed User'}
                          </span>
                          <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93] font-mono">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role & Scope */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold w-max ${
                          isSuper
                            ? 'bg-[#ff4f31]/10 text-[#ff4f31]'
                            : 'bg-black/5 dark:bg-white/5 text-[#12110b] dark:text-[#f4efea]'
                        }`}>
                          {u.roleName}
                        </span>
                        {u.leadScope && (
                          <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">
                            Scope: {u.leadScope.statuses?.join(', ') || 'All statuses'}
                            {u.leadScope.assignedToMe ? ' (Assigned only)' : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                        u.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                        {u.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    {/* 2FA State */}
                    <td className="py-3.5 px-4">
                      {u.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-medium text-[11px]">
                          <Shield className="h-3 w-3" /> Enforced
                        </span>
                      ) : u.mustSetup2Fa ? (
                        <span className="inline-flex items-center gap-1 text-amber-500 font-medium text-[11px]">
                          <Clock className="h-3 w-3" /> Setup on Next Login
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">Disabled</span>
                      )}
                    </td>

                    {/* Active Sessions */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono tabular-nums font-semibold text-[#12110b] dark:text-[#f4efea]">
                        {u.activeSessionsCount}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4 text-[#5a6265] dark:text-[#a09d93] text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u)}
                          title="Generate New Temporary Password"
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-[#ff4f31] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateInvite(u)}
                          title="Generate 24h Invite Link"
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-blue-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReset2Fa(u)}
                          title="Reset 2FA Secret"
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-amber-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRevokeSessions(u)}
                          title="Force Log Out (Kill All Sessions)"
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-orange-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          title="Soft-Delete User"
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5a6265] dark:text-[#a09d93]">
                    No users matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ONE-TIME TEMPORARY PASSWORD / INVITE MODAL ================= */}
      {tempPasswordResult && (
        <div
          onClick={() => setTempPasswordResult(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[24px] bg-[#181712] p-6 shadow-2xl border border-white/10 text-[#f4efea] flex flex-col gap-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Credentials Generated</h3>
                  <p className="text-[11px] text-[#a09d93]">{tempPasswordResult.email}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTempPasswordResult(null);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
            </div>

            {tempPasswordResult.temporaryPassword && (
              <div>
                <label className="block text-xs font-semibold text-[#5a6265] dark:text-[#a09d93] mb-1.5">
                  One-Time Temporary Password
                </label>
                <div className="flex items-center gap-2 p-3 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
                  <code className="flex-1 font-mono text-xs font-bold text-[#ff4f31] break-all select-all">
                    {tempPasswordResult.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tempPasswordResult.temporaryPassword!)}
                    className="h-8 px-3 rounded-lg bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="mt-2 p-2.5 rounded-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>This temporary password is never stored in plaintext and will <strong>NEVER</strong> be displayed again. Share it securely with the user.</span>
                </div>
              </div>
            )}

            {tempPasswordResult.inviteUrl && (
              <div>
                <label className="block text-xs font-semibold text-[#5a6265] dark:text-[#a09d93] mb-1.5">
                  Single-Use 24-Hour Invite Link
                </label>
                <div className="flex items-center gap-2 p-3 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
                  <input
                    type="text"
                    readOnly
                    value={tempPasswordResult.inviteUrl}
                    className="flex-1 font-mono text-xs bg-transparent outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tempPasswordResult.inviteUrl!)}
                    className="h-8 px-3 rounded-lg bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setTempPasswordResult(null)}
              className="mt-2 w-full h-[40px] rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* ================= CREATE USER MODAL ================= */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto py-8"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-[24px] bg-[#181712] p-6 shadow-2xl border border-white/10 text-[#f4efea] flex flex-col gap-4 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#f4efea]">Create Administrative User</h3>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCreateModalOpen(false);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-colors cursor-pointer z-30"
                aria-label="Close modal"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Varun Singh"
                  className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="team@frxcxstudio.com"
                  className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Role Assignment</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Account Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              {/* Granular Lead Scope Accordion */}
              <div className="p-3.5 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.07] flex flex-col gap-2.5">
                <span className="text-xs font-bold text-[#ff4f31] flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />
                  Granular Lead Scoping (Database-Enforced)
                </span>
                <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93]">
                  Restrict the statuses and leads this user is permitted to view, search, export, or count in KPI widgets.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['new', 'contacted', 'in_progress', 'won', 'lost', 'spam'].map((st) => {
                    const isSelected = newScopeStatuses.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewScopeStatuses(newScopeStatuses.filter((s) => s !== st));
                          } else {
                            setNewScopeStatuses([...newScopeStatuses, st]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b]'
                            : 'bg-black/5 dark:bg-white/5 text-[#5a6265] dark:text-[#a09d93]'
                        }`}
                      >
                        {st.replace('_', ' ').toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newScopeAssignedOnly}
                    onChange={(e) => setNewScopeAssignedOnly(e.target.checked)}
                    className="accent-[#ff4f31]"
                  />
                  <span>Restrict to assigned leads only (Assigned to me)</span>
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={newCreateInvite}
                  onChange={(e) => setNewCreateInvite(e.target.checked)}
                  className="accent-[#ff4f31]"
                />
                <span>Generate 24-hour Invite Link (instead of temporary password)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="h-10 px-4 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="h-10 px-5 rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white transition-colors cursor-pointer"
                >
                  {formSubmitting ? 'Creating...' : 'Create User & Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
