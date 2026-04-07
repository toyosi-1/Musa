/**
 * VTPass Service ID mapping for Nigerian Electricity DisCos.
 * Maps Flutterwave biller codes/names to VTPass service IDs.
 */

export interface VTPassDiscoMapping {
  serviceId: string;
  name: string;
}

// Map Flutterwave biller codes to VTPass service IDs
const BILLER_CODE_MAP: Record<string, VTPassDiscoMapping> = {
  BIL113: { serviceId: 'ikeja-electric', name: 'Ikeja Electric' },
  BIL112: { serviceId: 'eko-electric', name: 'Eko Electric' },
  BIL204: { serviceId: 'abuja-electric', name: 'Abuja Electric' },
  BIL120: { serviceId: 'kano-electric', name: 'Kano Electric' },
  BIL116: { serviceId: 'phed', name: 'Port Harcourt Electric' },
  BIL215: { serviceId: 'jos-electric', name: 'Jos Electric' },
  BIL114: { serviceId: 'ibadan-electric', name: 'Ibadan Electric' },
  BIL119: { serviceId: 'kaduna-electric', name: 'Kaduna Electric' },
  BIL115: { serviceId: 'enugu-electric', name: 'Enugu Electric' },
  BIL117: { serviceId: 'benin-electric', name: 'Benin Electric' },
  BIL118: { serviceId: 'yola-electric', name: 'Yola Electric' },
};

// Fuzzy name-based fallback matching
const NAME_KEYWORDS: [string, string][] = [
  ['ikeja', 'ikeja-electric'],
  ['ikedc', 'ikeja-electric'],
  ['eko', 'eko-electric'],
  ['ekedc', 'eko-electric'],
  ['abuja', 'abuja-electric'],
  ['aedc', 'abuja-electric'],
  ['kano', 'kano-electric'],
  ['kedco', 'kano-electric'],
  ['port harcourt', 'phed'],
  ['phed', 'phed'],
  ['phedc', 'phed'],
  ['jos', 'jos-electric'],
  ['jed', 'jos-electric'],
  ['ibadan', 'ibadan-electric'],
  ['ibedc', 'ibadan-electric'],
  ['kaduna', 'kaduna-electric'],
  ['kaedco', 'kaduna-electric'],
  ['enugu', 'enugu-electric'],
  ['eedc', 'enugu-electric'],
  ['benin', 'benin-electric'],
  ['bedc', 'benin-electric'],
  ['yola', 'yola-electric'],
  ['yedc', 'yola-electric'],
  ['aba', 'aba-electric'],
];

/**
 * Resolve a VTPass service ID from a Flutterwave biller code and/or biller name.
 */
export function resolveVTPassServiceId(billerCode?: string, billerName?: string): string | null {
  // 1. Direct code mapping
  if (billerCode && BILLER_CODE_MAP[billerCode]) {
    return BILLER_CODE_MAP[billerCode].serviceId;
  }

  // 2. Name-based fuzzy match
  if (billerName) {
    const lower = billerName.toLowerCase();
    for (const [keyword, serviceId] of NAME_KEYWORDS) {
      if (lower.includes(keyword)) {
        return serviceId;
      }
    }
  }

  return null;
}

/**
 * Determine VTPass variation code ('prepaid' or 'postpaid') from item name.
 */
export function resolveVariationCode(itemName?: string, itemCode?: string): string {
  const text = (itemName || itemCode || '').toLowerCase();
  if (text.includes('postpaid')) return 'postpaid';
  return 'prepaid'; // default to prepaid
}

/**
 * Generate a unique VTPass request ID.
 * Format: YYYYMMDDHHMMSS + random digits (must be unique per transaction)
 */
export function generateVTPassRequestId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const random = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0');
  return `${dateStr}${random}`;
}
