/**
 * Pure utilities for ranking Flutterwave biller candidates against a client request.
 * Extracted from complete-purchase route so the matching logic is unit-testable.
 */

export interface FlutterwaveBillItem {
  item_code: string;
  biller_code: string;
  biller_name?: string;
  short_name?: string;
  name?: string;
  [key: string]: unknown;
}

export interface BillerCandidate {
  itemCode: string;
  billerCode: string;
  label: string;
}

/**
 * Determine whether a purchase request is for prepaid (default) or postpaid based on naming hints.
 */
export function detectPrepaidIntent(itemName?: string, clientItemCode?: string, billerName?: string): 'prepaid' | 'postpaid' {
  const nameHint = `${itemName || ''} ${clientItemCode || ''} ${billerName || ''}`.toLowerCase();
  if (nameHint.includes('postpaid')) return 'postpaid';
  return 'prepaid';
}

/**
 * Given the live Flutterwave /bill-categories data and a client's biller/item codes,
 * return an ordered list of candidate (itemCode, billerCode) pairs to try sequentially.
 *
 * Matching strategy (in priority order):
 *   1. Exact match on client item_code
 *   2. All items with matching biller_code, preferring correct prepaid/postpaid type
 *   3. Fuzzy name match on billerName words (only if biller_code match produced nothing)
 *   4. Fallback to the client's original code so the request is still attempted
 */
export function rankBillerCandidates(
  apiData: FlutterwaveBillItem[] | null | undefined,
  billerCode: string,
  clientItemCode: string,
  billerName?: string,
  itemName?: string,
): BillerCandidate[] {
  const candidates: BillerCandidate[] = [];

  if (!Array.isArray(apiData) || apiData.length === 0) {
    candidates.push({ itemCode: clientItemCode, billerCode, label: 'client-fallback-no-data' });
    return candidates;
  }

  const typeLabel = detectPrepaidIntent(itemName, clientItemCode, billerName);

  // 1. Exact match
  const exactMatch = apiData.find((item) => item.item_code === clientItemCode);
  if (exactMatch) {
    candidates.push({ itemCode: clientItemCode, billerCode: exactMatch.biller_code, label: 'exact-match' });
  }

  // 2. biller_code match
  const billerItems = apiData.filter((item) => item.biller_code === billerCode);
  if (billerItems.length > 0) {
    const sorted = [...billerItems].sort((a, b) => {
      const aName = `${a.biller_name || ''} ${a.name || ''}`.toLowerCase();
      const bName = `${b.biller_name || ''} ${b.name || ''}`.toLowerCase();
      const aMatch = aName.includes(typeLabel) ? 0 : 1;
      const bMatch = bName.includes(typeLabel) ? 0 : 1;
      return aMatch - bMatch;
    });
    for (const item of sorted) {
      if (!candidates.some((c) => c.itemCode === item.item_code)) {
        candidates.push({
          itemCode: item.item_code,
          billerCode: item.biller_code,
          label: `biller-code-match(${item.biller_name || ''})`,
        });
      }
    }
  }

  // 3. Fuzzy name fallback (only if biller_code match produced nothing)
  if (billerItems.length === 0 && billerName) {
    const nameWords = billerName
      .toLowerCase()
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const fuzzyItems = apiData.filter((item) => {
      const text = `${item.biller_name || ''} ${item.short_name || ''} ${item.name || ''}`.toLowerCase();
      return nameWords.some((w) => text.includes(w));
    });
    const sorted = [...fuzzyItems].sort((a, b) => {
      const aName = `${a.biller_name || ''} ${a.name || ''}`.toLowerCase();
      const bName = `${b.biller_name || ''} ${b.name || ''}`.toLowerCase();
      const aMatch = aName.includes(typeLabel) ? 0 : 1;
      const bMatch = bName.includes(typeLabel) ? 0 : 1;
      return aMatch - bMatch;
    });
    for (const item of sorted) {
      if (!candidates.some((c) => c.itemCode === item.item_code)) {
        candidates.push({
          itemCode: item.item_code,
          billerCode: item.biller_code,
          label: `fuzzy-name(${item.biller_name || ''})`,
        });
      }
    }
  }

  // 4. Guaranteed fallback
  if (candidates.length === 0) {
    candidates.push({ itemCode: clientItemCode, billerCode, label: 'client-fallback' });
  }

  return candidates;
}
