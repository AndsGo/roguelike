import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

// Set up mock localStorage
const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { MetaManager, RunEndContext } from '../../src/managers/MetaManager';
import { EventBus } from '../../src/systems/EventBus';

// Reset singleton between tests
function resetMetaManager() {
  // Access private static instance to reset it
  (MetaManager as any).instance = undefined;
}

describe('MetaManager', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
    resetMetaManager();
  });

  describe('hero unlocks', () => {
    it('default heroes are unlocked', () => {
      const unlocked = MetaManager.getUnlockedHeroes();
      expect(unlocked).toContain('warrior');
      expect(unlocked).toContain('archer');
      expect(unlocked).toContain('mage');
      expect(unlocked).toContain('priest');
      expect(unlocked).toContain('rogue');
    });

    it('unlockHero adds a new hero', () => {
      MetaManager.unlockHero('knight');
      expect(MetaManager.isHeroUnlocked('knight')).toBe(true);
    });

    it('unlockHero is idempotent', () => {
      MetaManager.unlockHero('knight');
      MetaManager.unlockHero('knight');
      const heroes = MetaManager.getUnlockedHeroes();
      const knightCount = heroes.filter(h => h === 'knight').length;
      expect(knightCount).toBe(1);
    });

    it('isHeroUnlocked returns false for locked hero', () => {
      expect(MetaManager.isHeroUnlocked('nonexistent')).toBe(false);
    });
  });

  describe('relic unlocks', () => {
    it('starts with no relics', () => {
      expect(MetaManager.getUnlockedRelics()).toEqual([]);
    });

    it('unlockRelic adds a relic', () => {
      MetaManager.unlockRelic('test_relic');
      expect(MetaManager.getUnlockedRelics()).toContain('test_relic');
    });
  });

  describe('permanent upgrades', () => {
    it('getUpgrade returns upgrade with level 0', () => {
      const upgrade = MetaManager.getUpgrade('starting_gold');
      expect(upgrade).toBeDefined();
      expect(upgrade!.level).toBe(0);
      expect(upgrade!.maxLevel).toBe(5);
    });

    it('getUpgradeEffect returns 0 at level 0', () => {
      expect(MetaManager.getUpgradeEffect('starting_gold')).toBe(0);
    });

    it('purchaseUpgrade succeeds with enough currency', () => {
      MetaManager.addMetaCurrency(500);
      const result = MetaManager.purchaseUpgrade('starting_gold');
      expect(result).toBe(true);
      const upgrade = MetaManager.getUpgrade('starting_gold');
      expect(upgrade!.level).toBe(1);
    });

    it('purchaseUpgrade fails without enough currency', () => {
      // Cost is 50 for level 0->1
      MetaManager.addMetaCurrency(10);
      const result = MetaManager.purchaseUpgrade('starting_gold');
      expect(result).toBe(false);
    });

    it('purchaseUpgrade fails when at max level', () => {
      MetaManager.addMetaCurrency(100000);
      // Purchase all 5 levels of starting_gold
      for (let i = 0; i < 5; i++) {
        MetaManager.purchaseUpgrade('starting_gold');
      }
      const result = MetaManager.purchaseUpgrade('starting_gold');
      expect(result).toBe(false);
    });

    it('getUpgradeEffect returns correct value at level 1', () => {
      MetaManager.addMetaCurrency(500);
      MetaManager.purchaseUpgrade('starting_gold');
      // starting_gold level 1 = 20
      expect(MetaManager.getUpgradeEffect('starting_gold')).toBe(20);
    });
  });

  describe('meta currency', () => {
    it('starts at 0', () => {
      expect(MetaManager.getMetaCurrency()).toBe(0);
    });

    it('addMetaCurrency increases amount', () => {
      MetaManager.addMetaCurrency(100);
      expect(MetaManager.getMetaCurrency()).toBe(100);
    });

    it('addMetaCurrency does not go below 0', () => {
      MetaManager.addMetaCurrency(-100);
      expect(MetaManager.getMetaCurrency()).toBe(0);
    });
  });

  describe('recordRunEnd', () => {
    it('increments totalRuns', () => {
      MetaManager.recordRunEnd(false, 5);
      const meta = MetaManager.getMetaData();
      expect(meta.totalRuns).toBe(1);
    });

    it('increments totalVictories on victory', () => {
      MetaManager.recordRunEnd(true, 15);
      const meta = MetaManager.getMetaData();
      expect(meta.totalVictories).toBe(1);
    });

    it('updates highestFloor', () => {
      MetaManager.recordRunEnd(false, 7);
      expect(MetaManager.getMetaData().highestFloor).toBe(7);
    });

    it('priest is a default hero (no unlock needed)', () => {
      expect(MetaManager.isHeroUnlocked('priest')).toBe(true);
      const cond = MetaManager.getHeroUnlockCondition('priest');
      expect(cond?.type).toBe('default');
    });

    it('rogue is a default hero (no unlock needed)', () => {
      expect(MetaManager.isHeroUnlocked('rogue')).toBe(true);
      const cond = MetaManager.getHeroUnlockCondition('rogue');
      expect(cond?.type).toBe('default');
    });

    it('awards meta currency based on progress', () => {
      MetaManager.recordRunEnd(true, 15);
      // Victory awards 100 meta currency
      expect(MetaManager.getMetaCurrency()).toBeGreaterThanOrEqual(100);
    });
  });

  describe('achievements', () => {
    it('starts with no achievements', () => {
      expect(MetaManager.getAchievements()).toEqual([]);
    });

    it('addAchievement adds an achievement', () => {
      MetaManager.addAchievement('first_victory');
      expect(MetaManager.hasAchievement('first_victory')).toBe(true);
    });

    it('addAchievement is idempotent', () => {
      MetaManager.addAchievement('test');
      MetaManager.addAchievement('test');
      expect(MetaManager.getAchievements().length).toBe(1);
    });
  });

  describe('new unlock condition types', () => {
    function makeContext(overrides: Partial<RunEndContext> = {}): RunEndContext {
      return {
        partyHeroIds: ['warrior', 'archer'],
        partyElements: ['fire', 'fire'],
        partyRoles: ['tank', 'ranged_dps'],
        relicCount: 3,
        difficulty: 'normal',
        ...overrides,
      };
    }

    it('element_wins: unlocks with enough element heroes on victory', () => {
      // elementalist requires 3+ lightning heroes on victory
      const ctx = makeContext({ partyElements: ['lightning', 'lightning', 'lightning'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('elementalist')).toBe(true);
    });

    it('element_wins: does NOT unlock on defeat', () => {
      const ctx = makeContext({ partyElements: ['lightning', 'lightning', 'fire'] });
      MetaManager.recordRunEnd(false, 15, ctx);
      expect(MetaManager.isHeroUnlocked('elementalist')).toBe(false);
    });

    it('boss_kill: unlocks when boss has been defeated', () => {
      // necromancer requires defeating thunder_titan
      MetaManager.recordBossKill('thunder_titan');
      MetaManager.recordRunEnd(false, 5, makeContext());
      expect(MetaManager.isHeroUnlocked('necromancer')).toBe(true);
    });

    it('boss_kill: does NOT unlock when boss not defeated', () => {
      MetaManager.recordRunEnd(true, 15, makeContext());
      expect(MetaManager.isHeroUnlocked('necromancer')).toBe(false);
    });

    it('no_healer_win: unlocks on victory without healer', () => {
      // druid requires victory without healer
      const ctx = makeContext({ partyRoles: ['tank', 'melee_dps'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('druid')).toBe(true);
    });

    it('no_healer_win: does NOT unlock with healer in party', () => {
      const ctx = makeContext({ partyRoles: ['tank', 'healer'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('druid')).toBe(false);
    });

    it('no_healer_win with difficulty gate: does NOT unlock on normal', () => {
      // holy_sentinel requires no healer win on hard+
      const ctx = makeContext({ partyRoles: ['tank', 'melee_dps'], difficulty: 'normal' });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('holy_sentinel')).toBe(false);
    });

    it('no_healer_win with difficulty gate: DOES unlock on hard+', () => {
      const ctx = makeContext({ partyRoles: ['tank', 'melee_dps'], difficulty: 'hard' });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('holy_sentinel')).toBe(true);
    });

    it('full_element_team: unlocks when all party share same element on victory', () => {
      // dragon_knight requires mono-fire team
      const ctx = makeContext({ partyElements: ['fire', 'fire', 'fire'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('dragon_knight')).toBe(true);
    });

    it('full_element_team: does NOT unlock with mixed elements', () => {
      const ctx = makeContext({ partyElements: ['fire', 'ice', 'fire'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('dragon_knight')).toBe(false);
    });

    it('relic_count: unlocks with enough relics on victory', () => {
      // berserker requires 8+ relics
      const ctx = makeContext({ relicCount: 10 });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('berserker')).toBe(true);
    });

    it('relic_count: does NOT unlock with insufficient relics', () => {
      const ctx = makeContext({ relicCount: 5 });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('berserker')).toBe(false);
    });

    it('hero_used: unlocks when specific hero in party on victory', () => {
      // beast_warden requires winning with knight
      const ctx = makeContext({ partyHeroIds: ['knight', 'warrior'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('beast_warden')).toBe(true);
    });

    it('hero_used: does NOT unlock without specific hero', () => {
      const ctx = makeContext({ partyHeroIds: ['warrior', 'archer'] });
      MetaManager.recordRunEnd(true, 15, ctx);
      expect(MetaManager.isHeroUnlocked('beast_warden')).toBe(false);
    });

    it('backward compatible: recordRunEnd without context still works for runs/victory types', () => {
      // knight requires 5 runs (no context needed)
      for (let i = 0; i < 5; i++) {
        MetaManager.recordRunEnd(false, 5);
      }
      expect(MetaManager.isHeroUnlocked('knight')).toBe(true);
    });
  });

  describe('boss kill tracking', () => {
    it('recordBossKill stores boss ID', () => {
      MetaManager.recordBossKill('frost_queen');
      expect(MetaManager.hasDefeatedBoss('frost_queen')).toBe(true);
    });

    it('hasDefeatedBoss returns false for undefeated boss', () => {
      expect(MetaManager.hasDefeatedBoss('shadow_lord')).toBe(false);
    });

    it('recordBossKill is idempotent', () => {
      MetaManager.recordBossKill('frost_queen');
      MetaManager.recordBossKill('frost_queen');
      expect(MetaManager.getDefeatedBosses().length).toBe(1);
    });
  });
});
