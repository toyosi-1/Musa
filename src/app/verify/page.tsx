"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RouteGuard from '@/utils/RouteGuard';
import GuardDashboard from '@/components/guard/GuardDashboard';

export default function VerifyPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  
  return (
    <RouteGuard allowedRoles={['guard']}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Verify Access Codes</h1>
        
        {currentUser && <GuardDashboard user={currentUser} />}
      </div>
    </RouteGuard>
  );
}
