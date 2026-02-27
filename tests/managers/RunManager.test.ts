import { describe, it, expect, beforeEach } from 'vitest';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { STARTING_GOLD } from '../../src/constants';

describe('RunManager', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(12345);
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      expect(RunManager.getInstance()).toBe(rm);
    });
  });

  describe('newRun', () => {
    it('initializes with correct seed', () => {
      const state = rm.getState();
      expect(state.seed).toBe(12345);
    });

    it('starts with warrior and archer', () => {
      const heroes = rm.getHeroes();
      expect(heroes.length).toBe(2);
      expect(heroes[0].id).toBe('warrior');
      expect(heroes[1].id).toBe('archer');
    });

    it('starts with STARTING_GOLD', () => {
      expect(rm.getGold()).toBe(STARTING_GOLD);
    });

    it('starts at floor 1', () => {
      expect(rm.getFloor()).toBe(1);
    });

    it('starts with empty map', () => {
      expect(rm.getMap()).toEqual([]);
    });

    it('starts with currentNode -1', () => {
      expect(rm.getCurrentNode()).toBe(-1);
    });

    it('starts with empty relics', () => {
      expect(rm.getRelics()).toEqual([]);
    });

    it('uses "normal" difficulty by default', () => {
      expect(rm.getDifficulty()).toBe('normal');
    });

    it('calculates initial synergies', () => {
      const synergies = rm.getActiveSynergies();
      expect(Array.isArray(synergies)).toBe(true);
    });

    it('accepts custom difficulty', () => {
      rm.newRun(999, 'hard');
      expect(rm.getDifficulty()).toBe('hard');
    });

    it('heroes start at level 1 with 0 exp', () => {
      for (const hero of rm.getHeroes()) {
        expect(hero.level).toBe(1);
        expect(hero.exp).toBe(0);
      }
    });
  });

  describe('gold management', () => {
    it('addGold increases gold', () => {
      const before = rm.getGold();
      rm.addGold(50);
      expect(rm.getGold()).toBe(before + 50);
    });

    it('addGold with negative reduces gold', () => {
      const before = rm.getGold();
      rm.addGold(-30);
      expect(rm.getGold()).toBe(before - 30);
    });

    it('gold does not go below 0', () => {
      rm.addGold(-9999);
      expect(rm.getGold()).toBe(0);
    });

    it('spendGold succeeds when enough gold', () => {
      const before = rm.getGold();
      const result = rm.spendGold(50);
      expect(result).toBe(true);
      expect(rm.getGold()).toBe(before - 50);
    });

    it('spendGold fails when not enough gold', () => {
      const before = rm.getGold();
      const result = rm.spendGold(999);
      expect(result).toBe(false);
      expect(rm.getGold()).toBe(before); // unchanged
    });
  });

  describe('hero management', () => {
    it('addHero adds a new hero', () => {
      const result = rm.addHero('mage');
      expect(result).toBe(true);
      expect(rm.getHeroes().length).toBe(3);
      expect(rm.getHeroes()[2].id).toBe('mage');
    });

    it('addHero prevents duplicate heroes', () => {
      const result = rm.addHero('warrior');
      expect(result).toBe(false);
      expect(rm.getHeroes().length).toBe(2);
    });

    it('addHero respects MAX_TEAM_SIZE', () => {
      rm.addHero('mage');
      rm.addHero('priest');
      rm.addHero('rogue');
      // Now 5 heroes (max)
      const result = rm.addHero('knight');
      expect(result).toBe(false);
      expect(rm.getHeroes().length).toBe(5);
    });

    it('getHeroState returns correct hero', () => {
      const hero = rm.getHeroState('warrior');
      expect(hero).toBeDefined();
      expect(hero!.id).toBe('warrior');
    });

    it('getHeroState returns undefined for missing hero', () => {
      expect(rm.getHeroState('nonexistent')).toBeUndefined();
    });

    it('getHeroData returns data for known heroes', () => {
      const data = rm.getHeroData('warrior');
      expect(data).toBeDefined();
      expect(data.role).toBe('tank');
    });
  });

  describe('relics', () => {
    it('addRelic adds a relic', () => {
      rm.addRelic('test_relic');
      expect(rm.hasRelic('test_relic')).toBe(true);
    });

    it('addRelic prevents duplicate relics', () => {
      rm.addRelic('test_relic');
      rm.addRelic('test_relic');
      expect(rm.getRelics().length).toBe(1);
    });

    it('hasRelic returns false for missing relic', () => {
      expect(rm.hasRelic('nonexistent')).toBe(false);
    });

    it('incrementRelicTrigger increments count', () => {
      rm.addRelic('test_relic');
      rm.incrementRelicTrigger('test_relic');
      rm.incrementRelicTrigger('test_relic');
      const relic = rm.getRelics().find(r => r.id === 'test_relic');
      expect(relic!.triggerCount).toBe(2);
    });
  });

  describe('serialization', () => {
    it('serialize returns a JSON string', () => {
      const json = rm.serialize();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.state).toBeDefined();
      expect(parsed.rngState).toBeDefined();
    });

    it('deserialize restores state', () => {
      rm.addGold(200);
      rm.addRelic('test_relic');
      rm.addHero('mage');

      const savedGold = rm.getGold();
      const json = rm.serialize();

      // Start a fresh run
      rm.newRun(99999);
      expect(rm.getGold()).toBe(STARTING_GOLD);

      // Restore
      rm.deserialize(json);
      expect(rm.getGold()).toBe(savedGold);
      expect(rm.hasRelic('test_relic')).toBe(true);
      expect(rm.getHeroes().length).toBe(3);
    });

    it('serialize -> deserialize round-trip preserves all state', () => {
      rm.addHero('mage');
      rm.addGold(50);
      rm.addRelic('relic_a');
      rm.addRelic('relic_b');

      const before = rm.getState();
      const json = rm.serialize();
      rm.newRun(0);
      rm.deserialize(json);
      const after = rm.getState();

      expect(after.seed).toBe(before.seed);
      expect(after.gold).toBe(before.gold);
      expect(after.heroes.length).toBe(before.heroes.length);
      expect(after.relics.length).toBe(before.relics.length);
      expect(after.difficulty).toBe(before.difficulty);
    });
  });

  describe('map and node management', () => {
    it('setMap and getMap work', () => {
      const map = [
        { index: 0, type: 'battle' as const, completed: false, connections: [1] },
      ];
      rm.setMap(map);
      expect(rm.getMap().length).toBe(1);
    });

    it('advanceNode increments currentNode', () => {
      rm.advanceNode();
      expect(rm.getCurrentNode()).toBe(0);
      rm.advanceNode();
      expect(rm.getCurrentNode()).toBe(1);
    });

    it('setCurrentNode sets to specific index', () => {
      rm.setCurrentNode(5);
      expect(rm.getCurrentNode()).toBe(5);
    });
  });

  describe('healing', () => {
    it('healAllHeroes heals all heroes by percent', () => {
      const hero = rm.getHeroState('warrior')!;
      const data = rm.getHeroData('warrior');
      const maxHp = rm.getMaxHp(hero, data);
      hero.currentHp = Math.floor(maxHp / 2);
      rm.healAllHeroes(0.5);
      // Should heal 50% of max, capped at maxHp
      expect(hero.currentHp).toBeLessThanOrEqual(maxHp);
      expect(hero.currentHp).toBeGreaterThan(Math.floor(maxHp / 2));
    });

    it('healAllHeroes does not exceed maxHp', () => {
      const hero = rm.getHeroState('warrior')!;
      const data = rm.getHeroData('warrior');
      const maxHp = rm.getMaxHp(hero, data);
      hero.currentHp = maxHp - 1;
      rm.healAllHeroes(1.0);
      expect(hero.currentHp).toBe(maxHp);
    });
  });

  describe('synergies', () => {
    it('calculateSynergies detects human synergy with warrior (human) + mage (human)', () => {
      rm.addHero('mage'); // human
      rm.calculateSynergies();
      const synergies = rm.getActiveSynergies();
      // warrior is human, mage is human: 2 humans -> Human Alliance
      const humanSynergy = synergies.find(s => s.synergyId === 'synergy_human');
      expect(humanSynergy).toBeDefined();
    });
  });
});
