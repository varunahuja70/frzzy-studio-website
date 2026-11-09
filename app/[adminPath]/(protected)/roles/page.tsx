'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import {
  KeyRound,
  Shield,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  Users,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react';
import { ALL_PERMISSIONS, PERMISSION_METADATA, PermissionKey } from '@/lib/auth/permissions-constants';
import { ReauthModal } from '@/components/admin/reauth-modal';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface RoleItem {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  permissions: string[];
  defaultLeadScope: any;
  assignedUsersCount: number;
}

export default function AdminRolesPage(props: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = use(props.params);

  const cached = getCachedData<RoleItem[]>('roles_list');
  const [roles, setRoles] = useState<RoleItem[]>(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Reauth Guard state
  const [reauthOpen, setReauthOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [actionTitle, setActionTitle] = useState('Authorization Required');
  const [actionDesc, setActionDesc] = useState('');

  // Form states
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Escape key handling
  useEffect(() => {
    if (!createModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createModalOpen]);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/roles');
      if (res.status === 403) {
        window.location.href = `/${adminPath}/403`;
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
        setCachedData('roles_list', data.roles || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [adminPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRoles();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRoles]);

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
    fetchRoles();
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (selectedPermissions.length === 0) {
      setFormError('Please select at least one permission.');
      return;
    }

    executeWithReauth(
      async () => {
        try {
          setSubmitting(true);
          const res = await fetch('/api/admin/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newRoleName,
              description: newRoleDesc,
              permissions: selectedPermissions,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setFormError(data.error || 'Failed to create role');
          } else {
            setCreateModalOpen(false);
            setNewRoleName('');
            setNewRoleDesc('');
            setSelectedPermissions([]);
            fetchRoles();
          }
        } catch {
          setFormError('Connection failure creating role');
        } finally {
          setSubmitting(false);
        }
      },
      'Create Custom Role',
      `Authorization required to define new role "${newRoleName}".`
    );
  };

  const handleDeleteRole = (role: RoleItem) => {
    if (role.isBuiltIn) return;

    executeWithReauth(
      async () => {
        const res = await fetch(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
          fetchRoles();
        } else {
          alert(data.error || 'Failed to delete role');
        }
      },
      'Delete Custom Role',
      `Confirm removing custom role "${role.name}".`
    );
  };

  const togglePermission = (key: string) => {
    if (key === 'users:manage') return; // Cannot delegate users:manage
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  // Group permissions by category for modal
  const permissionGroups: Record<string, PermissionKey[]> = {};
  ALL_PERMISSIONS.forEach((p) => {
    const meta = PERMISSION_METADATA[p];
    if (!permissionGroups[meta.group]) permissionGroups[meta.group] = [];
    permissionGroups[meta.group].push(p);
  });

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
            Role & Permission Architecture
          </h1>
          <p className="text-xs sm:text-[13px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
            Granular access control templates and custom security profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchRoles}
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
            <Plus className="h-3.5 w-3.5" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* ================= ROLES GRID ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {roles.map((r) => {
          return (
            <div
              key={r.id}
              className="p-5 rounded-[18px] bg-white dark:bg-[#181712] border border-black/[0.06] dark:border-white/[0.07] shadow-xs flex flex-col justify-between transition-all hover:border-black/15 dark:hover:border-white/15"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    r.isBuiltIn
                      ? 'bg-blue-500/10 text-blue-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {r.isBuiltIn ? 'Built-In Template' : 'Custom Role'}
                  </span>

                  {!r.isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(r)}
                      title="Delete Role"
                      className="h-6 w-6 rounded flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="text-[16px] font-bold text-[#12110b] dark:text-[#f4efea] tracking-tight">
                  {r.name}
                </h3>
                <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-1 leading-relaxed min-h-[36px]">
                  {r.description || 'Custom administrative permissions profile.'}
                </p>

                {/* Assigned Users Badge */}
                <div className="flex items-center gap-1.5 mt-3 text-xs text-[#5a6265] dark:text-[#a09d93]">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold text-[#12110b] dark:text-[#f4efea] tabular-nums">
                    {r.assignedUsersCount}
                  </span>
                  <span>assigned user{r.assignedUsersCount === 1 ? '' : 's'}</span>
                </div>
              </div>

              {/* Permissions Summary Badges */}
              <div className="mt-4 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
                <span className="text-[10px] font-bold uppercase text-[#5a6265] dark:text-[#a09d93] tracking-wider block mb-1.5">
                  Permissions ({r.permissions.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {r.permissions.slice(0, 4).map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.04] text-[10px] font-medium text-[#12110b] dark:text-[#f4efea]"
                    >
                      {p.split(':')[1] || p}
                    </span>
                  ))}
                  {r.permissions.length > 4 && (
                    <span className="px-1.5 py-0.5 rounded bg-black/[0.03] dark:bg-white/[0.04] text-[10px] font-semibold text-[#5a6265] dark:text-[#a09d93]">
                      +{r.permissions.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= CREATE ROLE MODAL ================= */}
      {createModalOpen && (
        <div
          onClick={() => setCreateModalOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto py-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-[24px] bg-[#181712] p-6 shadow-2xl border border-white/10 text-[#f4efea] flex flex-col gap-4 max-h-[90vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center">
                  <KeyRound className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Create Custom Security Role</h3>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCreateModalOpen(false);
                }}
                className="h-8 w-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.15] text-[#a09d93] hover:text-white border border-white/10 transition-all cursor-pointer z-30"
              >
                <X className="h-4 w-4 pointer-events-none" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-[12px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRole} className="flex flex-col gap-4 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Regional Pipeline Coordinator"
                  className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Summary of responsibilities and scope..."
                  className="w-full h-10 px-3.5 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.08] dark:border-white/[0.08] text-xs outline-none focus:border-[#ff4f31]"
                />
              </div>

              {/* Granular Permission Checklist */}
              <div>
                <span className="block text-xs font-bold text-[#ff4f31] mb-2 uppercase tracking-wider">
                  Permission Matrix ({selectedPermissions.length} selected)
                </span>

                <div className="flex flex-col gap-4">
                  {Object.entries(permissionGroups).map(([groupName, groupPerms]) => (
                    <div
                      key={groupName}
                      className="p-3 rounded-[14px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.06]"
                    >
                      <span className="text-xs font-bold block mb-2">{groupName}</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {groupPerms.map((permKey) => {
                          const meta = PERMISSION_METADATA[permKey];
                          const isChecked = selectedPermissions.includes(permKey);
                          const isLocked = permKey === 'users:manage';

                          return (
                            <label
                              key={permKey}
                              className={`flex items-start gap-2.5 p-2 rounded-[10px] text-xs transition-colors ${
                                isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={isLocked}
                                checked={isChecked}
                                onChange={() => togglePermission(permKey)}
                                className="mt-0.5 accent-[#ff4f31]"
                              />
                              <div className="flex flex-col">
                                <span className="font-semibold">{meta.label}</span>
                                <span className="text-[10.5px] text-[#5a6265] dark:text-[#a09d93]">
                                  {meta.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="h-10 px-4 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-10 px-5 rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white transition-colors cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
