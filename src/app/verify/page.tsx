"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/utils/RouteGuard';
import GuardDashboard from '@/components/guard/GuardDashboard';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';


export default function VerifyPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  return (
    <RouteGuard allowedRoles={['guard']}>
      <div className="relative min-h-[calc(100vh-4rem)] px-4 sm:px-6">
        {/* Back button */}
        <button 
          onClick={() => router.back()}
          className="absolute top-0 left-0 flex items-center justify-center p-2 sm:p-0 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors mb-4 touch-manipulation"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          <span>Back</span>
        </button>

        <div className="mb-8 sm:mb-12 text-center mx-auto pt-12 sm:pt-14">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-800 dark:text-white">Verify Access Codes</h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl text-base sm:text-lg mx-auto px-2">
            Scan QR codes or enter access codes to verify and grant entry to authorized visitors.
          </p>
        </div>
        
        <div className="card p-0 overflow-hidden shadow-lg rounded-xl">
          <div className="h-2 bg-primary w-full"></div>
          <div className="p-4 sm:p-6 md:p-8">
            {currentUser && <GuardDashboard user={currentUser} />}
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
