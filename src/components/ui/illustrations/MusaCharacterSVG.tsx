'use client';

import { useId } from 'react';

type MusaCharacterSVGProps = {
  className?: string;
  size?: number;
  animated?: boolean;
};

export default function MusaCharacterSVG({
  className = '',
  size = 200,
  animated = true,
}: MusaCharacterSVGProps) {
  const id = useId();
  const p = (s: string) => `musa-${s}-${id}`;

  return (
    <svg
      className={`musa-character drop-shadow-lg transition-all duration-300 ${animated ? 'hover:scale-105' : ''} ${className}`}
      width={size}
      height={size * 1.2}
      viewBox="0 0 200 260"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Musa mascot"
      focusable="false"
    >
      <defs>
        {/* Skin gradient — warm brown with highlight */}
        <radialGradient id={p('skin')} cx="40%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#E0B07A" />
          <stop offset="100%" stopColor="#C48A56" />
        </radialGradient>

        {/* Agbada body gradient — rich gold fabric */}
        <linearGradient id={p('agbada')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5D77A" />
          <stop offset="40%" stopColor="#D4A520" />
          <stop offset="100%" stopColor="#A67C00" />
        </linearGradient>

        {/* Agbada shadow side */}
        <linearGradient id={p('agbadaShadow')} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A67C00" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7A5800" stopOpacity="0.7" />
        </linearGradient>

        {/* Inner tunic — slightly lighter */}
        <linearGradient id={p('inner')} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="100%" stopColor="#D4A520" />
        </linearGradient>

        {/* Cap gradient — bright gold with sheen */}
        <linearGradient id={p('cap')} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#FFE57F" />
          <stop offset="35%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>

        {/* Cap top highlight */}
        <linearGradient id={p('capHl')} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#FFF5CC" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0.3" />
        </linearGradient>

        {/* Soft ambient glow behind character */}
        <radialGradient id={p('glow')} cx="50%" cy="42%" r="52%">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.25" />
          <stop offset="70%" stopColor="#FFD700" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>

        {/* Cheek blush */}
        <radialGradient id={p('cheek')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8944A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#E8944A" stopOpacity="0" />
        </radialGradient>

        {/* Shoe leather */}
        <linearGradient id={p('shoe')} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#5C3317" />
          <stop offset="100%" stopColor="#3B1F0E" />
        </linearGradient>

        {/* Embroidery pattern */}
        <pattern id={p('embroidery')} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.7" fill="#FFE57F" opacity="0.45" />
        </pattern>

        {/* Drop shadow filter */}
        <filter id={p('shadow')} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#3B1F0E" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="100" cy="135" rx="88" ry="110" fill={`url(#${p('glow')})`} />

      {/* Main character group */}
      <g filter={`url(#${p('shadow')})`}>
        {animated ? (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -3; 0 0"
            dur="3.5s"
            repeatCount="indefinite"
          />
        ) : null}

        {/* ── LEGS & FEET ── */}
        {/* Trousers */}
        <path d="M88 195 L84 228 Q84 234 90 234 L94 234 Q98 234 97 228 L93 200 Z" fill="#4A3728" />
        <path d="M112 195 L116 228 Q116 234 110 234 L106 234 Q102 234 103 228 L107 200 Z" fill="#4A3728" />

        {/* Shoes */}
        <ellipse cx="89" cy="237" rx="11" ry="5.5" fill={`url(#${p('shoe')})`} />
        <ellipse cx="111" cy="237" rx="11" ry="5.5" fill={`url(#${p('shoe')})`} />
        <ellipse cx="89" cy="235.5" rx="9" ry="3" fill="#6B3F2A" opacity="0.3" />
        <ellipse cx="111" cy="235.5" rx="9" ry="3" fill="#6B3F2A" opacity="0.3" />

        {/* ── AGBADA BODY ── */}
        {/* Main robe — wider flowing shape */}
        <path
          d="M58 130 Q56 160 60 198 Q70 210 100 212 Q130 210 140 198 Q144 160 142 130
             Q135 118 100 115 Q65 118 58 130 Z"
          fill={`url(#${p('agbada')})`}
          stroke="#A67C00"
          strokeWidth="0.8"
        />

        {/* Embroidery overlay on chest */}
        <rect x="82" y="120" width="36" height="55" rx="4" fill={`url(#${p('embroidery')})`} opacity="0.7" />

        {/* Central chest panel / inner tunic visible area */}
        <path
          d="M85 120 Q100 117 115 120 L113 170 Q100 172 87 170 Z"
          fill={`url(#${p('inner')})`}
          opacity="0.6"
        />

        {/* Neckline — V-neck with embroidered border */}
        <path
          d="M82 122 Q100 132 118 122"
          stroke="#A67C00"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M84 124 Q100 133 116 124"
          stroke="#FFE57F"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Decorative embroidery lines down the center */}
        <line x1="100" y1="128" x2="100" y2="175" stroke="#A67C00" strokeWidth="1.2" opacity="0.5" />
        <line x1="97" y1="130" x2="97" y2="172" stroke="#FFE57F" strokeWidth="0.4" opacity="0.35" />
        <line x1="103" y1="130" x2="103" y2="172" stroke="#FFE57F" strokeWidth="0.4" opacity="0.35" />

        {/* Fabric fold shadows */}
        <path d="M65 140 Q68 170 70 195" stroke="#8B6914" strokeWidth="1" fill="none" opacity="0.3" />
        <path d="M135 140 Q132 170 130 195" stroke="#8B6914" strokeWidth="1" fill="none" opacity="0.3" />

        {/* ── ARMS (flowing agbada sleeves) ── */}
        {/* Left sleeve */}
        <path
          d="M58 130 Q42 135 38 155 Q36 170 45 178 Q52 172 58 155 Q60 145 58 130 Z"
          fill={`url(#${p('agbada')})`}
          stroke="#A67C00"
          strokeWidth="0.5"
        />
        {/* Left sleeve shadow */}
        <path d="M50 140 Q44 158 46 172" stroke="#8B6914" strokeWidth="0.8" fill="none" opacity="0.3" />

        {/* Right sleeve */}
        <path
          d="M142 130 Q158 135 162 155 Q164 170 155 178 Q148 172 142 155 Q140 145 142 130 Z"
          fill={`url(#${p('agbada')})`}
          stroke="#A67C00"
          strokeWidth="0.5"
        />
        {/* Right sleeve shadow */}
        <path d="M150 140 Q156 158 154 172" stroke="#8B6914" strokeWidth="0.8" fill="none" opacity="0.3" />

        {/* ── HANDS ── */}
        <ellipse cx="44" cy="180" rx="7.5" ry="9" fill={`url(#${p('skin')})`} stroke="#B8864B" strokeWidth="0.6" />
        <ellipse cx="156" cy="180" rx="7.5" ry="9" fill={`url(#${p('skin')})`} stroke="#B8864B" strokeWidth="0.6" />
        {/* Fingers hint */}
        <path d="M39 176 Q37 180 39 184" stroke="#B8864B" strokeWidth="0.5" fill="none" opacity="0.4" />
        <path d="M161 176 Q163 180 161 184" stroke="#B8864B" strokeWidth="0.5" fill="none" opacity="0.4" />

        {/* ── NECK ── */}
        <rect x="93" y="102" width="14" height="20" rx="5" fill={`url(#${p('skin')})`} />

        {/* ── HEAD ── */}
        <ellipse cx="100" cy="82" rx="28" ry="30" fill={`url(#${p('skin')})`} stroke="#B8864B" strokeWidth="1" />

        {/* Ear left */}
        <ellipse cx="72" cy="85" rx="5" ry="7" fill={`url(#${p('skin')})`} stroke="#B8864B" strokeWidth="0.7" />
        <ellipse cx="72.5" cy="85" rx="2.5" ry="4" fill="#C48A56" opacity="0.4" />

        {/* Ear right */}
        <ellipse cx="128" cy="85" rx="5" ry="7" fill={`url(#${p('skin')})`} stroke="#B8864B" strokeWidth="0.7" />
        <ellipse cx="127.5" cy="85" rx="2.5" ry="4" fill="#C48A56" opacity="0.4" />

        {/* Cheek blush */}
        <ellipse cx="83" cy="90" rx="10" ry="7" fill={`url(#${p('cheek')})`} />
        <ellipse cx="117" cy="90" rx="10" ry="7" fill={`url(#${p('cheek')})`} />

        {/* ── FILA CAP ── */}
        {/* Cap base */}
        <ellipse cx="100" cy="58" rx="32" ry="16" fill={`url(#${p('cap')})`} stroke="#A67C00" strokeWidth="0.8" />
        {/* Cap dome */}
        <ellipse cx="100" cy="54" rx="28" ry="13" fill={`url(#${p('capHl')})`} />
        {/* Cap brim fold */}
        <path d="M70 58 Q100 66 130 58" stroke="#A67C00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Cap highlight strip */}
        <path d="M78 55 Q100 49 122 55" stroke="#FFF5CC" strokeWidth="0.8" fill="none" opacity="0.5" />
        {/* Cap side creases */}
        <path d="M74 56 Q76 62 80 58" stroke="#B8860B" strokeWidth="0.6" fill="none" opacity="0.5" />
        <path d="M126 56 Q124 62 120 58" stroke="#B8860B" strokeWidth="0.6" fill="none" opacity="0.5" />

        {/* ── EYEBROWS ── */}
        <path d="M84 72 Q89 69 95 71" stroke="#3D2314" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M105 71 Q111 69 116 72" stroke="#3D2314" strokeWidth="1.6" strokeLinecap="round" fill="none" />

        {/* ── EYES ── */}
        <g>
          {animated ? (
            <animateTransform
              attributeName="transform"
              type="scale"
              additive="sum"
              values="1 1; 1 1; 1 0.15; 1 1; 1 1"
              keyTimes="0; 0.44; 0.5; 0.56; 1"
              dur="5.5s"
              repeatCount="indefinite"
            />
          ) : null}
          {/* Eye whites */}
          <ellipse cx="89" cy="80" rx="6" ry="5.5" fill="#FFFFFF" stroke="#B8864B" strokeWidth="0.4" />
          <ellipse cx="111" cy="80" rx="6" ry="5.5" fill="#FFFFFF" stroke="#B8864B" strokeWidth="0.4" />
          {/* Iris */}
          <circle cx="90" cy="80.5" r="3.5" fill="#2C1810" />
          <circle cx="112" cy="80.5" r="3.5" fill="#2C1810" />
          {/* Pupil */}
          <circle cx="90.5" cy="80" r="1.8" fill="#0A0A0A" />
          <circle cx="112.5" cy="80" r="1.8" fill="#0A0A0A" />
          {/* Eye shine */}
          <circle cx="91.5" cy="78.5" r="1.2" fill="#FFFFFF" opacity="0.85" />
          <circle cx="113.5" cy="78.5" r="1.2" fill="#FFFFFF" opacity="0.85" />
        </g>

        {/* ── NOSE ── */}
        <path d="M97 84 Q100 93 103 84" stroke="#9A6B40" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="97" cy="89" r="1.5" fill="#B8864B" opacity="0.25" />
        <circle cx="103" cy="89" r="1.5" fill="#B8864B" opacity="0.25" />

        {/* ── BEARD & GOATEE — neatly trimmed ── */}
        <path
          d="M78 97 Q80 92 88 91 Q94 90 100 92 Q106 90 112 91 Q120 92 122 97
             Q123 104 118 110 Q112 116 100 118 Q88 116 82 110 Q77 104 78 97 Z"
          fill="#1A0E08"
          opacity="0.92"
        />
        {/* Beard texture lines */}
        <path d="M85 98 Q90 105 88 112" stroke="#2A1A0F" strokeWidth="0.5" fill="none" opacity="0.35" />
        <path d="M95 95 Q98 105 96 115" stroke="#2A1A0F" strokeWidth="0.5" fill="none" opacity="0.35" />
        <path d="M105 95 Q102 105 104 115" stroke="#2A1A0F" strokeWidth="0.5" fill="none" opacity="0.35" />
        <path d="M115 98 Q110 105 112 112" stroke="#2A1A0F" strokeWidth="0.5" fill="none" opacity="0.35" />

        {/* Mustache — well-groomed */}
        <path
          d="M85 93 Q90 88 100 93 Q110 88 115 93 Q110 97 100 95 Q90 97 85 93 Z"
          fill="#1A0E08"
        />

        {/* Mouth — friendly smile (visible through beard) */}
        <path
          d="M93 97 Q100 101 107 97"
          stroke="#8B4513"
          strokeWidth="1"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />

        {/* ── SUBTLE ACCENTS ── */}
        {/* Gold stud earrings */}
        <circle cx="72" cy="88" r="1.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />

        {/* Collar pin / brooch */}
        <circle cx="100" cy="123" r="2.8" fill="#FFD700" stroke="#A67C00" strokeWidth="0.6" />
        <circle cx="100" cy="123" r="1.2" fill="#FFF5CC" opacity="0.7" />
      </g>
    </svg>
  );
}
