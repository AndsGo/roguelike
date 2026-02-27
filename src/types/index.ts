// ============ Core Enums / Literal Types ============

export type UnitRole = 'tank' | 'melee_dps' | 'ranged_dps' | 'healer' | 'support';
export type DamageType = 'physical' | 'magical' | 'pure';
export type TargetType = 'enemy' | 'ally' | 'self' | 'all_enemies' | 'all_allies';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type NodeType = 'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest';
export type StatusEffectType = 'dot' | 'hot' | 'stun' | 'buff' | 'debuff' | 'taunt';

// ============ New: Element, Race, Class ============

export type ElementType = 'fire' | 'ice' | 'lightning' | 'dark' | 'holy';
export type RaceType = 'human' | 'elf' | 'undead' | 'demon' | 'beast' | 'dragon';
export type ClassType = 'warrior' | 'mage' | 'ranger' | 'cleric' | 'assassin' | 'paladin';

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
  element?: ElementType;
  race?: RaceType;
  class?: ClassType;
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
  element?: ElementType;
  race?: RaceType;
  class?: ClassType;
  baseStats: UnitStats;
  scalingPerLevel: UnitScaling;
  skills: string[];
  spriteKey: string;
  goldReward: number;
  expReward: number;
  isBoss?: boolean;
}

// ============ Skills ============

export interface SkillEffect {
  type: 'damage' | 'heal' | 'status' | 'summon' | 'buff' | 'debuff' | 'element_reaction';
  damageType?: DamageType;
  element?: ElementType;
  baseDamage?: number;
  scalingStat?: 'attack' | 'magicPower';
  scalingRatio?: number;
  statusEffectId?: string;
  statusDuration?: number;
  aoeRadius?: number;
  chain?: SkillEffect; // chain to another effect after this one
}

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
  element?: ElementType;
  effects?: SkillEffect[]; // chain-capable effect list
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

// ============ Relics ============

export interface RelicConfig {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  triggerEvent: GameEventType; // which event triggers this relic
  effect: RelicEffect;
}

export interface RelicEffect {
  type: 'stat_boost' | 'on_damage' | 'on_heal' | 'on_kill' | 'on_battle_start' | 'on_battle_end' | 'passive';
  stat?: keyof UnitStats;
  value?: number;
  chance?: number; // 0-1 probability of triggering
}

// ============ Synergies ============

export interface SynergyConfig {
  id: string;
  name: string;
  description: string;
  type: 'race' | 'class' | 'element';
  key: RaceType | ClassType | ElementType;
  thresholds: SynergyThreshold[];
}

export interface SynergyThreshold {
  count: number;
  description: string;
  effects: SynergyEffect[];
}

export interface SynergyEffect {
  type: 'stat_boost' | 'skill_unlock' | 'damage_bonus' | 'resistance';
  stat?: keyof UnitStats;
  value?: number;
  skillId?: string;
  element?: ElementType;
}

// ============ Events (Narrative) ============

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
  type: 'gold' | 'heal' | 'damage' | 'item' | 'stat_boost' | 'relic';
  value: number;
  target?: 'all' | 'random';
  relicId?: string;
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
  connections: number[]; // indices of connected next nodes (supports branching)
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

// ============ Act / Region Config ============

export interface ActConfig {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
  enemyPool: string[];   // enemy IDs available in this act
  bossPool: string[];    // boss IDs
  eventPool: string[];   // event IDs
  elementAffinity?: ElementType; // dominant element in this act
  difficultyMultiplier: number;  // scales enemy stats
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
  element?: ElementType;  // element of the effect
}

// ============ Difficulty ============

export interface DifficultyConfig {
  id: string;
  name: string;
  description: string;
  enemyStatMultiplier: number;
  enemyCountBonus: number;      // extra enemies per encounter
  goldMultiplier: number;
  expMultiplier: number;
  eliteChanceBonus: number;     // extra chance for elite upgrades
}

// ============ Run State ============

export interface RunState {
  seed: number;
  heroes: HeroState[];
  gold: number;
  map: MapNode[];
  currentNode: number;
  floor: number;            // for difficulty scaling
  relics: RelicState[];     // acquired relics
  difficulty: string;       // difficulty config ID
  activeSynergies: ActiveSynergy[];
  currentAct: number;       // index into acts array
}

export interface RelicState {
  id: string;
  triggerCount: number; // how many times this relic has triggered
}

export interface ActiveSynergy {
  synergyId: string;
  count: number;
  activeThreshold: number; // highest threshold reached
}

// ============ Battle Result ============

export interface BattleResult {
  victory: boolean;
  goldEarned: number;
  expEarned: number;
  survivors: string[];  // hero IDs
}

// ============ Save / Meta Progression ============

export interface SaveData {
  version: number;
  timestamp: number;
  runState: RunState;
  rngState?: number;
  metaProgression: MetaProgressionData;
}

export interface MetaProgressionData {
  totalRuns: number;
  totalVictories: number;
  highestFloor: number;
  unlockedHeroes: string[];
  unlockedRelics: string[];
  permanentUpgrades: PermanentUpgrade[];
  achievements: string[];   // achievement IDs
}

export interface PermanentUpgrade {
  id: string;
  level: number;
  maxLevel: number;
}

// ============ Game Event Bus Types ============

export type GameEventType =
  | 'battle:start' | 'battle:end' | 'battle:turn'
  | 'unit:damage' | 'unit:heal' | 'unit:kill' | 'unit:death'
  | 'skill:use' | 'skill:cooldown'
  | 'status:apply' | 'status:expire'
  | 'combo:hit' | 'combo:break'
  | 'element:reaction'
  | 'node:complete' | 'run:end'
  | 'item:equip' | 'item:unequip'
  | 'relic:acquire' | 'relic:trigger'
  | 'achievement:unlock';

export interface GameEventMap {
  'battle:start': { heroCount: number; enemyCount: number };
  'battle:end': { victory: boolean; result: BattleResult };
  'battle:turn': { turnNumber: number };
  'unit:damage': { sourceId: string; targetId: string; amount: number; damageType: DamageType; element?: ElementType; isCrit: boolean };
  'unit:heal': { sourceId: string; targetId: string; amount: number };
  'unit:kill': { killerId: string; targetId: string };
  'unit:death': { unitId: string; isHero: boolean };
  'skill:use': { casterId: string; skillId: string; targets: string[] };
  'skill:cooldown': { unitId: string; skillId: string; remaining: number };
  'status:apply': { targetId: string; effectId: string; effectType: StatusEffectType };
  'status:expire': { targetId: string; effectId: string; effectType: StatusEffectType };
  'combo:hit': { unitId: string; comboCount: number };
  'combo:break': { unitId: string };
  'element:reaction': { element1: ElementType; element2: ElementType; targetId: string; reactionType: string };
  'node:complete': { nodeIndex: number; nodeType: NodeType };
  'run:end': { victory: boolean; floor: number };
  'item:equip': { heroId: string; itemId: string; slot: EquipmentSlot };
  'item:unequip': { heroId: string; itemId: string; slot: EquipmentSlot };
  'relic:acquire': { relicId: string };
  'relic:trigger': { relicId: string; context: string };
  'achievement:unlock': { achievementId: string };
}
