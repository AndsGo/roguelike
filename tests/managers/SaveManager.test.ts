import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

// Set up mock localStorage before importing SaveManager
const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

import { SaveManager } from '../../src/managers/SaveManager';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { STARTING_GOLD } from '../../src/constants';

describe('SaveManager', () => {
  beforeEach(() => {
    mockStorage.clear();
    EventBus.getInstance().reset();
    RunManager.getInstance().newRun(42);
  });

  describe('saveGame', () => {
    it('saves to a valid slot', () => {
      const result = SaveManager.saveGame(0);
      expect(result).toBe(true);
    });

    it('rejects invalid slot (negative)', () => {
      expect(SaveManager.saveGame(-1)).toBe(false);
    });

    it('rejects invalid slot (>= MAX_SLOTS)', () => {
      expect(SaveManager.saveGame(3)).toBe(false);
    });
  });

  describe('hasSave', () => {
    it('returns false for empty slot', () => {
      expect(SaveManager.hasSave(0)).toBe(false);
    });

    it('returns true after saving', () => {
      SaveManager.saveGame(0);
      expect(SaveManager.hasSave(0)).toBe(true);
    });
  });

  describe('loadGame', () => {
    it('loads a previously saved game', () => {
      const rm = RunManager.getInstance();
      rm.addGold(200);
      const savedGold = rm.getGold();
      SaveManager.saveGame(1);

      // Reset run
      rm.newRun(99999);
      expect(rm.getGold()).toBe(STARTING_GOLD);

      // Load
      const result = SaveManager.loadGame(1);
      expect(result).toBe(true);
      expect(rm.getGold()).toBe(savedGold);
    });

    it('returns false for empty slot', () => {
      expect(SaveManager.loadGame(0)).toBe(false);
    });

    it('rejects invalid slot', () => {
      expect(SaveManager.loadGame(-1)).toBe(false);
      expect(SaveManager.loadGame(5)).toBe(false);
    });
  });

  describe('deleteSave', () => {
    it('removes a saved game', () => {
      SaveManager.saveGame(0);
      expect(SaveManager.hasSave(0)).toBe(true);
      SaveManager.deleteSave(0);
      expect(SaveManager.hasSave(0)).toBe(false);
    });
  });

  describe('getSaveInfo', () => {
    it('returns null for empty slot', () => {
      expect(SaveManager.getSaveInfo(0)).toBeNull();
    });

    it('returns save info after saving', () => {
      SaveManager.saveGame(0);
      const info = SaveManager.getSaveInfo(0);
      expect(info).not.toBeNull();
      expect(info!.floor).toBe(1);
      expect(info!.heroCount).toBe(2);
      expect(typeof info!.timestamp).toBe('number');
    });
  });

  describe('meta progression', () => {
    it('saveMeta and loadMeta round-trip', () => {
      const metaData = {
        totalRuns: 5,
        totalVictories: 2,
        highestFloor: 10,
        unlockedHeroes: ['warrior', 'archer', 'mage'],
        unlockedRelics: ['relic1'],
        permanentUpgrades: [],
        achievements: ['first_victory'],
      };
      SaveManager.saveMeta(metaData);

      const loaded = SaveManager.loadMeta();
      expect(loaded.totalRuns).toBe(5);
      expect(loaded.totalVictories).toBe(2);
      expect(loaded.highestFloor).toBe(10);
      expect(loaded.unlockedHeroes).toContain('mage');
      expect(loaded.achievements).toContain('first_victory');
    });

    it('loadMeta returns defaults when no data exists', () => {
      const meta = SaveManager.loadMeta();
      expect(meta.totalRuns).toBe(0);
      expect(meta.totalVictories).toBe(0);
      expect(meta.unlockedHeroes).toContain('warrior');
      expect(meta.unlockedHeroes).toContain('archer');
      expect(meta.unlockedHeroes).toContain('mage');
    });
  });

  describe('checksum validation', () => {
    it('tampered data fails to load', () => {
      SaveManager.saveGame(0);

      // Tamper with the stored data
      const raw = mockStorage.getItem('roguelike_save_0');
      const payload = JSON.parse(raw!);
      // Modify the data but keep old checksum
      const data = JSON.parse(payload.data);
      data.runState.gold = 999999;
      payload.data = JSON.stringify(data);
      // Don't update checksum - should fail validation
      mockStorage.setItem('roguelike_save_0', JSON.stringify(payload));

      const result = SaveManager.loadGame(0);
      expect(result).toBe(false);
    });
  });

  describe('autoSave', () => {
    it('saves to slot 0', () => {
      SaveManager.autoSave();
      expect(SaveManager.hasSave(0)).toBe(true);
    });
  });
});
