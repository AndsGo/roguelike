import { EventBus } from './EventBus';
import { ErrorHandler } from './ErrorHandler';
import { SaveManager } from '../managers/SaveManager';
import { GameEventType } from '../types';

const AUDIO_SETTINGS_KEY = 'roguelike_audio_settings';
const MAX_CONCURRENT_SFX = 4;

interface AudioSettings {
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
}

/** Scene key → BGM key mapping */
const SCENE_BGM_MAP: Record<string, string> = {
  MainMenuScene: 'bgm_menu',
  HeroDraftScene: 'bgm_menu',
  MapScene: 'bgm_map',
  BattleScene: 'bgm_battle',
  RewardScene: 'bgm_victory',
  ShopScene: 'bgm_shop',
  RestScene: 'bgm_ambient',
  EventScene: 'bgm_event',
  VictoryScene: 'bgm_victory',
  GameOverScene: 'bgm_defeat',
};

/** EventBus event → SFX key mapping (typed for type-safe registration) */
const SFX_EVENT_ENTRIES: [GameEventType, string][] = [
  ['unit:damage', 'sfx_hit'],
  ['unit:kill', 'sfx_kill'],
  ['unit:heal', 'sfx_heal'],
  ['skill:use', 'sfx_skill'],
  ['element:reaction', 'sfx_reaction'],
  ['item:equip', 'sfx_equip'],
  ['achievement:unlock', 'sfx_levelup'],
];

/** All BGM keys for preloading */
export const BGM_KEYS = [
  'bgm_menu', 'bgm_map', 'bgm_battle', 'bgm_shop',
  'bgm_ambient', 'bgm_event', 'bgm_victory', 'bgm_defeat',
];

/** All SFX keys for preloading */
export const SFX_KEYS = [
  'sfx_hit', 'sfx_kill', 'sfx_heal', 'sfx_skill',
  'sfx_reaction', 'sfx_click', 'sfx_buy', 'sfx_equip', 'sfx_levelup',
  'sfx_select', 'sfx_coin', 'sfx_event_good', 'sfx_event_bad',
  'sfx_crit', 'sfx_error',
];

/**
 * Singleton audio manager handling BGM playback/crossfade and SFX.
 * Settings are persisted to localStorage.
 */
export class AudioManager {
  private static instance: AudioManager;
  private game: Phaser.Game | null = null;
  private settings: AudioSettings;
  private currentBgmKey: string = '';
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private activeSfxCount: number = 0;
  private sfxListenersRegistered: boolean = false;

  // Named SFX listener references
  private sfxListeners: Map<GameEventType, () => void> = new Map();

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Initialize with Phaser game reference */
  init(game: Phaser.Game): void {
    this.game = game;
    this.registerSfxListeners();
  }

  // ---- BGM ----

  /** Play BGM with optional crossfade */
  playBgm(key: string, fadeMs: number = 500): void {
    if (!this.game || !this.settings.bgmEnabled) return;
    if (key === this.currentBgmKey && this.currentBgm) return;

    const scene = this.getActiveScene();
    if (!scene) return;

    // Check if audio key exists
    if (!scene.sound.get(key) && !scene.cache.audio.exists(key)) return;

    // Fade out current BGM
    if (this.currentBgm) {
      const oldBgm = this.currentBgm;
      scene.tweens.add({
        targets: oldBgm,
        volume: 0,
        duration: fadeMs / 2,
        onComplete: () => {
          oldBgm.stop();
          oldBgm.destroy();
        },
      });
    }

    // Start new BGM
    const volume = this.settings.masterVolume * this.settings.bgmVolume;
    try {
      this.currentBgm = scene.sound.add(key, {
        loop: true,
        volume: 0,
      });
      this.currentBgm.play();
      this.currentBgmKey = key;

      // Fade in
      scene.tweens.add({
        targets: this.currentBgm,
        volume,
        duration: fadeMs / 2,
        delay: fadeMs / 2,
      });
    } catch (e) {
      ErrorHandler.report('warn', 'AudioManager', `failed to play BGM: ${key}`);
      this.currentBgm = null;
      this.currentBgmKey = '';
    }
  }

  /** Auto-select and play BGM based on scene key */
  onSceneStart(sceneKey: string): void {
    const bgmKey = SCENE_BGM_MAP[sceneKey];
    if (bgmKey) {
      this.playBgm(bgmKey);
    }
  }

