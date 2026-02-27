import { SaveData, MetaProgressionData } from '../types';
import { RunManager } from './RunManager';

/**
 * Handles localStorage persistence for save slots and meta progression.
 * Includes simple checksum validation to detect data tampering.
 */
export class SaveManager {
  private static SAVE_KEY_PREFIX = 'roguelike_save_';
  private static META_KEY = 'roguelike_meta';
  private static MAX_SLOTS = 3;
  private static SAVE_VERSION = 1;

  // ---- Save Operations ----

  static saveGame(slot: number): boolean {
    if (slot < 0 || slot >= SaveManager.MAX_SLOTS) return false;

    try {
      const rm = RunManager.getInstance();
      const saveData: SaveData = {
        version: SaveManager.SAVE_VERSION,
        timestamp: Date.now(),
        runState: rm.getState(),
        rngState: rm.getRng().getState(),
        metaProgression: SaveManager.loadMeta(),
      };

      const json = JSON.stringify(saveData);
      const checksum = SaveManager.generateChecksum(json);
      const payload = JSON.stringify({ data: json, checksum });

      localStorage.setItem(SaveManager.SAVE_KEY_PREFIX + slot, payload);
      return true;
    } catch {
      console.error('SaveManager: failed to save game to slot', slot);
      return false;
    }
  }

  static loadGame(slot: number): boolean {
    if (slot < 0 || slot >= SaveManager.MAX_SLOTS) return false;

    try {
      const raw = localStorage.getItem(SaveManager.SAVE_KEY_PREFIX + slot);
      if (!raw) return false;

      const payload = JSON.parse(raw) as { data: string; checksum: string };
      if (!SaveManager.validateChecksum(payload.data, payload.checksum)) {
        console.error('SaveManager: checksum mismatch for slot', slot);
        return false;
      }

      const saveData = JSON.parse(payload.data) as SaveData;

      // Version migration hook (for future use)
      if (saveData.version !== SaveManager.SAVE_VERSION) {
        console.warn('SaveManager: save version mismatch, attempting load anyway');
      }

      const rm = RunManager.getInstance();
      rm.deserialize(JSON.stringify({
        state: saveData.runState,
        rngState: saveData.rngState ?? saveData.runState.seed,
      }));
      return true;
    } catch {
      console.error('SaveManager: failed to load game from slot', slot);
      return false;
    }
  }

  static deleteSave(slot: number): void {
    if (slot < 0 || slot >= SaveManager.MAX_SLOTS) return;
    localStorage.removeItem(SaveManager.SAVE_KEY_PREFIX + slot);
  }

  static hasSave(slot: number): boolean {
    if (slot < 0 || slot >= SaveManager.MAX_SLOTS) return false;
    return localStorage.getItem(SaveManager.SAVE_KEY_PREFIX + slot) !== null;
  }

  static getSaveInfo(slot: number): { timestamp: number; floor: number; heroCount: number } | null {
    if (slot < 0 || slot >= SaveManager.MAX_SLOTS) return null;

    try {
      const raw = localStorage.getItem(SaveManager.SAVE_KEY_PREFIX + slot);
      if (!raw) return null;

      const payload = JSON.parse(raw) as { data: string; checksum: string };
      const saveData = JSON.parse(payload.data) as SaveData;

      return {
        timestamp: saveData.timestamp,
        floor: saveData.runState.floor,
        heroCount: saveData.runState.heroes.length,
      };
    } catch {
      return null;
    }
  }

  // ---- Auto Save ----

  static autoSave(): void {
    SaveManager.saveGame(0);
  }

  // ---- Meta Progression ----

  static saveMeta(data: MetaProgressionData): void {
    try {
      const json = JSON.stringify(data);
      const checksum = SaveManager.generateChecksum(json);
      const payload = JSON.stringify({ data: json, checksum });
      localStorage.setItem(SaveManager.META_KEY, payload);
    } catch {
      console.error('SaveManager: failed to save meta progression');
    }
  }

  static loadMeta(): MetaProgressionData {
    try {
      const raw = localStorage.getItem(SaveManager.META_KEY);
      if (!raw) return SaveManager.defaultMeta();

      const payload = JSON.parse(raw) as { data: string; checksum: string };
      if (!SaveManager.validateChecksum(payload.data, payload.checksum)) {
        console.error('SaveManager: meta checksum mismatch, using defaults');
        return SaveManager.defaultMeta();
      }

      return JSON.parse(payload.data) as MetaProgressionData;
    } catch {
      return SaveManager.defaultMeta();
    }
  }

  private static defaultMeta(): MetaProgressionData {
    return {
      totalRuns: 0,
      totalVictories: 0,
      highestFloor: 0,
      unlockedHeroes: ['warrior', 'archer', 'mage'],
      unlockedRelics: [],
      permanentUpgrades: [],
      achievements: [],
    };
  }

  // ---- Checksum ----

  private static generateChecksum(data: string): string {
    // Simple DJB2 hash - not cryptographic, just tamper detection
    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash + data.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(36);
  }

  private static validateChecksum(data: string, checksum: string): boolean {
    return SaveManager.generateChecksum(data) === checksum;
  }
}
