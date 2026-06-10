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
  // unit kill/death handled by custom unit:death listener (hero deaths get a low-pitched variant)
  ['unit:heal', 'sfx_heal'],
  // skill:use and element:reaction handled by custom listeners below
  ['item:equip', 'sfx_equip'],
  ['achievement:unlock', 'sfx_levelup'],
  ['ultimate:ready', 'sfx_ult_ready'],
  ['ultimate:used', 'sfx_ult_cast'],
];

/** All BGM keys for preloading */
export const BGM_KEYS = [
  'bgm_menu', 'bgm_map', 'bgm_battle', 'bgm_boss', 'bgm_shop',
  'bgm_ambient', 'bgm_event', 'bgm_victory', 'bgm_defeat',
];

/** All SFX keys for preloading */
export const SFX_KEYS = [
  'sfx_hit', 'sfx_kill', 'sfx_heal', 'sfx_skill',
  'sfx_reaction', 'sfx_click', 'sfx_buy', 'sfx_equip', 'sfx_levelup',
  'sfx_select', 'sfx_coin', 'sfx_event_good', 'sfx_event_bad',
  'sfx_crit', 'sfx_error',
  // Categorized skill SFX
  'sfx_melee', 'sfx_ranged', 'sfx_magic', 'sfx_heal_cast',
  // Element reaction SFX
  'sfx_react_melt', 'sfx_react_overload', 'sfx_react_superconduct', 'sfx_react_annihilate',
  // Ultimate SFX
  'sfx_ult_ready', 'sfx_ult_cast',
];

/** Chinese reaction name → SFX key mapping */
const REACTION_SFX_MAP: Record<string, string> = {
  '融化': 'sfx_react_melt',
  '超载': 'sfx_react_overload',
  '超导': 'sfx_react_superconduct',
  '湮灭': 'sfx_react_annihilate',
};

/** Determine SFX key for a skill:use event based on caster role and ally flag */
export function getSkillSfxKey(data: { casterRole?: string; isAllySkill?: boolean }): string {
  if (data.isAllySkill) return 'sfx_heal_cast';
  switch (data.casterRole) {
    case 'tank': case 'melee_dps': return 'sfx_melee';
    case 'ranged_dps': return 'sfx_ranged';
    case 'healer': return 'sfx_heal_cast';
    case 'support': return 'sfx_magic';
    default: return 'sfx_skill';
  }
}

