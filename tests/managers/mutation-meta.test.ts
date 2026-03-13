import { describe, it, expect, beforeEach } from 'vitest';
import { MetaManager } from '../../src/managers/MetaManager';

// Helper: buy upgrades until total levels >= target
function buyUpgradeLevels(target: number): void {
  MetaManager.addMetaCurrency(10000);
  let bought = 0;
  const ids = ['starting_gold', 'starting_hp', 'exp_bonus', 'crit_bonus', 'relic_chance'];
  let idx = 0;
  while (bought < target && idx < ids.length * 10) {
    if (MetaManager.purchaseUpgrade(ids[idx % ids.length])) {
      bought++;
    }
    idx++;
  }
}

describe('Mutation meta system', () => {
  beforeEach(() => {
    MetaManager.resetAll();
  });

  it('mutation tier is locked by default', () => {
    expect(MetaManager.isMutationTierUnlocked()).toBe(false);
    expect(MetaManager.getTotalUpgradeLevels()).toBe(0);
  });

  it('getTotalUpgradeLevels sums all upgrade levels', () => {
    MetaManager.addMetaCurrency(5000);
    MetaManager.purchaseUpgrade('starting_gold');
    MetaManager.purchaseUpgrade('starting_gold');
    MetaManager.purchaseUpgrade('crit_bonus');
    expect(MetaManager.getTotalUpgradeLevels()).toBe(3);
  });

  it('mutation tier unlocks at 10 total upgrade levels', () => {
    buyUpgradeLevels(10);
    expect(MetaManager.getTotalUpgradeLevels()).toBeGreaterThanOrEqual(10);
    expect(MetaManager.isMutationTierUnlocked()).toBe(true);
  });

  it('cannot purchase mutation when tier is locked', () => {
    MetaManager.addMetaCurrency(1000);
    expect(MetaManager.purchaseMutation('overkill_splash')).toBe(false);
    expect(MetaManager.hasMutation('overkill_splash')).toBe(false);
  });

  it('can purchase mutation when tier is unlocked', () => {
    buyUpgradeLevels(10);
    expect(MetaManager.purchaseMutation('overkill_splash')).toBe(true);
    expect(MetaManager.hasMutation('overkill_splash')).toBe(true);
  });

  it('cannot purchase same mutation twice', () => {
    buyUpgradeLevels(10);
    MetaManager.purchaseMutation('heal_shield');
    const before = MetaManager.getMetaCurrency();
    expect(MetaManager.purchaseMutation('heal_shield')).toBe(false);
    expect(MetaManager.getMetaCurrency()).toBe(before);
  });

  it('cannot purchase mutation with insufficient currency', () => {
    buyUpgradeLevels(10);
    // Drain remaining currency
    const remaining = MetaManager.getMetaCurrency();
    MetaManager.addMetaCurrency(-remaining);
    expect(MetaManager.purchaseMutation('overkill_splash')).toBe(false);
  });

  it('cannot purchase invalid mutation', () => {
    buyUpgradeLevels(10);
    expect(MetaManager.purchaseMutation('nonexistent')).toBe(false);
  });

  it('getMutations returns all purchased mutations', () => {
    buyUpgradeLevels(10);
    MetaManager.purchaseMutation('heal_shield');
    MetaManager.purchaseMutation('crit_cooldown');
    expect(MetaManager.getMutations()).toContain('heal_shield');
    expect(MetaManager.getMutations()).toContain('crit_cooldown');
    expect(MetaManager.getMutations().length).toBe(2);
  });

  it('resetAll clears mutations', () => {
    buyUpgradeLevels(10);
    MetaManager.purchaseMutation('crit_cooldown');
    MetaManager.resetAll();
    expect(MetaManager.hasMutation('crit_cooldown')).toBe(false);
    expect(MetaManager.getMutations()).toEqual([]);
  });

  it('all 8 mutation defs exist with valid costs', () => {
    expect(MetaManager.MUTATION_DEFS.length).toBe(8);
    for (const def of MetaManager.MUTATION_DEFS) {
      expect(def.cost).toBeGreaterThan(0);
      expect(def.id).toBeTruthy();
    }
  });

  it('mutation deducts correct cost', () => {
    buyUpgradeLevels(10);
    const before = MetaManager.getMetaCurrency();
    MetaManager.purchaseMutation('first_event_safe'); // cost: 80
    expect(MetaManager.getMetaCurrency()).toBe(before - 80);
  });
});
