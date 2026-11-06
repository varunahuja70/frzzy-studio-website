'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ClipboardList,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ADMIN_PATH, getAdminUrl } from '@/lib/auth/config';

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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [idleWarningOpen, setIdleWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  // Idle timeout tracking (13 minutes inactivity warning, 15 minutes logout)
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
        // Log out immediately
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
    },
    {
      name: 'Leads',
      href: `/${adminPath}/leads`,
      icon: Users,
      active: pathname.startsWith(`/${adminPath}/leads`),
    },
    {
      name: 'Sessions & Security',
      href: `/${adminPath}/security`,
      icon: ShieldCheck,
      active: pathname.startsWith(`/${adminPath}/security`),
    },
    {
      name: 'Audit Log',
      href: `/${adminPath}/audit`,
      icon: ClipboardList,
      active: pathname.startsWith(`/${adminPath}/audit`),
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#f4f3f0] dark:bg-[#12110b] text-[#12110b] dark:text-[#f4efea] flex flex-col font-sans transition-colors duration-400">
      {/* Session Expiring Modal */}
      {idleWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[24px] bg-white dark:bg-[#1a1914] p-6 shadow-2xl border border-black/[0.08] dark:border-white/[0.1] text-center flex flex-col items-center">
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
                className="flex-1 h-[40px] rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
              >
                Log Out
              </button>
              <button
                type="button"
                onClick={() => setIdleWarningOpen(false)}
                className="flex-1 h-[40px] rounded-full bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] text-xs font-semibold hover:bg-[#ff4f31] dark:hover:bg-[#ff4f31] dark:hover:text-white transition-colors"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 h-[64px] border-b border-black/[0.06] dark:border-white/[0.07] bg-white/80 dark:bg-[#15140f]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href={`/${adminPath}`} className="flex items-center gap-2.5">
            <span className="text-[15px] sm:text-[16px] font-bold tracking-tight">
              FRXCX <span className="text-[#ff4f31]">Vault</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold">{userEmail}</span>
            <span className="text-[10px] text-[#5a6265] dark:text-[#a09d93]">Super Admin</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="h-9 px-3.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-rose-500/10 hover:text-rose-500 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static top-[64px] bottom-0 left-0 z-30 w-[240px] shrink-0 border-r border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#15140f] p-4 flex flex-col justify-between transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="flex flex-col gap-1.5 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[12px] text-[13.5px] font-medium transition-all ${
                    item.active
                      ? 'bg-[#12110b] dark:bg-[#f4efea] text-white dark:text-[#12110b] shadow-sm'
                      : 'text-[#5a6265] dark:text-[#a09d93] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-[#12110b] dark:hover:text-[#f4efea]'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 rounded-[14px] bg-[#f4f3f0] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.05] text-[11px] text-[#5a6265] dark:text-[#8e8b83]">
            <div className="flex items-center gap-1.5 font-semibold text-[#12110b] dark:text-[#f4efea] mb-1">
              <Sparkles className="h-3.5 w-3.5 text-[#ff4f31]" />
              <span>Studio Defense Active</span>
            </div>
            <span>Argon2id + TOTP 2FA + AES-256 PII Encryption</span>
          </div>
        </aside>

        {/* Overlay backdrop on mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 top-[64px] z-20 bg-black/40 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1340px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
