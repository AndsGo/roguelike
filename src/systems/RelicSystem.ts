import { RelicState, RelicEffect, UnitStats, GameEventType } from '../types';
import { EventBus } from './EventBus';
import { Unit } from '../entities/Unit';
import { SeededRNG } from '../utils/rng';
import relicsData from '../data/relics.json';

interface RelicDef {
  id: string;
  name: string;
  description: string;
  rarity: string;
  triggerEvent: GameEventType;
  effect: RelicEffect;
}

/** Map element-specific relics to their element */
const ELEMENT_RELIC_MAP: Record<string, string> = {
  fire_emblem: 'fire',
  ice_crystal_pendant: 'ice',
  lightning_rod: 'lightning',
  dark_grimoire: 'dark',
  holy_scripture: 'holy',
};

/** Effect types that register reactive EventBus listeners */
const REACTIVE_EFFECT_TYPES = new Set([
  'on_battle_start',
  'on_damage',
  'on_kill',
  'on_heal',
  'on_battle_end',
  'on_reaction',
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
  private listeners: Array<{ event: GameEventType; handler: (...args: any[]) => void }> = [];
  private rng: SeededRNG = new SeededRNG(Date.now());
  private phoenixUsed: boolean = false;
  private holyScriptureUsed: boolean = false;
  private shieldTimer: number = 0;

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
  static activateWithUnits(relics: RelicState[], heroes: Unit[], enemies: Unit[], rng?: SeededRNG): void {
    const inst = RelicSystem.getInstance();
    inst.unregisterListeners();
    inst.relics = [...relics];
    inst.heroes = heroes;
    inst.enemies = enemies;
    if (rng) inst.rng = rng;
    inst.registerListeners();
  }

  /** Cleanup after battle */
  static deactivate(): void {
    const inst = RelicSystem.getInstance();
    inst.unregisterListeners();
    inst.relics = [];
    inst.heroes = [];
    inst.enemies = [];
    inst.phoenixUsed = false;
    inst.holyScriptureUsed = false;
    inst.shieldTimer = 0;
  }

  /** Update enemy references for new wave (gauntlet) */
  static updateEnemies(enemies: Unit[]): void {
    const inst = RelicSystem.getInstance();
    inst.enemies = enemies;
  }

  /** Reset per-battle one-time flags (called between gauntlet waves) */
  static resetBattleFlags(): void {
    const inst = RelicSystem.getInstance();
    inst.phoenixUsed = false;
    inst.holyScriptureUsed = false;
  }

  /** Reset singleton — for testing */
  static reset(): void {
    if (RelicSystem.instance) {
      RelicSystem.instance.unregisterListeners();
      RelicSystem.instance.relics = [];
      RelicSystem.instance.heroes = [];
      RelicSystem.instance.enemies = [];
      RelicSystem.instance.phoenixUsed = false;
      RelicSystem.instance.holyScriptureUsed = false;
      RelicSystem.instance.shieldTimer = 0;
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

  /** Check if phoenix_ash should revive a dying hero. Called from Unit.die() */
  static shouldRevive(unit: Unit): boolean {
    const inst = RelicSystem.getInstance();
    if (!RelicSystem.hasRelic('phoenix_ash')) return false;
    if (inst.phoenixUsed) return false;
    if (!unit.isHero) return false;

    inst.phoenixUsed = true;
    const relic = inst.relics.find(r => r.id === 'phoenix_ash');
    if (relic) relic.triggerCount++;

    // Revive with 30% HP
    const reviveHp = Math.round(unit.currentStats.maxHp * 0.3);
    unit.currentHp = reviveHp;
    return true;
  }

  /** Check if holy_scripture should prevent death for a holy hero */
  static shouldApplyHolyShield(unit: Unit): boolean {
    const inst = RelicSystem.getInstance();
    if (!RelicSystem.hasRelic('holy_scripture')) return false;
    if (inst.holyScriptureUsed) return false;
    if (!unit.isHero) return false;
    if (unit.element !== 'holy') return false;

    inst.holyScriptureUsed = true;
    const relic = inst.relics.find(r => r.id === 'holy_scripture');
    if (relic) relic.triggerCount++;

    unit.currentHp = 1;
    unit.addShield(Math.round(unit.currentStats.maxHp * 0.15), 8);
    return true;
  }

  /** Called from BattleSystem.update() every frame */
  static update(delta: number): void {
    const inst = RelicSystem.getInstance();

    // shield_charm: every 8 seconds, heal all heroes by 20
    if (RelicSystem.hasRelic('shield_charm')) {
      inst.shieldTimer += delta;
      if (inst.shieldTimer >= 8000) {
        inst.shieldTimer -= 8000;
        for (const hero of inst.heroes) {
          if (hero.isAlive) {
            hero.heal(20);
          }
        }
        const relic = inst.relics.find(r => r.id === 'shield_charm');
        if (relic) relic.triggerCount++;
      }
    }

    // Decay shields on all heroes
    for (const hero of inst.heroes) {
      if (hero.isAlive) {
        hero.decayShield(delta);
      }
    }
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

  /** Check if overflow_shield relic is active */
  static hasOverflowShield(): boolean {
    return RelicSystem.hasRelic('overflow_shield');
  }

  /** Check if chain_reaction relic is active */
  static hasChainReactionSplash(): boolean {
    return RelicSystem.hasRelic('chain_reaction');
  }

  /** Get alive enemies excluding a specific unit (for splash targeting) */
  static getSplashTargets(excludeId: string, maxCount: number): Unit[] {
    const inst = RelicSystem.getInstance();
    return inst.enemies
      .filter(e => e.isAlive && e.unitId !== excludeId)
      .slice(0, maxCount);
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
      if (relic.id === 'chain_reaction') total += 0.5;
    }
    return total;
  }

  /** mono_element_crown: +40% damage when all heroes share the same element */
  static getConditionalDamageBonus(heroElements: (string | undefined)[]): number {
    if (!RelicSystem.hasRelic('mono_element_crown')) return 0;
    const elements = heroElements.filter(Boolean);
    if (elements.length === 0) return 0;
    const allSame = elements.every(e => e === elements[0]);
    return allSame ? 0.4 : 0;
  }

  /** diversity_badge: +8% attackSpeed per unique class */
  static getAttackSpeedBonus(uniqueClassCount: number): number {
    if (!RelicSystem.hasRelic('diversity_badge')) return 0;
    return uniqueClassCount * 0.08;
  }

  /** Get element-specific damage bonus for a given element */
  static getElementDamageBonus(element: string): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      // Element-specific relics
      const relicElement = ELEMENT_RELIC_MAP[relic.id];
      if (relicElement === element) {
        const def = inst.relicDefs.get(relic.id);
        total += def?.effect.value ?? 0;
      }
      // crown_of_elements: all elements +15%
      if (relic.id === 'crown_of_elements') {
        const def = inst.relicDefs.get(relic.id);
        total += def?.effect.value ?? 0;
      }
    }
    return total;
  }

  /** berserker_mask: +25% attack when HP ratio < 50% */
  static getLowHpAttackBonus(hpRatio: number): number {
    if (!RelicSystem.hasRelic('berserker_mask')) return 0;
    return hpRatio < 0.5 ? 0.25 : 0;
  }

  /** berserker_oath: +20% attack, +10% crit when no healer present */
  static getBerserkerBonus(hasHealer: boolean): { attack: number; critChance: number } {
    if (!RelicSystem.hasRelic('berserker_oath') || hasHealer) {
      return { attack: 0, critChance: 0 };
    }
    return { attack: 0.2, critChance: 0.1 };
  }

  /** Combined conditional stat modifiers based on team composition */
  static getConditionalStatMods(): Partial<Record<keyof UnitStats, number>> {
    const inst = RelicSystem.getInstance();
    const mods: Partial<Record<keyof UnitStats, number>> = {};
    if (inst.heroes.length === 0) return mods;

    // diversity_badge: +8% attackSpeed per unique class
    const uniqueClasses = new Set(inst.heroes.map(h => h.classType)).size;
    const speedBonus = RelicSystem.getAttackSpeedBonus(uniqueClasses);
    if (speedBonus > 0) {
      mods.attackSpeed = (mods.attackSpeed ?? 0) + speedBonus;
    }

    // berserker_oath: +10% critChance when no healer (the attack +20% is multiplicative, applied in getDamageBonus)
    const hasHealer = inst.heroes.some(h => h.role === 'healer');
    const berserk = RelicSystem.getBerserkerBonus(hasHealer);
    if (berserk.critChance > 0) {
      mods.critChance = (mods.critChance ?? 0) + berserk.critChance;
    }

    return mods;
  }

  /** Get total damage multiplier bonus (glass_cannon +60%, heart_of_dragon +20%) */
  static getDamageBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      if (relic.id === 'glass_cannon') total += 0.6;
      if (relic.id === 'heart_of_dragon') total += 0.2;
    }
    // mono_element_crown: +40% if all heroes same element
    if (inst.heroes.length > 0) {
      const heroElements = inst.heroes.map(h => h.element);
      total += RelicSystem.getConditionalDamageBonus(heroElements);
    }
    // berserker_oath: +20% attack if no healer
    if (inst.heroes.length > 0) {
      const hasHealer = inst.heroes.some(h => h.role === 'healer');
      if (!hasHealer && RelicSystem.hasRelic('berserker_oath')) {
        total += 0.2;
      }
    }
    return total;
  }

  /** Get total gold bonus fraction (lucky_coin = +20%) */
  static getGoldBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      if (relic.id === 'lucky_coin') total += 0.2;
    }
    return total;
  }

  /** Get total exp bonus fraction (training_manual +15%, tactics_manual +20%) */
  static getExpBonus(): number {
    const inst = RelicSystem.getInstance();
    let total = 0;
    for (const relic of inst.relics) {
      if (relic.id === 'training_manual') total += 0.15;
      if (relic.id === 'tactics_manual') total += 0.2;
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

      eb.on(def.triggerEvent, handler);
      this.listeners.push({ event: def.triggerEvent, handler });
    }
  }

  /** Remove all registered EventBus listeners */
  private unregisterListeners(): void {
    const eb = EventBus.getInstance();
    for (const { event, handler } of this.listeners) {
      eb.off(event, handler);
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
      case 'on_reaction':
        return (data: any) => this.handleOnReaction(relic, def, data);
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
    if (!this.rng.chance(chance)) return;

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
            const randomEnemy = this.rng.pick(otherEnemies);
            randomEnemy.takeDamage(val);
          }
        }
        break;

      case 'dark_grimoire':
        // Dark-element hero lifesteal: heal 20% of damage dealt
        if (source && source.isHero && source.isAlive && source.element === 'dark') {
          const healAmount = Math.round(damage * 0.2);
          if (healAmount > 0) source.heal(healAmount);
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

      case 'kill_momentum':
        // +3% attack per kill (cumulative, all heroes benefit)
        for (const hero of this.heroes) {
          if (hero.isAlive) {
            hero.currentStats.attack = Math.round(hero.currentStats.attack * (1 + val));
          }
        }
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

  /** Handle element:reaction relics */
  private handleOnReaction(relic: RelicState, def: RelicDef, data: {
    reactionType: string; attackerId: string; targetId: string; damage: number;
  }): void {
    // Check reaction type filter
    const requiredReaction = def.effect.reactionType;
    if (requiredReaction && requiredReaction !== 'any' && data.reactionType !== requiredReaction) return;

    const attacker = this.findUnit(data.attackerId);
    const target = this.findUnit(data.targetId);
    if (!attacker?.isAlive || !target?.isAlive) return;

    switch (def.id) {
      case 'melt_heart': {
        // Heal attacker for value% of reaction damage
        if (data.damage > 0) {
          const heal = Math.round(data.damage * (def.effect.value ?? 0.2));
          attacker.heal(heal);
        }
        break;
      }
      case 'overload_engine': {
        // chance% to stun target for 1s
        if (this.rng.chance(def.effect.chance ?? 0.25)) {
          target.statusEffects.push({
            id: `relic_stun_${Date.now()}`,
            type: 'stun',
            name: 'stun',
            duration: 1,
            value: 0,
          });
        }
        break;
      }
      case 'superconduct_shield': {
        // Grant attacker temp HP
        const shieldVal = def.effect.value ?? 10;
        attacker.currentStats.maxHp += shieldVal;
        attacker.currentHp = Math.min(attacker.currentHp + shieldVal, attacker.currentStats.maxHp);
        break;
      }
      case 'annihilation_echo': {
        // Repeat value% of reaction damage after 1s
        if (data.damage > 0 && attacker.scene) {
          const echoDamage = Math.round(data.damage * (def.effect.value ?? 0.4));
          attacker.scene.time.delayedCall(1000, () => {
            if (target.isAlive) target.takeDamage(echoDamage);
          });
        }
        break;
      }
      case 'elemental_resonance': {
        // Apply element resist debuff
        target.statusEffects.push({
          id: `relic_elres_down_${Date.now()}`,
          type: 'debuff',
          name: 'element_resist_down',
          duration: def.effect.duration ?? 5,
          value: -(def.effect.value ?? 15),
          stat: 'magicResist',
        });
        break;
      }
    }

    relic.triggerCount++;
    // Emit relic trigger event
    EventBus.getInstance().emit('relic:trigger', { relicId: def.id, context: 'on_reaction' });
  }
}
