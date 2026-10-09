export interface GlobalStateProps {
  isMobile: boolean;
  collapsed: boolean;
  isAdminPage: boolean;
  isMobileCollapsed: boolean;
  setIsMobile: (isMobile: boolean) => void;
  setCollapsed: (collapsed: boolean) => void;
  setIsAdminPage: (isAdminPage: boolean) => void;
  setIsMobileCollapsed: (isMobileCollapsed: boolean) => void;
  isTablet: boolean;
  setIsTablet: (isTablet: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
}
