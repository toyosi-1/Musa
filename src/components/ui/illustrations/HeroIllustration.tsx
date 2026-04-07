'use client';

import { useEffect, useState } from 'react';
import MusaCharacterSVG from './MusaCharacterSVG';

export default function HeroIllustration() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <div className={`relative w-[280px] h-[420px] sm:w-[300px] sm:h-[460px] md:w-[320px] md:h-[500px] transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {/* Background glow effects */}
      <div className="absolute -inset-8 bg-gradient-to-br from-blue-500/20 via-indigo-400/15 to-violet-500/20 dark:from-blue-500/30 dark:via-indigo-400/20 dark:to-violet-500/25 rounded-[60px] blur-3xl" />
      <div className="absolute -top-4 -right-4 w-32 h-32 bg-emerald-400/20 dark:bg-emerald-400/25 rounded-full blur-2xl" />

      {/* Phone frame */}
      <div className="relative w-full h-full rounded-[2.5rem] bg-gray-900 dark:bg-black p-[3px] shadow-2xl shadow-gray-900/40 dark:shadow-black/60">
        {/* Inner bezel */}
        <div className="relative w-full h-full rounded-[2.3rem] bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-7 pt-4 pb-2">
            <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">9:41</span>
            <div className="w-20 h-5 bg-gray-900 dark:bg-black rounded-full" />
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px]">
                <div className="w-[3px] h-2 bg-gray-800 dark:bg-gray-200 rounded-full" />
                <div className="w-[3px] h-2.5 bg-gray-800 dark:bg-gray-200 rounded-full" />
                <div className="w-[3px] h-3 bg-gray-800 dark:bg-gray-200 rounded-full" />
                <div className="w-[3px] h-3.5 bg-gray-800 dark:bg-gray-200 rounded-full" />
              </div>
              <svg className="w-4 h-4 text-gray-800 dark:text-gray-200 ml-1" viewBox="0 0 24 24" fill="currentColor">
                <rect x="2" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <rect x="21" y="10" width="2" height="4" rx="1" fill="currentColor" />
                <rect x="4" y="8" width="10" height="8" rx="1" fill="currentColor" opacity="0.7" />
              </svg>
            </div>
          </div>

          {/* App header */}
          <div className="px-5 pt-2 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">Musa Security</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Estate Access Control</p>
              </div>
            </div>
          </div>

          {/* Access granted card */}
          <div className="mx-4 mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 shadow-lg shadow-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-[15px]">Access Granted</p>
                <p className="text-emerald-100 text-[11px]">Code verified successfully</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <p className="text-white/90 text-[11px] font-medium">12 Parkview Lane, Block A</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">Scan QR</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">Visitors</p>
            </div>
          </div>

          {/* Recent activity */}
          <div className="mx-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">Recent Activity</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">Guest checked in</p>
                  <p className="text-[10px] text-gray-400">2 min ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 truncate">New code generated</p>
                  <p className="text-[10px] text-gray-400">15 min ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Musa mascot badge - top left */}
      <div className="absolute -top-5 -left-4 sm:-top-6 sm:-left-5 z-10" style={{ animation: 'float 3s ease-in-out infinite 0.75s' }}>
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/40 dark:to-orange-900/30 border border-amber-200/80 dark:border-amber-700/50 shadow-xl shadow-amber-500/15 dark:shadow-amber-900/30 flex items-center justify-center overflow-hidden">
          <MusaCharacterSVG size={40} animated={false} />
        </div>
      </div>

      {/* Floating notification badge - top right */}
      <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
        <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-900/10 dark:shadow-black/30 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-900 dark:text-white">Verified</p>
            <p className="text-[9px] text-gray-400">Just now</p>
          </div>
        </div>
      </div>

      {/* Floating speed badge - bottom left */}
      <div className="absolute -bottom-2 -left-2 sm:-bottom-3 sm:-left-3" style={{ animation: 'float 3s ease-in-out infinite 1.5s' }}>
        <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-900/10 dark:shadow-black/30 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-900 dark:text-white">&lt;1s</p>
            <p className="text-[9px] text-gray-400">Verify speed</p>
          </div>
        </div>
      </div>

      {/* CSS animation for floating effect */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
