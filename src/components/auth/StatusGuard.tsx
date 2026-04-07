"use client";

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StatusGuardProps {
  children: ReactNode;
  requireStatus?: 'approved' | 'pending' | 'rejected' | 'any';
  requireAdmin?: boolean;
  requireRole?: 'admin' | 'guard' | 'resident' | 'any';
  redirectUrl?: string;
}

export default function StatusGuard({
  children,
  requireStatus = 'approved',
  requireAdmin = false,
  requireRole = 'any',
  redirectUrl = '/auth/pending',
}: StatusGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // Wait until auth state is resolved
    if (!loading) {
      // Check if user exists
      if (!currentUser) {
        router.push('/auth/login');
        return;
      }

      // Check admin requirement if needed
      if (requireAdmin && currentUser.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      // Check role requirement if a specific role is required
      if (requireRole !== 'any' && currentUser.role !== requireRole) {
        console.log(`Role mismatch: required ${requireRole}, found ${currentUser.role}`);
        // Redirect based on actual role
        switch (currentUser.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'guard':
            router.push('/dashboard/guard');
            break;
          case 'resident':
            router.push('/dashboard/resident');
            break;
          default:
            console.error('SECURITY ERROR: Unknown user role in StatusGuard:', currentUser.role);
            router.push('/auth/login');
        }
        return;
      }

      // Check user status unless 'any' is specified
      if (requireStatus !== 'any' && currentUser.status !== requireStatus) {
        // Redirect based on actual status
        switch (currentUser.status) {
          case 'pending':
            router.push('/auth/pending');
            break;
          case 'rejected':
            router.push('/auth/rejected');
            break;
          case 'approved':
            // If we're on a status page but user is actually approved, go to dashboard
            if (window.location.pathname.includes('/auth/')) {
              router.push('/dashboard');
            }
            break;
          default:
            router.push(redirectUrl);
        }
        return;
      }

      // User meets all requirements
      setAuthorized(true);
    }
  }, [currentUser, loading, requireAdmin, requireStatus, requireRole, redirectUrl, router]);

  // Show loading while checking authorization
  if (loading || !authorized) {
    return <LoadingSpinner />;
  }

  // Render children only if authorized
  return <>{children}</>;
}
