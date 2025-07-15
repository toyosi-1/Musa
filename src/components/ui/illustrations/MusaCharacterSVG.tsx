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

  return (
    <svg 
      className={cn(
        'drop-shadow-lg transition-all duration-300', 
        animated && 'hover:scale-105', 
        isDarkMode && 'filter brightness-110 contrast-110',
        className
      )}
      width={size} 
      height={size} 
      viewBox="0 0 200 240" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700"/>
          <stop offset="100%" stopColor={isDarkMode ? "#DAA520" : "#B8860B"}/>
        </linearGradient>
        <radialGradient id="glowEffect" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx="100" cy="120" r="90" fill="url(#backgroundGradient)" opacity="0.1" />
      
      {/* Body - kurta */}
      <ellipse 
        cx="100" 
        cy="160" 
        rx="35" 
        ry="50" 
        fill={isDarkMode ? "#DAA520" : "#B8860B"} 
        stroke={isDarkMode ? "#B8860B" : "#8B4513"} 
        strokeWidth="2"
      />
      
      {/* Arms */}
      <ellipse 
        cx="70" 
        cy="140" 
        rx="12" 
        ry="25" 
        fill={isDarkMode ? "#E0C899" : "#CD853F"} 
        transform="rotate(-15 70 140)"
      />
      <ellipse 
        cx="130" 
        cy="140" 
        rx="12" 
        ry="25" 
        fill={isDarkMode ? "#E0C899" : "#CD853F"} 
        transform="rotate(15 130 140)"
      />
      
      {/* Hands */}
      <circle cx="85" cy="165" r="8" fill={isDarkMode ? "#E6B973" : "#8B4513"}/>
      <circle cx="115" cy="165" r="8" fill={isDarkMode ? "#E6B973" : "#8B4513"}/>
      
      {/* Kurta decoration */}
      <path 
        d="M85 130 Q100 125 115 130 L115 145 Q100 140 85 145 Z" 
        fill={isDarkMode ? "#FFD700" : "#DAA520"}
      />
      <circle cx="90" cy="135" r="2" fill={isDarkMode ? "#FFFF00" : "#FFD700"}/>
      <circle cx="100" cy="133" r="2" fill={isDarkMode ? "#FFFF00" : "#FFD700"}/>
      <circle cx="110" cy="135" r="2" fill={isDarkMode ? "#FFFF00" : "#FFD700"}/>
      
      {/* Legs */}
      <ellipse cx="90" cy="195" rx="8" ry="20" fill={isDarkMode ? "#8B7355" : "#654321"}/>
      <ellipse cx="110" cy="195" rx="8" ry="20" fill={isDarkMode ? "#8B7355" : "#654321"}/>
      
      {/* Feet */}
      <ellipse cx="90" cy="220" rx="10" ry="6" fill={isDarkMode ? "#A0522D" : "#8B4513"}/>
      <ellipse cx="110" cy="220" rx="10" ry="6" fill={isDarkMode ? "#A0522D" : "#8B4513"}/>
      
      {/* Head */}
      <circle 
        cx="100" 
        cy="85" 
        r="25" 
        fill={isDarkMode ? "#E6B973" : "#8B4513"}
      />
      
      {/* Hat base */}
      <ellipse 
        cx="100" 
        cy="65" 
        rx="28" 
        ry="15" 
        fill={isDarkMode ? "#FFD700" : "#DAA520"}
      />
      
      {/* Hat top */}
      <ellipse 
        cx="100" 
        cy="62" 
        rx="25" 
        ry="12" 
        fill={isDarkMode ? "#FFFF00" : "#FFD700"}
      />
      
      {/* Hat decoration */}
      <path 
        d="M75 65 Q100 70 125 65 Q100 75 75 65" 
        fill={isDarkMode ? "#DAA520" : "#B8860B"}
      />
      
      {/* Eyes */}
      <circle cx="92" cy="82" r="3" fill="#FFFFFF"/>
      <circle cx="108" cy="82" r="3" fill="#FFFFFF"/>
      <circle cx="92" cy="82" r="2" fill="#000000"/>
      <circle cx="108" cy="82" r="2" fill="#000000"/>
      
      {/* Nose */}
      <ellipse cx="100" cy="88" rx="2" ry="3" fill={isDarkMode ? "#CD853F" : "#654321"}/>
      
      {/* Mustache */}
      <ellipse 
        cx="100" 
        cy="95" 
        rx="15" 
        ry="8" 
        fill={isDarkMode ? "#4A4A4A" : "#2F1B14"}
      />
      <ellipse 
        cx="100" 
        cy="98" 
        rx="12" 
        ry="6" 
        fill={isDarkMode ? "#4A4A4A" : "#2F1B14"}
      />
      
      {/* Mouth */}
      <path 
        d="M95 92 Q100 95 105 92" 
        stroke={isDarkMode ? "#8B4513" : "#654321"} 
        strokeWidth="1" 
        fill="none"
      />
      
      {/* Decorative elements */}
      <g opacity="0.7">
        <circle cx="70" cy="60" r="3" fill={isDarkMode ? "#FFFF00" : "#FFD700"}/>
        <circle cx="130" cy="60" r="3" fill={isDarkMode ? "#FFFF00" : "#FFD700"}/>
        <circle cx="60" cy="100" r="2" fill={isDarkMode ? "#FFD700" : "#DAA520"}/>
        <circle cx="140" cy="100" r="2" fill={isDarkMode ? "#FFD700" : "#DAA500"}/>
      </g>

      {/* Overall glow effect */}
      <circle cx="100" cy="120" r="95" fill="url(#glowEffect)" opacity="0.3" />
    </svg>
  );
}
