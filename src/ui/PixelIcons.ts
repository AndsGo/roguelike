/**
 * 8x8 pixel icon system for roles and elements.
 *
 * Templates use 3 values: 0 = transparent, 1 = primary color, 2 = highlight/accent.
 * Colors are sourced from Theme.ts via getRoleColor/getElementColor.
 */

import { getRoleColor, getElementColor, lightenColor } from './Theme';

/** 8x8 pixel grid: 0=transparent, 1=primary, 2=highlight */
export type IconTemplate = number[][];

// ── Role Icon Templates (8x8) ──

/** Shield icon for tank */
const SHIELD: IconTemplate = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 2, 2, 1, 1, 0],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 2, 1, 1, 2, 1, 1],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [0, 1, 1, 2, 2, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

/** Sword icon for melee_dps */
const SWORD: IconTemplate = [
  [0, 0, 0, 0, 0, 0, 1, 2],
  [0, 0, 0, 0, 0, 1, 2, 0],
  [0, 0, 0, 0, 1, 2, 0, 0],
  [0, 0, 0, 1, 2, 0, 0, 0],
  [0, 1, 1, 2, 0, 0, 0, 0],
  [1, 1, 2, 0, 0, 0, 0, 0],
  [0, 2, 1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0],
];

/** Bow icon for ranged_dps */
const BOW: IconTemplate = [
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 0, 2, 0],
  [1, 0, 0, 0, 1, 2, 0, 0],
  [1, 0, 0, 0, 2, 0, 0, 0],
  [1, 0, 0, 0, 2, 0, 0, 0],
  [1, 0, 0, 0, 1, 2, 0, 0],
  [0, 1, 0, 1, 0, 0, 2, 0],
  [0, 0, 1, 0, 0, 0, 0, 0],
];

/** Cross icon for healer */
const CROSS: IconTemplate = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

/** Star icon for support */
const STAR: IconTemplate = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [1, 1, 2, 2, 2, 2, 1, 1],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 0, 2, 2, 2, 2, 0, 0],
  [0, 1, 2, 1, 1, 2, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

export const ROLE_ICON_TEMPLATES: Record<string, IconTemplate> = {
  tank: SHIELD,
  melee_dps: SWORD,
  ranged_dps: BOW,
  healer: CROSS,
  support: STAR,
};

// ── Element Icon Templates (8x8) ──

/** Flame icon for fire */
const FLAME: IconTemplate = [
  [0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [1, 1, 2, 2, 2, 2, 1, 0],
  [1, 2, 2, 1, 2, 2, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 0],
];

/** Snowflake icon for ice */
const SNOWFLAKE: IconTemplate = [
  [0, 0, 0, 1, 1, 0, 0, 0],
  [1, 0, 0, 2, 2, 0, 0, 1],
  [0, 1, 0, 2, 2, 0, 1, 0],
  [0, 0, 2, 2, 2, 2, 0, 0],
  [0, 0, 2, 2, 2, 2, 0, 0],
  [0, 1, 0, 2, 2, 0, 1, 0],
  [1, 0, 0, 2, 2, 0, 0, 1],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

/** Lightning bolt icon */
const BOLT: IconTemplate = [
  [0, 0, 0, 1, 1, 1, 0, 0],
  [0, 0, 1, 2, 2, 0, 0, 0],
  [0, 1, 2, 2, 0, 0, 0, 0],
  [1, 2, 2, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 1, 0],
  [0, 0, 0, 0, 2, 2, 0, 0],
  [0, 0, 0, 2, 2, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0],
];

/** Crescent moon icon for dark */
const CRESCENT: IconTemplate = [
  [0, 0, 1, 1, 1, 0, 0, 0],
  [0, 1, 2, 2, 0, 0, 0, 0],
  [1, 2, 2, 0, 0, 0, 0, 0],
  [1, 2, 2, 0, 0, 0, 0, 0],
  [1, 2, 2, 0, 0, 0, 0, 0],
  [1, 2, 2, 0, 0, 0, 0, 0],
  [0, 1, 2, 2, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0],
];

/** Sun icon for holy */
const SUN: IconTemplate = [
  [0, 0, 1, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [1, 0, 1, 2, 2, 1, 0, 1],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [0, 1, 2, 2, 2, 2, 1, 0],
  [1, 0, 1, 2, 2, 1, 0, 1],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 1, 0, 0],
];

export const ELEMENT_ICON_TEMPLATES: Record<string, IconTemplate> = {
  fire: FLAME,
  ice: SNOWFLAKE,
  lightning: BOLT,
  dark: CRESCENT,
  holy: SUN,
};

// ── Drawing functions ──

/**
 * Draw a pixel icon template onto a Phaser Graphics object.
 * @param g - Graphics context (must have fillStyle + fillRect)
 * @param x - Top-left x
 * @param y - Top-left y
 * @param template - 8x8 grid
 * @param primaryColor - Color for value 1
 * @param highlightColor - Color for value 2
 * @param scale - Pixel scale (default 1)
 */
export function drawPixelIcon(
  g: { fillStyle: (color: number, alpha?: number) => void; fillRect: (x: number, y: number, w: number, h: number) => void },
  x: number,
  y: number,
  template: IconTemplate,
  primaryColor: number,
  highlightColor: number,
  scale: number = 1,
): void {
  for (let r = 0; r < template.length; r++) {
    const row = template[r];
    for (let c = 0; c < row.length; c++) {
      const val = row[c];
      if (val === 0) continue;
      const color = val === 2 ? highlightColor : primaryColor;
      g.fillStyle(color, 1);
      g.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

/**
 * Draw a role icon. Safe for unknown role keys (returns silently).
 */
export function drawRoleIcon(
  g: { fillStyle: (color: number, alpha?: number) => void; fillRect: (x: number, y: number, w: number, h: number) => void },
  x: number,
  y: number,
  role: string,
  scale: number = 1,
): void {
  const template = ROLE_ICON_TEMPLATES[role];
  if (!template) return;
  const primary = getRoleColor(role);
  const highlight = lightenColor(primary, 0.25);
  drawPixelIcon(g, x, y, template, primary, highlight, scale);
}

/**
 * Draw an element icon. Safe for unknown element keys (returns silently).
 */
export function drawElementIcon(
  g: { fillStyle: (color: number, alpha?: number) => void; fillRect: (x: number, y: number, w: number, h: number) => void },
  x: number,
  y: number,
  element: string,
  scale: number = 1,
): void {
  const template = ELEMENT_ICON_TEMPLATES[element];
  if (!template) return;
  const primary = getElementColor(element);
  const highlight = lightenColor(primary, 0.25);
  drawPixelIcon(g, x, y, template, primary, highlight, scale);
}
