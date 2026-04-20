import { describe, expect, it } from 'vitest';
import { getInitials, getRoleBadgeColor, formatRoleLabel } from './feedHelpers';

describe('getInitials', () => {
  it('takes the first letter of each space-separated word', () => {
    expect(getInitials('Toyosi Ajibola')).toBe('TA');
  });

  it('uppercases the result even for lowercase input', () => {
    expect(getInitials('john doe')).toBe('JD');
  });

  it('caps the result at two characters', () => {
    expect(getInitials('Anna Beth Cass')).toBe('AB');
  });

  it('handles a single name', () => {
    expect(getInitials('Chisom')).toBe('C');
  });
});

describe('getRoleBadgeColor', () => {
  it.each([
    ['admin',        'bg-red-100'],
    ['estate_admin', 'bg-purple-100'],
    ['guard',        'bg-yellow-100'],
    ['resident',     'bg-blue-100'],
    ['something',    'bg-blue-100'], // unknown → falls through to the default
  ])('returns the expected colour for %s', (role, expectedBg) => {
    expect(getRoleBadgeColor(role)).toContain(expectedBg);
  });
});

describe('formatRoleLabel', () => {
  it('renders estate_admin as Admin', () => {
    expect(formatRoleLabel('estate_admin')).toBe('Admin');
  });

  it('capitalises other roles', () => {
    expect(formatRoleLabel('resident')).toBe('Resident');
    expect(formatRoleLabel('guard')).toBe('Guard');
  });
});
