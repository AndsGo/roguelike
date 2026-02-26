// ============ Game Dimensions ============

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// ============ Battle Layout ============

export const BATTLE_GROUND_Y = 300;
export const HERO_START_X = 100;
export const ENEMY_START_X = 600;
export const UNIT_SPACING_Y = 60;

// ============ Combat ============

export const BASE_ATTACK_COOLDOWN = 1000; // ms
export const DAMAGE_VARIANCE = 0.1; // +/-10%
export const CRIT_MULTIPLIER = 1.5;
export const DEFENSE_FORMULA_BASE = 100; // damage * (100 / (100 + def))
export const Y_MOVEMENT_DAMPING = 0.3;

// ============ Leveling ============

export const BASE_EXP_REQUIRED = 100;
export const EXP_PER_LEVEL = 50;
export const MAX_LEVEL = 20;

// ============ Economy ============

export const STARTING_GOLD = 100;
export const NORMAL_BATTLE_GOLD_MIN = 15;
export const NORMAL_BATTLE_GOLD_MAX = 25;
export const ELITE_BATTLE_GOLD_MIN = 50;
export const ELITE_BATTLE_GOLD_MAX = 100;
export const BOSS_BATTLE_GOLD = 150;

// ============ Map ============

export const MAP_NODE_COUNT = 15;
export const REST_HEAL_PERCENT = 0.3;

// ============ Equipment ============

export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'accessory'] as const;
export const MAX_TEAM_SIZE = 5;

// ============ Animation ============

export const IDLE_FRAMES = 4;
export const WALK_FRAMES = 6;
export const ATTACK_FRAMES = 4;
export const HURT_FRAMES = 2;
export const DEATH_FRAMES = 4;
export const ATTACK_DAMAGE_FRAME = 2; // 0-indexed, 3rd frame

// ============ UI ============

export const HEALTH_BAR_WIDTH = 40;
export const HEALTH_BAR_HEIGHT = 5;
export const DAMAGE_NUMBER_DURATION = 800;
export const DAMAGE_NUMBER_RISE = 30;
