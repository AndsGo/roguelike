import { RelicState, RelicEffect, UnitStats } from '../types';
import { EventBus } from './EventBus';
import { Unit } from '../entities/Unit';
import relicsData from '../data/relics.json';

interface RelicDef {
  id: string;
  name: string;
  description: string;
  rarity: string;
  triggerEvent: string;
  effect: RelicEffect;
}

/** Effect types that register reactive EventBus listeners */
const REACTIVE_EFFECT_TYPES = new Set([
  'on_battle_start',
  'on_damage',
  'on_kill',
  'on_heal',
  'on_battle_end',
]);

/** All numeric keys on UnitStats */
const STAT_KEYS: (keyof UnitStats)[] = [
  'maxHp', 'hp', 'attack', 'defense', 'magicPower', 'magicResist',
  'speed', 'attackSpeed', 'attackRange', 'critChance', 'critDamage',
];

/**
 * RelicSystem — singleton that evaluates relic effects during battle.
 * Handles stat_boost relics (getStatModifiers) and reactive relics (EventBus listeners).
 */
export class RelicSystem {
  private static instance: RelicSystem;

  private relics: RelicState[] = [];
  private relicDefs: Map<string, RelicDef> = new Map();
  private heroes: Unit[] = [];
  private enemies: Unit[] = [];
  private listeners: Array<{ event: string; handler: (...args: any[]) => void }> = [];

  private constructor() {
    // Load relic definitions from data
    for (const r of relicsData as RelicDef[]) {
      this.relicDefs.set(r.id, r);
    }
  }

  private static getInstance(): RelicSystem {
    if (!RelicSystem.instance) {
      RelicSystem.instance = new RelicSystem();
    }
    return RelicSystem.instance;
  }

  /** Activate relics for the current battle */
  static activate(relics: RelicState[]): void {
    const inst = RelicSystem.getInstance();
    inst.unregisterListeners();
    inst.relics = [...relics];
    inst.registerListeners();
  }

  /** Activate relics with unit references for reactive effects */
  static activateWithUnits(relics: RelicState[], heroes: Unit[], enemies: Unit[]): void {
    const inst = RelicSystem.getInstance();
    inst.unregisterListeners();
    inst.relics = [...relics];
    inst.heroes = heroes;
    inst.enemies = enemies;
    inst.registerListeners();
  }

  /** Cleanup after battle */
  static deactivate(): void {
    const inst = RelicSystem.getInstance();
    inst.unregisterListeners();
    inst.relics = [];
    inst.heroes = [];
    inst.enemies = [];
  }

  /** Reset singleton — for testing */
  static reset(): void {
    if (RelicSystem.instance) {
      RelicSystem.instance.unregisterListeners();
      RelicSystem.instance.relics = [];
      RelicSystem.instance.heroes = [];
      RelicSystem.instance.enemies = [];
    }
  }

  /**
   * Returns flat stat modifiers from stat_boost relics.
   * If baseStats is provided, infinity_stone (percentage-based) computes actual values.
   * Without baseStats, infinity_stone contributes its raw percentage value to each stat.
   */
  static getStatModifiers(baseStats?: UnitStats): Partial<Record<keyof UnitStats, number>> {
    const inst = RelicSystem.getInstance();
    const mods: Partial<Record<keyof UnitStats, number>> = {};

    for (const relicState of inst.relics) {
      const def = inst.relicDefs.get(relicState.id);
      if (!def || def.effect.type !== 'stat_boost') continue;

      const { stat, value } = def.effect;
      if (value === undefined) continue;

      if (stat) {
        // Flat stat boost (e.g. quick_boots: speed +10)
        mods[stat] = (mods[stat] ?? 0) + value;
      } else {
        // No stat field = percentage boost to ALL stats (e.g. infinity_stone)
        for (const key of STAT_KEYS) {
          if (baseStats) {
            mods[key] = (mods[key] ?? 0) + baseStats[key] * value;
          } else {
            mods[key] = (mods[key] ?? 0) + value;
          }
        }
      }
    }

    return mods;
  }

  /** Check if a relic is currently active */
  static hasRelic(relicId: string): boolean {
    const inst = RelicSystem.getInstance();
    return inst.relics.some(r => r.id === relicId);
  }

  /** Get relic definition by id */
  static getRelicDef(relicId: string): RelicDef | undefined {
    const inst = RelicSystem.getInstance();
    return inst.relicDefs.get(relicId);
  }

