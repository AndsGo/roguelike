import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

// Set up mock localStorage before importing SaveManager
const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { autoFormationByRole, RunManager } from '../../src/managers/RunManager';
import { SaveManager } from '../../src/managers/SaveManager';

describe('autoFormationByRole', () => {
  it('assigns tank to front', () => {
    expect(autoFormationByRole('tank')).toBe('front');
  });

  it('assigns melee_dps to front', () => {
    expect(autoFormationByRole('melee_dps')).toBe('front');
  });

  it('assigns ranged_dps to back', () => {
    expect(autoFormationByRole('ranged_dps')).toBe('back');
  });

  it('assigns healer to back', () => {
    expect(autoFormationByRole('healer')).toBe('back');
  });

  it('assigns support to back', () => {
    expect(autoFormationByRole('support')).toBe('back');
  });
});

describe('Formation save/load', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('formation persists through save/load cycle', () => {
    const rm = RunManager.getInstance();
    rm.newRun(12345, 'normal', ['warrior', 'archer']);

    // Change warrior to back (warrior is melee_dps, defaults to front)
    rm.setHeroFormation('warrior', 'back');
    expect(rm.getHeroFormation('warrior')).toBe('back');

    // Save
    SaveManager.saveGame(0);

    // Reset state with new run
    rm.newRun(99999, 'normal', ['warrior', 'archer']);
    expect(rm.getHeroFormation('warrior')).toBe('front'); // back to default

    // Load
    SaveManager.loadGame(0);

    // Should restore the changed formation
    expect(rm.getHeroFormation('warrior')).toBe('back');
  });

  it('old save without formation falls back to role default', () => {
    const rm = RunManager.getInstance();
    rm.newRun(12345, 'normal', ['warrior', 'archer']);

    // Simulate old save: remove formation field
    const heroes = rm.getHeroes();
    for (const h of heroes) {
      delete (h as any).formation;
    }

    // getHeroFormation should fall back to role-based default
    // warrior is melee_dps -> front
    expect(rm.getHeroFormation('warrior')).toBe('front');
    // archer is ranged_dps -> back
    expect(rm.getHeroFormation('archer')).toBe('back');
  });
});
