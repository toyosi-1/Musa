import { describe, it, expect } from 'vitest';
import { mapOccupation, normalizePhone, shouldSkipVendor, resolveVendorDisplayName } from './vendorMapping';

describe('mapOccupation', () => {
  it('maps electrical occupations to electrician', () => {
    expect(mapOccupation('Electrician', 'Snr Facility Manager')).toContain('electrician');
    expect(mapOccupation('Electrical Engineering', 'UPS/FM200/Fire System')).toContain('electrician');
    expect(mapOccupation('Mechanical', 'Generator Specialist')).toContain('electrician');
  });

  it('maps civil/construction/wood work to carpenter', () => {
    expect(mapOccupation('Civil', 'Wood Work Specialist')).toContain('carpenter');
    expect(mapOccupation('Civil Works', 'Scaffolding')).toContain('carpenter');
    expect(mapOccupation('Construction', 'Quantity Surveyor')).toContain('carpenter');
    expect(mapOccupation('Interior Fittings', 'Blinds')).toContain('carpenter');
    expect(mapOccupation('Fabrications', 'Glass Production')).toContain('carpenter');
  });

  it('maps painting to painter', () => {
    expect(mapOccupation('Civil Works', 'Painter/Screeding')).toContain('painter');
    // also accept the bare 'screed' keyword (e.g. 'Screeding Specialist')
    expect(mapOccupation('Civil Works', 'Screeding Specialist')).toContain('painter');
  });

  it('maps pool/flooring/tiles to plumber', () => {
    expect(mapOccupation('Pool Management', 'Tiles Flooring and Gen Cleaning')).toContain('plumber');
    expect(mapOccupation('Civil Works', 'Floor and Buffering Professional')).toContain('plumber');
  });

  it('maps cleaning/janitorial/waste to cleaner', () => {
    expect(mapOccupation('Janitorial', 'House Cleaning')).toContain('cleaner');
    expect(mapOccupation('Waste Management', 'Biodigester')).toContain('cleaner');
  });

  it('maps DSTV/gym/kitchen to it_support', () => {
    expect(mapOccupation('DSTV', 'DSTV')).toContain('it_support');
    expect(mapOccupation('Mechanical', 'Gym Equipments')).toContain('it_support');
  });

  it('maps supplier/dealer/vehicle to other', () => {
    expect(mapOccupation('Supplier', 'Diesel Supplier')).toContain('other');
    expect(mapOccupation('Dealership', 'Vehicle Dealer')).toContain('other');
    expect(mapOccupation('Contracting', 'General Services')).toContain('other');
  });

  it('always returns at least one service type', () => {
    expect(mapOccupation('', '')).toEqual(['other']);
    expect(mapOccupation('Random Unknown Thing', '')).toEqual(['other']);
  });

  it('handles case-insensitively', () => {
    expect(mapOccupation('ELECTRICIAN', 'SNR FACILITY MANAGER')).toContain('electrician');
    expect(mapOccupation('electrician', 'snr facility manager')).toContain('electrician');
  });

  it('handles null/undefined inputs gracefully', () => {
    expect(mapOccupation(null as any, null as any)).toEqual(['other']);
    expect(mapOccupation(undefined as any, undefined as any)).toEqual(['other']);
  });

  it('can return multiple matching service types', () => {
    // "Construction" matches carpenter, "Electrician" matches electrician, for a combined row
    const result = mapOccupation('Construction Electrician', 'Civil Works');
    expect(result).toContain('electrician');
    expect(result).toContain('carpenter');
  });
});

describe('normalizePhone', () => {
  it('returns primary number when slash-separated', () => {
    expect(normalizePhone('08024175196 / 09052075189')).toBe('08024175196');
  });

  it('strips whitespace', () => {
    expect(normalizePhone('  08024175196  ')).toBe('08024175196');
    expect(normalizePhone('080 241 75196')).toBe('08024175196');
  });

  it('returns single number as-is', () => {
    expect(normalizePhone('08160686300')).toBe('08160686300');
  });

  it('returns N/A for empty/null input', () => {
    expect(normalizePhone('')).toBe('N/A');
    expect(normalizePhone(null as any)).toBe('N/A');
    expect(normalizePhone(undefined as any)).toBe('N/A');
  });
});

describe('shouldSkipVendor', () => {
  it('skips empty names with no company', () => {
    expect(shouldSkipVendor('')).toBe(true);
    expect(shouldSkipVendor('   ')).toBe(true);
    expect(shouldSkipVendor(null)).toBe(true);
    expect(shouldSkipVendor(undefined)).toBe(true);
  });

  it('skips Nil placeholder when company is also missing/Nil', () => {
    expect(shouldSkipVendor('Nil')).toBe(true);
    expect(shouldSkipVendor('NIL', 'NIL')).toBe(true);
    expect(shouldSkipVendor('nil', '')).toBe(true);
    expect(shouldSkipVendor('  nil  ', undefined)).toBe(true);
  });

  it('does not skip real names', () => {
    expect(shouldSkipVendor('Raphael Etim')).toBe(false);
    expect(shouldSkipVendor('Ayotunde')).toBe(false);
  });

  it('keeps rows where the person name is Nil but the company is real', () => {
    expect(shouldSkipVendor('Nil', 'Kitchen and Accessories')).toBe(false);
    expect(shouldSkipVendor('', 'GO Autos')).toBe(false);
  });
});

describe('resolveVendorDisplayName', () => {
  it('returns the person name when present', () => {
    expect(resolveVendorDisplayName('Raphael Etim', 'NIL')).toBe('Raphael Etim');
    expect(resolveVendorDisplayName('Ayotunde', 'Heywhy Cleaning Service')).toBe('Ayotunde');
  });

  it('falls back to the company when the person name is empty or Nil', () => {
    expect(resolveVendorDisplayName('Nil', 'Kitchen and Accessories')).toBe('Kitchen and Accessories');
    expect(resolveVendorDisplayName('', 'GO Autos')).toBe('GO Autos');
    expect(resolveVendorDisplayName(null, '  Mantrac  ')).toBe('Mantrac');
  });

  it('returns an empty string when neither name nor company is usable', () => {
    expect(resolveVendorDisplayName('Nil', 'NIL')).toBe('');
    expect(resolveVendorDisplayName('', '')).toBe('');
  });
});
