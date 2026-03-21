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

// ─── Boss Entrance ───
export const BOSS_ENTRANCE = {
  START_X: 900,           // off-screen right
  SLIDE_DURATION: 400,    // ms
  TITLE_FADE_IN: 200,     // ms
  TITLE_HOLD: 400,        // ms after slide
  TITLE_FADE_OUT: 300,    // ms
  SHAKE_INTENSITY: 0.01,
  SHAKE_DURATION: 200,    // ms
  TITLE_DEPTH: 500,
} as const;

// ─── Wave Transition (Gauntlet) ───
export const WAVE_TRANSITION = {
  SLIDE_DURATION: 400,     // ms for enemies to slide in
  SLIDE_START_X: 900,      // start offscreen right
  TEXT_DEPTH: 500,
} as const;

// ─── Health Bar Styles ───
export const HEALTH_BAR_STYLES = {
  hero: {
    borderColor: 0x4488cc,
    borderAlpha: 0.5,
    borderWidth: 1,
    bgColor: 0x333333,
    width: 40,
    height: 5,
  },
  normal: {
    borderColor: 0,
    borderAlpha: 0,
    borderWidth: 0,
    bgColor: 0x442222,
    width: 40,
    height: 5,
  },
  elite: {
    borderColor: 0x9944cc,
    borderAlpha: 0.8,
    borderWidth: 1,
    bgColor: 0x332233,
    width: 40,
    height: 6,
  },
  boss: {
    borderColor: 0xffd700,
    borderAlpha: 0.9,
    borderWidth: 2,
    bgColor: 0x333322,
    width: 56,
    height: 7,
  },
} as const;

export type HealthBarStyle = keyof typeof HEALTH_BAR_STYLES;

// ─── Unit Animation Parameters ───
export const HERO_ANIM_PARAMS: Record<string, {
  idleDuration: number; idleDelta: number;
  attackDuration: number; attackDistance: number;
  castDuration: number; castScale: number;
}> = {
  tank:       { idleDuration: 1000, idleDelta: 2, attackDuration: 120, attackDistance: 20, castDuration: 180, castScale: 1.1 },
  melee_dps:  { idleDuration: 800,  idleDelta: 3, attackDuration: 70,  attackDistance: 35, castDuration: 150, castScale: 1.2 },
  ranged_dps: { idleDuration: 800,  idleDelta: 3, attackDuration: 60,  attackDistance: 15, castDuration: 140, castScale: 1.15 },
  healer:     { idleDuration: 1200, idleDelta: 4, attackDuration: 100, attackDistance: 10, castDuration: 200, castScale: 1.25 },
  support:    { idleDuration: 1000, idleDelta: 4, attackDuration: 90,  attackDistance: 12, castDuration: 180, castScale: 1.2 },
};

export const MONSTER_ANIM_PARAMS: Record<string, {
  idleDuration: number; idleDelta: number;
  attackDuration: number; attackDistance: number;
  castDuration: number; castScale: number;
}> = {
  beast:     { idleDuration: 600,  idleDelta: 2, attackDuration: 50,  attackDistance: 40, castDuration: 120, castScale: 1.1 },
  undead:    { idleDuration: 1200, idleDelta: 2, attackDuration: 100, attackDistance: 25, castDuration: 160, castScale: 1.15 },
  construct: { idleDuration: 1400, idleDelta: 1, attackDuration: 140, attackDistance: 15, castDuration: 200, castScale: 1.05 },
  caster:    { idleDuration: 1000, idleDelta: 5, attackDuration: 80,  attackDistance: 8,  castDuration: 160, castScale: 1.3 },
  humanoid:  { idleDuration: 800,  idleDelta: 3, attackDuration: 80,  attackDistance: 30, castDuration: 150, castScale: 1.2 },
  draconic:  { idleDuration: 1000, idleDelta: 2, attackDuration: 100, attackDistance: 20, castDuration: 180, castScale: 1.15 },
};

// ─── Gameplay UI Thresholds ───
export const UI_THRESHOLDS = {
  COMBO_DISPLAY_MIN: 5,
  SKILL_BAR_SLOTS: 8,
  MAX_DISPLAYED_ACHIEVEMENTS: 5,
  NAME_TRUNCATE_LENGTH: 8,
} as const;
