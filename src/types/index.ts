// ============ Enums ============

export type UnitRole = 'tank' | 'melee_dps' | 'ranged_dps' | 'healer' | 'support';
export type DamageType = 'physical' | 'magical' | 'pure';
export type TargetType = 'enemy' | 'ally' | 'self' | 'all_enemies' | 'all_allies';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type NodeType = 'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest';
export type StatusEffectType = 'dot' | 'hot' | 'stun' | 'buff' | 'debuff' | 'taunt';

// ============ Unit Stats ============

export interface UnitStats {
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  magicPower: number;
  magicResist: number;
  speed: number;        // movement speed px/s
  attackSpeed: number;  // attacks per second
  attackRange: number;  // px
  critChance: number;   // 0-1
  critDamage: number;   // multiplier e.g. 1.5
}

export interface UnitScaling {
  maxHp: number;
  attack: number;
  defense: number;
  magicPower: number;
  magicResist: number;
}

// ============ Hero ============

export interface HeroData {
  id: string;
  name: string;
  role: UnitRole;
  baseStats: UnitStats;
  scalingPerLevel: UnitScaling;
  skills: string[];    // skill IDs
  spriteKey: string;
}

export interface HeroState {
  id: string;
  level: number;
  exp: number;
  currentHp: number;
  equipment: {
    weapon: ItemData | null;
    armor: ItemData | null;
    accessory: ItemData | null;
  };
}

// ============ Enemy ============

export interface EnemyData {
  id: string;
  name: string;
  role: UnitRole;
  baseStats: UnitStats;
  scalingPerLevel: UnitScaling;
  skills: string[];
  spriteKey: string;
  goldReward: number;
  expReward: number;
  isBoss?: boolean;
}

// ============ Skills ============

export interface SkillData {
  id: string;
  name: string;
  description: string;
  cooldown: number;      // seconds
  damageType: DamageType;
  targetType: TargetType;
  baseDamage: number;    // or heal amount
  scalingStat: 'attack' | 'magicPower';
  scalingRatio: number;
  range: number;
  aoeRadius?: number;
  statusEffect?: string; // statusEffect ID to apply
  effectDuration?: number;
}

// ============ Items ============

export interface ItemData {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  cost: number;
  stats: Partial<UnitStats>;
}

// ============ Events ============

export interface EventChoice {
  text: string;
  outcomes: EventOutcome[];
}

export interface EventOutcome {
  probability: number;  // 0-1, all outcomes sum to 1
  description: string;
  effects: EventEffect[];
}

export interface EventEffect {
  type: 'gold' | 'heal' | 'damage' | 'item' | 'stat_boost';
  value: number;
  target?: 'all' | 'random';
}

export interface EventData {
  id: string;
  title: string;
  description: string;
  choices: EventChoice[];
}

// ============ Map ============

export interface MapNode {
  index: number;
  type: NodeType;
  completed: boolean;
  data?: BattleNodeData | ShopNodeData | EventNodeData;
}

export interface BattleNodeData {
  enemies: { id: string; level: number }[];
}

export interface ShopNodeData {
  items: ItemData[];
}

export interface EventNodeData {
  eventId: string;
}

// ============ Status Effects ============

export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  name: string;
  duration: number;       // remaining seconds
  tickInterval?: number;  // for DoT/HoT
  value: number;          // damage/heal per tick, or stat modifier
  stat?: keyof UnitStats; // which stat to modify for buff/debuff
  sourceId?: string;      // who applied it (for taunt)
}

// ============ Run State ============

export interface RunState {
  seed: number;
  heroes: HeroState[];
  gold: number;
  map: MapNode[];
  currentNode: number;
  floor: number;        // for difficulty scaling
}

// ============ Battle Result ============

export interface BattleResult {
  victory: boolean;
  goldEarned: number;
  expEarned: number;
  survivors: string[];  // hero IDs
}
