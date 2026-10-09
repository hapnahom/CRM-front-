/**
 * Kanban / pipeline stage color presets — hex-based colors
 */

/** Shared 10-color palette for lead & deal stage settings. */
export const STAGE_COLOR_PRESETS = [
  { label: 'Red', color: '#C00000', borderColor: '#990000' },
  { label: 'Orange', color: '#ED7D31', borderColor: '#BE6527' },
  { label: 'Yellow', color: '#FFFF85', borderColor: '#CCCC6A' },
  { label: 'Green', color: '#00B050', borderColor: '#008D40' },
  { label: 'Blue', color: '#4472C4', borderColor: '#365B9D' },
  { label: 'Purple', color: '#7030A0', borderColor: '#5A2680' },
  { label: 'Pink', color: '#FF6699', borderColor: '#CC527A' },
  { label: 'Teal', color: '#00B0B0', borderColor: '#008D8D' },
  { label: 'Gray', color: '#A5A5A5', borderColor: '#848484' },
  { label: 'Indigo', color: '#44546A', borderColor: '#364355' },
] as const;

export const DEALS_STAGE_COLOR_PRESETS = STAGE_COLOR_PRESETS;

export const LEAD_SETTINGS_STAGE_PRESETS = STAGE_COLOR_PRESETS;

function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return withHash.toUpperCase();
}

/** Index into `presets`, or -1 when colors do not match a preset. */
export function findStagePresetIndex(
  color: string | null | undefined,
  borderColor: string | null | undefined,
  presets: ReadonlyArray<{
    color: string;
    borderColor: string;
  }> = STAGE_COLOR_PRESETS,
): number {
  if (!color) return -1;
  const normalizedColor = normalizeHex(color);
  const normalizedBorder = borderColor ? normalizeHex(borderColor) : null;
  return presets.findIndex((preset) => {
    const colorMatch = normalizeHex(preset.color) === normalizedColor;
    if (!normalizedBorder) return colorMatch;
    return colorMatch && normalizeHex(preset.borderColor) === normalizedBorder;
  });
}

function parseHexChannels(hex: string): [number, number, number] | null {
  const match = /^#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})$/.exec(hex);
  if (!match) return null;
  return [match[1], match[2], match[3]].map((h) => parseInt(h, 16)) as [
    number,
    number,
    number,
  ];
}

/** Relative luminance (0–255) for contrast checks on solid stage backgrounds. */
export function stageColorLuminance(hex: string): number {
  const channels = parseHexChannels(hex);
  if (!channels) return 128;
  const [r, g, b] = channels;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Text color readable on a solid stage-color background. */
export function textOnStageColor(hex: string): string {
  return stageColorLuminance(hex) > 140 ? '#111827' : '#ffffff';
}

export function textOnStageColorRgb(hex: string): [number, number, number] {
  return stageColorLuminance(hex) > 140 ? [17, 24, 39] : [255, 255, 255];
}

export function stageBadgeStyles(color: string): {
  backgroundColor: string;
  color: string;
} {
  const backgroundColor = color.startsWith('#') ? color : `#${color}`;
  return {
    backgroundColor,
    color: textOnStageColor(backgroundColor),
  };
}

export function stagePresetSwatchStyle(
  color: string,
  borderColor: string,
): { backgroundColor: string; borderColor: string } {
  return {
    backgroundColor: color,
    borderColor: borderColor,
  };
}

export function pipelineStageAppearance(
  stage: {
    color?: string | null;
    borderColor?: string | null;
  },
  index = 0,
  presets: ReadonlyArray<{
    color: string;
    borderColor: string;
  }> = STAGE_COLOR_PRESETS,
): { backgroundColor: string; borderColor: string } {
  const preset = presets[index % presets.length]!;
  const color = stage.color || preset.color;
  const borderColor = stage.borderColor || preset.borderColor;
  return stagePresetSwatchStyle(color, borderColor);
}

export const ACTIVITY_ICON_PRESETS = [
  { bg: 'bg-stage-green', text: 'text-success' },
  { bg: 'bg-stage-sky', text: 'text-brand' },
  { bg: 'bg-stage-purple', text: 'text-purple' },
  { bg: 'bg-stage-amber', text: 'text-warning' },
  { bg: 'bg-stage-rose', text: 'text-error' },
] as const;
