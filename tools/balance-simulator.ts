/**
 * Balance Simulator - Lightweight battle simulator for balance analysis.
 * Runs in pure Node.js via tsx, no Phaser dependency.
 *
 * Usage: npx tsx tools/balance-simulator.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ============ Type definitions (mirrored from src/types) ============

type ElementType = 'fire' | 'ice' | 'lightning' | 'dark' | 'holy';
type DamageType = 'physical' | 'magical' | 'pure';
type TargetType = 'enemy' | 'ally' | 'self' | 'all_enemies' | 'all_allies';

interface UnitStats {
  maxHp: number; hp: number; attack: number; defense: number;
  magicPower: number; magicResist: number; speed: number;
  attackSpeed: number; attackRange: number; critChance: number; critDamage: number;
}

interface UnitScaling {
  maxHp: number; attack: number; defense: number; magicPower: number; magicResist: number;
}

interface HeroData {
  id: string; name: string; role: string; element: ElementType | null;
  race: string; class: string;
  baseStats: UnitStats; scalingPerLevel: UnitScaling;
  skills: string[]; spriteKey: string;
}

interface EnemyData {
  id: string; name: string; role: string; element: ElementType | null;
  race: string;
  baseStats: UnitStats; scalingPerLevel: UnitScaling;
  skills: string[]; spriteKey: string;
  goldReward: number; expReward: number; isBoss?: boolean;
}

interface SkillEffect {
  type: string; damageType?: DamageType; element?: ElementType;
  baseDamage?: number; scalingStat?: string; scalingRatio?: number;
  chain?: SkillEffect;
}

interface SkillData {
  id: string; name: string; description: string; cooldown: number;
  damageType: DamageType; targetType: TargetType;
  baseDamage: number; scalingStat: string; scalingRatio: number; range: number;
  aoeRadius?: number; statusEffect?: string; effectDuration?: number;
  element?: ElementType; effects?: SkillEffect[];
}

interface ItemData {
  id: string; name: string; description: string; slot: string;
  rarity: string; cost: number; stats: Partial<UnitStats>;
}

interface ActConfig {
  id: string; name: string; description: string; nodeCount: number;
  enemyPool: string[]; bossPool: string[];
  elementAffinity?: ElementType; difficultyMultiplier: number;
}

interface DifficultyConfig {
  id: string; enemyStatMultiplier: number; enemyCountBonus: number;
  goldMultiplier: number; expMultiplier: number;
}

// ============ Load JSON data ============

const ROOT = resolve(import.meta.dirname || __dirname, '..');

function loadJson<T>(relativePath: string): T {
  const raw = readFileSync(resolve(ROOT, relativePath), 'utf-8');
  return JSON.parse(raw) as T;
}

const heroes: HeroData[] = loadJson('src/data/heroes.json');
const enemies: EnemyData[] = loadJson('src/data/enemies.json');
const skills: SkillData[] = loadJson('src/data/skills.json');
const items: ItemData[] = loadJson('src/data/items.json');
const acts: ActConfig[] = loadJson('src/data/acts.json');

const skillMap = new Map<string, SkillData>();
for (const s of skills) skillMap.set(s.id, s);

const heroMap = new Map<string, HeroData>();
for (const h of heroes) heroMap.set(h.id, h);

const enemyMap = new Map<string, EnemyData>();
for (const e of enemies) enemyMap.set(e.id, e);

// ============ Constants (from balance.ts) ============

const DEFENSE_FORMULA_BASE = 100;
const DAMAGE_VARIANCE = 0.1;
const BASE_ATTACK_COOLDOWN = 1000; // ms

// Economy constants
const STARTING_GOLD = 80;
const NORMAL_BATTLE_GOLD_MIN = 12;
const NORMAL_BATTLE_GOLD_MAX = 22;
const ELITE_BATTLE_GOLD_MIN = 40;
const ELITE_BATTLE_GOLD_MAX = 80;
const BOSS_BATTLE_GOLD = 120;

// Difficulty configs
const DIFFICULTY_LEVELS: DifficultyConfig[] = [
  { id: 'normal', enemyStatMultiplier: 1.0, enemyCountBonus: 0, goldMultiplier: 1.0, expMultiplier: 1.0 },
  { id: 'hard', enemyStatMultiplier: 1.3, enemyCountBonus: 1, goldMultiplier: 1.2, expMultiplier: 1.2 },
];

// Element system
const ELEMENT_ADVANTAGE: Record<string, string[]> = {
  fire: ['ice'], ice: ['lightning'], lightning: ['fire'], dark: ['holy'], holy: ['dark'],
};
const ELEMENT_ADVANTAGE_MULTIPLIER = 1.2;
const ELEMENT_DISADVANTAGE_MULTIPLIER = 0.85;

// ============ Seeded RNG (Mulberry32) ============

class SeededRNG {
  private state: number;
  constructor(seed: number) { this.state = seed; }

  next(): number {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextFloat(min: number, max: number): number { return min + this.next() * (max - min); }
  nextInt(min: number, max: number): number { return Math.floor(this.nextFloat(min, max + 1)); }
  chance(p: number): boolean { return this.next() < p; }
}

// ============ Sim Unit ============

interface SimUnit {
  id: string;
  name: string;
  stats: UnitStats;
  element: ElementType | null;
  skills: SkillData[];
  skillCooldowns: Map<string, number>; // remaining turns
  isAlive: boolean;
  team: 'heroes' | 'enemies';
  statusEffects: SimStatusEffect[];
  role: string;
}

interface SimStatusEffect {
  name: string;
  duration: number; // remaining turns
  type: 'buff' | 'debuff' | 'dot' | 'hot' | 'stun';
  stat?: string;
  value: number;
  element?: ElementType;
}

function createSimUnit(
  data: HeroData | EnemyData,
  team: 'heroes' | 'enemies',
  level: number = 1,
  diffMult: number = 1.0,
): SimUnit {
  const s = { ...data.baseStats };
  const sc = data.scalingPerLevel;

  // Apply level scaling
  if (level > 1) {
    const lvls = level - 1;
    s.maxHp += sc.maxHp * lvls;
    s.hp = s.maxHp;
    s.attack += sc.attack * lvls;
    s.defense += sc.defense * lvls;
    s.magicPower += sc.magicPower * lvls;
    s.magicResist += sc.magicResist * lvls;
  } else {
    s.hp = s.maxHp;
  }

  // Apply difficulty multiplier (enemies only)
  if (team === 'enemies' && diffMult !== 1.0) {
    s.maxHp = Math.round(s.maxHp * diffMult);
    s.hp = s.maxHp;
    s.attack = Math.round(s.attack * diffMult);
    s.defense = Math.round(s.defense * diffMult);
    s.magicPower = Math.round(s.magicPower * diffMult);
    s.magicResist = Math.round(s.magicResist * diffMult);
  }

  const unitSkills: SkillData[] = [];
  for (const sid of data.skills) {
    const sk = skillMap.get(sid);
    if (sk) unitSkills.push(sk);
  }

  return {
    id: data.id,
    name: data.name,
    stats: s,
    element: data.element ?? null,
    skills: unitSkills,
    skillCooldowns: new Map(),
    isAlive: true,
    team,
    statusEffects: [],
    role: data.role,
  };
}

// ============ Element helpers ============

function hasElementAdvantage(attacker: ElementType | null, target: ElementType | null): boolean {
  if (!attacker || !target) return false;
  return ELEMENT_ADVANTAGE[attacker]?.includes(target) ?? false;
}

function getElementMultiplier(atk: ElementType | null, def: ElementType | null): number {
  if (!atk || !def || atk === def) return 1.0;
  if (hasElementAdvantage(atk, def)) return ELEMENT_ADVANTAGE_MULTIPLIER;
  if (hasElementAdvantage(def, atk)) return ELEMENT_DISADVANTAGE_MULTIPLIER;
  return 1.0;
}

// ============ Damage calculation ============

function calcDamage(
  attacker: SimUnit,
  target: SimUnit,
  baseDmg: number,
  damageType: DamageType,
  rng: SeededRNG,
  skillElement?: ElementType,
  forceCrit: boolean = false,
): number {
  let raw = baseDmg;

  // Defense
  if (damageType !== 'pure') {
    const def = damageType === 'magical' ? target.stats.magicResist : target.stats.defense;
    raw = raw * (DEFENSE_FORMULA_BASE / (DEFENSE_FORMULA_BASE + Math.max(0, def)));
  }

  // Crit
  const isCrit = forceCrit || rng.chance(attacker.stats.critChance);
  if (isCrit) raw *= attacker.stats.critDamage;

  // Element
  const atkEl = skillElement ?? attacker.element;
  const elemMod = getElementMultiplier(atkEl, target.element);
  raw *= elemMod;

  // Variance
  raw *= 1 + rng.nextFloat(-DAMAGE_VARIANCE, DAMAGE_VARIANCE);

  return Math.max(1, Math.round(raw));
}

// ============ Heal calculation ============

function calcHeal(
  healer: SimUnit,
  baseHeal: number,
  scalingStat: string,
  scalingRatio: number,
): number {
  const statVal = scalingStat === 'magicPower' ? healer.stats.magicPower : healer.stats.attack;
  return Math.round(Math.abs(baseHeal) + statVal * scalingRatio);
}

// ============ Target selection ============

function getLowestHpTarget(units: SimUnit[]): SimUnit | null {
  const alive = units.filter(u => u.isAlive);
  if (alive.length === 0) return null;
  return alive.reduce((min, u) => (u.stats.hp / u.stats.maxHp) < (min.stats.hp / min.stats.maxHp) ? u : min);
}

function getLowestHpAlly(allies: SimUnit[]): SimUnit | null {
  const alive = allies.filter(u => u.isAlive && u.stats.hp < u.stats.maxHp);
  if (alive.length === 0) return null;
  return alive.reduce((min, u) => (u.stats.hp / u.stats.maxHp) < (min.stats.hp / min.stats.maxHp) ? u : min);
}

// ============ Skill execution ============

function executeSkill(
  caster: SimUnit,
  skill: SkillData,
  allies: SimUnit[],
  enemies: SimUnit[],
  rng: SeededRNG,
): void {
  const aliveEnemies = enemies.filter(u => u.isAlive);
  const aliveAllies = allies.filter(u => u.isAlive);

  // Determine base damage for the skill
  const statVal = skill.scalingStat === 'magicPower' ? caster.stats.magicPower : caster.stats.attack;
  const skillBaseDmg = Math.abs(skill.baseDamage) + statVal * skill.scalingRatio;

  // Heal skill
  if (skill.baseDamage < 0 || skill.targetType === 'ally' || skill.targetType === 'all_allies') {
    if (skill.baseDamage < 0) {
      // Healing skill
      const healAmt = calcHeal(caster, skill.baseDamage, skill.scalingStat, skill.scalingRatio);
      if (skill.targetType === 'ally') {
        const target = getLowestHpAlly(aliveAllies);
        if (target) {
          target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + healAmt);
        }
      } else if (skill.targetType === 'all_allies') {
        for (const ally of aliveAllies) {
          ally.stats.hp = Math.min(ally.stats.maxHp, ally.stats.hp + healAmt);
        }
      }

      // Also check for damage effect in effects array (e.g., ultimate_holy_burst)
      if (skill.effects) {
        for (const eff of skill.effects) {
          if (eff.type === 'damage') {
            const effStatVal = eff.scalingStat === 'magicPower' ? caster.stats.magicPower : caster.stats.attack;
            const effBase = (eff.baseDamage ?? 0) + effStatVal * (eff.scalingRatio ?? 0);
            for (const enemy of aliveEnemies) {
              const dmg = calcDamage(caster, enemy, effBase, eff.damageType ?? 'magical', rng, eff.element ?? skill.element);
              enemy.stats.hp -= dmg;
              if (enemy.stats.hp <= 0) { enemy.stats.hp = 0; enemy.isAlive = false; }
            }
          }
        }
      }
      return;
    }
  }

  // Self buff
  if (skill.targetType === 'self') {
    if (skill.statusEffect === 'berserk') {
      caster.statusEffects.push({ name: 'berserk', duration: skill.effectDuration ?? 6, type: 'buff', stat: 'attack', value: Math.round(caster.stats.attack * 0.5) });
      caster.stats.attack = Math.round(caster.stats.attack * 1.5);
    } else if (skill.statusEffect === 'divine_shield') {
      caster.statusEffects.push({ name: 'divine_shield', duration: skill.effectDuration ?? 4, type: 'buff', stat: 'defense', value: 30 });
      caster.stats.defense += 30;
    } else if (skill.statusEffect === 'ice_armor') {
      caster.statusEffects.push({ name: 'ice_armor', duration: skill.effectDuration ?? 6, type: 'buff', stat: 'defense', value: 25 });
      caster.stats.defense += 25;
    } else if (skill.statusEffect === 'attack_buff') {
      const buffVal = Math.round(caster.stats.attack * 0.3);
      caster.statusEffects.push({ name: 'attack_buff', duration: skill.effectDuration ?? 5, type: 'buff', stat: 'attack', value: buffVal });
      caster.stats.attack += buffVal;
    }
    return;
  }

  // Damage skills
  if (skill.targetType === 'enemy') {
    const target = getLowestHpTarget(aliveEnemies);
    if (!target) return;
    const dmg = calcDamage(caster, target, skillBaseDmg, skill.damageType, rng, skill.element);
    target.stats.hp -= dmg;
    if (target.stats.hp <= 0) { target.stats.hp = 0; target.isAlive = false; }

    // Apply status effect
    if (skill.statusEffect === 'stun' && skill.effectDuration) {
      target.statusEffects.push({ name: 'stun', duration: Math.ceil(skill.effectDuration), type: 'stun', value: 0 });
    }

    // Handle chain effects (chain_lightning)
    if (skill.effects) {
      for (const eff of skill.effects) {
        if (eff.chain) {
          let chainEff: SkillEffect | undefined = eff.chain;
          while (chainEff) {
            const chainTarget = getLowestHpTarget(aliveEnemies.filter(u => u.isAlive && u !== target));
            if (!chainTarget) break;
            const chainStatVal = chainEff.scalingStat === 'magicPower' ? caster.stats.magicPower : caster.stats.attack;
            const chainBase = (chainEff.baseDamage ?? 0) + chainStatVal * (chainEff.scalingRatio ?? 0);
            const chainDmg = calcDamage(caster, chainTarget, chainBase, chainEff.damageType ?? 'magical', rng, chainEff.element ?? skill.element);
            chainTarget.stats.hp -= chainDmg;
            if (chainTarget.stats.hp <= 0) { chainTarget.stats.hp = 0; chainTarget.isAlive = false; }
            chainEff = chainEff.chain;
          }
        }
      }
    }

    // Handle shadow_drain self-heal
    if (skill.effects) {
      for (const eff of skill.effects) {
        if (eff.type === 'heal') {
          const hStatVal = eff.scalingStat === 'magicPower' ? caster.stats.magicPower : caster.stats.attack;
          const hAmt = Math.round((eff.baseDamage ?? 0) + hStatVal * (eff.scalingRatio ?? 0));
          caster.stats.hp = Math.min(caster.stats.maxHp, caster.stats.hp + hAmt);
        }
      }
    }
  } else if (skill.targetType === 'all_enemies') {
    for (const target of [...aliveEnemies]) {
      const dmg = calcDamage(caster, target, skillBaseDmg, skill.damageType, rng, skill.element);
      target.stats.hp -= dmg;
      if (target.stats.hp <= 0) { target.stats.hp = 0; target.isAlive = false; }
      if (skill.statusEffect === 'stun' && skill.effectDuration) {
        target.statusEffects.push({ name: 'stun', duration: Math.ceil(skill.effectDuration), type: 'stun', value: 0 });
      }
    }
  }
}

// ============ Status effect processing ============

function processStatusEffects(unit: SimUnit): void {
  const expired: number[] = [];
  for (let i = 0; i < unit.statusEffects.length; i++) {
    const eff = unit.statusEffects[i];
    eff.duration--;
    if (eff.duration <= 0) {
      // Remove buff stat modification
      if (eff.type === 'buff' && eff.stat) {
        (unit.stats as any)[eff.stat] -= eff.value;
      }
      expired.push(i);
    }
  }
  for (let i = expired.length - 1; i >= 0; i--) {
    unit.statusEffects.splice(expired[i], 1);
  }
}

function isStunned(unit: SimUnit): boolean {
  return unit.statusEffects.some(e => e.type === 'stun');
}

// ============ Battle simulation ============

interface BattleResult {
  heroesWin: boolean;
  draw: boolean;
  survivingHeroes: number;
  totalHeroes: number;
  turns: number;
  totalDamageDealt: number;
}

function simulateBattle(
  heroTeam: SimUnit[],
  enemyTeam: SimUnit[],
  rng: SeededRNG,
  maxTurns: number = 100,
): BattleResult {
  let turns = 0;
  let totalDamageDealt = 0;

  // Combine all units and sort by speed for turn order
  const allUnits = [...heroTeam, ...enemyTeam];

  while (turns < maxTurns) {
    turns++;

    // Sort by speed (+ small random to break ties)
    allUnits.sort((a, b) => (b.stats.speed + rng.nextFloat(0, 5)) - (a.stats.speed + rng.nextFloat(0, 5)));

    for (const unit of allUnits) {
      if (!unit.isAlive) continue;

      // Process status effects
      processStatusEffects(unit);

      // Check stun
      if (isStunned(unit)) continue;

      const allies = unit.team === 'heroes' ? heroTeam : enemyTeam;
      const opponents = unit.team === 'heroes' ? enemyTeam : heroTeam;

      // Check if any opponents alive
      if (!opponents.some(u => u.isAlive)) break;

      // Try to use a skill (check cooldowns)
      let usedSkill = false;
      for (const skill of unit.skills) {
        const cd = unit.skillCooldowns.get(skill.id) ?? 0;
        if (cd <= 0) {
          // Use skill
          executeSkill(unit, skill, allies, opponents, rng);
          unit.skillCooldowns.set(skill.id, skill.cooldown);
          usedSkill = true;
          break;
        }
      }

      // If no skill used, do basic attack
      if (!usedSkill) {
        const target = getLowestHpTarget(opponents.filter(u => u.isAlive));
        if (target) {
          // Determine damage type based on whether unit uses magicPower
          const usesMagic = unit.stats.magicPower > unit.stats.attack;
          const baseDmg = usesMagic ? unit.stats.magicPower : unit.stats.attack;
          const dmgType: DamageType = usesMagic ? 'magical' : 'physical';
          const dmg = calcDamage(unit, target, baseDmg, dmgType, rng, unit.element);
          target.stats.hp -= dmg;
          totalDamageDealt += dmg;
          if (target.stats.hp <= 0) {
            target.stats.hp = 0;
            target.isAlive = false;
          }
        }
      }

      // attackSpeed > 1 means extra attacks
      const extraAttacks = Math.floor(unit.stats.attackSpeed) - 1;
      for (let i = 0; i < Math.max(0, extraAttacks); i++) {
        if (!opponents.some(u => u.isAlive)) break;
        const target = getLowestHpTarget(opponents.filter(u => u.isAlive));
        if (target) {
          const usesMagic = unit.stats.magicPower > unit.stats.attack;
          const baseDmg = usesMagic ? unit.stats.magicPower : unit.stats.attack;
          const dmgType: DamageType = usesMagic ? 'magical' : 'physical';
          const dmg = calcDamage(unit, target, baseDmg, dmgType, rng, unit.element);
          target.stats.hp -= dmg;
          totalDamageDealt += dmg;
          if (target.stats.hp <= 0) {
            target.stats.hp = 0;
            target.isAlive = false;
          }
        }
      }
    }

    // Tick cooldowns
    for (const unit of allUnits) {
      if (!unit.isAlive) continue;
      for (const [sid, cd] of unit.skillCooldowns.entries()) {
        if (cd > 0) unit.skillCooldowns.set(sid, cd - 1);
      }
    }

    // Check end conditions
    const heroesAlive = heroTeam.some(u => u.isAlive);
    const enemiesAlive = enemyTeam.some(u => u.isAlive);
    if (!heroesAlive || !enemiesAlive) {
      return {
        heroesWin: heroesAlive && !enemiesAlive,
        draw: false,
        survivingHeroes: heroTeam.filter(u => u.isAlive).length,
        totalHeroes: heroTeam.length,
        turns,
        totalDamageDealt,
      };
    }
  }

  return {
    heroesWin: false,
    draw: true,
    survivingHeroes: heroTeam.filter(u => u.isAlive).length,
    totalHeroes: heroTeam.length,
    turns: maxTurns,
    totalDamageDealt,
  };
}

// ============ Simulation runners ============

/**
 * 2A: Hero 1v1 Tournament
 */
