/**
 * Pure helpers for the estate-feed UI.
 * The `_components` prefix keeps Next.js from routing these files.
 */

/** Two-character uppercase initials for an avatar. */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Tailwind classes for the coloured role pill shown next to the author. */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'estate_admin':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'guard':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  }
}

/** Human label for a role, lower-cased except for the first letter. */
export function formatRoleLabel(role: string): string {
  if (role === 'estate_admin') return 'Admin';
  return role.charAt(0).toUpperCase() + role.slice(1);
}
