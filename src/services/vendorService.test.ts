import { describe, it, expect } from 'vitest';
import { mergeVendors } from './vendorService';
import type { Vendor } from '@/types/user';

// Minimal factory — only the fields mergeVendors cares about (id) plus a marker
// so we can assert which list each vendor came from.
function v(id: string, marker: string): Vendor {
  return {
    id,
    estateId: 'test',
    name: marker,
    phone: '0000',
    serviceTypes: ['other'],
    isAvailable: true,
    addedBy: 'seed',
    addedAt: 0,
  };
}

describe('mergeVendors', () => {
  it('returns the primary list when the secondary is empty', () => {
    const primary = [v('a', 'local-A'), v('b', 'local-B')];
    const out = mergeVendors(primary, []);
    expect(out.map(x => x.id)).toEqual(['a', 'b']);
    expect(out.map(x => x.name)).toEqual(['local-A', 'local-B']);
  });

  it('returns the secondary list when the primary is empty', () => {
    const secondary = [v('p1', 'platform-1'), v('p2', 'platform-2')];
    const out = mergeVendors([], secondary);
    expect(out.map(x => x.id)).toEqual(['p1', 'p2']);
  });

  it('concatenates primary then secondary when ids are disjoint', () => {
    const primary = [v('a', 'local-A')];
    const secondary = [v('p1', 'platform-1')];
    const out = mergeVendors(primary, secondary);
    expect(out.map(x => x.id)).toEqual(['a', 'p1']);
  });

  it('lets primary entries win when ids collide', () => {
    const primary = [v('shared', 'local-version')];
    const secondary = [v('shared', 'platform-version')];
    const out = mergeVendors(primary, secondary);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('local-version');
  });

  it('drops entries with missing ids so the Set semantics stay predictable', () => {
    const primary = [v('a', 'ok'), { ...v('', 'no-id') }];
    const secondary = [v('b', 'ok-too')];
    const out = mergeVendors(primary, secondary);
    expect(out.map(x => x.id)).toEqual(['a', 'b']);
  });

  it('preserves the first-seen entry for duplicate ids within a single list', () => {
    const primary = [v('dup', 'first'), v('dup', 'second')];
    const out = mergeVendors(primary, []);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('first');
  });
});