function runHero1v1Tournament(iterations: number = 50): { matrix: number[][]; heroIds: string[] } {
  const heroIds = heroes.map(h => h.id);
  const n = heroIds.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { matrix[i][j] = 0.5; continue; }
      let wins = 0;
      for (let k = 0; k < iterations; k++) {
        const rng = new SeededRNG(i * 10000 + j * 100 + k);
        const h1 = createSimUnit(heroes[i], 'heroes', 1);
        const h2 = createSimUnit(heroes[j], 'enemies', 1);
        const result = simulateBattle([h1], [h2], rng);
        if (result.heroesWin) wins++;
      }
      matrix[i][j] = wins / iterations;
    }
  }

  return { matrix, heroIds };
}

/**
 * 2B: Team vs Act enemies
 */
interface TeamVsActResult {
  teamName: string;
  actId: string;
  difficulty: string;
  winRate: number;
  avgSurvivors: number;
  avgTurns: number;
}

function buildEnemyGroup(actConfig: ActConfig, enemyCount: number, level: number, diffMult: number, rng: SeededRNG): SimUnit[] {
  const group: SimUnit[] = [];
  for (let i = 0; i < enemyCount; i++) {
    const eid = actConfig.enemyPool[rng.nextInt(0, actConfig.enemyPool.length - 1)];
    const edata = enemyMap.get(eid);
    if (edata) {
      group.push(createSimUnit(edata, 'enemies', level, diffMult * actConfig.difficultyMultiplier));
    }
  }
  return group;
}

