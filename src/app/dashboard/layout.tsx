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
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClockIcon as ClockIconSolid,
  UserIcon as UserIconSolid,
  NewspaperIcon as NewspaperIconSolid,
} from '@heroicons/react/24/solid';
import NotificationBell from '@/components/notifications/NotificationBell';
import BiometricSetupBanner from '@/components/auth/BiometricSetupBanner';
import { useTheme } from '@/contexts/ThemeContext';

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
      <div className="min-h-screen flex items-center justify-center bg-musa-bg dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Role-aware home path (avoids redirect loop through /dashboard)
  const homePath = currentUser.role === 'guard' ? '/dashboard/guard' : '/dashboard/resident';
  const isGuard = currentUser.role === 'guard';

  // Active state helpers
  const isHomePage = pathname === '/dashboard' || pathname === '/dashboard/resident' || pathname === '/dashboard/guard';
  const isFeedPage = pathname?.startsWith('/dashboard/feed');
  const isActivityPage = pathname?.startsWith('/dashboard/history');
  const isScanPage = pathname?.startsWith('/dashboard/scan');
  const isProfilePage = pathname?.startsWith('/dashboard/profile');
  const isUtilitiesPage = pathname?.startsWith('/dashboard/utilities');

  // Desktop nav active helper
  const desktopNavClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 safe-area-inset-bottom">
      {/* ─── Desktop Top Header ─── */}
      <header className="md:block hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-7 h-7 text-primary" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Musa</h1>
              </div>
              <nav className="flex items-center gap-1 ml-4">
                <Link href={homePath} className={desktopNavClass(isHomePage)}>Home</Link>
                <Link href="/dashboard/feed" className={desktopNavClass(!!isFeedPage)}>Feed</Link>
                <Link href="/dashboard/history" className={desktopNavClass(!!isActivityPage)}>Activity</Link>
                {isGuard && (
                  <Link href="/dashboard/scan" className={desktopNavClass(!!isScanPage)}>Scan</Link>
                )}
                <Link href="/dashboard/profile" className={desktopNavClass(!!isProfilePage)}>Profile</Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={cycleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={`Theme: ${theme}`}
              >
                {actualTheme === 'dark' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              </button>
              <NotificationBell />
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden lg:block">
                  {currentUser.displayName}
                </span>
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                  {currentUser.displayName?.charAt(0).toUpperCase() || '?'}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-grow overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
        <div className="w-full max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 py-4 md:py-8">
          {/* Mobile Top Bar */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-primary" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Musa</h1>
            </div>
            <NotificationBell />
          </div>
          <BiometricSetupBanner />
          {children}
        </div>
      </main>

      {/* ─── Mobile Bottom Navigation ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <nav className="h-16 flex items-stretch justify-around">
          {/* Tab: Social / Feed */}
          <Link href="/dashboard/feed" className="flex-1 relative" aria-label="Social">
            <div className={`flex flex-col items-center justify-center h-full transition-colors ${
              isFeedPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isFeedPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              {isFeedPage ? <NewspaperIconSolid className="w-6 h-6" /> : <NewspaperIcon className="w-6 h-6" />}
              <span className={`text-[10px] mt-0.5 ${isFeedPage ? 'font-semibold' : 'font-medium'}`}>Social</span>
            </div>
          </Link>

          {/* Tab: Home */}
          <Link href={homePath} className="flex-1 relative" aria-label="Home">
            <div className={`flex flex-col items-center justify-center h-full transition-colors ${
              isHomePage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isHomePage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              {isHomePage ? <HomeIconSolid className="w-6 h-6" /> : <HomeIcon className="w-6 h-6" />}
              <span className={`text-[10px] mt-0.5 ${isHomePage ? 'font-semibold' : 'font-medium'}`}>Home</span>
            </div>
          </Link>

          {/* Tab: Activity */}
          <Link href="/dashboard/history" className="flex-1 relative" aria-label="Activity">
            <div className={`flex flex-col items-center justify-center h-full transition-colors ${
              isActivityPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isActivityPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              {isActivityPage ? <ClockIconSolid className="w-6 h-6" /> : <ClockIcon className="w-6 h-6" />}
              <span className={`text-[10px] mt-0.5 ${isActivityPage ? 'font-semibold' : 'font-medium'}`}>Activity</span>
            </div>
          </Link>

          {/* Tab: Profile */}
          <Link href="/dashboard/profile" className="flex-1 relative" aria-label="Profile">
            <div className={`flex flex-col items-center justify-center h-full transition-colors ${
              isProfilePage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isProfilePage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              {isProfilePage ? <UserIconSolid className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
              <span className={`text-[10px] mt-0.5 ${isProfilePage ? 'font-semibold' : 'font-medium'}`}>Profile</span>
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
}
