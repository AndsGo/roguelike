// ============ Game Dimensions ============

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// ============ Battle Layout ============

export const BATTLE_GROUND_Y = 260;
export const HERO_START_X = 120;
export const ENEMY_START_X = 620;
export const UNIT_SPACING_Y = 70;

// ============ Formation ============

export const FRONT_ROW_X = 140;
export const BACK_ROW_X = 80;
export const FRONT_ROW_AGGRO_BONUS = 50;
export const MELEE_RANGE_THRESHOLD = 100;

// ============ Combat ============

export const BASE_ATTACK_COOLDOWN = 1000; // ms
export const DAMAGE_VARIANCE = 0.1; // +/-10%
export const CRIT_MULTIPLIER = 1.5;
export const DEFENSE_FORMULA_BASE = 100; // damage * (100 / (100 + def))
export const DEFENSE_SOFT_CAP = 80;         // defense value where diminishing returns begin
export const DEFENSE_SOFT_CAP_FACTOR = 20;  // sqrt scaling factor above soft cap
export const Y_MOVEMENT_DAMPING = 0.3;

// ============ Leveling ============

export const BASE_EXP_REQUIRED = 100;
export const EXP_PER_LEVEL = 50;
export const MAX_LEVEL = 20;

// ============ Economy ============

export const STARTING_GOLD = 80;
export const NORMAL_BATTLE_GOLD_MIN = 12;
export const NORMAL_BATTLE_GOLD_MAX = 18;
export const ELITE_BATTLE_GOLD_MIN = 40;
export const ELITE_BATTLE_GOLD_MAX = 65;
export const BOSS_BATTLE_GOLD = 120;

// ============ Boss ============

export const MAX_ENEMIES = 10; // 场上敌人安全上限（含 boss）

// ============ Map ============

export const MAP_NODE_COUNT = 15;
export const REST_HEAL_PERCENT = 0.3;
export const REST_TRAIN_EXP = 120;
export const REST_SCAVENGE_GOLD_MIN = 40;
export const REST_SCAVENGE_GOLD_MAX = 60;
export const MAP_SHORTCUT_CHANCE = 0.15;
export const MAP_HIDDEN_NODE_CHANCE = 0.10;
export const MAP_HIDDEN_NODE_COST = 30;
export const CLERIC_ENERGY_MULTIPLIER = 1.5;

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

// ============ Gauntlet ============

export const GAUNTLET_REWARD_MULTIPLIER = 0.8; // per-wave multiplier (3 waves × 0.8 = 2.4x total)

// ============ Reaction ============

export const REACTION_DAMAGE_BONUS_CAP = 1.0; // max 100% reaction damage bonus from relics/synergies
