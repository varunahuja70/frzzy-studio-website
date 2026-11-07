'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  Search,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Shield,
  User,
  Sliders,
  UserCheck,
  KeyRound,
  FileSpreadsheet,
  CheckSquare,
  Briefcase,
  Inbox,
  Building2,
  Lock,
  Palette,
  Star,
} from 'lucide-react';

interface AdminLayoutShellProps {
  children: React.ReactNode;
  userEmail?: string;
  adminPath: string;
}

export function AdminLayoutShell({
  children,
  userEmail = '',
  adminPath,
}: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar states
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);

  // Optimistic Navigation State for instant (<100ms) UI updates
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(false);
    setOptimisticPath(null);
  }, [pathname]);

  // Top bar dropdowns
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Range selector
  const [activeRange, setActiveRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');

  // Dynamic theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // New leads unread count badge
  const [unreadLeadsCount, setUnreadLeadsCount] = useState<number>(0);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync theme with document: Always enforce pure dark mode by default
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
  }, [theme]);

  // Keyboard shortcut Cmd+K or Ctrl+K & Close dropdowns on outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      } else if (e.key === 'Escape') {
        setSearchFocused(false);
        setNotificationsOpen(false);
        setProfileDropdownOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch unread leads badge on mount and 60s interval
  useEffect(() => {
    let isMounted = true;
    const fetchBadge = async () => {
      try {
        const res = await fetch('/api/admin/leads?status=new&limit=1');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.leads) {
            setUnreadLeadsCount(data.leads.length > 0 ? data.leads.length : 0);
          }
        }
      } catch {
        // Silently ignore badge fetch error
      }
    };
    fetchBadge();
    const interval = setInterval(fetchBadge, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Resilient Session Heartbeat: Keep session alive silently in the background
  useEffect(() => {
    const keepSessionAlive = () => {
      fetch('/api/admin/sessions', { method: 'PATCH' }).catch(() => {});
    };

    // Heartbeat every 5 minutes while dashboard is open
    const interval = setInterval(keepSessionAlive, 5 * 60 * 1000);

    // Refresh activity whenever user switches back to this tab or moves mouse/clicks
    window.addEventListener('focus', keepSessionAlive);

    // Initial ping on mount
    keepSessionAlive();

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', keepSessionAlive);
    };
  }, []);

  const [currentUser, setCurrentUser] = useState<{
    name: string | null;
    email: string;
    roleName: string;
    isSuperAdmin: boolean;
    permissions: string[];
  }>({
    name: null,
    email: userEmail,
    roleName: 'Super Admin',
    isSuperAdmin: true,
    permissions: ['users:manage', 'leads:export', 'audit:view', 'settings:view'],
  });

  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.email) {
          setCurrentUser({
            name: data.name,
            email: data.email,
            roleName: data.roleName || 'Staff',
            isSuperAdmin: Boolean(data.isSuperAdmin),
            permissions: data.permissions || [],
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push(`/${adminPath}/login`);
    }
  }, [adminPath, router]);

  const hasPerm = (p: string) => currentUser.isSuperAdmin || currentUser.permissions.includes(p);
  const activePath = optimisticPath || pathname;

  const navItems = [
    {
      name: 'Dashboard',
      href: `/${adminPath}`,
      icon: LayoutDashboard,
      active: activePath === `/${adminPath}`,
      badge: null,
      show: hasPerm('dashboard:view_analytics') || hasPerm('dashboard:view_kpis'),
    },
    {
      name: 'My Tasks',
      href: `/${adminPath}/tasks`,
      icon: CheckSquare,
      active: activePath.startsWith(`/${adminPath}/tasks`),
      badge: null,
      show: true,
    },
    {
      name: 'Work Items',
      href: `/${adminPath}/work-items`,
      icon: Briefcase,
      active: activePath.startsWith(`/${adminPath}/work-items`),
      badge: null,
      show: hasPerm('work_items:view') || hasPerm('work_items:view_all') || hasPerm('work_items:view_assigned'),
    },
    {
      name: 'Intake Inbox',
      href: `/${adminPath}/intake`,
      icon: Inbox,
      active: activePath.startsWith(`/${adminPath}/intake`),
      badge: null,
      show: hasPerm('intake:create') || hasPerm('work_items:create'),
    },
    {
      name: 'Leads',
      href: `/${adminPath}/leads`,
      icon: Users,
      active: activePath.startsWith(`/${adminPath}/leads`),
      badge: unreadLeadsCount > 0 ? `${unreadLeadsCount}` : null,
      show: hasPerm('leads:view'),
    },
    {
      name: 'Clients',
      href: `/${adminPath}/clients`,
      icon: Building2,
      active: activePath.startsWith(`/${adminPath}/clients`),
      badge: null,
      show: hasPerm('clients:view'),
    },
    {
      name: 'Lead Exports',
      href: `/${adminPath}/exports`,
      icon: FileSpreadsheet,
      active: activePath.startsWith(`/${adminPath}/exports`),
      badge: null,
      show: hasPerm('leads:export'),
    },
    {
      name: 'Team & Users',
      href: `/${adminPath}/users`,
      icon: UserCheck,
      active: activePath.startsWith(`/${adminPath}/users`),
      badge: null,
      show: hasPerm('users:manage'),
    },
    {
      name: 'Roles & Access',
      href: `/${adminPath}/roles`,
      icon: KeyRound,
      active: activePath.startsWith(`/${adminPath}/roles`),
      badge: null,
      show: hasPerm('users:manage'),
    },
    {
      name: 'Sessions & Security',
      href: `/${adminPath}/security`,
      icon: ShieldCheck,
      active: activePath.startsWith(`/${adminPath}/security`),
      badge: null,
      show: true,
    },
    {
      name: 'Audit Log',
      href: `/${adminPath}/audit`,
      icon: ClipboardList,
      active: activePath.startsWith(`/${adminPath}/audit`),
      badge: null,
      show: hasPerm('audit:view'),
    },
    {
      name: 'Reviews',
      href: `/${adminPath}/reviews`,
      icon: Star,
      active: activePath.startsWith(`/${adminPath}/reviews`),
      badge: null,
      show: hasPerm('settings:view'),
    },
    {
      name: 'Site Appearance',
      href: `/${adminPath}/appearance`,
      icon: Palette,
      active: activePath.startsWith(`/${adminPath}/appearance`),
      badge: null,
      show: hasPerm('settings:view'),
    },
    {
      name: 'Settings',
      href: `/${adminPath}/settings`,
      icon: Settings,
      active: activePath.startsWith(`/${adminPath}/settings`),
      badge: null,
      show: hasPerm('settings:view'),
    },
  ].filter((item) => item.show);

  const searchablePages = [
    { name: 'Dashboard', description: 'Metrics overview & conversion funnels', href: `/${adminPath}`, icon: LayoutDashboard },
    { name: 'Work Items', description: 'Manage customer deliverables & tasks', href: `/${adminPath}/work-items`, icon: Briefcase },
    { name: 'My Tasks', description: 'Assigned jobs & deliveries', href: `/${adminPath}/tasks`, icon: CheckSquare },
    { name: 'Intake Queue', description: 'Log incoming project requests', href: `/${adminPath}/intake`, icon: Inbox },
    { name: 'Clients Directory', description: 'Customer accounts & CRM records', href: `/${adminPath}/clients`, icon: Building2 },
    { name: 'Leads Pipeline', description: 'Inbound inquiries & status tracking', href: `/${adminPath}/leads`, icon: Users },
    { name: 'Lead Exports', description: 'Export client lists to XLSX/CSV', href: `/${adminPath}/exports`, icon: FileSpreadsheet },
    { name: 'Team & Users', description: 'Admin accounts & access controls', href: `/${adminPath}/users`, icon: UserCheck },
    { name: 'Roles & Access', description: 'Permissions & lead visibility scopes', href: `/${adminPath}/roles`, icon: KeyRound },
    { name: 'Sessions & Security', description: 'Active logins & hardware sessions', href: `/${adminPath}/security`, icon: ShieldCheck },
    { name: 'Audit Log', description: 'Immutable admin activity log', href: `/${adminPath}/audit`, icon: ClipboardList },
    { name: 'Reviews', description: 'Client reviews shown on the website', href: `/${adminPath}/reviews`, icon: Star },
    { name: 'Site Appearance', description: 'Public website palette, look, scroll & hero', href: `/${adminPath}/appearance`, icon: Palette },
    { name: 'Settings', description: 'Vault preferences & notifications', href: `/${adminPath}/settings`, icon: Settings },
  ];

  const filteredPages = searchQuery.trim()
    ? searchablePages.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchablePages;

  // Derive current page title for breadcrumb
  const currentNav = navItems.find((n) => n.active) || navItems[0];

  return (
    <div className="min-h-screen w-full bg-[#f4f3f0] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] flex flex-col font-sans transition-colors duration-300">
      {/* Top Thin Progress Bar for Immediate Click Feedback */}
      {isNavigating && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#ff4f31] via-amber-400 to-[#ff4f31] z-[9999] animate-pulse pointer-events-none"
        />
      )}

      {/* Main Framework Container */}
      <div className="flex-1 flex w-full relative">
        {/* ================= FIXED LEFT SIDEBAR (Linear / Stripe Quality) ================= */}
        {/* Desktop Fixed Sidebar */}
        <aside
          style={{ width: isRailCollapsed ? '72px' : '260px' }}
          className="hidden lg:flex fixed top-0 bottom-0 left-0 z-30 shrink-0 border-r border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#15140f] flex-col justify-between transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          {/* Top Brand Header */}
          <div className="h-[64px] border-b border-black/[0.06] dark:border-white/[0.07] flex items-center px-4 justify-between">
            {!isRailCollapsed ? (
              <Link href={`/${adminPath}`} className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-8 w-8 rounded-[9px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
                  FX
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold tracking-tight leading-tight flex items-center gap-1.5">
                    FRXCX <span className="text-[#ff4f31]">Vault</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Protected
                  </span>
                </div>
              </Link>
            ) : (
              <Link href={`/${adminPath}`} className="mx-auto" title="FRXCX Vault">
                <div className="h-8 w-8 rounded-[9px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
                  FX
                </div>
              </Link>
            )}

            {/* Rail Collapse Toggle */}
            <button
              type="button"
              onClick={() => setIsRailCollapsed((c) => !c)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title={isRailCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isRailCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
            {!isRailCollapsed && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5a6265]/70 dark:text-[#a09d93]/60 px-3 pb-1">
                Platform
              </span>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={() => {
                    if (pathname !== item.href) {
                      setOptimisticPath(item.href);
                      setIsNavigating(true);
                    }
                  }}
                  title={isRailCollapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 cursor-pointer ${
                    item.active
                      ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-xs'
                      : 'text-[#5a6265] dark:text-[#a09d93] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                  } ${isRailCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110`} />
                  {!isRailCollapsed && <span className="truncate">{item.name}</span>}

                  {/* Badge */}
                  {item.badge && !isRailCollapsed && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff4f31] text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  {item.badge && isRailCollapsed && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#ff4f31]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Bottom Profile & Security Card */}
          <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.07] flex flex-col gap-2">
            {!isRailCollapsed ? (
              <div className="flex items-center justify-between p-2 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#ff4f31] to-amber-500 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : currentUser.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[12px] font-semibold truncate leading-tight">{currentUser.name || currentUser.email}</span>
                    <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">{currentUser.roleName}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Log out"
                  className="h-7 w-7 rounded-md flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="h-10 w-10 mx-auto rounded-full flex items-center justify-center text-[#5a6265] dark:text-[#a09d93] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </aside>

        {/* Mobile Slide-in Drawer */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileDrawerOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed top-0 bottom-0 left-0 z-50 w-[280px] bg-white dark:bg-[#15140f] border-r border-black/[0.08] dark:border-white/[0.1] p-4 flex flex-col justify-between lg:hidden shadow-2xl"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.07]">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-[9px] bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
                        FX
                      </div>
                      <span className="text-[15px] font-bold tracking-tight">
                        FRXCX <span className="text-[#ff4f31]">Vault</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="Close menu drawer"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <X className="h-5 w-5 pointer-events-none" />
                    </button>
                  </div>

                  <nav className="flex flex-col gap-1.5 mt-4">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          prefetch={true}
                          onClick={() => {
                            setMobileDrawerOpen(false);
                            if (pathname !== item.href) {
                              setOptimisticPath(item.href);
                              setIsNavigating(true);
                            }
                          }}
                          className={`flex items-center gap-3 px-3.5 py-3 rounded-[12px] text-[14px] font-medium transition-all cursor-pointer ${
                            item.active
                              ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b]'
                              : 'text-[#5a6265] dark:text-[#a09d93] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                          {item.badge && (
                            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff4f31] text-white">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.07] flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#ff4f31] to-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                        SA
                      </div>
                      <span className="text-xs font-semibold truncate max-w-[140px]">{userEmail}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-xs text-rose-500 font-medium px-2 py-1 rounded hover:bg-rose-500/10 cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ================= DESKTOP SIDEBAR SPACER ================= */}
        <div
          style={{ width: isRailCollapsed ? '72px' : '260px' }}
          className="hidden lg:block shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ================= STICKY TOP BAR (Clean Breadcrumb + Right Aligned Tools) ================= */}
          <header className="sticky top-0 z-20 h-[64px] border-b border-black/[0.06] dark:border-white/[0.07] bg-white/85 dark:bg-[#15140f]/85 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 select-none">
            {/* Left: Mobile Toggle + Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-medium text-[#5a6265] dark:text-[#a09d93]">
                <span className="hidden sm:inline">FRXCX Vault</span>
                <ChevronRight className="h-3.5 w-3.5 hidden sm:inline opacity-50" />
                <span className="text-[#12110b] dark:text-[#f4efea] font-semibold text-[13.5px]">
                  {currentNav.name}
                </span>
              </div>
            </div>

            {/* Right: Quick Search + Range Tabs + Notifications + Theme + Profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Search & Command Palette */}
              <div ref={searchContainerRef} className="relative">
                <div
                  className={`relative hidden md:flex items-center rounded-full transition-all duration-200 border ${
                    searchFocused
                      ? 'w-[250px] bg-[#181712] border-[#ff4f31] shadow-[0_0_20px_rgba(255,79,49,0.25)]'
                      : 'w-[180px] bg-white/[0.04] border-white/10 hover:border-white/20'
                  }`}
                >
                  <Search className="h-3.5 w-3.5 ml-3 text-[#a09d93] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search Vault (⌘K)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    className="w-full bg-transparent px-2.5 py-1.5 text-xs text-[#f4efea] placeholder-[#a09d93]/60 outline-none"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setSearchQuery('')}
                      className="mr-2 text-[#a09d93] hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3 pointer-events-none" />
                    </button>
                  ) : (
                    <kbd className="mr-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/[0.08] text-[#a09d93] border border-white/10 shrink-0">
                      ⌘K
                    </kbd>
                  )}
                </div>

                {/* Command Palette Dropdown */}
                <AnimatePresence>
                  {searchFocused && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-[320px] rounded-[20px] bg-[#181712]/98 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-2 z-50 text-left overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b border-white/[0.07] flex items-center justify-between text-[11px] text-[#a09d93]">
                        <span className="font-semibold uppercase tracking-wider text-[10px]">Quick Navigation</span>
                        <span>{filteredPages.length} routes</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto py-1 space-y-0.5">
                        {filteredPages.map((page) => {
                          const Icon = page.icon;
                          return (
                            <Link
                              key={page.href}
                              href={page.href}
                              prefetch={true}
                              onClick={() => {
                                setSearchFocused(false);
                                setSearchQuery('');
                                if (pathname !== page.href) {
                                  setOptimisticPath(page.href);
                                  setIsNavigating(true);
                                }
                              }}
                              className="group flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-xs hover:bg-white/[0.06] transition-colors cursor-pointer"
                            >
                              <div className="h-7 w-7 rounded-lg bg-white/[0.05] group-hover:bg-[#ff4f31]/15 text-[#a09d93] group-hover:text-[#ff4f31] flex items-center justify-center transition-colors shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[#f4efea] group-hover:text-white truncate">{page.name}</p>
                                <p className="text-[10px] text-[#a09d93] truncate">{page.description}</p>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-[#ff4f31] transition-colors shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Date Range Selector Pills */}
              <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-white/[0.04] border border-white/10 shadow-inner">
                {(['today', '7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setActiveRange(range)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                      activeRange === range
                        ? 'bg-[#25241d] text-[#f4efea] shadow-xs border border-white/10'
                        : 'text-[#a09d93] hover:text-[#f4efea]'
                    }`}
                  >
                    {range === 'today' ? 'Today' : range.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Notifications Dropdown */}
              <div ref={notifRef} className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((o) => !o)}
                  className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4 text-[#a09d93]" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#ff4f31]" />
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-84 rounded-[22px] bg-[#181712]/98 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 z-50 text-left"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4 text-[#ff4f31]" />
                          <span className="text-[13px] font-bold text-white">System Security</span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Vault Active
                        </span>
                      </div>

                      <div className="py-2 flex flex-col gap-2 max-h-72 overflow-y-auto">
                        <div className="p-3 rounded-[14px] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                          <div className="flex items-start gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#f4efea]">Hardware Vault Defense</p>
                              <p className="text-[11px] text-[#a09d93] mt-0.5 leading-snug">
                                Argon2id memory-hardened encryption + TOTP 2FA active across all sessions.
                              </p>
                              <span className="text-[9.5px] text-[#a09d93]/60 mt-1 inline-block">Security Layer</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-[14px] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                          <div className="flex items-start gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-[#ff4f31]/10 text-[#ff4f31] flex items-center justify-center shrink-0 mt-0.5">
                              <Lock className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#f4efea]">Client PII Protected</p>
                              <p className="text-[11px] text-[#a09d93] mt-0.5 leading-snug">
                                AES-256-GCM encryption verified on all incoming client leads and contacts.
                              </p>
                              <span className="text-[9.5px] text-[#a09d93]/60 mt-1 inline-block">Privacy Guard</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-[#a09d93] hover:text-white transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <span className="text-[10px] text-[#a09d93]/50">FRXCX Sec-Ops</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Switcher Toggle */}
              <button
                type="button"
                onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                title="Toggle Light / Dark"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {/* Profile Avatar Dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#ff4f31] to-amber-500 text-white font-bold text-[11px] flex items-center justify-center shadow-xs">
                    SA
                  </div>
                </button>

                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-64 rounded-[22px] bg-[#181712]/98 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-2 z-50 text-left overflow-hidden"
                    >
                      <div className="px-3 py-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#ff4f31] to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : currentUser.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="text-xs font-bold text-[#f4efea] truncate">{currentUser.name || currentUser.email}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-0.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              {currentUser.roleName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="py-1.5 space-y-0.5">
                        <Link
                          href={`/${adminPath}/security`}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs text-[#a09d93] hover:text-white hover:bg-white/[0.06] font-medium transition-colors"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-[#ff4f31]" />
                          <span>Security & Sessions</span>
                        </Link>
                        <Link
                          href={`/${adminPath}/audit`}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs text-[#a09d93] hover:text-white hover:bg-white/[0.06] font-medium transition-colors"
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-amber-400" />
                          <span>Audit Trail</span>
                        </Link>
                        <Link
                          href={`/${adminPath}/settings`}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs text-[#a09d93] hover:text-white hover:bg-white/[0.06] font-medium transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 text-[#a09d93]" />
                          <span>Preferences</span>
                        </Link>
                      </div>

                      <div className="pt-1.5 border-t border-white/[0.08]">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-semibold transition-colors cursor-pointer"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* ================= MAIN CONTENT CONTAINER ================= */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-[1440px] space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}