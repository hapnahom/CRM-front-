'use client';
import { GlobalStateStore } from '@/store/uistate/features/global';
import { useEffect } from 'react';

interface DeviceSizes {
  isMobile: boolean;
  isTablet: boolean;
}

export const useIsMobile = (): DeviceSizes => {
  const { setIsMobile, isMobile, setIsTablet, isTablet } = GlobalStateStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDeviceSizes = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width <= 1024);
    };

    // Initial check
    updateDeviceSizes();

    // Add event listener
    window.addEventListener('resize', updateDeviceSizes);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateDeviceSizes);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resize listener registered once on mount
  }, []);

  return { isMobile, isTablet };
};