function runTeamVsAct(
  teamHeroIds: string[],
  teamName: string,
  iterations: number = 100,
): TeamVsActResult[] {
  const results: TeamVsActResult[] = [];
  // Filter to only heroes that exist
  const validIds = teamHeroIds.filter(id => heroMap.has(id));
  if (validIds.length === 0) return results;

  const difficulties = ['normal', 'hard'];
  const actLevels = [1, 4, 7]; // approximate hero level per act

  for (let ai = 0; ai < acts.length; ai++) {
    const act = acts[ai];
    const heroLevel = actLevels[ai] ?? 1;

    for (const diffId of difficulties) {
      const diffConfig = DIFFICULTY_LEVELS.find(d => d.id === diffId)!;
      let totalWins = 0;
      let totalSurvivors = 0;
      let totalTurns = 0;

      for (let k = 0; k < iterations; k++) {
        const rng = new SeededRNG(ai * 100000 + k);
        const heroTeam = validIds.map(id => createSimUnit(heroMap.get(id)!, 'heroes', heroLevel));
        const enemyCount = 4 + diffConfig.enemyCountBonus;
        const enemyTeam = buildEnemyGroup(act, enemyCount, heroLevel, diffConfig.enemyStatMultiplier, rng);

        const result = simulateBattle(heroTeam, enemyTeam, rng);
        if (result.heroesWin) totalWins++;
        totalSurvivors += result.survivingHeroes;
        totalTurns += result.turns;
      }

      results.push({
        teamName,
        actId: act.id,
        difficulty: diffId,
        winRate: totalWins / iterations,
        avgSurvivors: totalSurvivors / iterations,
        avgTurns: totalTurns / iterations,
      });
    }
  }

  return results;
}

