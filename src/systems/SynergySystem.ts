import {
  HeroState, HeroData, UnitStats, ActiveSynergy, SynergyEffect, SkillData,
  ElementType,
} from '../types';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import skillsData from '../data/skills.json';

/**
 * Cached results from synergy calculation for a battle.
 */
export interface SynergyBonusCache {
  /** Per-hero stat bonuses: heroId -> Partial<UnitStats> */
  heroBonuses: Map<string, Partial<UnitStats>>;
  /** Global damage bonuses: element? -> multiplier additive */
  damageBonuses: Map<string | 'all', number>;
  /** Resistance bonuses applied to all heroes */
  globalResistance: Partial<UnitStats>;
  /** Skills unlocked by synergies */
  unlockedSkills: SkillData[];
  /** Active synergies for display */
  activeSynergies: ActiveSynergy[];
}

/**
 * Calculates and caches synergy bonuses for a hero team composition.
 * Should be run once at battle start and results cached for the battle duration.
 */
export class SynergySystem {
  private cache: SynergyBonusCache | null = null;

  /**
   * Calculate all active synergies based on the hero roster.
   * Returns the full cache of bonuses that can be applied to units.
   */
  calculateActiveSynergies(
    heroes: HeroState[],
    heroDataMap: Map<string, HeroData>,
  ): SynergyBonusCache {
    // Count occurrences of each race/class/element
    const raceCounts = new Map<string, string[]>();   // race -> heroIds
    const classCounts = new Map<string, string[]>();   // class -> heroIds
    const elementCounts = new Map<string, string[]>(); // element -> heroIds

    for (const heroState of heroes) {
      const data = heroDataMap.get(heroState.id);
      if (!data) continue;

      if (data.race) {
        const list = raceCounts.get(data.race) ?? [];
        list.push(heroState.id);
        raceCounts.set(data.race, list);
      }
      if (data.class) {
        const list = classCounts.get(data.class) ?? [];
        list.push(heroState.id);
        classCounts.set(data.class, list);
      }
      if (data.element) {
        const list = elementCounts.get(data.element) ?? [];
        list.push(heroState.id);
        elementCounts.set(data.element, list);
      }
    }

    const heroBonuses = new Map<string, Partial<UnitStats>>();
    const damageBonuses = new Map<string | 'all', number>();
    const globalResistance: Partial<UnitStats> = {};
    const unlockedSkills: SkillData[] = [];
    const activeSynergies: ActiveSynergy[] = [];

    // Initialize hero bonus maps
    for (const heroState of heroes) {
      heroBonuses.set(heroState.id, {});
    }

    for (const synergy of SYNERGY_DEFINITIONS) {
      let memberIds: string[] = [];
      let count = 0;

      if (synergy.type === 'race') {
        memberIds = raceCounts.get(synergy.key) ?? [];
        count = memberIds.length;
      } else if (synergy.type === 'class') {
        memberIds = classCounts.get(synergy.key) ?? [];
        count = memberIds.length;
      } else if (synergy.type === 'element') {
        memberIds = elementCounts.get(synergy.key) ?? [];
        count = memberIds.length;
      }

      // Find highest reached threshold
      let activeThreshold = 0;
      const activeEffects: SynergyEffect[] = [];

      for (const threshold of synergy.thresholds) {
        if (count >= threshold.count) {
          activeThreshold = threshold.count;
          activeEffects.push(...threshold.effects);
        }
      }

      if (activeThreshold === 0) continue;

      activeSynergies.push({
        synergyId: synergy.id,
        count,
        activeThreshold,
      });

      // Apply effects
      for (const effect of activeEffects) {
        switch (effect.type) {
          case 'stat_boost': {
            if (!effect.stat || effect.value === undefined) break;
            // Apply stat boost to all members of this synergy
            for (const heroId of memberIds) {
              const bonus = heroBonuses.get(heroId) ?? {};
              const current = (bonus[effect.stat] as number) ?? 0;
              (bonus[effect.stat] as number) = current + effect.value;
              heroBonuses.set(heroId, bonus);
            }
            break;
          }
          case 'damage_bonus': {
            const key = effect.element ?? 'all';
            const current = damageBonuses.get(key) ?? 0;
            damageBonuses.set(key, current + (effect.value ?? 0));
            break;
          }
          case 'resistance': {
            // Apply resistance to all heroes (global)
            if (effect.stat && effect.value !== undefined) {
              const current = (globalResistance[effect.stat] as number) ?? 0;
              (globalResistance[effect.stat] as number) = current + effect.value;
            } else if (effect.value !== undefined) {
              // Default to magicResist
              const current = (globalResistance.magicResist as number) ?? 0;
              globalResistance.magicResist = current + effect.value;
            }
            break;
          }
          case 'skill_unlock': {
            if (effect.skillId) {
              const skill = (skillsData as SkillData[]).find(s => s.id === effect.skillId);
              if (skill) {
                unlockedSkills.push(skill);
              }
            }
            break;
          }
        }
      }
    }

    // Apply global resistance to all heroes
    if (Object.keys(globalResistance).length > 0) {
      for (const heroState of heroes) {
        const bonus = heroBonuses.get(heroState.id) ?? {};
        for (const [key, value] of Object.entries(globalResistance)) {
          const current = (bonus[key as keyof UnitStats] as number) ?? 0;
          (bonus[key as keyof UnitStats] as number) = current + (value as number);
        }
        heroBonuses.set(heroState.id, bonus);
      }
    }

    this.cache = {
      heroBonuses,
      damageBonuses,
      globalResistance,
      unlockedSkills,
      activeSynergies,
    };

    return this.cache;
  }

  /**
   * Get the stat bonuses for a specific hero from active synergies.
   * Must call calculateActiveSynergies first.
   */
  getSynergyBonuses(heroId: string): Partial<UnitStats> {
    if (!this.cache) return {};
    return this.cache.heroBonuses.get(heroId) ?? {};
  }

  /**
   * Get all damage bonuses from active synergies.
   * Returns a map of element (or 'all') to additive damage multiplier.
   */
  getDamageBonuses(): Map<string | 'all', number> {
    if (!this.cache) return new Map();
    return this.cache.damageBonuses;
  }

  /**
   * Get the synergy-based damage multiplier for a specific element.
   * Includes both element-specific and 'all' bonuses.
   */
  getSynergyDamageMultiplier(element?: ElementType): number {
    if (!this.cache) return 1.0;
    let bonus = this.cache.damageBonuses.get('all') ?? 0;
    if (element) {
      bonus += this.cache.damageBonuses.get(element) ?? 0;
    }
    return 1.0 + bonus;
  }

  /**
   * Get skills unlocked by active synergies.
   */
  getUnlockedSkills(): SkillData[] {
    if (!this.cache) return [];
    return this.cache.unlockedSkills;
  }

  /**
   * Get the active synergies list (for UI display).
   */
  getActiveSynergies(): ActiveSynergy[] {
    if (!this.cache) return [];
    return this.cache.activeSynergies;
  }

  /**
   * Reset the cache (e.g. when roster changes).
   */
  reset(): void {
    this.cache = null;
  }
}
