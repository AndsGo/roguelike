import { describe, it, expect } from 'vitest';
import { compositePixelGrid, ChibiConfig } from '../../src/systems/UnitRenderer';
import { P } from '../../src/data/pixel-templates';

function countFilledPixels(grid: number[][], rowStart: number, rowEnd: number): number {
  let count = 0;
  for (let r = rowStart; r < rowEnd && r < grid.length; r++) {
    for (const px of grid[r]) { if (px !== P._) count++; }
  }
  return count;
}

function countEdgePixels(grid: number[][], rowStart: number, rowEnd: number, edgeCols: number): number {
  let count = 0;
  for (let r = rowStart; r < rowEnd && r < grid.length; r++) {
    for (let c = 0; c < edgeCols; c++) { if (grid[r][c] !== P._) count++; }
    for (let c = grid[r].length - edgeCols; c < grid[r].length; c++) { if (grid[r][c] !== P._) count++; }
  }
  return count;
}

function hasWeaponPixels(grid: number[][]): boolean {
  for (let r = 7; r < 16; r++) {
    for (const px of grid[r]) { if (px === P.W || px === P.WG) return true; }
  }
  return false;
}

describe('UnitRenderer compositePixelGrid', () => {
  const baseConfig: ChibiConfig = {
    role: 'melee_dps', race: 'human', classType: 'warrior',
    fillColor: 0xdd8833, borderColor: 0x000000, isHero: false, isBoss: false,
  };

  it('construct body is wider than hero melee_dps body', () => {
    const construct = compositePixelGrid({ ...baseConfig, monsterType: 'construct' });
    const hero = compositePixelGrid({ ...baseConfig, monsterType: undefined });
    const constructEdge = countEdgePixels(construct, 7, 16, 2);
    const heroEdge = countEdgePixels(hero, 7, 16, 2);
    expect(constructEdge).toBeGreaterThan(heroEdge);
  });

  it('caster body has fewer filled pixels in bottom rows', () => {
    const caster = compositePixelGrid({ ...baseConfig, monsterType: 'caster' });
    const humanoid = compositePixelGrid({ ...baseConfig, monsterType: 'humanoid' });
    const casterBottom = countFilledPixels(caster, 13, 16);
    const humanoidBottom = countFilledPixels(humanoid, 13, 16);
    expect(casterBottom).toBeLessThan(humanoidBottom);
  });

  it('falls back gracefully when monsterType is undefined', () => {
    const grid = compositePixelGrid({ ...baseConfig, monsterType: undefined });
    expect(grid.length).toBe(20);
    expect(grid[0].length).toBe(16);
    expect(countFilledPixels(grid, 0, 20)).toBeGreaterThan(30);
  });

  it('does NOT render weapon for non-humanoid monsters', () => {
    expect(hasWeaponPixels(compositePixelGrid({ ...baseConfig, monsterType: 'beast' }))).toBe(false);
  });

  it('renders weapon for humanoid monsters', () => {
    expect(hasWeaponPixels(compositePixelGrid({ ...baseConfig, monsterType: 'humanoid' }))).toBe(true);
  });

  it('monster grid differs significantly from hero grid', () => {
    const monster = compositePixelGrid({ ...baseConfig, monsterType: 'undead' });
    const hero = compositePixelGrid({ ...baseConfig, monsterType: undefined });
    let diff = 0;
    for (let r = 0; r < Math.min(monster.length, hero.length); r++) {
      for (let c = 0; c < monster[r].length; c++) {
        if (monster[r][c] !== hero[r][c]) diff++;
      }
    }
    expect(diff).toBeGreaterThan(20);
  });
});
