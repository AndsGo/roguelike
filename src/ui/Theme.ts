import { SaveManager } from '../managers/SaveManager';

const ACCESSIBILITY_KEY = 'roguelike_accessibility';

export interface AccessibilitySettings {
  colorblindMode: boolean;
}

const defaultAccessibility: AccessibilitySettings = {
  colorblindMode: false,
};

let accessibilityCache: AccessibilitySettings | null = null;

export function getAccessibility(): AccessibilitySettings {
  if (!accessibilityCache) {
    accessibilityCache = SaveManager.loadData<AccessibilitySettings>(ACCESSIBILITY_KEY) ?? { ...defaultAccessibility };
  }
  return accessibilityCache;
}

export function setAccessibility(settings: AccessibilitySettings): void {
  accessibilityCache = settings;
  SaveManager.saveData(ACCESSIBILITY_KEY, settings);
}

/**
 * Colorblind-safe element palette (deuteranopia/protanopia friendly).
 * Uses distinct hue + luminance so colors remain distinguishable
 * without red-green discrimination.
 */
const COLORBLIND_ELEMENT: Record<string, number> = {
  fire: 0xff9933,      // warm orange (was red-orange)
  ice: 0x3399ff,       // bright blue (same family, higher contrast)
  lightning: 0xffff00,  // pure yellow (unchanged)
  dark: 0x8833cc,      // violet-purple (shifted from magenta)
  holy: 0xffffff,      // white (unchanged)
};

/** Get the element color, respecting colorblind mode setting */
export function getElementColor(element: string): number {
  if (getAccessibility().colorblindMode) {
    return COLORBLIND_ELEMENT[element] ?? Theme.colors.element[element] ?? 0xaaaaaa;
  }
  return Theme.colors.element[element] ?? 0xaaaaaa;
}

export const Theme = {
  colors: {
    primary: 0x4a90d9,
    secondary: 0xd4a843,
    danger: 0xd94a4a,
    success: 0x4ad94a,
    background: 0x1a1a2e,
    panel: 0x16213e,
    panelBorder: 0x0f3460,
    text: 0xffffff,
    textDim: 0x999999,
    gold: 0xffd700,

    element: {
      fire: 0xff6b35,
      ice: 0x35c9ff,
      lightning: 0xffeb3b,
      dark: 0x9c27b0,
      holy: 0xffffff,
    } as Record<string, number>,

    /** Unicode symbols for elements (colorblind-friendly indicators) */
    elementSymbol: {
      fire: '\u2666',       // ♦
      ice: '\u25C6',        // ◆
      lightning: '\u26A1',   // ⚡
      dark: '\u25CF',        // ●
      holy: '\u2606',        // ☆
    } as Record<string, string>,

    rarity: {
      common: 0xbbbbbb,
      uncommon: 0x4caf50,
      rare: 0x2196f3,
      epic: 0x9c27b0,
      legendary: 0xff9800,
    } as Record<string, number>,

    role: {
      tank: 0x4488ff,
      melee_dps: 0xff8844,
      ranged_dps: 0xff4488,
      healer: 0x44ff88,
      support: 0xaaaa44,
    } as Record<string, number>,

    node: {
      battle: 0xcc4444,
      elite: 0xff8844,
      boss: 0xff2222,
      shop: 0x44cc44,
      event: 0x8844cc,
      rest: 0x4488cc,
    } as Record<string, number>,

    health: {
      high: 0x44ff44,
      medium: 0xffaa00,
      low: 0xff4444,
      shield: 0x4488ff,
      delay: 0xcc3333,
      bg: 0x333333,
    },

    raceAccent: {
      human: 0xddccaa,
      elf: 0xaaddaa,
      undead: 0x889988,
      demon: 0xcc4444,
      beast: 0xbb8844,
      dragon: 0x44aacc,
    } as Record<string, number>,

    ui: {
      accent: 0x8899cc,
      muted: 0x556677,
      label: 0xaaaaaa,
      subtitle: 0x667788,
    },
  },

  fonts: {
    title: { fontSize: '24px', fontFamily: 'monospace', color: '#ffffff' },
    body: { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff' },
    small: { fontSize: '11px', fontFamily: 'monospace', color: '#999999' },
    damage: { fontSize: '18px', fontFamily: 'monospace', fontStyle: 'bold' },
  },

  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

/** Convert a 0x hex number to a '#rrggbb' CSS string */
export function colorToString(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

/** Lighten a color by a factor (0-1) */
export function lightenColor(color: number, factor: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.round(255 * factor));
  const g = Math.min(255, ((color >> 8) & 0xff) + Math.round(255 * factor));
  const b = Math.min(255, (color & 0xff) + Math.round(255 * factor));
  return (r << 16) | (g << 8) | b;
}

/** Darken a color by a factor (0-1) */
export function darkenColor(color: number, factor: number): number {
  const r = Math.max(0, Math.round(((color >> 16) & 0xff) * (1 - factor)));
  const g = Math.max(0, Math.round(((color >> 8) & 0xff) * (1 - factor)));
  const b = Math.max(0, Math.round((color & 0xff) * (1 - factor)));
  return (r << 16) | (g << 8) | b;
}
