'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import MusaCharacterSVG from './MusaCharacterSVG';

export default function LogoAnimation() {
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [useSVG, setUseSVG] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    
    // Sequence the animation stages
    const timer1 = setTimeout(() => setStage(1), 500);
    const timer2 = setTimeout(() => setStage(2), 1000);
    const timer3 = setTimeout(() => setStage(3), 1500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="relative h-64 w-64 sm:h-80 sm:w-80 md:h-96 md:w-96">
      {/* Character Logo */}
      <div className={`
        absolute top-0 left-0 right-0 bottom-0
        transition-all duration-1000 ease-in-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
      `}>
        {useSVG ? (
          <div className="w-full h-full flex items-center justify-center">
            <MusaCharacterSVG 
              size={280}
              animated={true}
              className="transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        ) : !imageError ? (
          <Image
            src="/images/musa-character.png"
            alt="Musa Character"
            className="object-contain"
            fill
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          // Fallback when image is not available
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-40 h-40 md:w-52 md:h-52 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold shadow-2xl">
              <span className="text-6xl md:text-8xl">M</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Animated circle background */}
      <div className={`
        absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        rounded-full bg-primary-100 dark:bg-primary-900/30
        transition-all duration-1500 ease-in-out
        ${stage >= 1 ? 'opacity-50 scale-100' : 'opacity-0 scale-0'}
        w-full h-full -z-10
      `}></div>
      
      {/* App Name with typing effect */}
      <div className={`
        absolute -bottom-16 left-1/2 transform -translate-x-1/2
        text-4xl md:text-5xl font-bold text-gray-900 dark:text-white
        transition-all duration-500 ease-in-out
        ${stage >= 2 ? 'opacity-100' : 'opacity-0'}
      `}>
        <span className="inline-block animate-typing overflow-hidden whitespace-nowrap border-r-4 border-primary">
          Musa
        </span>
      </div>
      
      {/* Tagline */}
      <div className={`
        absolute -bottom-28 left-1/2 transform -translate-x-1/2
        text-md md:text-lg text-gray-600 dark:text-gray-300
        transition-all duration-500 ease-in-out
        ${stage >= 3 ? 'opacity-100' : 'opacity-0'}
      `}>
        Estate Access Control System
      </div>
    </div>
  );
}
