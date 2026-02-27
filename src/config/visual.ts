/**
 * Visual constants extracted from UI/scene files.
 * Centralizes magic numbers for fonts, animations, spacing, depths, and particles.
 */

// ─── Font Sizes ───
export const FONT = {
  TITLE: '24px',
  HEADING: '20px',
  BODY: '14px',
  LABEL: '11px',
  SMALL: '9px',
  TINY: '8px',
  HOTKEY: '7px',
} as const;

// ─── Animation Durations (ms) ───
export const ANIM = {
  BUTTON_HOVER: 100,
  BUTTON_PRESS: 60,
  PANEL_OPEN: 200,
  CARD_EXPAND: 150,
  CARD_COLLAPSE: 100,
  COMBO_FADE: 300,
  CRIT_SCALE: 250,
  COMBO_FLOAT: 1000,
  HEALTH_DELAY: 400,
  HEALTH_CATCH_UP: 300,
  SKILL_READY_PULSE: 600,
  SPARKLE_LIFE: 400,
} as const;

// ─── UI Dimensions ───
export const UI_SIZES = {
  CARD_WIDTH: 130,
  CARD_HEIGHT: 160,
  SKILL_SLOT: 44,
  SKILL_GAP: 4,
  BUTTON_HIT_PADDING: 8,
  CORNER_SM: 2,
  CORNER_MD: 4,
  CORNER_LG: 8,
} as const;

// ─── Z-Depth Layers ───
export const DEPTH = {
  HUD: 100,
  SKILL_BAR: 101,
  SYNERGY_TOOLTIP: 110,
  SKILL_TOOLTIP: 200,
  DAMAGE_NUMBER: 201,
  NODE_TOOLTIP: 500,
  DETAIL_POPUP: 800,
  DETAIL_CONTENT: 801,
  SCENE_OVERLAY: 9999,
} as const;

// ─── Opacity Presets ───
export const OPACITY = {
  PANEL_BG: 0.9,
  HEALTH_DELAY: 0.8,
  UI_ELEMENT: 0.7,
  SHIELD_OVERLAY: 0.45,
  DISABLED: 0.3,
} as const;

// ─── Scale Presets ───
export const SCALE = {
  CRIT_INITIAL: 1.6,
  COMBO_INITIAL: 1.5,
  SHIELD_PULSE: 1.3,
  BUTTON_HOVER: 1.05,
  BUTTON_PRESS: 0.95,
} as const;

// ─── Particle System ───
export const PARTICLE = {
  POOL_MAX: 16,
  SPARKLE_COUNT: 4,
  LIFESPAN_LONG: 800,
  LIFESPAN_MEDIUM: 600,
  LIFESPAN_STANDARD: 500,
  LIFESPAN_CAST: 400,
  LIFESPAN_SHORT: 300,
} as const;

// ─── Gameplay UI Thresholds ───
export const UI_THRESHOLDS = {
  COMBO_DISPLAY_MIN: 5,
  SKILL_BAR_SLOTS: 8,
  MAX_DISPLAYED_ACHIEVEMENTS: 5,
  NAME_TRUNCATE_LENGTH: 8,
} as const;