  /** Stop current BGM immediately */
  stopBgm(): void {
    if (this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = null;
      this.currentBgmKey = '';
    }
  }

  /** Toggle BGM on/off */
  toggleBgm(): boolean {
    this.settings.bgmEnabled = !this.settings.bgmEnabled;
    if (!this.settings.bgmEnabled && this.currentBgm) {
      this.currentBgm.stop();
      this.currentBgm.destroy();
      this.currentBgm = null;
      this.currentBgmKey = '';
    }
    this.saveSettings();
    return this.settings.bgmEnabled;
  }

  /** Toggle SFX on/off */
  toggleSfx(): boolean {
    this.settings.sfxEnabled = !this.settings.sfxEnabled;
    this.saveSettings();
    return this.settings.sfxEnabled;
  }

  // ---- SFX ----

  /** Play a one-shot sound effect (fire-and-forget, with concurrency limit and pitch variation) */
  playSfx(key: string): void {
    if (!this.game || !this.settings.sfxEnabled) return;
    if (this.activeSfxCount >= MAX_CONCURRENT_SFX) return;

    const scene = this.getActiveScene();
    if (!scene) return;

    if (!scene.cache.audio.exists(key)) return;

    try {
      const volume = this.settings.masterVolume * this.settings.sfxVolume;
      // Random detune ±50 cents for natural variation on repeated sounds
      const detune = (Math.random() - 0.5) * 100;
      const sfx = scene.sound.add(key, { volume, detune });
      this.activeSfxCount++;
      sfx.once('complete', () => {
        this.activeSfxCount--;
        sfx.destroy();
      });
      sfx.play();
    } catch {
      ErrorHandler.report('warn', 'AudioManager', `failed to play SFX: ${key}`);
    }
  }

  /** Register EventBus listeners for SFX triggers */
  registerSfxListeners(): void {
    if (this.sfxListenersRegistered) return;
    this.sfxListenersRegistered = true;

    const bus = EventBus.getInstance();
    for (const [eventName, sfxKey] of SFX_EVENT_ENTRIES) {
      const listener = () => this.playSfx(sfxKey);
      this.sfxListeners.set(eventName, listener);
      bus.on(eventName, listener);
    }
  }

  /** Unregister EventBus SFX listeners */
  unregisterSfxListeners(): void {
    if (!this.sfxListenersRegistered) return;
    this.sfxListenersRegistered = false;

    const bus = EventBus.getInstance();
    for (const [eventName, listener] of this.sfxListeners) {
      bus.off(eventName, listener);
    }
    this.sfxListeners.clear();
  }

  // ---- Volume Control ----

  setMasterVolume(v: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, v));
    this.updateBgmVolume();
    this.saveSettings();
  }

  setBgmVolume(v: number): void {
    this.settings.bgmVolume = Math.max(0, Math.min(1, v));
    this.updateBgmVolume();
    this.saveSettings();
  }

  setSfxVolume(v: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, v));
    this.saveSettings();
  }

  getMasterVolume(): number { return this.settings.masterVolume; }
  getBgmVolume(): number { return this.settings.bgmVolume; }
  getSfxVolume(): number { return this.settings.sfxVolume; }
  isBgmEnabled(): boolean { return this.settings.bgmEnabled; }
  isSfxEnabled(): boolean { return this.settings.sfxEnabled; }

  private updateBgmVolume(): void {
    if (this.currentBgm && 'volume' in this.currentBgm) {
      (this.currentBgm as unknown as { volume: number }).volume =
        this.settings.masterVolume * this.settings.bgmVolume;
    }
  }

  // ---- Settings Persistence ----

  private loadSettings(): AudioSettings {
    const loaded = SaveManager.loadData<AudioSettings>(AUDIO_SETTINGS_KEY);
    if (loaded) return loaded;
    return {
      masterVolume: 0.7,
      bgmVolume: 0.5,
      sfxVolume: 0.6,
      bgmEnabled: true,
      sfxEnabled: true,
    };
  }

  private saveSettings(): void {
    SaveManager.saveData(AUDIO_SETTINGS_KEY, this.settings);
  }

  // ---- Helpers ----

  private getActiveScene(): Phaser.Scene | null {
    if (!this.game) return null;
    const scenes = this.game.scene.getScenes(true);
    return scenes.length > 0 ? scenes[0] : null;
  }
}
