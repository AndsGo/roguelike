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

    rarity: {
      common: 0xbbbbbb,
      uncommon: 0x4caf50,
      rare: 0x2196f3,
      epic: 0x9c27b0,
      legendary: 0xff9800,
    } as Record<string, number>,
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