/** Determine SFX key for an element:reaction event based on Chinese reactionType */
export function getReactionSfxKey(reactionType: string): string {
  return REACTION_SFX_MAP[reactionType] ?? 'sfx_reaction';
}

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
  /** Previous BGM instance still fading out (cleared on fade completion) */
  private fadingBgm: Phaser.Sound.BaseSound | null = null;
  /** Playback rate applied to bgm_battle, varies per act */
  private battleBgmRate: number = 1.0;
  private activeSfxCount: number = 0;
  private sfxListenersRegistered: boolean = false;

  // Named SFX listener references
  private sfxListeners: Map<GameEventType, (...args: any[]) => void> = new Map();

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

    // If a previous BGM is still fading out, kill it immediately to avoid orphan instances
    if (this.fadingBgm) {
      const stale = this.fadingBgm;
      this.fadingBgm = null;
      try {
        stale.stop();
        stale.destroy();
      } catch {
        // already destroyed by its fade tween — nothing to do
      }
    }

    // Fade out current BGM
    if (this.currentBgm) {
      const oldBgm = this.currentBgm;
      this.fadingBgm = oldBgm;
      scene.tweens.add({
        targets: oldBgm,
        volume: 0,
        duration: fadeMs / 2,
        onComplete: () => {
          oldBgm.stop();
          oldBgm.destroy();
          if (this.fadingBgm === oldBgm) this.fadingBgm = null;
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

      // Per-act variation for the battle theme (boss theme stays at 1.0)
      if (key === 'bgm_battle') {
        this.applyBgmRate(this.currentBgm, this.battleBgmRate);
      }

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

  /**
   * Set the current battle act for BGM variation. Applies a per-act playback
   * rate to bgm_battle (act0=1.0, act1=1.04, act2=0.96, act3=1.08).
   * Called by BattleScene.create; boss battles use bgm_boss and are unaffected.
   */
  setBattleAct(act: number): void {
    const rates = [1.0, 1.04, 0.96, 1.08];
    this.battleBgmRate = rates[act] ?? 1.0;
    if (this.currentBgmKey === 'bgm_battle' && this.currentBgm) {
      this.applyBgmRate(this.currentBgm, this.battleBgmRate);
    }
  }

  /** Apply playback rate to a BGM instance (setRate lives on concrete sound classes) */
  private applyBgmRate(bgm: Phaser.Sound.BaseSound, rate: number): void {
    const sound = bgm as unknown as { setRate?: (rate: number) => void };
    if (typeof sound.setRate === 'function') {
      sound.setRate(rate);
    }
  }

  /** Stop current BGM immediately */
  stopBgm(): void {
    if (this.fadingBgm) {
      const stale = this.fadingBgm;
      this.fadingBgm = null;
      try {
        stale.stop();
        stale.destroy();
      } catch {
        // already destroyed
      }
    }
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

  /**
   * Play a one-shot SFX with explicit detune/rate/volume overrides.
   * Used for stingers and pitched variants — intentionally independent of
   * playSfx's concurrency/priority logic (these are low-frequency, high-salience cues).
   */
  playSfxVariant(key: string, opts: { detune?: number; rate?: number; volumeScale?: number } = {}): void {
    if (!this.game || !this.settings.sfxEnabled) return;

    const scene = this.getActiveScene();
    if (!scene) return;
    if (!scene.cache.audio.exists(key)) return;

    try {
      const volume = this.settings.masterVolume * this.settings.sfxVolume * (opts.volumeScale ?? 1);
      const sfx = scene.sound.add(key, {
        volume,
        detune: opts.detune ?? 0,
        rate: opts.rate ?? 1,
      });
      sfx.once('complete', () => sfx.destroy());
      sfx.play();
    } catch {
      ErrorHandler.report('warn', 'AudioManager', `failed to play SFX variant: ${key}`);
    }
  }

  /** Two-part victory stinger: bright levelup followed by a coin chime */
  playVictoryStinger(): void {
    this.playSfxVariant('sfx_levelup', { detune: 200 });
    setTimeout(() => this.playSfxVariant('sfx_coin'), 100);
  }

  /** Defeat stinger: deep-pitched bad-event cue */
  playDefeatStinger(): void {
    this.playSfxVariant('sfx_event_bad', { detune: -500 });
  }

  /** Two-part boss phase-transition stinger: low crit hit, then rising ult-ready cue */
  private playBossPhaseStinger(): void {
    this.playSfxVariant('sfx_crit', { detune: -300 });
    setTimeout(() => this.playSfxVariant('sfx_ult_ready', { detune: 200 }), 250);
  }

  /** Register EventBus listeners for SFX triggers */
  registerSfxListeners(): void {
    if (this.sfxListenersRegistered) return;
    this.sfxListenersRegistered = true;

    const bus = EventBus.getInstance();

    // Simple 1:1 event→SFX mappings
    for (const [eventName, sfxKey] of SFX_EVENT_ENTRIES) {
      const listener = () => this.playSfx(sfxKey);
      this.sfxListeners.set(eventName, listener);
      bus.on(eventName, listener);
    }

    // Custom skill:use dispatch by caster role
    const skillListener = (data: { casterRole?: string; isAllySkill?: boolean }) => {
      this.playSfx(getSkillSfxKey(data));
    };
    this.sfxListeners.set('skill:use', skillListener);
    bus.on('skill:use', skillListener);

    // Custom element:reaction dispatch by Chinese reaction name
    const reactionListener = (data: { reactionType: string }) => {
      this.playSfx(getReactionSfxKey(data.reactionType));
    };
    this.sfxListeners.set('element:reaction', reactionListener);
    bus.on('element:reaction', reactionListener);

    // Unit death: heroes get a deep-pitched kill sound, enemies keep the standard one
    const deathListener = (data: { unitId: string; isHero: boolean }) => {
      if (data.isHero) {
        this.playSfxVariant('sfx_kill', { detune: -400 });
      } else {
        this.playSfx('sfx_kill');
      }
    };
    this.sfxListeners.set('unit:death', deathListener);
    bus.on('unit:death', deathListener);

    // Boss phase transition: two-part stinger
    const bossPhaseListener = () => this.playBossPhaseStinger();
    this.sfxListeners.set('boss:phase', bossPhaseListener);
    bus.on('boss:phase', bossPhaseListener);

    // Relic acquisition: bright equip variant
    const relicListener = () => this.playSfxVariant('sfx_equip', { detune: 300 });
    this.sfxListeners.set('relic:acquire', relicListener);
    bus.on('relic:acquire', relicListener);

    // Combo escalation: rising pitch from 3 hits onward (bypasses playSfx throttling — low frequency)
    const comboListener = (data: { unitId: string; comboCount: number }) => {
      if (data.comboCount >= 3) {
        this.playSfxVariant('sfx_hit', { detune: Math.min(600, data.comboCount * 60) });
      }
    };
    this.sfxListeners.set('combo:hit', comboListener);
    bus.on('combo:hit', comboListener);
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
    // Prefer a real scene with a usable audio cache (skip system/bootstrap scenes)
    for (const s of scenes) {
      if (s.sys?.settings?.key !== '__SYSTEM' && s.cache?.audio) {
        return s;
      }
    }
    return scenes.length > 0 ? scenes[0] : null;
  }
}
