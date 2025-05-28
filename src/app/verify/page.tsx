"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/utils/RouteGuard';
import GuardDashboard from '@/components/guard/GuardDashboard';
import Link from 'next/link';

export default function VerifyPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  return (
    <RouteGuard allowedRoles={['guard']}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-primary hover:text-primary-dark transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Verify Access Codes</h1>
        </div>
        
        {currentUser && <GuardDashboard user={currentUser} />}
      </div>
    </RouteGuard>
  );
}
