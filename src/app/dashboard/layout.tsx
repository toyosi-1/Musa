"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  HomeIcon,
  ClockIcon,
  UserIcon,
  QrCodeIcon,
  NewspaperIcon,
  Bars3Icon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ClockIcon as ClockIconSolid,
  UserIcon as UserIconSolid,
  QrCodeIcon as QrCodeIconSolid,
  NewspaperIcon as NewspaperIconSolid,
} from '@heroicons/react/24/solid';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useTheme } from '@/contexts/ThemeContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, actualTheme } = useTheme();

  // More menu state
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/auth/login');
    }
  }, [loading, currentUser, router]);

  // Close more menu on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsMoreOpen(false);
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
          {children}
        </div>
      </main>

      {/* ─── Mobile Bottom Navigation (5 tabs, Clannet-style) ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 pb-safe">
        <nav className="h-16 flex items-stretch justify-around">
          {/* Tab 1: Home */}
          <Link href={homePath} className="flex-1 relative" aria-label="Home">
            <div className={`flex flex-col items-center justify-center h-full transition-colors ${
              isHomePage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isHomePage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              {isHomePage ? <HomeIconSolid className="w-6 h-6" /> : <HomeIcon className="w-6 h-6" />}
              <span className={`text-[10px] mt-0.5 ${isHomePage ? 'font-semibold' : 'font-medium'}`}>Home</span>
            </div>
          </Link>

          {/* Tab 2: Scan (guards) or Feed (residents) */}
          {isGuard ? (
            <Link href="/dashboard/scan" className="flex-1 relative" aria-label="Scan">
              <div className={`flex flex-col items-center justify-center h-full transition-colors ${
                isScanPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isScanPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                {isScanPage ? <QrCodeIconSolid className="w-6 h-6" /> : <QrCodeIcon className="w-6 h-6" />}
                <span className={`text-[10px] mt-0.5 ${isScanPage ? 'font-semibold' : 'font-medium'}`}>Scan</span>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/feed" className="flex-1 relative" aria-label="Feed">
              <div className={`flex flex-col items-center justify-center h-full transition-colors ${
                isFeedPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isFeedPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                {isFeedPage ? <NewspaperIconSolid className="w-6 h-6" /> : <NewspaperIcon className="w-6 h-6" />}
                <span className={`text-[10px] mt-0.5 ${isFeedPage ? 'font-semibold' : 'font-medium'}`}>Feed</span>
              </div>
            </Link>
          )}

          {/* Tab 3: Feed (guards) or Activity (residents) */}
          {isGuard ? (
            <Link href="/dashboard/feed" className="flex-1 relative" aria-label="Feed">
              <div className={`flex flex-col items-center justify-center h-full transition-colors ${
                isFeedPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isFeedPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                {isFeedPage ? <NewspaperIconSolid className="w-6 h-6" /> : <NewspaperIcon className="w-6 h-6" />}
                <span className={`text-[10px] mt-0.5 ${isFeedPage ? 'font-semibold' : 'font-medium'}`}>Feed</span>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/history" className="flex-1 relative" aria-label="Activity">
              <div className={`flex flex-col items-center justify-center h-full transition-colors ${
                isActivityPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isActivityPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                {isActivityPage ? <ClockIconSolid className="w-6 h-6" /> : <ClockIcon className="w-6 h-6" />}
                <span className={`text-[10px] mt-0.5 ${isActivityPage ? 'font-semibold' : 'font-medium'}`}>Activity</span>
              </div>
            </Link>
          )}

          {/* Tab 4: Activity (guards) or Utilities (residents) */}
          {isGuard ? (
            <Link href="/dashboard/history" className="flex-1 relative" aria-label="Activity">
              <div className={`flex flex-col items-center justify-center h-full transition-colors ${
                isActivityPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isActivityPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                {isActivityPage ? <ClockIconSolid className="w-6 h-6" /> : <ClockIcon className="w-6 h-6" />}
                <span className={`text-[10px] mt-0.5 ${isActivityPage ? 'font-semibold' : 'font-medium'}`}>Activity</span>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard/utilities" className="flex-1 relative" aria-label="Utilities">
              <div className={`flex flex-col items-center justify-center h-full transition-colors ${
                isUtilitiesPage ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
              }`}>
                {isUtilitiesPage && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                {isUtilitiesPage ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                )}
                <span className={`text-[10px] mt-0.5 ${isUtilitiesPage ? 'font-semibold' : 'font-medium'}`}>Utilities</span>
              </div>
            </Link>
          )}

          {/* Tab 5: More */}
          <button onClick={() => setIsMoreOpen(true)} className="flex-1 relative" aria-label="More options">
            <div className={`flex flex-col items-center justify-center h-full transition-colors ${
              isMoreOpen ? 'text-primary dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {isMoreOpen && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
              <Bars3Icon className="w-6 h-6" />
              <span className={`text-[10px] mt-0.5 ${isMoreOpen ? 'font-semibold' : 'font-medium'}`}>More</span>
            </div>
          </button>
        </nav>
      </div>

      {/* ─── "More" Bottom Sheet ─── */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl animate-slide-up max-h-[70vh] overflow-y-auto pb-safe">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* User Card */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                {currentUser.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{currentUser.displayName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                currentUser.role === 'guard'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : currentUser.role === 'admin'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {currentUser.role}
              </span>
            </div>

            {/* Menu Items */}
            <div className="px-3 py-2">
              {/* Profile */}
              <Link
                href="/dashboard/profile"
                onClick={() => setIsMoreOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">My Profile</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </Link>

              {/* Theme */}
              <button
                onClick={cycleTheme}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {actualTheme === 'dark' ? (
                  <MoonIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <SunIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
                <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">Appearance</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{theme}</span>
              </button>

              {/* Notifications */}
              <button
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <BellIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">Notifications</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </button>

              <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

              {/* Settings */}
              <button
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">Settings</span>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </button>

              <div className="my-2 border-t border-gray-100 dark:border-gray-800" />

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500 dark:text-red-400" />
                <span className="flex-1 text-left text-sm font-medium text-red-600 dark:text-red-400">Sign Out</span>
              </button>
            </div>

            {/* App Version */}
            <div className="px-5 py-3 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-600">Musa Security v1.0.0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
