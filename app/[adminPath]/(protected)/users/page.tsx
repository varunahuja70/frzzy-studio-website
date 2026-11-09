'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Trash2,
  RotateCcw,
  ExternalLink,
  Search,
  Check,
  Copy,
  AlertTriangle,
  X,
  LogOut,
  Clock,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Sliders,
  Send,
  MailCheck,
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
  isPrimaryOwner?: boolean;
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
  const [createStep, setCreateStep] = useState<'form' | 'otp'>('form');
  const [verificationId, setVerificationId] = useState('');
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [stagedTempPassword, setStagedTempPassword] = useState<string | undefined>(undefined);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

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
  const [passwordType, setPasswordType] = useState<'random' | 'custom'>('random');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomPassword, setShowCustomPassword] = useState(false);
  const [newScopeStatuses, setNewScopeStatuses] = useState<string[]>([]);
  const [newScopeAssignedOnly, setNewScopeAssignedOnly] = useState(false);
  const [newScopeMaxAge, setNewScopeMaxAge] = useState<number | ''>('');
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  // Fetch Users
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
        setUsers(data.users);
        setCachedData('users_list', data.users);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
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
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  // Helper to trigger Reauth Guard if needed
  const executeWithReauth = (action: () => Promise<void>, title: string, desc: string) => {
    setActionTitle(title);
    setActionDesc(desc);
    setPendingAction(() => action);
    setReauthOpen(true);
  };

  const handleReauthSuccess = async () => {
    setReauthOpen(false);
    if (pendingAction) {
      await pendingAction();
      setPendingAction(null);
    }
    fetchUsers();
  };

  // 6-digit OTP input handlers
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setOtpError('');

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const prevInput = document.getElementById(`otp-digit-${index - 1}`);
        prevInput?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      document.getElementById(`otp-digit-${index - 1}`)?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      document.getElementById(`otp-digit-${index + 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    const nextIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-digit-${nextIdx}`)?.focus();
  };

  // Step 1: Submit Form to initiate OTP
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
              passwordType,
              customPassword: passwordType === 'custom' ? customPassword.trim() : undefined,
              leadScope: Object.keys(leadScopePayload).length > 0 ? leadScopePayload : undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setFormError(data.error || 'Failed to initiate user creation');
          } else if (data.requiresOtp) {
            setVerificationId(data.verificationId);
            setOtpTargetEmail(data.email);
            setStagedTempPassword(data.temporaryPassword);
            setOtpDigits(['', '', '', '', '', '']);
            setOtpError('');
            setCreateStep('otp');
            setResendCooldown(30);
            setTimeout(() => {
              document.getElementById('otp-digit-0')?.focus();
            }, 100);
          }
        } catch {
          setFormError('Network failure connecting to Vault server');
        } finally {
          setFormSubmitting(false);
        }
      },
      'Authorize User Provisioning',
      `Administrative privilege required to configure account and dispatch verification code to ${newEmail}.`
    );
  };

  // Step 2: Verify OTP and finalize creation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setOtpError('Please enter all 6 digits of the code');
      return;
    }

    try {
      setOtpSubmitting(true);
      setOtpError('');

      const res = await fetch('/api/admin/users/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId,
          otp: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOtpError(data.error || 'Verification failed. Please re-check the code.');
      } else {
        // Success!
        setCreateModalOpen(false);
        setTempPasswordResult({
          email: otpTargetEmail,
          temporaryPassword: stagedTempPassword,
        });

        // Reset all form state
        setCreateStep('form');
        setNewName('');
        setNewEmail('');
        setNewRole('manager');
        setPasswordType('random');
        setCustomPassword('');
        setNewScopeStatuses([]);
        setNewScopeAssignedOnly(false);
        setNewScopeMaxAge('');
        setVerificationId('');
        setOtpDigits(['', '', '', '', '', '']);

        fetchUsers();
      }
    } catch {
      setOtpError('Network error verifying code');
    } finally {
      setOtpSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !verificationId) return;

    try {
      setOtpError('');
      const res = await fetch('/api/admin/users/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId }),
      });

      const data = await res.json();
      if (res.ok) {
        setResendCooldown(30);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => document.getElementById('otp-digit-0')?.focus(), 50);
      } else {
        setOtpError(data.error || 'Failed to resend code');
      }
    } catch {
      setOtpError('Failed to dispatch code');
    }
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
        } else {
          alert(data.error || 'Failed to reset password');
        }
      },
      'Force Password Reset',
      `Confirm generating a new temporary credential for ${user.email}.`
    );
  };

  // Reset 2FA Secret Action
  const handleReset2Fa = (user: UserRecord) => {
    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/users/${user.id}/reset-2fa`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
          fetchUsers();
        } else {
          alert(data.error || 'Failed to reset 2FA');
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

  // Permanent Delete Action
  const handleDeleteUser = (user: UserRecord) => {
    if (user.isPrimaryOwner || user.email?.toLowerCase() === 'vk679028@gmail.com') {
      alert('This user is protected and cannot be deleted.');
      return;
    }

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
      'Permanently Delete Account',
      `Warning: This will permanently remove ${user.email} from Supabase Auth, profiles, and Vault. This cannot be undone.`
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Reauth Modal Guard */}
      <ReauthModal
        isOpen={reauthOpen}
        title={actionTitle}
        description={actionDesc}
        onClose={() => {
          setReauthOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handleReauthSuccess}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#12110b] dark:text-[#f4efea] flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[#26D67C]" />
            Team & User Access
          </h1>
          <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1">
            Super Admin access controls, role assignments, OTP verification, and live Supabase synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            className="h-9 px-3 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer text-[#12110b] dark:text-[#f4efea]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateStep('form');
              setFormError('');
              setCreateModalOpen(true);
            }}
            className="h-9 px-4 rounded-full bg-[#26D67C] hover:bg-[#20b86a] text-black text-xs font-bold transition-all shadow-[0_0_20px_rgba(38,214,124,0.3)] flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team members by name or email..."
            className="w-full h-9 pl-9 pr-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-transparent focus:border-[#26D67C] text-xs outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-xs outline-none cursor-pointer flex-1 sm:flex-none"
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
            className="h-9 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-xs outline-none cursor-pointer flex-1 sm:flex-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-[20px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.08] text-[#5a6265] dark:text-[#a09d93] uppercase font-bold tracking-wider text-[10px]">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role & Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">2FA State</th>
                <th className="py-3 px-4">Active Sessions</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
              {users.map((u) => {
                const isSuper = u.role === 'superadmin';
                return (
                  <tr key={u.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    {/* User Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isSuper
                            ? 'bg-[#ff4f31] text-white'
                            : 'bg-black/5 dark:bg-white/5 text-[#12110b] dark:text-[#f4efea]'
                        }`}>
                          {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#12110b] dark:text-[#f4efea] flex items-center gap-1.5">
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
                          className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-[#26D67C] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
                          title="Permanently Delete User"
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
                <div className="h-8 w-8 rounded-xl bg-[#26D67C]/10 text-[#26D67C] flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Account Created & Verified</h3>
                  <p className="text-[11px] text-[#a09d93]">{tempPasswordResult.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTempPasswordResult(null)}
                className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 text-[#a09d93] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {tempPasswordResult.temporaryPassword && (
              <div>
                <label className="block text-xs font-semibold text-[#5a6265] dark:text-[#a09d93] mb-1.5">
                  Confirmed Password (Saved in Supabase Auth)
                </label>
                <div className="flex items-center gap-2 p-3 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08]">
                  <input
                    type="text"
                    readOnly
                    value={tempPasswordResult.temporaryPassword}
                    className="flex-1 font-mono text-sm font-bold text-[#26D67C] bg-transparent outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tempPasswordResult.temporaryPassword!)}
                    className="h-8 px-3 rounded-lg bg-[#26D67C] text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
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
              className="mt-2 w-full h-[40px] rounded-full bg-[#26D67C] text-black text-xs font-bold cursor-pointer"
            >
              Done & Return to Vault
            </button>
          </div>
        </div>
      )}

      {/* ================= CREATE USER MODAL WITH 2-STEP EMAIL OTP ================= */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto py-8"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className={`w-full ${createStep === 'otp' ? 'max-w-md' : 'max-w-lg'} rounded-[28px] bg-[#101216] p-7 sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.8)] border border-white/[0.08] text-[#f4efea] flex flex-col gap-5 relative z-10 transition-all duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#26D67C]/10 border border-[#26D67C]/20 text-[#26D67C] flex items-center justify-center">
                  {createStep === 'form' ? <UserPlus className="h-4 w-4" /> : <MailCheck className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#f4efea]">
                    {createStep === 'form' ? 'Add Team Member' : 'Email Verification'}
                  </h3>
                  <p className="text-xs text-[#8e95a0]">
                    {createStep === 'form'
                      ? 'Configure member profile and credentials'
                      : `Code sent to ${otpTargetEmail}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.1] text-[#8e95a0] hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Banner */}
            {(formError || otpError) && (
              <div className="p-3 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{formError || otpError}</span>
              </div>
            )}

            {/* STEP 1: USER DETAILS FORM */}
            {createStep === 'form' ? (
              <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#26D67C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address (Receives Verification OTP)</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="team@frzzy.studio"
                    className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#26D67C]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Role Assignment</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#26D67C]"
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
                      className="w-full h-10 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#26D67C]"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                {/* Password Mode Selector */}
                <div className="p-3.5 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.07] flex flex-col gap-2.5">
                  <label className="block text-xs font-bold text-[#f4efea] flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-[#26D67C]" />
                    Password & Credentials Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordType('random')}
                      className={`h-10 px-3 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        passwordType === 'random'
                          ? 'bg-[#26D67C]/15 border-[#26D67C] text-[#26D67C]'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-[#a09d93]'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Random Password</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasswordType('custom')}
                      className={`h-10 px-3 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        passwordType === 'custom'
                          ? 'bg-[#26D67C]/15 border-[#26D67C] text-[#26D67C]'
                          : 'bg-black/[0.03] dark:bg-white/[0.04] border-black/[0.08] dark:border-white/[0.08] text-[#a09d93]'
                      }`}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Custom Password</span>
                    </button>
                  </div>

                  {passwordType === 'custom' ? (
                    <div className="pt-1">
                      <label className="block text-[11px] font-semibold text-[#a09d93] mb-1">
                        Custom Password (min. 8 characters)
                      </label>
                      <div className="relative">
                        <input
                          type={showCustomPassword ? 'text' : 'password'}
                          required={passwordType === 'custom'}
                          minLength={8}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Enter password..."
                          className="w-full h-10 pl-3.5 pr-10 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#26D67C]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustomPassword(!showCustomPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a09d93] hover:text-[#f4efea]"
                        >
                          {showCustomPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#a09d93]">
                      A high-entropy 18-character password will be generated upon OTP verification and saved into Supabase.
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-[#26D67C]">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>Synchronizes in real time with Supabase Auth & public.profiles</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="h-10 px-5 rounded-full border border-white/10 text-xs font-semibold hover:bg-white/5 transition-colors cursor-pointer text-[#a09d93] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="h-10 px-6 rounded-full bg-[#26D67C] hover:bg-[#20b86a] disabled:opacity-50 text-black text-xs font-bold transition-all shadow-[0_0_24px_rgba(38,214,124,0.3)] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{formSubmitting ? 'Sending Code...' : 'Send Verification Code'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: ULTRA-PREMIUM MINIMAL OTP VERIFICATION */
              <form onSubmit={handleVerifyOtp} className="flex flex-col items-center text-center py-2">
                <div className="h-14 w-14 rounded-2xl bg-[#26D67C]/10 border border-[#26D67C]/25 flex items-center justify-center text-[#26D67C] mb-4 shadow-[0_0_24px_rgba(38,214,124,0.15)]">
                  <MailCheck className="h-7 w-7" />
                </div>

                <h4 className="text-lg font-bold text-white tracking-tight mb-1.5">
                  Check your email
                </h4>
                <p className="text-xs text-[#8e95a0] max-w-sm mb-6 leading-relaxed">
                  We dispatched a 6-digit verification code to <span className="font-semibold text-white">{otpTargetEmail}</span>. Enter the code below to complete setup.
                </p>

                {/* 6 Individual Luxury Digit Cells */}
                <div className="flex items-center justify-center gap-2 sm:gap-2.5 mb-5 w-full">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      id={`otp-digit-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={otpDigits[index] || ''}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-14 sm:w-12 sm:h-15 text-center text-xl font-bold font-mono rounded-[14px] bg-white/[0.03] border border-white/10 text-white focus:border-[#26D67C] focus:bg-[#26D67C]/[0.02] focus:ring-4 focus:ring-[#26D67C]/15 outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="text-center text-xs font-semibold text-rose-400 mb-4 flex items-center justify-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="text-center mb-6 text-xs text-[#8e95a0]">
                  Didn't receive the email?{' '}
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handleResendOtp}
                    className={`font-semibold transition-colors cursor-pointer ${
                      resendCooldown > 0 ? 'text-[#5a6265] cursor-not-allowed' : 'text-[#26D67C] hover:underline'
                    }`}
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 w-full pt-1">
                  <button
                    type="submit"
                    disabled={otpSubmitting || otpDigits.join('').length !== 6}
                    className="h-11 w-full rounded-full bg-[#26D67C] hover:bg-[#20b86a] disabled:opacity-40 text-black text-xs font-bold tracking-wide transition-all shadow-[0_0_24px_rgba(38,214,124,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>{otpSubmitting ? 'Verifying...' : 'Verify & Provision User'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateStep('form')}
                    className="text-xs text-[#8e95a0] hover:text-white py-1 transition-colors cursor-pointer"
                  >
                    ← Back to Details
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