/**
 * 2C: Element efficiency
 */
interface ElementEfficiencyResult {
  scenario: string;
  avgDps: number;
  winRate: number;
  avgTurns: number;
}

function runElementEfficiency(iterations: number = 100): ElementEfficiencyResult[] {
  const results: ElementEfficiencyResult[] = [];

  // Fire heroes available
  const fireHeroes = heroes.filter(h => h.element === 'fire').map(h => h.id);
  const iceEnemies = enemies.filter(e => e.element === 'ice' && !e.isBoss).map(e => e.id);
  const fireEnemies = enemies.filter(e => e.element === 'fire' && !e.isBoss).map(e => e.id);
  const neutralEnemies = enemies.filter(e => !e.element && !e.isBoss).map(e => e.id);

  const scenarios = [
    { name: 'Fire vs Ice (advantage)', heroIds: fireHeroes, enemyIds: iceEnemies },
    { name: 'Fire vs Fire (same)', heroIds: fireHeroes, enemyIds: fireEnemies },
    { name: 'Fire vs Neutral', heroIds: fireHeroes, enemyIds: neutralEnemies },
  ];

  for (const sc of scenarios) {
    if (sc.heroIds.length === 0 || sc.enemyIds.length === 0) continue;

    let totalWins = 0;
    let totalTurns = 0;
    let totalDamage = 0;

    for (let k = 0; k < iterations; k++) {
      const rng = new SeededRNG(k + 5000);
      // Use up to 3 fire heroes (pad with first one)
      const hIds = sc.heroIds.slice(0, 3);
      while (hIds.length < 3) hIds.push(sc.heroIds[0]);
      const heroTeam = hIds.map(id => createSimUnit(heroMap.get(id)!, 'heroes', 3));

      // Pick 4 enemies at level 5 for a more challenging test
      const eIds: string[] = [];
      for (let i = 0; i < 4; i++) eIds.push(sc.enemyIds[rng.nextInt(0, sc.enemyIds.length - 1)]);
      const enemyTeam = eIds.map(id => createSimUnit(enemyMap.get(id)!, 'enemies', 5));

      const result = simulateBattle(heroTeam, enemyTeam, rng);
      if (result.heroesWin) totalWins++;
      totalTurns += result.turns;
      totalDamage += result.totalDamageDealt;
    }

    results.push({
      scenario: sc.name,
      avgDps: totalDamage / iterations,
      winRate: totalWins / iterations,
      avgTurns: totalTurns / iterations,
    });
  }

  return results;
}

