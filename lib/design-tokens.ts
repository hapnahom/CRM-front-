/**
 * JS mirror of styles/tokens.css — keep in sync when rebranding.
 * Used by Ant Design, charts, and inline styles that cannot read CSS variables.
 */

export const tokens = {
  color: {
    brand: '#ed6925',
    brandHover: '#d45e1f',
    brandMuted: '#fdf0e9',
    brandBorder: '#f5d4c0',
    brandForeground: '#ffffff',
    accentBlue: '#1D9BF0',
    surfacePage: '#f2f4f7',
    surfaceCard: '#ffffff',
    surfaceElevated: '#f9fafb',
    surfaceSubtle: '#f7f7f7',
    surfaceHover: '#f1f5f9',
    surfaceSelected: '#f5f5f5',
    textPrimary: '#111827',
    textSecondary: '#1c1e21',
    textMuted: '#6b7280',
    textSubtle: '#9ca3af',
    textInverse: '#ffffff',
    borderDefault: '#e5e7eb',
    borderStrong: '#d1d5db',
    borderInput: '#E9EAEC',
    borderFocus: '#4b5563',
    success: '#0BA259',
    successMuted: '#55c790',
    warning: '#E6BB20',
    warningMuted: '#ffde65',
    error: '#E03137',
    errorMuted: '#fa3a3a',
    orange: '#FE964A',
    blue: '#0062FF',
    purple: '#8C62FF',
    lightPurple: '#E7E7FF',
    lightblue: '#d3e4f0',
    antSuccess: '#0CAF60',
    antWarning: '#FACC15',
    tableHeaderBg: '#FAFAFA',
    tableHeaderColor: '#718096',
    menuSelectedBg: '#F8F8F8',
  },
  font: {
    family: 'Inter',
    size: {
      xs: '11px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '24px',
    },
    weight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  radius: {
    sm: 'calc(0.625rem - 4px)',
    md: 'calc(0.625rem - 2px)',
    lg: '0.625rem',
    xl: 'calc(0.625rem + 4px)',
    ant: 9,
  },
  spacing: {
    pageX: '1.5rem',
    pageY: '1.5rem',
    card: '1rem',
    section: '1.5rem',
    inputHeight: '2.5rem',
    controlHeight: '54px',
  },
  shadow: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  chart: {
    palette: ['#ed6925', '#0062FF', '#0BA259', '#E6BB20', '#8C62FF'] as const,
  },
} as const;

export type DesignTokens = typeof tokens;

/** Ant Design ConfigProvider theme for page-level overrides */
export const antdPageTheme = {
  token: {
    borderRadius: tokens.radius.ant,
    colorPrimary: tokens.color.brand,
  },
} as const;
