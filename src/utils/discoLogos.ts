/**
 * Nigerian DisCo (Distribution Company) brand identity.
 * Includes brand colors, abbreviations, and SVG logo data.
 */

export interface DiscoBrand {
  abbr: string;          // Short abbreviation shown in fallback
  color: string;         // Primary brand background color
  secondaryColor: string; // Secondary/accent color for gradient
  textColor: string;     // Text color on the icon
  fullName: string;      // Full company name
  logoSvg: string;       // SVG path data for the logo icon (fallback)
  logoImage?: string;    // Path to actual logo image file
}

// Map biller codes to their brand identity with recognizable logos
const DISCO_BRANDS: Record<string, DiscoBrand> = {
  // Ikeja Electric (IE) — Red brand, lightning bolt in shield
  BIL113: {
    abbr: 'IE',
    color: '#E31937',
    secondaryColor: '#B71530',
    textColor: '#FFFFFF',
    fullName: 'Ikeja Electric',
    logoSvg: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 18.93C7.05 18.13 5 14.67 5 11V6.3l7-3.11v16.74zM11 10l-2 5h2.5L10 19l5-7h-3l2-4h-3z',
    logoImage: '/images/discos/ikedc.png',
  },
  // Eko Electric (EKEDC) — Blue brand, power tower
  BIL112: {
    abbr: 'EKO',
    color: '#0054A6',
    secondaryColor: '#003D7A',
    textColor: '#FFFFFF',
    fullName: 'Eko Electricity',
    logoSvg: 'M12 2L6 7v2h2v11h2v-5h4v5h2V9h2V7l-6-5zm0 2.41L16 8v1H8V8l4-3.59zM10 11h4v2h-4v-2z',
    logoImage: '/images/discos/ekedc.png',
  },
  // Abuja Electric (AEDC) — Green brand, lightning in circle
  BIL204: {
    abbr: 'AE',
    color: '#00A551',
    secondaryColor: '#007D3E',
    textColor: '#FFFFFF',
    fullName: 'Abuja Electricity',
    logoSvg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-1-13h2l-1 4h3l-5 7 1-4H8l3-7z',
    logoImage: '/images/discos/aedc.png',
  },
  // Kano Electric (KEDCO) — Orange brand, sun with bolt
  BIL120: {
    abbr: 'KE',
    color: '#F7941D',
    secondaryColor: '#E07B0D',
    textColor: '#FFFFFF',
    fullName: 'Kano Electricity',
    logoSvg: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zm1-9V2h-2v4h2zm0 14v-4h-2v4h2zm9-7h-4v-2h4v2zM6 13H2v-2h4v2zm12.36-5.64l-2.83 2.83-1.41-1.42 2.83-2.83 1.41 1.42zM7.88 17.24l-2.83 2.83-1.41-1.42 2.83-2.83 1.41 1.42zm10.49 2.83l-2.83-2.83 1.41-1.42 2.83 2.83-1.41 1.42zM5.05 7.59L7.88 4.76l1.41 1.42-2.83 2.83-1.41-1.42z',
    logoImage: '/images/discos/kedco.png',
  },
  // Port Harcourt Electric (PHED) — Navy brand, wave + bolt
  BIL116: {
    abbr: 'PH',
    color: '#00529B',
    secondaryColor: '#003C73',
    textColor: '#FFFFFF',
    fullName: 'Port Harcourt Electricity',
    logoSvg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2l-1-6h4l-1 6z',
    logoImage: '/images/discos/phed.png',
  },
  // Jos Electric (JED) — Dark red brand, mountain + bolt
  BIL215: {
    abbr: 'JED',
    color: '#8B0000',
    secondaryColor: '#660000',
    textColor: '#FFFFFF',
    fullName: 'Jos Electricity',
    logoSvg: 'M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6zm-3.22 9L12 13.2 13.22 15h-2.44z',
    logoImage: '/images/discos/jed.png',
  },
  // Ibadan Electric (IBEDC) — Dark blue brand, gateway arch
  BIL114: {
    abbr: 'IB',
    color: '#1B3C73',
    secondaryColor: '#122B55',
    textColor: '#FFFFFF',
    fullName: 'Ibadan Electricity',
    logoSvg: 'M6 21V7c0-3.31 2.69-6 6-6s6 2.69 6 6v14h-3v-7c0-1.66-1.34-3-3-3s-3 1.34-3 3v7H6zm6-16c-1.66 0-3 1.34-3 3v3.17c.85-.6 1.88-.95 3-.95s2.15.35 3 .95V8c0-1.66-1.34-3-3-3z',
    logoImage: '/images/discos/ibedc.png',
  },
  // Kaduna Electric (KAEDCO) — Green brand, leaf + power
  BIL119: {
    abbr: 'KD',
    color: '#006838',
    secondaryColor: '#004D2A',
    textColor: '#FFFFFF',
    fullName: 'Kaduna Electricity',
    logoSvg: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.37-.06.74-.1 1.12-.1 2.83 0 5.42 1.18 7.27 3.07l1.41-1.41C14.82 19.19 12.51 18 10 18c-.15 0-.3 0-.46.01l1.97-5.67A11.27 11.27 0 0017 14V8zm-5 4c-1.66 0-3-1.34-3-3 0-.37.08-.71.2-1.03C9.56 9.4 11 10.56 11 12h1z',
    logoImage: '/images/discos/kaedco.png',
  },
  // Enugu Electric (EEDC) — Orange brand, sun rays
  BIL115: {
    abbr: 'EN',
    color: '#FF6600',
    secondaryColor: '#CC5200',
    textColor: '#FFFFFF',
    fullName: 'Enugu Electricity',
    logoSvg: 'M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z',
    logoImage: '/images/discos/eedc.jpg',
  },
  // Benin Electric (BEDC) — Dark navy brand, ancient wall
  BIL117: {
    abbr: 'BE',
    color: '#003366',
    secondaryColor: '#002244',
    textColor: '#FFFFFF',
    fullName: 'Benin Electricity',
    logoSvg: 'M1 21h22V9L12 2 1 9v12zm2-2v-8.9l9-5.62L21 10.1V19H3zm4-6h2v4H7v-4zm4 0h2v4h-2v-4zm4 0h2v4h-2v-4z',
    logoImage: '/images/discos/bedc.png',
  },
  // Yola Electric (YEDC) — Purple brand, northern star
  BIL118: {
    abbr: 'YE',
    color: '#4B0082',
    secondaryColor: '#350060',
    textColor: '#FFFFFF',
    fullName: 'Yola Electricity',
    logoSvg: 'M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.2 5.6 21.2 8 14 2 9.2h7.6L12 2z',
    logoImage: '/images/discos/yedc.png',
  },
  // Aba Electric (ABEDC) — Teal brand, power bolt
  BIL121: {
    abbr: 'ABA',
    color: '#008080',
    secondaryColor: '#006060',
    textColor: '#FFFFFF',
    fullName: 'Aba Electricity',
    logoSvg: 'M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z',
    logoImage: '/images/discos/abedc.png',
  },
};