/**
 * 2D: Economy analysis
 */
interface EconomyAnalysis {
  actId: string;
  normalBattles: number;
  eliteBattles: number;
  bossBattles: number;
  totalGold: number;
  avgItemCost: number;
  affordableItems: number;
}

function runEconomyAnalysis(): EconomyAnalysis[] {
  const results: EconomyAnalysis[] = [];

  // Map node template per act: ~8 nodes each
  // Typical distribution per act: 4 normal battles, 1 elite, 1 boss, 1 shop, 1 event
  const actTemplate = { normalBattles: 4, eliteBattles: 1, bossBattles: 1 };

  const avgItemCost = items.reduce((sum, i) => sum + i.cost, 0) / items.length;

  let cumulativeGold = STARTING_GOLD;

  for (const act of acts) {
    const normalGoldAvg = (NORMAL_BATTLE_GOLD_MIN + NORMAL_BATTLE_GOLD_MAX) / 2;
    const eliteGoldAvg = (ELITE_BATTLE_GOLD_MIN + ELITE_BATTLE_GOLD_MAX) / 2;

    const actGold =
      actTemplate.normalBattles * normalGoldAvg +
      actTemplate.eliteBattles * eliteGoldAvg +
      actTemplate.bossBattles * BOSS_BATTLE_GOLD;

    cumulativeGold += actGold;

    results.push({
      actId: act.id,
      normalBattles: actTemplate.normalBattles,
      eliteBattles: actTemplate.eliteBattles,
      bossBattles: actTemplate.bossBattles,
      totalGold: Math.round(cumulativeGold),
      avgItemCost: Math.round(avgItemCost),
      affordableItems: Math.round(cumulativeGold / avgItemCost * 10) / 10,
    });
    // Assume player spends ~60% per act
    cumulativeGold = Math.round(cumulativeGold * 0.4);
  }

  return results;
}

