"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Placed on the landing page (`/`). If a user is already logged in
 * (session persisted from a previous visit), redirect them straight
 * to their dashboard so they never see the Register/Login screen again.
 */
export default function SessionRedirect() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Wait for auth to initialise

    if (currentUser) {
      const target =
        currentUser.role === 'estate_admin'
          ? '/estate-admin/dashboard'
          : currentUser.role === 'admin'
            ? '/admin/dashboard'
            : currentUser.role === 'guard'
              ? '/dashboard/guard'
              : '/dashboard/resident';

      router.replace(target);
    }
  }, [currentUser, loading, router]);

  // Also do an instant check from localStorage before React hydrates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('musa_user_profile_cache');
      if (cached) {
        const { user } = JSON.parse(cached);
        if (user?.uid) {
          // We have a persisted session — show nothing while auth loads
          document.getElementById('home-landing')?.classList.add('opacity-0');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return null; // Renders nothing — purely side-effect
}
