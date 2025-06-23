'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

type MusaCharacterSVGProps = {
  className?: string;
  size?: number;
  animated?: boolean;
};

export default function MusaCharacterSVG({ 
  className = '', 
  size = 200, 
  animated = true 
}: MusaCharacterSVGProps) {
  const { actualTheme } = useTheme();
  const isDarkMode = actualTheme === 'dark';

  // Color schemes based on dark mode
  const colors = isDarkMode ? {
    // Dark mode colors - brighter and more contrasting
    kurta: '#E6C168', // Brighter gold
    kurta_detail: '#F4D03F', // Bright yellow-gold
    kurta_buttons: '#FFE135', // Bright yellow
    skin: '#D4A574', // Lighter brown
    cap: '#F7DC6F', // Bright gold
    cap_highlight: '#FFEB3B', // Bright yellow
    cap_detail: '#E6C168', // Medium gold
    beard: '#4A4A4A', // Lighter dark
    pants: '#8B6F47', // Lighter brown
    feet: '#A0522D', // Lighter brown
    eyes_white: '#FFFFFF',
    eyes_black: '#000000',
    nose: '#8B6F47', // Lighter brown
    mouth: '#8B6F47', // Lighter brown
    background_start: '#FFE135', // Bright yellow
    background_end: '#E6C168', // Medium gold
    glow: '#FFE135', // Bright yellow
    decorative: '#FFE135', // Bright yellow
    decorative_alt: '#E6C168' // Medium gold
  } : {
    // Light mode colors - original colors
    kurta: '#B8860B',
    kurta_detail: '#DAA520',
    kurta_buttons: '#FFD700',
    skin: '#8B4513',
    cap: '#DAA520',
    cap_highlight: '#FFD700',
    cap_detail: '#B8860B',
    beard: '#2F1B14',
    pants: '#654321',
    feet: '#8B4513',
    eyes_white: '#FFFFFF',
    eyes_black: '#000000',
    nose: '#654321',
    mouth: '#654321',
    background_start: '#FFD700',
    background_end: '#B8860B',
    glow: '#FFD700',
    decorative: '#FFD700',
    decorative_alt: '#DAA520'
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 240" 
      className={cn(
        'drop-shadow-lg transition-all duration-300', 
        animated && 'hover:scale-105', 
        // Add dark mode background support
        isDarkMode && 'filter brightness-110 contrast-110',
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Enhanced Background Circle for better visibility */}
      <circle 
        cx="100" 
        cy="120" 
        r="90" 
        fill="url(#backgroundGradient)" 
        opacity={isDarkMode ? "0.2" : "0.1"}
        className={animated ? 'animate-pulse-slow' : ''}
      />
      
      {/* Character Body - Traditional Kurta */}
      <ellipse cx="100" cy="160" rx="35" ry="50" fill={colors.kurta} stroke={colors.skin} strokeWidth="2"/>
      
      {/* Arms */}
      <ellipse cx="70" cy="140" rx="12" ry="25" fill="#CD853F" transform="rotate(-15 70 140)"/>
      <ellipse cx="130" cy="140" rx="12" ry="25" fill="#CD853F" transform="rotate(15 130 140)"/>
      
      {/* Hands clasped */}
      <circle cx="85" cy="165" r="8" fill={colors.skin}/>
      <circle cx="115" cy="165" r="8" fill={colors.skin}/>
      
      {/* Traditional Kurta Details */}
      <path d="M85 130 Q100 125 115 130 L115 145 Q100 140 85 145 Z" fill={colors.kurta_detail}/>
      <circle cx="90" cy="135" r="2" fill={colors.kurta_buttons}/>
      <circle cx="100" cy="133" r="2" fill={colors.kurta_buttons}/>
      <circle cx="110" cy="135" r="2" fill={colors.kurta_buttons}/>
      
      {/* Legs/Pants */}
      <ellipse cx="90" cy="195" rx="8" ry="20" fill={colors.pants}/>
      <ellipse cx="110" cy="195" rx="8" ry="20" fill={colors.pants}/>
      
      {/* Feet */}
      <ellipse cx="90" cy="220" rx="10" ry="6" fill={colors.feet}/>
      <ellipse cx="110" cy="220" rx="10" ry="6" fill={colors.feet}/>
      
      {/* Head */}
      <circle cx="100" cy="85" r="25" fill={colors.skin}/>
      
      {/* Traditional Cap */}
      <ellipse cx="100" cy="65" rx="28" ry="15" fill={colors.cap}/>
      <ellipse cx="100" cy="62" rx="25" ry="12" fill={colors.cap_highlight}/>
      <path d="M75 65 Q100 70 125 65 Q100 75 75 65" fill={colors.cap_detail}/>
      
      {/* Eyes */}
      <circle cx="92" cy="82" r="3" fill={colors.eyes_white}/>
      <circle cx="108" cy="82" r="3" fill={colors.eyes_white}/>
      <circle cx="92" cy="82" r="2" fill={colors.eyes_black}/>
      <circle cx="108" cy="82" r="2" fill={colors.eyes_black}/>
      
      {/* Nose */}
      <ellipse cx="100" cy="88" rx="2" ry="3" fill={colors.nose}/>
      
      {/* Beard */}
      <ellipse cx="100" cy="95" rx="15" ry="8" fill={colors.beard}/>
      <ellipse cx="100" cy="98" rx="12" ry="6" fill={colors.beard}/>
      
      {/* Mouth */}
      <path d="M95 92 Q100 95 105 92" stroke={colors.mouth} strokeWidth="1" fill="none"/>
      
      {/* Decorative Elements */}
      <g opacity={isDarkMode ? "0.9" : "0.7"}>
        <circle cx="70" cy="60" r="3" fill={colors.decorative} className={animated ? 'animate-bounce-gentle' : ''} style={{animationDelay: '0.5s'}}/>
        <circle cx="130" cy="60" r="3" fill={colors.decorative} className={animated ? 'animate-bounce-gentle' : ''} style={{animationDelay: '1s'}}/>
        <circle cx="60" cy="100" r="2" fill={colors.decorative_alt} className={animated ? 'animate-bounce-gentle' : ''} style={{animationDelay: '1.5s'}}/>
        <circle cx="140" cy="100" r="2" fill={colors.decorative_alt} className={animated ? 'animate-bounce-gentle' : ''} style={{animationDelay: '2s'}}/>
      </g>
      
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.background_start}/>
          <stop offset="100%" stopColor={colors.background_end}/>
        </linearGradient>
        <radialGradient id="glowEffect" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.glow} stopOpacity={isDarkMode ? "0.9" : "0.8"}/>
          <stop offset="100%" stopColor={colors.glow} stopOpacity="0"/>
        </radialGradient>
      </defs>
      
      {/* Enhanced Glow effect for dark mode */}
      <circle 
        cx="100" 
        cy="120" 
        r="95" 
        fill="url(#glowEffect)" 
        opacity={isDarkMode ? "0.4" : "0.3"}
        className={animated ? 'animate-pulse-slow' : ''}
      />
    </svg>
  );
}
