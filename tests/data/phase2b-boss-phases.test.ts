import { describe, it, expect } from 'vitest';
import bossPhases from '../../src/data/boss-phases.json';
import enemiesData from '../../src/data/enemies.json';

const phases = bossPhases as Record<string, { phases: { hpPercent: number; spawns: string[]; bossEffect: { type: string; value: number } }[] }>;
const enemies = enemiesData as { id: string }[];
const enemyIds = new Set(enemies.map(e => e.id));

const NEW_BOSSES = ['frost_queen', 'thunder_titan', 'shadow_lord'];

describe('Phase 2b: Boss Phases', () => {
  it('all 3 new boss phase configs exist', () => {
    for (const id of NEW_BOSSES) {
      expect(phases[id], `Missing boss phase config: ${id}`).toBeDefined();
    }
  });

  it('frost_queen has 2 phases', () => {
    expect(phases.frost_queen.phases).toHaveLength(2);
  });

  it('thunder_titan has 3 phases', () => {
    expect(phases.thunder_titan.phases).toHaveLength(3);
  });

  it('shadow_lord has 3 phases', () => {
    expect(phases.shadow_lord.phases).toHaveLength(3);
  });

  it('hpPercent values are decreasing within each boss', () => {
    for (const id of NEW_BOSSES) {
      const bossPhaseList = phases[id].phases;
      for (let i = 1; i < bossPhaseList.length; i++) {
        expect(bossPhaseList[i].hpPercent).toBeLessThan(bossPhaseList[i - 1].hpPercent);
      }
    }
  });

  it('all spawned enemies exist in enemies.json', () => {
    for (const id of NEW_BOSSES) {
      for (const phase of phases[id].phases) {
        for (const spawnId of phase.spawns) {
          expect(enemyIds.has(spawnId), `Boss ${id} spawns unknown enemy: ${spawnId}`).toBe(true);
        }
      }
    }
  });

  it('boss effects use valid types', () => {
    // Issue #5 added heal (sustain wall) and cleanse (debuff purge) to diversify
    // the response each boss demands beyond "burst > sustain".
    const validTypes = ['enrage', 'shield', 'damage_reduction', 'heal', 'cleanse'];
    for (const id of NEW_BOSSES) {
      for (const phase of phases[id].phases) {
        expect(validTypes).toContain(phase.bossEffect.type);
        // cleanse purges all (no magnitude); every other effect needs value > 0.
        if (phase.bossEffect.type === 'cleanse') {
          expect(phase.bossEffect.value).toBeGreaterThanOrEqual(0);
        } else {
          expect(phase.bossEffect.value).toBeGreaterThan(0);
        }
      }
    }
  });

  it('frost_queen has no spawns (Act 1 simplicity)', () => {
    for (const phase of phases.frost_queen.phases) {
      expect(phase.spawns).toHaveLength(0);
    }
  });

  it('each boss has a distinct mechanical signature (issue #5)', () => {
    const ALL_BOSSES = ['dragon_boss', 'heart_of_the_forge', 'frost_queen', 'thunder_titan', 'shadow_lord'];
    const signatures = ALL_BOSSES.map(id =>
      phases[id].phases.map(p => p.bossEffect.type).sort().join('+'),
    );
    // No two bosses share the same effect-type profile — each demands a distinct response.
    expect(new Set(signatures).size).toBe(ALL_BOSSES.length);
  });

  it('boss roster uses more than the original 3 effect types (issue #5)', () => {
    const ALL_BOSSES = ['dragon_boss', 'heart_of_the_forge', 'frost_queen', 'thunder_titan', 'shadow_lord'];
    const allTypes = new Set<string>();
    for (const id of ALL_BOSSES) {
      for (const p of phases[id].phases) allTypes.add(p.bossEffect.type);
    }
    expect(allTypes.has('heal') || allTypes.has('cleanse')).toBe(true);
    expect(allTypes.size).toBeGreaterThan(3);
  });
});