// Name-based matching for biller codes not in the map
const NAME_HINTS: Record<string, string> = {
  'ikeja': 'BIL113', 'eko': 'BIL112', 'abuja': 'BIL204', 'aedc': 'BIL204',
  'kano': 'BIL120', 'kedco': 'BIL120', 'port harcourt': 'BIL116', 'phed': 'BIL116',
  'jos': 'BIL215', 'jed': 'BIL215', 'ibadan': 'BIL114', 'ibedc': 'BIL114',
  'kaduna': 'BIL119', 'kaedco': 'BIL119', 'enugu': 'BIL115', 'eedc': 'BIL115',
  'benin': 'BIL117', 'bedc': 'BIL117', 'yola': 'BIL118', 'yedc': 'BIL118',
  'aba': 'BIL121', 'abedc': 'BIL121',
};

/**
 * Get the brand identity for a given biller code.
 * Uses name-based fuzzy matching as fallback if the code isn't found.
 */
export function getDiscoBrand(billerCode: string, providerName?: string): DiscoBrand {
  // Direct code match
  if (DISCO_BRANDS[billerCode]) {
    return DISCO_BRANDS[billerCode];
  }

  // Try name-based matching
  if (providerName) {
    const lower = providerName.toLowerCase();
    for (const [hint, code] of Object.entries(NAME_HINTS)) {
      if (lower.includes(hint)) {
        return DISCO_BRANDS[code];
      }
    }
  }

  // Fallback: generate from provider name
  const abbr = providerName
    ? providerName.replace(/[^A-Z]/g, '').substring(0, 3) || providerName.substring(0, 2).toUpperCase()
    : billerCode.substring(0, 3);
  return {
    abbr,
    color: '#6B7280',
    secondaryColor: '#4B5563',
    textColor: '#FFFFFF',
    fullName: providerName || billerCode,
    logoSvg: 'M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z',
  };
}
