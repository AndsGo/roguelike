import { describe, it, expect } from 'vitest';
import { HERO_ANIM_PARAMS, MONSTER_ANIM_PARAMS } from '../../src/config/visual';

describe('Unit Animation Parameters', () => {
  it('defines params for all 5 hero roles', () => {
    for (const role of ['tank', 'melee_dps', 'ranged_dps', 'healer', 'support']) {
      expect(HERO_ANIM_PARAMS[role]).toBeDefined();
    }
  });

  it('defines params for all 6 monster types', () => {
    for (const type of ['beast', 'undead', 'construct', 'caster', 'humanoid', 'draconic']) {
      expect(MONSTER_ANIM_PARAMS[type]).toBeDefined();
    }
  });

  it('beast attack is faster than construct', () => {
    expect(MONSTER_ANIM_PARAMS.beast.attackDuration).toBeLessThan(MONSTER_ANIM_PARAMS.construct.attackDuration);
  });

  it('tank hero attack is slower than melee_dps', () => {
    expect(HERO_ANIM_PARAMS.tank.attackDuration).toBeGreaterThan(HERO_ANIM_PARAMS.melee_dps.attackDuration);
  });

  it('healer has longer idle than melee_dps', () => {
    expect(HERO_ANIM_PARAMS.healer.idleDuration).toBeGreaterThan(HERO_ANIM_PARAMS.melee_dps.idleDuration);
  });
});
