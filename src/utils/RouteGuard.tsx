"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if authentication is still loading
    if (loading) return;

    // If no user is logged in, redirect to login
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    // If specific roles are allowed and user doesn't have one of them
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(currentUser.role)) {
        // Redirect to dashboard if user doesn't have permission
        router.push('/dashboard');
      }
    }
  }, [currentUser, loading, router, allowedRoles]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children if user is not authenticated
  if (!currentUser) {
    return null;
  }

  // Don't render children if user doesn't have required role
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
}
