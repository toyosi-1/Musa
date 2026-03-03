/**
 * Nigerian DisCo (Distribution Company) brand colors and abbreviations.
 * Used to render recognizable provider icons in the utilities UI.
 */

interface DiscoBrand {
  abbr: string;       // Short abbreviation shown in the icon
  color: string;      // Brand background color
  textColor: string;  // Text color on the icon
}

// Map biller codes to their brand identity
const DISCO_BRANDS: Record<string, DiscoBrand> = {
  // Ikeja Electric
  BIL113: { abbr: 'IE', color: '#E31937', textColor: '#FFFFFF' },
  // Eko Electric
  BIL112: { abbr: 'EKO', color: '#0054A6', textColor: '#FFFFFF' },
  // Abuja Electric (AEDC)
  BIL204: { abbr: 'AE', color: '#00A551', textColor: '#FFFFFF' },
  // Kano Electric (KEDCO)
  BIL120: { abbr: 'KE', color: '#F7941D', textColor: '#FFFFFF' },
  // Port Harcourt Electric
  BIL116: { abbr: 'PH', color: '#00529B', textColor: '#FFFFFF' },
  // Jos Electric (JED)
  BIL215: { abbr: 'JED', color: '#8B0000', textColor: '#FFFFFF' },
  // Ibadan Electric (IBEDC)
  BIL114: { abbr: 'IB', color: '#1B3C73', textColor: '#FFFFFF' },
  // Kaduna Electric (KAEDCO)
  BIL119: { abbr: 'KD', color: '#006838', textColor: '#FFFFFF' },
  // Enugu Electric (EEDC)
  BIL115: { abbr: 'EN', color: '#FF6600', textColor: '#FFFFFF' },
  // Benin Electric (BEDC)
  BIL117: { abbr: 'BE', color: '#003366', textColor: '#FFFFFF' },
  // Yola Electric (YEDC)
  BIL118: { abbr: 'YE', color: '#4B0082', textColor: '#FFFFFF' },
};

/**
 * Get the brand identity for a given biller code.
 * Falls back to a generic style using the first 2 characters of the provider name.
 */
export function getDiscoBrand(billerCode: string, providerName?: string): DiscoBrand {
  if (DISCO_BRANDS[billerCode]) {
    return DISCO_BRANDS[billerCode];
  }
  // Fallback: generate from provider name
  const abbr = providerName
    ? providerName.replace(/[^A-Z]/g, '').substring(0, 3) || providerName.substring(0, 2).toUpperCase()
    : billerCode.substring(0, 3);
  return { abbr, color: '#6B7280', textColor: '#FFFFFF' };
}
