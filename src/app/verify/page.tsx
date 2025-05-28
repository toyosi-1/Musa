"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/utils/RouteGuard';
import GuardDashboard from '@/components/guard/GuardDashboard';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function VerifyPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  return (
    <RouteGuard allowedRoles={['guard']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-gray-600 hover:text-primary font-medium transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-8">Verify Access Codes</h1>
        
        {currentUser && <GuardDashboard user={currentUser} />}
      </div>
    </RouteGuard>
  );
}
