'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import MusaCharacterSVG from './illustrations/MusaCharacterSVG';

type LogoProps = {
  variant?: 'default' | 'compact' | 'full';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animated?: boolean;
  className?: string;
  href?: string;
  useSVG?: boolean;
};

export default function Logo({
  variant = 'default',
  size = 'md',
  showText = true,
  animated = true,
  className = '',
  href = '/',
  useSVG = true
}: LogoProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  // Size mapping for the logo - responsive values
  const sizeMap = {
    sm: { img: 40, text: 'text-lg sm:text-xl', containerClass: 'w-10 h-12 sm:w-10 sm:h-12' },
    md: { img: 52, text: 'text-xl sm:text-2xl', containerClass: 'w-12 h-14 sm:w-13 sm:h-16' },
    lg: { img: 72, text: 'text-2xl sm:text-3xl', containerClass: 'w-16 h-20 sm:w-18 sm:h-[5.5rem]' },
  };
  
  // Determine the components to render based on variant
  const renderLogo = () => {
    const ImageComponent = (
      <div 
        className={`relative flex items-center justify-center ${sizeMap[size].containerClass} ${animated ? 'transform transition-transform duration-500' : ''} 
        ${isHovered && animated ? 'scale-110' : ''}`}
      >
        {useSVG ? (
          <MusaCharacterSVG 
            size={sizeMap[size].img} 
            animated={animated}
            className={`${isLoaded ? 'animate-fade-in' : 'opacity-0'} w-full h-full`}
          />
        ) : !imageError ? (
          <Image
            src="/images/musa-character.png"
            alt="Musa Logo"
            className={`object-contain ${
              isLoaded ? 'animate-fade-in' : 'opacity-0'
            }`}
            fill
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          // Fallback when image is not available
          <div className={`
            w-full h-full rounded-full bg-gradient-to-br from-primary-500 to-primary-700 
            flex items-center justify-center text-white font-bold shadow-lg
            ${isLoaded ? 'animate-fade-in' : 'opacity-0'}
          `}>
            <span className="text-lg">M</span>
          </div>
        )}
      </div>
    );
    
    const TextComponent = showText ? (
      <span 
        className={`font-bold ${sizeMap[size].text} 
        ${animated ? 'transition-colors duration-300' : ''} 
        ml-2 sm:ml-3 text-gray-900 dark:text-white`}
      >
        Musa
      </span>
    ) : null;
    
    switch (variant) {
      case 'compact':
        return ImageComponent;
      case 'full':
        return (
          <>
            {ImageComponent}
            {TextComponent}
          </>
        );
      default:
        return (
          <>
            {ImageComponent}
            {TextComponent}
          </>
        );
    }
  };
  
  const logoContent = (
    <div 
      className={cn(
        'flex items-center',
        isLoaded ? 'animate-fade-in' : 'opacity-0',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {renderLogo()}
    </div>
  );
  
  // Wrap in Link if href is provided
  return href ? (
    <Link href={href} className="flex items-center">
      {logoContent}
    </Link>
  ) : (
    logoContent
  );
}