// ============ Scoring ============

interface HeroScore {
  id: string;
  name: string;
  avg1v1WinRate: number;
  teamContribution: number;
  overallScore: number;
  status: string;
}

function computeHeroScores(
  matrix: number[][],
  heroIds: string[],
  teamResults: TeamVsActResult[],
): HeroScore[] {
  const scores: HeroScore[] = [];

  // Define which heroes appear in which team
  const teamDefs: { name: string; ids: string[] }[] = [
    { name: 'classic', ids: ['warrior', 'archer', 'mage', 'priest', 'rogue'] },
    { name: 'heavy', ids: ['warrior', 'knight', 'berserker', 'priest', 'shadow_assassin'] },
    { name: 'magic', ids: ['mage', 'elementalist', 'necromancer', 'priest', 'druid'] },
    { name: 'assassin', ids: ['rogue', 'shadow_assassin', 'archer', 'frost_ranger', 'priest'] },
  ];

  for (let i = 0; i < heroIds.length; i++) {
    const hid = heroIds[i];
    const hero = heroMap.get(hid)!;

    // Average 1v1 winrate (exclude mirror)
    const winrates = matrix[i].filter((_, j) => j !== i);
    const avg1v1 = winrates.reduce((a, b) => a + b, 0) / winrates.length;

    // Team contribution: average winrate of teams containing this hero
    const teamsWithHero = teamDefs.filter(t => t.ids.includes(hid));
    let teamContrib = 0;
    if (teamsWithHero.length > 0) {
      const relevantResults = teamResults.filter(r =>
        teamsWithHero.some(t => t.name === r.teamName) && r.difficulty === 'normal'
      );
      if (relevantResults.length > 0) {
        teamContrib = relevantResults.reduce((sum, r) => sum + r.winRate, 0) / relevantResults.length;
      }
    }

    const overallScore = avg1v1 * 0.4 + teamContrib * 0.6;

    // Status determination
    const meanWr = 0.5;
    let status = 'OK';
    if (avg1v1 > meanWr + 0.1) status = 'STRONG';
    if (avg1v1 > meanWr + 0.2) status = 'OVERPOWERED';
    if (avg1v1 < meanWr - 0.1) status = 'WEAK';
    if (avg1v1 < meanWr - 0.2) status = 'UNDERPOWERED';

    scores.push({ id: hid, name: hero.name, avg1v1WinRate: avg1v1, teamContribution: teamContrib, overallScore, status });
  }

  scores.sort((a, b) => b.overallScore - a.overallScore);
  return scores;
}

// ============ Report generation ============

