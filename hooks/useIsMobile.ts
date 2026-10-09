'use client';
import { GlobalStateStore } from '@/store/uistate/features/global';
import { useEffect } from 'react';

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
};

export const useIsMobile = (): { isMobile: boolean; isTablet: boolean } => {
  const { isMobile, setIsMobile, isTablet, setIsTablet } = GlobalStateStore();

  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      // Debounce resize handler to prevent excessive updates
      resizeTimeout = setTimeout(() => {
        const width = window.innerWidth;
        // Mobile: <= 768px, Tablet: 769px - 1024px
        const newIsMobile = width <= BREAKPOINTS.mobile;
        const newIsTablet =
          width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet;

        if (isMobile !== newIsMobile) {
          setIsMobile(newIsMobile);
        }
        if (isTablet !== newIsTablet) {
          setIsTablet(newIsTablet);
        }
      }, 100);
    };

    // Initial call to set values on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [isMobile, isTablet, setIsMobile, setIsTablet]);

  return { isMobile, isTablet };
};
