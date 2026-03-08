import { RelicState, RelicEffect, UnitStats } from '../types';
import { EventBus } from './EventBus';
import relicsData from '../data/relics.json';

interface RelicDef {
  id: string;
  name: string;
  description: string;
  rarity: string;
  triggerEvent: string;
  effect: RelicEffect;
}

/** All numeric keys on UnitStats */
const STAT_KEYS: (keyof UnitStats)[] = [
  'maxHp', 'hp', 'attack', 'defense', 'magicPower', 'magicResist',
  'speed', 'attackSpeed', 'attackRange', 'critChance', 'critDamage',
];

/**
 * RelicSystem — singleton that evaluates relic effects during battle.
 * Task 1 implements stat_boost relics only.
 */
export class RelicSystem {
  private static instance: RelicSystem;

  private relics: RelicState[] = [];
  private relicDefs: Map<string, RelicDef> = new Map();

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
    inst.relics = [...relics];
    inst.registerListeners();
  }

  /** Cleanup after battle */
  static deactivate(): void {
    const inst = RelicSystem.getInstance();
    inst.unregisterListeners();
    inst.relics = [];
  }

  /** Reset singleton — for testing */
  static reset(): void {
    if (RelicSystem.instance) {
      RelicSystem.instance.unregisterListeners();
      RelicSystem.instance.relics = [];
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

  /** Stub for Task 2 — register EventBus listeners for reactive relics */
  private registerListeners(): void {
    // Will be implemented in Task 2
  }

  /** Remove all EventBus listeners */
  private unregisterListeners(): void {
    // Will be implemented in Task 2
  }
}
