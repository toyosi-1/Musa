"use client";

import React from 'react';

interface ProfessionalCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: 'blue' | 'amber' | 'green' | 'purple' | 'red' | 'none';
  onClick?: () => void;
}

export default function ProfessionalCard({ 
  children, 
  className = '', 
  hover = false,
  gradient = 'none',
  onClick 
}: ProfessionalCardProps) {
  const gradientClasses = {
    blue: 'from-blue-50/50 to-transparent dark:from-blue-900/20 dark:to-transparent',
    amber: 'from-amber-50/50 to-transparent dark:from-amber-900/20 dark:to-transparent',
    green: 'from-green-50/50 to-transparent dark:from-green-900/20 dark:to-transparent',
    purple: 'from-purple-50/50 to-transparent dark:from-purple-900/20 dark:to-transparent',
    red: 'from-red-50/50 to-transparent dark:from-red-900/20 dark:to-transparent',
    none: ''
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-2xl shadow-md
        ${hover ? 'card-hover-lift cursor-pointer' : ''}
        ${onClick ? 'btn-press' : ''}
        ${className}
      `}
    >
      {gradient !== 'none' && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClasses[gradient]} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      )}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}

interface ActionTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: 'blue' | 'amber' | 'green' | 'purple' | 'red';
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
}

export function ActionTile({ 
  icon, 
  title, 
  subtitle, 
  color, 
  onClick, 
  disabled = false,
  badge 
}: ActionTileProps) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
      shadow: 'shadow-primary',
      gradient: 'from-blue-50/50 to-transparent dark:from-blue-900/20 dark:to-transparent'
    },
    amber: {
      bg: 'from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700',
      shadow: 'shadow-lg',
      gradient: 'from-amber-50/50 to-transparent dark:from-amber-900/20 dark:to-transparent'
    },
    green: {
      bg: 'from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700',
      shadow: 'shadow-success',
      gradient: 'from-green-50/50 to-transparent dark:from-green-900/20 dark:to-transparent'
    },
    purple: {
      bg: 'from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700',
      shadow: 'shadow-lg',
      gradient: 'from-purple-50/50 to-transparent dark:from-purple-900/20 dark:to-transparent'
    },
    red: {
      bg: 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700',
      shadow: 'shadow-lg',
      gradient: 'from-red-50/50 to-transparent dark:from-red-900/20 dark:to-transparent'
    }
  };

  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative overflow-hidden
        flex flex-col items-center justify-center gap-3 p-6 
        rounded-2xl bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        shadow-md
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'card-hover-lift btn-press'}
        transition-all duration-300
      `}
    >
      {badge && (
        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
          {badge}
        </span>
      )}
      
      {!disabled && (
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      )}
      
      <div className={`
        relative w-14 h-14 rounded-2xl 
        bg-gradient-to-br ${colors.bg} 
        flex items-center justify-center 
        ${colors.shadow}
        ${!disabled && 'group-hover:scale-110'}
        transition-transform duration-300
      `}>
        {icon}
      </div>
      
      <div className="relative text-center">
        <span className="block text-sm font-bold text-gray-900 dark:text-white">
          {title}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {subtitle}
        </span>
      </div>
    </button>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
  color: 'blue' | 'amber' | 'green' | 'purple' | 'red';
}

export function StatCard({ icon, label, value, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <ProfessionalCard className="p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {value}
          </p>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={trend.positive ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} 
                />
              </svg>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
    </ProfessionalCard>
  );
}
