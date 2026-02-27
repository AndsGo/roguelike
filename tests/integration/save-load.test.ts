import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { RunManager } from '../../src/managers/RunManager';
import { SaveManager } from '../../src/managers/SaveManager';
import { EventBus } from '../../src/systems/EventBus';
import { STARTING_GOLD } from '../../src/constants';

describe('Integration: Save/Load Flow', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
  });

  it('full save -> load -> verify state consistency', () => {
    const rm = RunManager.getInstance();
    rm.newRun(54321);

    // Modify state
    rm.addGold(250);
    rm.addHero('mage');
    rm.addHero('priest');
    rm.addRelic('sword_of_power');
    rm.addRelic('shield_of_valor');

    // Capture state before save
    const beforeState = {
      seed: rm.getState().seed,
      gold: rm.getGold(),
      heroCount: rm.getHeroes().length,
      heroIds: rm.getHeroes().map(h => h.id),
      relicCount: rm.getRelics().length,
      relicIds: rm.getRelics().map(r => r.id),
      difficulty: rm.getDifficulty(),
      floor: rm.getFloor(),
    };

    // Save
    const saveResult = SaveManager.saveGame(1);
    expect(saveResult).toBe(true);

    // Verify save exists
    expect(SaveManager.hasSave(1)).toBe(true);

    // Start a completely new run (different state)
    rm.newRun(99999, 'hard');
    expect(rm.getGold()).toBe(STARTING_GOLD);
    expect(rm.getHeroes().length).toBe(2);

    // Load
    const loadResult = SaveManager.loadGame(1);
    expect(loadResult).toBe(true);

    // Verify state restored
    expect(rm.getState().seed).toBe(beforeState.seed);
    expect(rm.getGold()).toBe(beforeState.gold);
    expect(rm.getHeroes().length).toBe(beforeState.heroCount);
    expect(rm.getHeroes().map(h => h.id)).toEqual(beforeState.heroIds);
    expect(rm.getRelics().length).toBe(beforeState.relicCount);
    expect(rm.getRelics().map(r => r.id)).toEqual(beforeState.relicIds);
    expect(rm.getDifficulty()).toBe(beforeState.difficulty);
  });

  it('RunManager serialize -> SaveManager save -> load -> deserialize round-trip', () => {
    const rm = RunManager.getInstance();
    rm.newRun(11111);
    rm.addGold(100);
    rm.addHero('rogue');
    rm.addRelic('amulet');

    const savedGold = rm.getGold();

    // Manual serialize
    const serialized = rm.serialize();

    // Also save via SaveManager
    SaveManager.saveGame(0);

    // Wipe and restore via SaveManager
    rm.newRun(0);
    SaveManager.loadGame(0);

    // Verify gold matches saved value
    expect(rm.getGold()).toBe(savedGold);
    expect(rm.getHeroes().length).toBe(3);
    expect(rm.hasRelic('amulet')).toBe(true);

    // Then also verify manual deserialize
    rm.newRun(0);
    rm.deserialize(serialized);

    expect(rm.getGold()).toBe(savedGold);
    expect(rm.getHeroes().length).toBe(3);
    expect(rm.hasRelic('amulet')).toBe(true);
  });

  it('multiple save slots are independent', () => {
    const rm = RunManager.getInstance();

    // Save slot 0
    rm.newRun(100);
    rm.addGold(50);
    const slot0Gold = rm.getGold();
    SaveManager.saveGame(0);

    // Save slot 1 with different state
    rm.newRun(200, 'hard');
    rm.addGold(500);
    rm.addHero('mage');
    const slot1Gold = rm.getGold();
    SaveManager.saveGame(1);

    // Load slot 0
    SaveManager.loadGame(0);
    expect(rm.getGold()).toBe(slot0Gold);
    expect(rm.getDifficulty()).toBe('normal');

    // Load slot 1
    SaveManager.loadGame(1);
    expect(rm.getGold()).toBe(slot1Gold);
    expect(rm.getDifficulty()).toBe('hard');
  });
});