function generateReport(
  heroScores: HeroScore[],
  matrix: number[][],
  heroIds: string[],
  teamResults: TeamVsActResult[],
  elemResults: ElementEfficiencyResult[],
  econResults: EconomyAnalysis[],
): string {
  const lines: string[] = [];
  lines.push('# Balance Analysis Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Hero Tier List
  lines.push('## Hero Tier List');
  lines.push('');
  lines.push('| Rank | Hero | ID | 1v1 WinRate | Team Contrib | Overall | Status |');
  lines.push('|------|------|----|-------------|--------------|---------|--------|');
  heroScores.forEach((h, i) => {
    lines.push(`| ${i + 1} | ${h.name} | ${h.id} | ${(h.avg1v1WinRate * 100).toFixed(1)}% | ${(h.teamContribution * 100).toFixed(1)}% | ${(h.overallScore * 100).toFixed(1)} | ${h.status} |`);
  });
  lines.push('');

  // 1v1 Matrix
  lines.push('## 1v1 Win Rate Matrix');
  lines.push('');
  lines.push('Rows = attacker, Columns = defender. Value = attacker win rate.');
  lines.push('');
  const hdr = '| | ' + heroIds.map(id => id.substring(0, 8)).join(' | ') + ' |';
  lines.push(hdr);
  lines.push('|' + '---|'.repeat(heroIds.length + 1));
  for (let i = 0; i < heroIds.length; i++) {
    const row = `| ${heroIds[i].substring(0, 8)} | ` + matrix[i].map(v => `${(v * 100).toFixed(0)}%`).join(' | ') + ' |';
    lines.push(row);
  }
  lines.push('');

  // Team vs Act results
  lines.push('## Team vs Act Performance');
  lines.push('');
  lines.push('| Team | Act | Difficulty | Win Rate | Avg Survivors | Avg Turns |');
  lines.push('|------|-----|------------|----------|---------------|-----------|');
  for (const r of teamResults) {
    lines.push(`| ${r.teamName} | ${r.actId} | ${r.difficulty} | ${(r.winRate * 100).toFixed(1)}% | ${r.avgSurvivors.toFixed(1)}/${5} | ${r.avgTurns.toFixed(1)} |`);
  }
  lines.push('');

  // Element efficiency
  lines.push('## Element Efficiency');
  lines.push('');
  lines.push('| Scenario | Win Rate | Avg Turns | Total Damage |');
  lines.push('|----------|----------|-----------|--------------|');
  for (const r of elemResults) {
    lines.push(`| ${r.scenario} | ${(r.winRate * 100).toFixed(1)}% | ${r.avgTurns.toFixed(1)} | ${r.avgDps.toFixed(0)} |`);
  }
  lines.push('');

  // Economy
  lines.push('## Economy Analysis');
  lines.push('');
  lines.push('| Act | Normal Battles | Elite | Boss | Cumulative Gold | Avg Item Cost | Affordable Items |');
  lines.push('|-----|----------------|-------|------|-----------------|---------------|------------------|');
  for (const r of econResults) {
    lines.push(`| ${r.actId} | ${r.normalBattles} | ${r.eliteBattles} | ${r.bossBattles} | ${r.totalGold} | ${r.avgItemCost} | ${r.affordableItems} |`);
  }
  lines.push('');

  // Issues
  lines.push('## Issues Flagged');
  lines.push('');
  const overpowered = heroScores.filter(h => h.status === 'OVERPOWERED');
  const strong = heroScores.filter(h => h.status === 'STRONG');
  const underpowered = heroScores.filter(h => h.status === 'UNDERPOWERED');
  const weak = heroScores.filter(h => h.status === 'WEAK');

  if (overpowered.length > 0) {
    for (const h of overpowered) {
      lines.push(`- WARNING: ${h.name} (${h.id}) OVERPOWERED - 1v1 win rate ${(h.avg1v1WinRate * 100).toFixed(1)}%`);
    }
  }
  if (strong.length > 0) {
    for (const h of strong) {
      lines.push(`- NOTICE: ${h.name} (${h.id}) slightly strong - 1v1 win rate ${(h.avg1v1WinRate * 100).toFixed(1)}%`);
    }
  }
  if (underpowered.length > 0) {
    for (const h of underpowered) {
      lines.push(`- WARNING: ${h.name} (${h.id}) UNDERPOWERED - 1v1 win rate ${(h.avg1v1WinRate * 100).toFixed(1)}%`);
    }
  }
  if (weak.length > 0) {
    for (const h of weak) {
      lines.push(`- NOTICE: ${h.name} (${h.id}) slightly weak - 1v1 win rate ${(h.avg1v1WinRate * 100).toFixed(1)}%`);
    }
  }

  // Team winrate issues
  const act1NormalResults = teamResults.filter(r => r.actId === 'act1_forest' && r.difficulty === 'normal');
  const act2NormalResults = teamResults.filter(r => r.actId === 'act2_volcano' && r.difficulty === 'normal');
  const act3NormalResults = teamResults.filter(r => r.actId === 'act3_abyss' && r.difficulty === 'normal');

  const avgAct1WR = act1NormalResults.length > 0 ? act1NormalResults.reduce((s, r) => s + r.winRate, 0) / act1NormalResults.length : 0;
  const avgAct2WR = act2NormalResults.length > 0 ? act2NormalResults.reduce((s, r) => s + r.winRate, 0) / act2NormalResults.length : 0;
  const avgAct3WR = act3NormalResults.length > 0 ? act3NormalResults.reduce((s, r) => s + r.winRate, 0) / act3NormalResults.length : 0;

  lines.push('');
  lines.push(`### Act Win Rates (normal, averaged across teams)`);
  lines.push(`- Act 1: ${(avgAct1WR * 100).toFixed(1)}% (target: >85%)`);
  lines.push(`- Act 2: ${(avgAct2WR * 100).toFixed(1)}% (target: ~70%)`);
  lines.push(`- Act 3: ${(avgAct3WR * 100).toFixed(1)}% (target: ~55%)`);

  if (avgAct1WR < 0.85) lines.push(`  - WARNING: Act 1 win rate below target`);
  if (avgAct2WR < 0.60 || avgAct2WR > 0.80) lines.push(`  - WARNING: Act 2 win rate outside target range`);
  if (avgAct3WR < 0.45 || avgAct3WR > 0.65) lines.push(`  - WARNING: Act 3 win rate outside target range`);

  // Element
  if (elemResults.length >= 2) {
    const advWR = elemResults.find(r => r.scenario.includes('advantage'))?.winRate ?? 0;
    const sameWR = elemResults.find(r => r.scenario.includes('same'))?.winRate ?? 0;
    const advantage = advWR - sameWR;
    lines.push('');
    lines.push(`### Element Advantage Impact`);
    lines.push(`- Advantage winrate delta: ${(advantage * 100).toFixed(1)}% (target: 20-30%)`);
    if (advantage > 0.40) lines.push(`  - WARNING: Element advantage too strong (>${(advantage * 100).toFixed(0)}%)`);
    if (advantage < 0.15) lines.push(`  - WARNING: Element advantage too weak (<${(advantage * 100).toFixed(0)}%)`);
  }

  lines.push('');
  lines.push('## Adjustment Recommendations');
  lines.push('');

  // Generate concrete adjustment recommendations
  for (const h of overpowered) {
    lines.push(`1. **Nerf ${h.name} (${h.id})**: Reduce base attack/magicPower by ~10-15%, or increase cooldowns`);
  }
  for (const h of underpowered) {
    lines.push(`1. **Buff ${h.name} (${h.id})**: Increase base attack/magicPower by ~10-15%, or reduce cooldowns`);
  }

  if (avgAct1WR < 0.85) {
    lines.push(`1. **Act 1 too hard**: Reduce Act 1 enemy stats or lower difficultyMultiplier`);
  }
  if (avgAct2WR > 0.80) {
    lines.push(`1. **Act 2 too easy**: Increase Act 2 enemy stats or raise difficultyMultiplier`);
  }
  if (avgAct3WR > 0.65) {
    lines.push(`1. **Act 3 too easy**: Increase Act 3 enemy stats or raise difficultyMultiplier`);
  }

  return lines.join('\n');
}

// ============ Main entry ============

function main() {
  console.log('=== Balance Simulator ===\n');

  // 2A: Hero 1v1 Tournament
  console.log('[1/4] Running Hero 1v1 Tournament (12 heroes x 50 iterations)...');
  const { matrix, heroIds } = runHero1v1Tournament(50);
  console.log('  Done.');

  // 2B: Team vs Act
  console.log('[2/4] Running Team vs Act simulations...');
  const teamDefs: { name: string; ids: string[] }[] = [
    { name: 'classic', ids: ['warrior', 'archer', 'mage', 'priest', 'rogue'] },
    { name: 'heavy', ids: ['warrior', 'knight', 'berserker', 'priest', 'shadow_assassin'] },
    { name: 'magic', ids: ['mage', 'elementalist', 'necromancer', 'priest', 'druid'] },
    { name: 'assassin', ids: ['rogue', 'shadow_assassin', 'archer', 'frost_ranger', 'priest'] },
  ];

  const teamResults: TeamVsActResult[] = [];
  for (const td of teamDefs) {
    const validIds = td.ids.filter(id => heroMap.has(id));
    if (validIds.length >= 3) {
      const results = runTeamVsAct(validIds, td.name, 100);
      teamResults.push(...results);
      console.log(`  Team "${td.name}" (${validIds.length} heroes): ${results.length} scenarios`);
    }
  }
  console.log('  Done.');

  // 2C: Element Efficiency
  console.log('[3/4] Running Element Efficiency analysis...');
  const elemResults = runElementEfficiency(100);
  console.log('  Done.');

  // 2D: Economy Analysis
  console.log('[4/4] Running Economy Analysis...');
  const econResults = runEconomyAnalysis();
  console.log('  Done.');

  // Compute hero scores
  const heroScores = computeHeroScores(matrix, heroIds, teamResults);

  // Generate report
  console.log('\nGenerating report...');
  const report = generateReport(heroScores, matrix, heroIds, teamResults, elemResults, econResults);

  const reportPath = resolve(ROOT, 'tools', 'balance-report.md');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`Report written to: ${reportPath}`);

  // Print summary
  console.log('\n=== Quick Summary ===\n');
  console.log('Hero Rankings:');
  for (const h of heroScores) {
    console.log(`  ${h.id.padEnd(18)} 1v1: ${(h.avg1v1WinRate * 100).toFixed(1).padStart(5)}%  team: ${(h.teamContribution * 100).toFixed(1).padStart(5)}%  overall: ${(h.overallScore * 100).toFixed(1).padStart(5)}  [${h.status}]`);
  }

  console.log('\nAct Win Rates (normal, averaged):');
  for (const actId of ['act1_forest', 'act2_volcano', 'act3_abyss']) {
    const actResults = teamResults.filter(r => r.actId === actId && r.difficulty === 'normal');
    const avgWR = actResults.length > 0 ? actResults.reduce((s, r) => s + r.winRate, 0) / actResults.length : 0;
    console.log(`  ${actId}: ${(avgWR * 100).toFixed(1)}%`);
  }

  console.log('\nElement Efficiency:');
  for (const r of elemResults) {
    console.log(`  ${r.scenario}: WR=${(r.winRate * 100).toFixed(1)}% turns=${r.avgTurns.toFixed(1)}`);
  }

  console.log('\nEconomy:');
  for (const r of econResults) {
    console.log(`  ${r.actId}: cumulative gold=${r.totalGold} affordable items=${r.affordableItems}`);
  }

  return { heroScores, matrix, heroIds, teamResults, elemResults, econResults };
}

main();
