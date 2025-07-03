import { useState, useEffect } from 'react';
import { isMobileDevice } from '@/utils/mobileUtils';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // This code only runs on the client side
    setIsMobile(isMobileDevice());
  }, []);

  return isMobile;
}
