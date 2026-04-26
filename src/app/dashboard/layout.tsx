"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  HomeIcon,
  ClockIcon,
  UserIcon,
  NewspaperIcon,
  MoonIcon,
  SunIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClockIcon as ClockIconSolid,
  UserIcon as UserIconSolid,
  NewspaperIcon as NewspaperIconSolid,
} from '@heroicons/react/24/solid';
import NotificationBell from '@/components/notifications/NotificationBell';
import BiometricSetupBanner from '@/components/auth/BiometricSetupBanner';
import MusaCharacterSVG from '@/components/ui/illustrations/MusaCharacterSVG';
import { useTheme } from '@/contexts/ThemeContext';
import PageLoading from '@/components/ui/PageLoading';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, actualTheme } = useTheme();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/auth/login');
    }
  }, [loading, currentUser, router]);

  // Cycle through themes
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  if (loading) {
    return (
      <PageLoading
        accent="blue"
        icon={<MusaCharacterSVG size={24} animated={false} />}
      />
    );
  }

  if (!currentUser) {
    return null;
  }

  // Role-aware home path (avoids redirect loop through /dashboard)
  const homePath = currentUser.role === 'guard' ? '/dashboard/guard' : '/dashboard/resident';
  const isGuard = currentUser.role === 'guard';

  // Active state helpers
  const isFeedPage = pathname?.startsWith('/dashboard/feed');
  const isActivityPage = pathname?.startsWith('/dashboard/history');
  const isScanPage = pathname?.startsWith('/dashboard/scan');
  const isProfilePage = pathname?.startsWith('/dashboard/profile');
  // Home is active on resident/guard pages and any sub-page not covered by other tabs
  const isHomePage = pathname === '/dashboard' || pathname?.startsWith('/dashboard/resident') || pathname?.startsWith('/dashboard/guard') || (!isFeedPage && !isActivityPage && !isScanPage && !isProfilePage);

  // Greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const firstName = currentUser.displayName?.split(' ')[0] || 'User';

  // Desktop nav active helper
  const desktopNavClass = (active: boolean) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
      active
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/60'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 safe-area-inset-bottom">
      {/* ─── Desktop Top Header ─── */}
      <header className="md:block hidden sticky top-0 z-40">
        {/* Gradient accent line */}
        <div className="h-0.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href={homePath} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 border border-amber-200/60 dark:border-amber-700/40 flex items-center justify-center overflow-hidden shadow-sm">
                  <MusaCharacterSVG size={24} animated={false} />
                </div>
                <span className="text-lg font-bold text-gray-900 dark:text-white">Musa</span>
              </Link>
              <nav className="flex items-center gap-1">
                <Link href={homePath} className={desktopNavClass(isHomePage)}>Home</Link>
                <Link href="/dashboard/feed" className={desktopNavClass(!!isFeedPage)}>Feed</Link>
                <Link href="/dashboard/history" className={desktopNavClass(!!isActivityPage)}>Activity</Link>
                {isGuard && (
                  <Link href="/dashboard/scan" className={desktopNavClass(!!isScanPage)}>Scan</Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cycleTheme}
                className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                title={`Theme: ${theme}`}
              >
                {actualTheme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              </button>
              <NotificationBell />
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all group"
              >
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {firstName}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize">{currentUser.role}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-blue-500/20">
                  {firstName.charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-grow overflow-y-auto overflow-x-hidden md:pb-0" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 16px))' }}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 1.25rem))' }}>
          {/* Mobile Top Bar — premium feel */}
          <div className="md:hidden flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-base font-bold shadow-lg shadow-blue-500/25">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{getGreeting()}</p>
                <p className="text-base font-bold text-gray-900 dark:text-white -mt-0.5">{firstName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={cycleTheme}
                className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {actualTheme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              </button>
              <NotificationBell />
            </div>
          </div>
          <BiometricSetupBanner />
          {children}
        </div>
      </main>

      {/* ─── Mobile Bottom Navigation — refined ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-t border-gray-200/60 dark:border-gray-800/60 pointer-events-auto">
          <nav className="h-[56px] flex items-stretch justify-around px-2">
            {/* Tab: Feed */}
            <Link href="/dashboard/feed" className="flex-1" aria-label="Feed">
              <div className={`flex flex-col items-center justify-center h-full gap-0.5 transition-all duration-200 ${
                isFeedPage ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isFeedPage ? <NewspaperIconSolid className="w-[22px] h-[22px]" /> : <NewspaperIcon className="w-[22px] h-[22px]" />}
                <span className={`text-[10px] ${isFeedPage ? 'font-bold' : 'font-medium'}`}>Feed</span>
              </div>
            </Link>

            {/* Tab: Home */}
            <Link href={homePath} className="flex-1" aria-label="Home">
              <div className={`flex flex-col items-center justify-center h-full gap-0.5 transition-all duration-200 ${
                isHomePage ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isHomePage ? <HomeIconSolid className="w-[22px] h-[22px]" /> : <HomeIcon className="w-[22px] h-[22px]" />}
                <span className={`text-[10px] ${isHomePage ? 'font-bold' : 'font-medium'}`}>Home</span>
              </div>
            </Link>

            {/* Tab: Activity */}
            <Link href="/dashboard/history" className="flex-1" aria-label="Activity">
              <div className={`flex flex-col items-center justify-center h-full gap-0.5 transition-all duration-200 ${
                isActivityPage ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isActivityPage ? <ClockIconSolid className="w-[22px] h-[22px]" /> : <ClockIcon className="w-[22px] h-[22px]" />}
                <span className={`text-[10px] ${isActivityPage ? 'font-bold' : 'font-medium'}`}>Activity</span>
              </div>
            </Link>

            {/* Tab: Profile */}
            <Link href="/dashboard/profile" className="flex-1" aria-label="Profile">
              <div className={`flex flex-col items-center justify-center h-full gap-0.5 transition-all duration-200 ${
                isProfilePage ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isProfilePage ? <UserIconSolid className="w-[22px] h-[22px]" /> : <UserIcon className="w-[22px] h-[22px]" />}
                <span className={`text-[10px] ${isProfilePage ? 'font-bold' : 'font-medium'}`}>Profile</span>
              </div>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
