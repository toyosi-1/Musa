import { describe, expect, it } from 'vitest';
import { getDashboardRoute } from './dashboardRoute';

describe('getDashboardRoute', () => {
  it.each([
    ['guard',        '/dashboard/guard'],
    ['admin',        '/admin/dashboard'],
    ['estate_admin', '/estate-admin/dashboard'],
    ['resident',     '/dashboard/resident'],
  ])('maps %s to %s', (role, expected) => {
    expect(getDashboardRoute(role)).toBe(expected);
  });

  it('forces re-auth for unknown roles', () => {
    expect(getDashboardRoute('hacker')).toBe('/auth/login');
  });

  it('forces re-auth for undefined / null / empty', () => {
    expect(getDashboardRoute(undefined)).toBe('/auth/login');
    expect(getDashboardRoute('')).toBe('/auth/login');
  });
});
