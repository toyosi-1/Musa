import type { ServiceType } from '@/types/user';

/**
 * Maps spreadsheet occupation + designation text to one or more ServiceType values.
 * Used when bulk-importing vendors from the COG contact spreadsheet.
 *
 * Always returns at least one ServiceType (falls back to 'other').
 */
export function mapOccupation(occupation: string, designation: string): ServiceType[] {
  const occ = (occupation || '').toLowerCase();
  const des = (designation || '').toLowerCase();
  const combined = `${occ} ${des}`;

  const types: ServiceType[] = [];

  if (
    combined.includes('electric') ||
    combined.includes('electrician') ||
    combined.includes('generator') ||
    combined.includes('ups') ||
    combined.includes('fire system')
  ) types.push('electrician');

  if (
    combined.includes('plumb') ||
    combined.includes('pool') ||
    combined.includes('floor') ||
    combined.includes('tiles')
  ) types.push('plumber');

  if (
    combined.includes('civil') ||
    combined.includes('scaffold') ||
    combined.includes('wood') ||
    combined.includes('construction') ||
    combined.includes('carpenter') ||
    combined.includes('quantity') ||
    combined.includes('interior') ||
    combined.includes('fabricat')
  ) types.push('carpenter');

  if (combined.includes('paint') || combined.includes('screed')) types.push('painter');
  if (combined.includes('garden') || combined.includes('landscap')) types.push('gardener');
  if (combined.includes('security') || combined.includes('guard')) types.push('security');

  if (
    combined.includes('clean') ||
    combined.includes('janitorial') ||
    combined.includes('waste') ||
    combined.includes('house clean')
  ) types.push('cleaner');

  if (
    combined.includes('it ') ||
    combined.includes('dstv') ||
    combined.includes('tech') ||
    combined.includes('computer') ||
    combined.includes('gym') ||
    combined.includes('kitchen')
  ) types.push('it_support');

  if (
    combined.includes('contract') ||
    combined.includes('general') ||
    combined.includes('supplier') ||
    combined.includes('diesel') ||
    combined.includes('dealer') ||
    combined.includes('vehicle') ||
    combined.includes('blind') ||
    combined.includes('glass') ||
    combined.includes('biodigester') ||
    combined.includes('extractor') ||
    combined.includes('m & e') ||
    combined.includes('mechanic')
  ) types.push('other');

  return types.length > 0 ? types : ['other'];
}

/**
 * Normalizes raw contact string (e.g. "08024175196 / 09052075189") to primary phone.
 * Returns 'N/A' if no valid number found.
 */
export function normalizePhone(raw: string): string {
  if (!raw) return 'N/A';
  const primary = raw.split('/')[0].trim().replace(/\s/g, '');
  return primary || 'N/A';
}

/**
 * Returns true if a vendor row should be skipped during import.
 * A row is skippable only when BOTH the person name and the company are
 * empty or the placeholder "Nil" — without either, there is no useful
 * identifier to display to admins / residents.
 */
export function shouldSkipVendor(
  name: string | undefined | null,
  company?: string | undefined | null,
): boolean {
  const isPlaceholder = (s: string | undefined | null) => {
    const v = (s || '').trim();
    return !v || v.toLowerCase() === 'nil';
  };
  return isPlaceholder(name) && isPlaceholder(company);
}

/**
 * Returns the best human-readable display name for a vendor row.
 * Falls back to the company when the person name is empty or a placeholder.
 * Returns an empty string when neither name nor company is usable (the
 * caller should pair this with `shouldSkipVendor` so empty rows never reach
 * the database).
 */
export function resolveVendorDisplayName(
  name: string | undefined | null,
  company: string | undefined | null,
): string {
  const isReal = (s: string | undefined | null) => {
    const v = (s || '').trim();
    return v && v.toLowerCase() !== 'nil' ? v : '';
  };
  return isReal(name) || isReal(company);
}
