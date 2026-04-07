"use client";

import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'title' | 'button' | 'avatar' | 'card' | 'access-code';
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export default function SkeletonLoader({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  lines = 1 
}: SkeletonLoaderProps) {
  const getSkeletonClass = () => {
    switch (variant) {
      case 'text':
        return 'skeleton-text';
      case 'title':
        return 'skeleton-title';
      case 'button':
        return 'skeleton-button';
      case 'avatar':
        return 'skeleton-avatar';
      case 'card':
        return 'skeleton-card';
      case 'access-code':
        return 'card';
      default:
        return 'skeleton';
    }
  };

  if (variant === 'access-code') {
    return (
      <div className={`skeleton-card ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="skeleton-title"></div>
          <div className="skeleton h-6 w-16 rounded-full"></div>
        </div>
        <div className="skeleton-text mb-2"></div>
        <div className="skeleton-text-sm mb-4"></div>
        <div className="flex justify-between items-center">
          <div className="skeleton h-8 w-24 rounded-lg"></div>
          <div className="skeleton h-8 w-8 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`skeleton-card ${className}`}>
        <div className="skeleton-title"></div>
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="skeleton-text"></div>
        ))}
        <div className="skeleton-button"></div>
      </div>
    );
  }

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  if (lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div 
            key={index} 
            className={getSkeletonClass()} 
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      className={`${getSkeletonClass()} ${className}`} 
      style={style}
    />
  );
}

// Specialized skeleton components for common use cases
export function AccessCodeSkeleton({ className = '' }: { className?: string }) {
  return <SkeletonLoader variant="access-code" className={className} />;
}

export function DashboardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="skeleton-title"></div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AccessCodeSkeleton />
        <AccessCodeSkeleton />
      </div>
      <SkeletonLoader variant="card" lines={3} />
    </div>
  );
}

export function FormSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="skeleton-text-sm"></div>
      <div className="skeleton h-12 w-full rounded-xl"></div>
      <div className="skeleton-text-sm"></div>
      <div className="skeleton h-12 w-full rounded-xl"></div>
      <div className="skeleton-button"></div>
    </div>
  );
}
