import type { UserRole } from '@/types/user';

/**
 * Pure mapping from user role to the dashboard route that role should land
 * on after login. Centralised so every post-auth redirect (login, biometric,
 * session recovery) picks the same route for a given role.
 *
 * If the role is unrecognised we fall back to the generic `/dashboard` path,
 * which subsequently redirects to `/auth/login` on the server — that's the
 * safe "force re-auth" behaviour documented in the original AuthForm.
 */
export function getDashboardRoute(role: UserRole | string | undefined): string {
  switch (role) {
    case 'guard':
      return '/dashboard/guard';
    case 'admin':
      return '/admin/dashboard';
    case 'estate_admin':
      return '/estate-admin/dashboard';
    case 'resident':
      return '/dashboard/resident';
    default:
      return '/auth/login';
  }
}