  /** Get total defense piercing fraction (0-1). armor_piercer = 0.3 (not yet in data — Task 5) */
  static getDefensePiercing(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      if (relic.id === 'armor_piercer') total += 0.3;
    }
    return total;
  }

  /** Get total heal bonus multiplier (e.g. 0.2 = +20%) */
  static getHealBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      const def = inst.relicDefs.get(relic.id);
      if (!def) continue;
      if (def.id === 'healers_blessing' && def.effect.value) {
        total += def.effect.value;
      }
    }
    return total;
  }

  /** Get total element reaction damage bonus */
  static getReactionDamageBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      const def = inst.relicDefs.get(relic.id);
      if (!def) continue;
      if ((def.id === 'elemental_catalyst' || def.id === 'elemental_fusion_stone') && def.effect.value) {
        total += def.effect.value;
      }
    }
    return total;
  }

  /** Get total damage multiplier bonus (glass_cannon +60%, heart_of_dragon +20%) */
  static getDamageBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      if (relic.id === 'glass_cannon') total += 0.6;
      if (relic.id === 'heart_of_dragon') total += 0.2;
    }
    return total;
  }

  /** Get damage taken bonus (glass_cannon = +30% damage taken) */
  static getDamageTakenBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      if (relic.id === 'glass_cannon') total += 0.3;
    }
    return total;
  }

  /** Test helper: get reactive handlers registered for a given event */
  static getReactiveHandlers(event: string): Array<{ event: string; handler: any }> {
    return RelicSystem.getInstance().listeners.filter(l => l.event === event);
  }

  /** Find a unit by id across heroes and enemies */
  private findUnit(unitId: string): Unit | undefined {
    return [...this.heroes, ...this.enemies].find(u => u.unitId === unitId);
  }

  /** Register EventBus listeners for reactive (non-stat_boost, non-passive) relics */
  private registerListeners(): void {
    const eb = EventBus.getInstance();

    for (const relicState of this.relics) {
      const def = this.relicDefs.get(relicState.id);
      if (!def) continue;

      // Skip stat_boost and passive relics — they don't use EventBus listeners
      if (!REACTIVE_EFFECT_TYPES.has(def.effect.type)) continue;

      const handler = this.createHandler(relicState, def);
      if (!handler) continue;

      eb.on(def.triggerEvent as any, handler);
      this.listeners.push({ event: def.triggerEvent, handler });
    }
  }

  /** Remove all registered EventBus listeners */
  private unregisterListeners(): void {
    const eb = EventBus.getInstance();
    for (const { event, handler } of this.listeners) {
      eb.off(event as any, handler);
    }
    this.listeners = [];
  }

  /** Create a handler function for a reactive relic based on its effect type */
  private createHandler(relic: RelicState, def: RelicDef): ((data: any) => void) | null {
    switch (def.effect.type) {
      case 'on_battle_start':
        return (data: any) => this.handleBattleStart(relic, def, data);
      case 'on_damage':
        return (data: any) => this.handleOnDamage(relic, def, data);
      case 'on_kill':
        return (data: any) => this.handleOnKill(relic, def, data);
      case 'on_heal':
        return (data: any) => this.handleOnHeal(relic, def, data);
      case 'on_battle_end':
        return (data: any) => this.handleBattleEnd(relic, def, data);
      default:
        return null;
    }
  }

  /** Handle battle:start relics */
  private handleBattleStart(relic: RelicState, def: RelicDef, _data: any): void {
    const val = def.effect.value ?? 0;

    switch (def.id) {
      case 'iron_heart':
        // Add val HP to each hero (increase both maxHp and currentHp)
        for (const hero of this.heroes) {
          if (!hero.isAlive) continue;
          hero.currentStats.maxHp += val;
          hero.currentHp = Math.min(hero.currentHp + val, hero.currentStats.maxHp);
        }
        break;

      case 'herb_pouch':
      case 'life_spring':
        // Heal each hero by val * maxHp
        for (const hero of this.heroes) {
          if (!hero.isAlive) continue;
          const healAmount = val * hero.currentStats.maxHp;
          hero.heal(healAmount);
        }
        break;

      case 'time_crystal':
        // Reduce each hero's skill cooldowns by val fraction
        for (const hero of this.heroes) {
          if (!hero.isAlive) continue;
          for (const [skillId, cd] of hero.skillCooldowns) {
            hero.skillCooldowns.set(skillId, cd * (1 - val));
          }
        }
        break;
    }

    relic.triggerCount++;
  }

  /** Handle unit:damage relics */
  private handleOnDamage(relic: RelicState, def: RelicDef, data: any): void {
    const val = def.effect.value ?? 0;
    const chance = def.effect.chance ?? 1;

    // Roll chance check
    if (Math.random() > chance) return;

    const source = this.findUnit(data.sourceId);
    const target = this.findUnit(data.targetId);
    const damage = data.amount ?? 0;

    switch (def.id) {
      case 'vampiric_fang':
        // If source is hero, heal source for val * damage
        if (source && source.isHero && source.isAlive) {
          const healAmount = val * damage;
          source.heal(healAmount);
        }
        break;

      case 'soul_mirror':
        // If target is hero, reflect val * damage back to source
        if (target && target.isHero && source && source.isAlive) {
          const reflectAmount = val * damage;
          source.takeDamage(reflectAmount);
        }
        break;

      case 'thunder_emblem':
        // If source is hero, deal val damage to a random other enemy
        if (source && source.isHero) {
          const otherEnemies = this.enemies.filter(
            e => e.isAlive && e.unitId !== data.targetId
          );
          if (otherEnemies.length > 0) {
            const randomEnemy = otherEnemies[Math.floor(Math.random() * otherEnemies.length)];
            randomEnemy.takeDamage(val);
          }
        }
        break;
    }

    relic.triggerCount++;
  }

  /** Handle unit:kill relics */
  private handleOnKill(relic: RelicState, def: RelicDef, data: any): void {
    const val = def.effect.value ?? 0;
    const killer = this.findUnit(data.killerId);
    if (!killer || !killer.isAlive) return;

    switch (def.id) {
      case 'blood_vial':
        // Heal killer by val * killer's maxHp
        killer.heal(val * killer.currentStats.maxHp);
        break;

      case 'soul_collector':
        // Add val to killer's currentStats.attack
        killer.currentStats.attack += val;
        break;
    }

    relic.triggerCount++;
  }

  /** Handle unit:heal relics — triggerCount increment (actual behavior in later tasks) */
  private handleOnHeal(relic: RelicState, _def: RelicDef, _data: any): void {
    relic.triggerCount++;
  }

  /** Handle battle:end relics — triggerCount increment (actual behavior in later tasks) */
  private handleBattleEnd(relic: RelicState, _def: RelicDef, _data: any): void {
    relic.triggerCount++;
  }
}
