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
  Clock,
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
} from 'lucide-react';

interface AdminLayoutShellProps {
  children: React.ReactNode;
  userEmail?: string;
  adminPath: string;
}

export function AdminLayoutShell({
  children,
  userEmail = 'admin@frxcxstudio.com',
  adminPath,
}: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar states
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);

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

  // Session idle timeout
  const [idleWarningOpen, setIdleWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Sync theme with document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread leads badge
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
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Idle timeout tracking (13m warning, 15m logout)
  useEffect(() => {
    let lastActivity = Date.now();
    const IDLE_LIMIT_MS = 15 * 60 * 1000;
    const WARNING_TIME_MS = 13 * 60 * 1000;

    const resetActivity = () => {
      lastActivity = Date.now();
      if (idleWarningOpen) {
        setIdleWarningOpen(false);
      }
    };

    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= IDLE_LIMIT_MS) {
        fetch('/api/admin/logout', { method: 'POST' }).finally(() => {
          router.push(`/${adminPath}/login`);
        });
      } else if (elapsed >= WARNING_TIME_MS) {
        setIdleWarningOpen(true);
        const rem = Math.max(0, Math.floor((IDLE_LIMIT_MS - elapsed) / 1000));
        setSecondsRemaining(rem);
      } else {
        setIdleWarningOpen(false);
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivity));
      clearInterval(checkInterval);
    };
  }, [adminPath, idleWarningOpen, router]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push(`/${adminPath}/login`);
    }
  }, [adminPath, router]);

  const navItems = [
    {
      name: 'Dashboard',
      href: `/${adminPath}`,
      icon: LayoutDashboard,
      active: pathname === `/${adminPath}`,
      badge: null,
    },
    {
      name: 'Leads',
      href: `/${adminPath}/leads`,
      icon: Users,
      active: pathname.startsWith(`/${adminPath}/leads`),
      badge: unreadLeadsCount > 0 ? `${unreadLeadsCount}` : null,
    },
    {
      name: 'Sessions & Security',
      href: `/${adminPath}/security`,
      icon: ShieldCheck,
      active: pathname.startsWith(`/${adminPath}/security`),
      badge: null,
    },
    {
      name: 'Audit Log',
      href: `/${adminPath}/audit`,
      icon: ClipboardList,
      active: pathname.startsWith(`/${adminPath}/audit`),
      badge: null,
    },
    {
      name: 'Settings',
      href: `/${adminPath}/settings`,
      icon: Settings,
      active: pathname.startsWith(`/${adminPath}/settings`),
      badge: null,
    },
  ];

  // Derive current page title for breadcrumb
  const currentNav = navItems.find((n) => n.active) || navItems[0];

  return (
    <div className="min-h-screen w-full bg-[#f4f3f0] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] flex flex-col font-sans transition-colors duration-300">
      {/* Session Expiring Modal */}
      {idleWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#1a1914] p-6 shadow-2xl border border-black/[0.08] dark:border-white/[0.1] text-center flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h4 className="text-[17px] font-semibold tracking-tight">Session Expiring</h4>
            <p className="text-xs text-[#5a6265] dark:text-[#a09d93] mt-2 mb-5 leading-relaxed">
              You have been inactive for over 13 minutes. To protect client lead confidentiality, you will be logged out in{' '}
              <span className="font-semibold text-[#ff4f31] tabular-nums">{secondsRemaining}s</span>.
            </p>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 h-[40px] rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
              >
                Log Out
              </button>
              <button
                type="button"
                onClick={() => setIdleWarningOpen(false)}
                className="flex-1 h-[40px] rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white transition-colors cursor-pointer"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
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
                  title={isRailCollapsed ? item.name : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 ${
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
                    SA
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[12px] font-semibold truncate leading-tight">{userEmail}</span>
                    <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">Super Admin</span>
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
                      onClick={() => setMobileDrawerOpen(false)}
                      className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <nav className="flex flex-col gap-1.5 mt-4">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-3 rounded-[12px] text-[14px] font-medium transition-all ${
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

        {/* ================= RIGHT WORKSPACE: Sticky Top Bar + Scrollable Content ================= */}
        <div
          style={{ paddingLeft: isRailCollapsed ? '72px' : '260px' }}
          className="hidden lg:block w-full transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
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
              {/* Quick Search Bar */}
              <div
                className={`relative hidden md:flex items-center rounded-full transition-all duration-200 border ${
                  searchFocused
                    ? 'w-[240px] bg-white dark:bg-[#1b1a14] border-black/30 dark:border-white/30 shadow-xs'
                    : 'w-[180px] bg-black/[0.03] dark:bg-white/[0.04] border-transparent hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                <Search className="h-3.5 w-3.5 ml-3 text-[#5a6265] dark:text-[#a09d93]" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="w-full bg-transparent px-2 py-1.5 text-xs text-[#12110b] dark:text-[#f4efea] placeholder-[#5a6265]/60 dark:placeholder-[#a09d93]/60 outline-none"
                />
                <kbd className="mr-2 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/[0.06] dark:bg-white/[0.08] text-[#5a6265] dark:text-[#a09d93]">
                  ⌘K
                </kbd>
              </div>

              {/* Date Range Selector Pills */}
              <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.06]">
                {(['today', '7d', '30d', '90d'] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setActiveRange(range)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                      activeRange === range
                        ? 'bg-white dark:bg-[#25241d] text-[#12110b] dark:text-[#f4efea] shadow-xs'
                        : 'text-[#5a6265] dark:text-[#a09d93] hover:text-[#12110b] dark:hover:text-[#f4efea]'
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
                  className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4 text-[#5a6265] dark:text-[#a09d93]" />
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#ff4f31]" />
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-80 rounded-[18px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-4 z-50 text-left"
                    >
                      <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] dark:border-white/[0.08]">
                        <span className="text-[13px] font-semibold">Security & Inquiries</span>
                        <span className="text-[10px] text-emerald-500 font-medium">All systems green</span>
                      </div>
                      <div className="py-2 flex flex-col gap-2 max-h-60 overflow-y-auto">
                        <div className="p-2 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] text-xs">
                          <p className="font-semibold text-[12px]">Argon2id + 2FA Active</p>
                          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
                            Hardware vault defense operational.
                          </p>
                        </div>
                        <div className="p-2 rounded-[10px] bg-black/[0.02] dark:bg-white/[0.03] text-xs">
                          <p className="font-semibold text-[12px]">Inquiries Encrypted</p>
                          <p className="text-[11px] text-[#5a6265] dark:text-[#a09d93] mt-0.5">
                            Client PII secured with AES-256-GCM.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Switcher Toggle */}
              <button
                type="button"
                onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Toggle Light / Dark"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-700" />
                )}
              </button>

              {/* Profile Avatar Dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
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
                      className="absolute right-0 mt-2 w-56 rounded-[18px] bg-white dark:bg-[#1a1914] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-2 z-50 text-left"
                    >
                      <div className="px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                        <p className="text-[12px] font-semibold truncate leading-tight">{userEmail}</p>
                        <p className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">Super Administrator</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href={`/${adminPath}/security`}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-[#5a6265] dark:text-[#a09d93]" />
                          <span>Security & Sessions</span>
                        </Link>
                        <Link
                          href={`/${adminPath}/audit`}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                          <ClipboardList className="h-3.5 w-3.5 text-[#5a6265] dark:text-[#a09d93]" />
                          <span>Audit Trail</span>
                        </Link>
                        <Link
                          href={`/${adminPath}/settings`}
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                        >
                          <Settings className="h-3.5 w-3.5 text-[#5a6265] dark:text-[#a09d93]" />
                          <span>Preferences</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-black/[0.06] dark:border-white/[0.08]">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs text-rose-500 hover:bg-rose-500/10 font-medium transition-colors cursor-pointer"
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