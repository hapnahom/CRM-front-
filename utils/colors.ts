// Brand / theme colors (aligned with crm project)
export const brandColors = {
  primary: '#ed6925',
  primaryHover: '#d45e1f',
  primaryLight: '#fdf0e9',
  primaryLightAlt: '#fef3eb',
  primaryBorder: '#f5d4c0',
  primaryBorderAlt: '#f0c4a8',
  primaryMuted: '#b84d1a',
  sidebarBg: '#fdf0e9',
  sidebarBorder: '#f5d4c0',
} as const;

// Predefined color palette for lead status and other UI elements
export const colorPalette = [
  '#FF0000', // Red
  '#2ECC71', // Green
  '#3498DB', // Blue
  '#F5B041', // Orange
  '#F39C12', // Dark Orange
  '#AF7AC5', // Purple
  '#16A085', // Teal
  '#F53595', // Pink
  '#00FFFF', // Cyan
  '#00FF00', // Lime Green
] as const;

// Type for the color palette
export type ColorPalette = (typeof colorPalette)[number];

// Default color for new lead statuses
export const defaultLeadStatusColor = '#FF6B6B';

// Utility function to check if a color is in the palette
export const isColorInPalette = (color: string): boolean => {
  return colorPalette.includes(color as ColorPalette);
};

// Utility function to get a random color from the palette
export const getRandomColor = (): ColorPalette => {
  const randomIndex = Math.floor(Math.random() * colorPalette.length);
  return colorPalette[randomIndex];
};
