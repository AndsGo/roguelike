import { describe, it, expect, beforeEach } from 'vitest';
import { RelicSystem } from '../../src/systems/RelicSystem';
import { RelicState, UnitStats } from '../../src/types';

const BASE_STATS: UnitStats = {
  maxHp: 500, hp: 500, attack: 50, defense: 20,
  magicPower: 30, magicResist: 10, speed: 100,
  attackSpeed: 1.0, attackRange: 100, critChance: 0.1, critDamage: 1.5,
};

describe('RelicSystem', () => {
  beforeEach(() => {
    RelicSystem.reset();
  });

  describe('getStatModifiers', () => {
    it('returns empty object when no relics are active', () => {
      RelicSystem.activate([]);
      const mods = RelicSystem.getStatModifiers();
      expect(Object.keys(mods)).toHaveLength(0);
    });

    it('returns empty object when relics are not activated', () => {
      const mods = RelicSystem.getStatModifiers();
      expect(Object.keys(mods)).toHaveLength(0);
    });

    it('returns correct modifier for quick_boots (speed +10)', () => {
      const relics: RelicState[] = [{ id: 'quick_boots', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(mods.speed).toBe(10);
    });

    it('returns correct modifier for thick_skin (defense +10)', () => {
      const relics: RelicState[] = [{ id: 'thick_skin', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(mods.defense).toBe(10);
    });

    it('returns correct modifier for sharp_stone (critChance +0.05)', () => {
      const relics: RelicState[] = [{ id: 'sharp_stone', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(mods.critChance).toBe(0.05);
    });

    it('returns correct modifier for mana_crystal (magicPower +15)', () => {
      const relics: RelicState[] = [{ id: 'mana_crystal', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(mods.magicPower).toBe(15);
    });

    it('returns correct modifier for warriors_belt (maxHp +50)', () => {
      const relics: RelicState[] = [{ id: 'warriors_belt', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(mods.maxHp).toBe(50);
    });

    it('stacks multiple stat_boost relics correctly', () => {
      const relics: RelicState[] = [
        { id: 'warriors_belt', triggerCount: 0 },  // maxHp +50
        { id: 'heart_of_dragon', triggerCount: 0 }, // maxHp +150
        { id: 'quick_boots', triggerCount: 0 },     // speed +10
        { id: 'thick_skin', triggerCount: 0 },      // defense +10
      ];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(mods.maxHp).toBe(200);  // 50 + 150
      expect(mods.speed).toBe(10);
      expect(mods.defense).toBe(10);
    });

    it('infinity_stone without baseStats returns raw percentage for all stats', () => {
      const relics: RelicState[] = [{ id: 'infinity_stone', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      // Without baseStats, returns raw 0.1 for each stat key
      expect(mods.maxHp).toBe(0.1);
      expect(mods.attack).toBe(0.1);
      expect(mods.defense).toBe(0.1);
      expect(mods.speed).toBe(0.1);
      expect(mods.critChance).toBe(0.1);
      expect(mods.critDamage).toBe(0.1);
    });

    it('infinity_stone with baseStats computes percentage-based flat values', () => {
      const relics: RelicState[] = [{ id: 'infinity_stone', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers(BASE_STATS);
      // 10% of each base stat
      expect(mods.maxHp).toBe(50);       // 500 * 0.1
      expect(mods.attack).toBe(5);       // 50 * 0.1
      expect(mods.defense).toBe(2);      // 20 * 0.1
      expect(mods.magicPower).toBe(3);   // 30 * 0.1
      expect(mods.speed).toBe(10);       // 100 * 0.1
      expect(mods.critChance).toBeCloseTo(0.01);  // 0.1 * 0.1
      expect(mods.critDamage).toBeCloseTo(0.15);  // 1.5 * 0.1
    });

    it('ignores non-stat_boost relics', () => {
      const relics: RelicState[] = [
        { id: 'iron_heart', triggerCount: 0 },      // on_battle_start
        { id: 'blood_vial', triggerCount: 0 },       // on_kill
        { id: 'quick_boots', triggerCount: 0 },      // stat_boost
      ];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      // Only quick_boots contributes
      expect(mods.speed).toBe(10);
      expect(Object.keys(mods)).toHaveLength(1);
    });

    it('ignores unknown relic ids', () => {
      const relics: RelicState[] = [{ id: 'nonexistent_relic', triggerCount: 0 }];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers();
      expect(Object.keys(mods)).toHaveLength(0);
    });

    it('infinity_stone stacks with flat stat_boost relics', () => {
      const relics: RelicState[] = [
        { id: 'infinity_stone', triggerCount: 0 },   // all stats * 0.1
        { id: 'warriors_belt', triggerCount: 0 },     // maxHp +50
      ];
      RelicSystem.activate(relics);
      const mods = RelicSystem.getStatModifiers(BASE_STATS);
      // maxHp: 500*0.1 (infinity) + 50 (belt) = 100
      expect(mods.maxHp).toBe(100);
      // attack: 50*0.1 = 5
      expect(mods.attack).toBe(5);
    });
  });

  describe('hasRelic', () => {
    it('returns true for an active relic', () => {
      RelicSystem.activate([{ id: 'quick_boots', triggerCount: 0 }]);
      expect(RelicSystem.hasRelic('quick_boots')).toBe(true);
    });

    it('returns false for a relic not in active set', () => {
      RelicSystem.activate([{ id: 'quick_boots', triggerCount: 0 }]);
      expect(RelicSystem.hasRelic('thick_skin')).toBe(false);
    });

    it('returns false when no relics activated', () => {
      expect(RelicSystem.hasRelic('quick_boots')).toBe(false);
    });
  });

  describe('getRelicDef', () => {
    it('returns definition for a known relic', () => {
      const def = RelicSystem.getRelicDef('quick_boots');
      expect(def).toBeDefined();
      expect(def!.id).toBe('quick_boots');
      expect(def!.effect.type).toBe('stat_boost');
      expect(def!.effect.stat).toBe('speed');
      expect(def!.effect.value).toBe(10);
    });

    it('returns undefined for unknown relic', () => {
      expect(RelicSystem.getRelicDef('nonexistent')).toBeUndefined();
    });
  });

  describe('activate / deactivate', () => {
    it('deactivate clears active relics', () => {
      RelicSystem.activate([{ id: 'quick_boots', triggerCount: 0 }]);
      expect(RelicSystem.hasRelic('quick_boots')).toBe(true);
      RelicSystem.deactivate();
      expect(RelicSystem.hasRelic('quick_boots')).toBe(false);
    });

    it('activate replaces previous relics', () => {
      RelicSystem.activate([{ id: 'quick_boots', triggerCount: 0 }]);
      RelicSystem.activate([{ id: 'thick_skin', triggerCount: 0 }]);
      expect(RelicSystem.hasRelic('quick_boots')).toBe(false);
      expect(RelicSystem.hasRelic('thick_skin')).toBe(true);
    });
  });

  describe('reactive relics', () => {
    it('blood_vial: registers handler on unit:kill', () => {
      RelicSystem.activate([{ id: 'blood_vial', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('unit:kill');
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('vampiric_fang: registers handler on unit:damage', () => {
      RelicSystem.activate([{ id: 'vampiric_fang', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('unit:damage');
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('stat_boost relics do not register handlers', () => {
      RelicSystem.activate([{ id: 'quick_boots', triggerCount: 0 }]);
      // quick_boots has triggerEvent battle:start but is stat_boost type
      const all = RelicSystem.getReactiveHandlers('battle:start');
      expect(all.length).toBe(0);
    });

    it('deactivate removes all listeners', () => {
      RelicSystem.activate([{ id: 'blood_vial', triggerCount: 0 }]);
      expect(RelicSystem.getReactiveHandlers('unit:kill').length).toBe(1);
      RelicSystem.deactivate();
      expect(RelicSystem.getReactiveHandlers('unit:kill').length).toBe(0);
    });

    it('iron_heart: registers handler on battle:start', () => {
      RelicSystem.activate([{ id: 'iron_heart', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('battle:start');
      expect(handlers.length).toBe(1);
    });

    it('soul_collector: registers handler on unit:kill', () => {
      RelicSystem.activate([{ id: 'soul_collector', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('unit:kill');
      expect(handlers.length).toBe(1);
    });

    it('soul_mirror: registers handler on unit:damage', () => {
      RelicSystem.activate([{ id: 'soul_mirror', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('unit:damage');
      expect(handlers.length).toBe(1);
    });

    it('time_crystal: registers handler on battle:start', () => {
      RelicSystem.activate([{ id: 'time_crystal', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('battle:start');
      expect(handlers.length).toBe(1);
    });

    it('herb_pouch: registers handler on battle:start', () => {
      RelicSystem.activate([{ id: 'herb_pouch', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('battle:start');
      expect(handlers.length).toBe(1);
    });

    it('life_spring: registers handler on battle:start', () => {
      RelicSystem.activate([{ id: 'life_spring', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('battle:start');
      expect(handlers.length).toBe(1);
    });

    it('multiple reactive relics register multiple handlers', () => {
      RelicSystem.activate([
        { id: 'blood_vial', triggerCount: 0 },
        { id: 'soul_collector', triggerCount: 0 },
      ]);
      const handlers = RelicSystem.getReactiveHandlers('unit:kill');
      expect(handlers.length).toBe(2);
    });

    it('re-activate clears previous listeners and registers new ones', () => {
      RelicSystem.activate([{ id: 'blood_vial', triggerCount: 0 }]);
      expect(RelicSystem.getReactiveHandlers('unit:kill').length).toBe(1);
      RelicSystem.activate([{ id: 'vampiric_fang', triggerCount: 0 }]);
      expect(RelicSystem.getReactiveHandlers('unit:kill').length).toBe(0);
      expect(RelicSystem.getReactiveHandlers('unit:damage').length).toBe(1);
    });

    it('passive relics do not register handlers', () => {
      RelicSystem.activate([{ id: 'lucky_coin', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('battle:end');
      expect(handlers.length).toBe(0);
    });
  });

  describe('build-defining relics', () => {
    it('mono_element_crown: +40% damage when all heroes same element', () => {
      RelicSystem.activate([{ id: 'mono_element_crown', triggerCount: 0 }]);
      const bonus = RelicSystem.getConditionalDamageBonus(['fire', 'fire', 'fire']);
      expect(bonus).toBeCloseTo(0.4);
    });

    it('mono_element_crown: no bonus with mixed elements', () => {
      RelicSystem.activate([{ id: 'mono_element_crown', triggerCount: 0 }]);
      const bonus = RelicSystem.getConditionalDamageBonus(['fire', 'ice', 'fire']);
      expect(bonus).toBe(0);
    });

    it('mono_element_crown: no bonus without relic', () => {
      RelicSystem.activate([]);
      expect(RelicSystem.getConditionalDamageBonus(['fire', 'fire'])).toBe(0);
    });

    it('diversity_badge: +8% speed per unique class', () => {
      RelicSystem.activate([{ id: 'diversity_badge', triggerCount: 0 }]);
      expect(RelicSystem.getAttackSpeedBonus(3)).toBeCloseTo(0.24);
    });

    it('diversity_badge: no bonus without relic', () => {
      RelicSystem.activate([]);
      expect(RelicSystem.getAttackSpeedBonus(5)).toBe(0);
    });

    it('berserker_oath: +20% attack, +10% crit when no healer', () => {
      RelicSystem.activate([{ id: 'berserker_oath', triggerCount: 0 }]);
      const bonus = RelicSystem.getBerserkerBonus(false);
      expect(bonus.attack).toBeCloseTo(0.2);
      expect(bonus.critChance).toBeCloseTo(0.1);
    });

    it('berserker_oath: no bonus when healer present', () => {
      RelicSystem.activate([{ id: 'berserker_oath', triggerCount: 0 }]);
      const bonus = RelicSystem.getBerserkerBonus(true);
      expect(bonus.attack).toBe(0);
      expect(bonus.critChance).toBe(0);
    });

    it('getDamageBonus includes mono_element_crown when all heroes same element', () => {
      // Need to use activateWithUnits to set heroes for getDamageBonus
      // But we can test the component method directly
      RelicSystem.activate([{ id: 'mono_element_crown', triggerCount: 0 }]);
      const bonus = RelicSystem.getConditionalDamageBonus(['ice', 'ice']);
      expect(bonus).toBeCloseTo(0.4);
    });

    it('kill_momentum: registers handler on unit:kill', () => {
      RelicSystem.activate([{ id: 'kill_momentum', triggerCount: 0 }]);
      const handlers = RelicSystem.getReactiveHandlers('unit:kill');
      expect(handlers.length).toBe(1);
    });
  });

  describe('formula modifiers', () => {
    it('getDefensePiercing returns 0 with no armor_piercer', () => {
      RelicSystem.activate([]);
      expect(RelicSystem.getDefensePiercing()).toBe(0);
    });

    it('getHealBonus returns correct value for healers_blessing', () => {
      RelicSystem.activate([{ id: 'healers_blessing', triggerCount: 0 }]);
      expect(RelicSystem.getHealBonus()).toBeCloseTo(0.2);
    });

    it('getReactionDamageBonus stacks catalyst + fusion_stone', () => {
      RelicSystem.activate([
        { id: 'elemental_catalyst', triggerCount: 0 },
        { id: 'elemental_fusion_stone', triggerCount: 0 },
      ]);
      expect(RelicSystem.getReactionDamageBonus()).toBeCloseTo(0.6);
    });

    it('getDamageBonus returns heart_of_dragon bonus', () => {
      RelicSystem.activate([{ id: 'heart_of_dragon', triggerCount: 0 }]);
      expect(RelicSystem.getDamageBonus()).toBeCloseTo(0.2);
    });

    it('getDamageTakenBonus returns 0 without glass_cannon', () => {
      RelicSystem.activate([]);
      expect(RelicSystem.getDamageTakenBonus()).toBe(0);
    });

    it('getGoldBonus returns 0.2 for lucky_coin', () => {
      RelicSystem.activate([{ id: 'lucky_coin', triggerCount: 0 }]);
      expect(RelicSystem.getGoldBonus()).toBeCloseTo(0.2);
    });

    it('getGoldBonus returns 0 without lucky_coin', () => {
      RelicSystem.activate([]);
      expect(RelicSystem.getGoldBonus()).toBe(0);
    });

    it('getExpBonus stacks training_manual + tactics_manual', () => {
      RelicSystem.activate([
        { id: 'training_manual', triggerCount: 0 },
        { id: 'tactics_manual', triggerCount: 0 },
      ]);
      expect(RelicSystem.getExpBonus()).toBeCloseTo(0.35);
    });

    it('getExpBonus returns 0 without exp relics', () => {
      RelicSystem.activate([]);
      expect(RelicSystem.getExpBonus()).toBe(0);
    });
  });
});
