"use client";

import React from 'react';

interface ModernBannerProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: 'primary' | 'amber' | 'green' | 'purple' | 'red';
  badge?: string;
  className?: string;
}

export default function ModernBanner({ 
  title, 
  subtitle, 
  icon, 
  gradient = 'primary',
  badge,
  className = '' 
}: ModernBannerProps) {
  const gradients = {
    primary: 'from-primary-500 via-primary-600 to-blue-700 dark:from-primary-600 dark:via-primary-700 dark:to-blue-800',
    amber: 'from-amber-500 via-amber-600 to-orange-600 dark:from-amber-600 dark:via-amber-700 dark:to-orange-700',
    green: 'from-green-500 via-emerald-600 to-teal-600 dark:from-green-600 dark:via-emerald-700 dark:to-teal-700',
    purple: 'from-purple-500 via-purple-600 to-indigo-600 dark:from-purple-600 dark:via-purple-700 dark:to-indigo-700',
    red: 'from-red-500 via-red-600 to-rose-600 dark:from-red-600 dark:via-red-700 dark:to-rose-700'
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradients[gradient]} p-6 shadow-lg animate-fade-in ${className}`}>
      {/* Decorative elements */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full blur-xl" />
      <div className="absolute left-1/2 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
      
      <div className="relative flex items-center gap-4">
        {icon && (
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            {icon}
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-white/20 text-white backdrop-blur-sm">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-white/80 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface WelcomeBannerProps {
  userName: string;
  estateName?: string;
  className?: string;
}

export function WelcomeBanner({ userName, estateName, className = '' }: WelcomeBannerProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-600 to-emerald-600 dark:from-primary-700 dark:via-primary-800 dark:to-emerald-700 p-6 shadow-lg animate-slide-up ${className}`}>
      {/* Decorative elements */}
      <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-sm" />
      <div className="absolute -right-2 top-10 w-20 h-20 bg-white/5 rounded-full" />
      <div className="absolute left-1/2 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-md" />
      
      <div className="relative z-10">
        <p className="text-xs font-medium text-white/70 uppercase tracking-wider mb-1">
          {getGreeting()}
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">
          {userName.split(' ')[0] || 'Resident'}
        </h1>
        {estateName && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse-glow" />
            <p className="text-sm text-white/90 font-medium">{estateName}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface AlertBannerProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export function AlertBanner({ type, title, message, action, onDismiss }: AlertBannerProps) {
  const styles = {
    info: {
      bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-200',
      message: 'text-blue-800 dark:text-blue-300'
    },
    success: {
      bg: 'from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-800/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-900 dark:text-green-200',
      message: 'text-green-800 dark:text-green-300'
    },
    warning: {
      bg: 'from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-800/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-900 dark:text-yellow-200',
      message: 'text-yellow-800 dark:text-yellow-300'
    },
    error: {
      bg: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-200',
      message: 'text-red-800 dark:text-red-300'
    }
  };

  const style = styles[type];

  const icons = {
    info: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${style.bg} border ${style.border} rounded-2xl p-5 shadow-sm animate-slide-up`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-gray-900 rounded-full -mr-16 -mt-16 blur-2xl opacity-30" />
      
      <div className="relative flex items-start gap-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-white/50 dark:bg-gray-900/30 flex items-center justify-center ${style.icon}`}>
          {icons[type]}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-base mb-1 ${style.title}`}>
            {title}
          </h3>
          <p className={`text-sm leading-relaxed ${style.message}`}>
            {message}
          </p>
          
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 px-4 py-2 rounded-lg font-medium text-sm ${style.icon} bg-white/50 dark:bg-gray-900/30 hover:bg-white/70 dark:hover:bg-gray-900/50 transition-colors btn-press`}
            >
              {action.label}
            </button>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 rounded-lg ${style.icon} hover:bg-white/50 dark:hover:bg-gray-900/30 transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
