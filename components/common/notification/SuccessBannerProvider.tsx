'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import SuccessBanner from './SuccessBanner';
import { setGlobalSuccessHandler } from './notificationMessage';

interface SuccessBannerContextType {
  showSuccess: (
    message: string,
    description?: string,
    duration?: number,
  ) => void;
  hideSuccess: () => void;
}

const SuccessBannerContext = createContext<
  SuccessBannerContextType | undefined
>(undefined);

interface SuccessBannerProviderProps {
  children: ReactNode;
}

export function SuccessBannerProvider({
  children,
}: SuccessBannerProviderProps) {
  const [bannerState, setBannerState] = useState<{
    message: string;
    description?: string;
    duration?: number;
  } | null>(null);

  const showSuccess = (
    message: string,
    description?: string,
    duration = 4000,
  ) => {
    setBannerState({ message, description, duration });
  };

  const hideSuccess = () => {
    setBannerState(null);
  };

  // Connect to global notification system
  useEffect(() => {
    const handleResize = () => {
      // If screen becomes desktop size and banner is showing, hide it and show antd notification
      if (window.innerWidth > 768 && bannerState) {
        hideSuccess();
      }
    };

    setGlobalSuccessHandler(showSuccess);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [bannerState]); // Depend on bannerState to re-evaluate when it changes

  return (
    <SuccessBannerContext.Provider value={{ showSuccess, hideSuccess }}>
      {children}
      {bannerState && (
        <SuccessBanner
          message={bannerState.message}
          description={bannerState.description}
          duration={bannerState.duration}
          onClose={hideSuccess}
        />
      )}
    </SuccessBannerContext.Provider>
  );
}

export const useSuccessBanner = () => {
  const context = useContext(SuccessBannerContext);
  if (context === undefined) {
    throw new Error(
      'useSuccessBanner must be used within a SuccessBannerProvider',
    );
  }
  return context;
};
