import { describe, it, expect } from 'vitest';
import { rankBillerCandidates, detectPrepaidIntent, type FlutterwaveBillItem } from './billerMatching';

// Sample representative data shaped like the Flutterwave /bill-categories response
const sampleApiData: FlutterwaveBillItem[] = [
  { item_code: 'AE-00001', biller_code: 'BIL112', biller_name: 'EKEDC PREPAID (IKEJA)', short_name: 'EKEDC', name: 'EKEDC Prepaid' },
  { item_code: 'AE-00002', biller_code: 'BIL112', biller_name: 'EKEDC POSTPAID (IKEJA)', short_name: 'EKEDC', name: 'EKEDC Postpaid' },
  { item_code: 'AE-00003', biller_code: 'BIL113', biller_name: 'IKEDC PREPAID', short_name: 'IKEDC', name: 'IKEDC Prepaid' },
  { item_code: 'AE-00004', biller_code: 'BIL113', biller_name: 'IKEDC POSTPAID', short_name: 'IKEDC', name: 'IKEDC Postpaid' },
  { item_code: 'AE-00005', biller_code: 'BIL114', biller_name: 'KEDCO PREPAID', short_name: 'KEDCO', name: 'KEDCO Prepaid' },
];

describe('detectPrepaidIntent', () => {
  it('returns postpaid when any hint mentions postpaid', () => {
    expect(detectPrepaidIntent('EKEDC Postpaid', 'AE-00002', 'EKEDC')).toBe('postpaid');
    expect(detectPrepaidIntent(undefined, 'POSTPAID-001', undefined)).toBe('postpaid');
  });

  it('defaults to prepaid otherwise', () => {
    expect(detectPrepaidIntent('EKEDC Prepaid', 'AE-00001', 'EKEDC')).toBe('prepaid');
    expect(detectPrepaidIntent(undefined, undefined, undefined)).toBe('prepaid');
    expect(detectPrepaidIntent('', '', '')).toBe('prepaid');
  });
});

describe('rankBillerCandidates', () => {
  it('returns an exact-match candidate first when client item_code exists in live data', () => {
    const result = rankBillerCandidates(sampleApiData, 'BIL112', 'AE-00001', 'EKEDC', 'Prepaid');
    expect(result[0]).toMatchObject({ itemCode: 'AE-00001', billerCode: 'BIL112', label: 'exact-match' });
  });

  it('never duplicates the client itemCode as both exact-match and biller-code-match', () => {
    const result = rankBillerCandidates(sampleApiData, 'BIL112', 'AE-00001', 'EKEDC', 'Prepaid');
    const codes = result.map((r) => r.itemCode);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it('returns ALL biller_code matches (not just one) so the API can retry', () => {
    const result = rankBillerCandidates(sampleApiData, 'BIL112', 'UNKNOWN', 'EKEDC', 'Prepaid');
    const codes = result.map((r) => r.itemCode);
    expect(codes).toContain('AE-00001');
    expect(codes).toContain('AE-00002');
  });

  it('prioritizes prepaid items when user wants prepaid', () => {
    const result = rankBillerCandidates(sampleApiData, 'BIL112', 'UNKNOWN', 'EKEDC', 'Prepaid');
    // First biller-code-match should be the prepaid one
    const billerMatches = result.filter((r) => r.label.startsWith('biller-code-match'));
    expect(billerMatches[0].itemCode).toBe('AE-00001');
  });

  it('prioritizes postpaid items when user wants postpaid', () => {
    const result = rankBillerCandidates(sampleApiData, 'BIL112', 'UNKNOWN', 'EKEDC', 'Postpaid');
    const billerMatches = result.filter((r) => r.label.startsWith('biller-code-match'));
    expect(billerMatches[0].itemCode).toBe('AE-00002');
  });

  it('falls back to fuzzy name match when biller_code has no matches', () => {
    const result = rankBillerCandidates(sampleApiData, 'WRONG-CODE', 'UNKNOWN', 'EKEDC', 'Prepaid');
    const fuzzy = result.filter((r) => r.label.startsWith('fuzzy-name'));
    expect(fuzzy.length).toBeGreaterThan(0);
    expect(fuzzy.some((f) => f.itemCode === 'AE-00001')).toBe(true);
  });

  it('does NOT use fuzzy match if biller_code match found results (avoids noise)', () => {
    const result = rankBillerCandidates(sampleApiData, 'BIL112', 'UNKNOWN', 'IKEDC', 'Prepaid');
    const fuzzy = result.filter((r) => r.label.startsWith('fuzzy-name'));
    expect(fuzzy.length).toBe(0);
  });

  it('returns a guaranteed fallback candidate if no matches found at all', () => {
    const result = rankBillerCandidates(sampleApiData, 'NONEXISTENT', 'ALSO-NONE', 'ZzzUnknown', 'Prepaid');
    expect(result.length).toBeGreaterThan(0);
    expect(result[result.length - 1].label).toBe('client-fallback');
  });

  it('handles empty API data gracefully', () => {
    const result = rankBillerCandidates([], 'BIL112', 'AE-00001', 'EKEDC', 'Prepaid');
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('client-fallback-no-data');
  });

  it('handles null/undefined API data gracefully', () => {
    expect(rankBillerCandidates(null, 'BIL112', 'AE-00001').length).toBe(1);
    expect(rankBillerCandidates(undefined, 'BIL112', 'AE-00001').length).toBe(1);
  });

  it('ignores short words (length <= 2) in fuzzy matching to avoid false positives', () => {
    // "of" and "in" are short; should not match anything just because words contain them
    const result = rankBillerCandidates(sampleApiData, 'WRONG', 'WRONG', 'of in', 'Prepaid');
    const fuzzy = result.filter((r) => r.label.startsWith('fuzzy-name'));
    expect(fuzzy.length).toBe(0);
  });

  it('handles parentheses in biller names for fuzzy matching', () => {
    const result = rankBillerCandidates(sampleApiData, 'WRONG', 'WRONG', 'EKEDC (Ikeja)', 'Prepaid');
    const fuzzy = result.filter((r) => r.label.startsWith('fuzzy-name'));
    expect(fuzzy.length).toBeGreaterThan(0);
  });

  it('always returns at least one candidate (regression: user was hitting empty-array bugs)', () => {
    expect(rankBillerCandidates(sampleApiData, 'X', 'X').length).toBeGreaterThanOrEqual(1);
    expect(rankBillerCandidates([], 'X', 'X').length).toBeGreaterThanOrEqual(1);
    expect(rankBillerCandidates(null, 'X', 'X').length).toBeGreaterThanOrEqual(1);
  });
});
