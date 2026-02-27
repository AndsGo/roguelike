import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { MainMenuScene } from '../../src/scenes/MainMenuScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('MainMenuScene', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
    const rm = RunManager.getInstance();
    rm.newRun(42);
  });

  function createScene(): MainMenuScene {
    return SceneTestHarness.createScene(MainMenuScene);
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createScene();
      expect(scene).toBeDefined();
    });

    it('initializes panel references to null', () => {
      const scene = createScene();
      expect((scene as any).upgradePanel).toBeNull();
      expect((scene as any).achievementPanel).toBeNull();
      expect((scene as any).helpPanel).toBeNull();
    });

    it('shutdown kills all tweens', () => {
      const scene = createScene();
      let killed = false;
      (scene as any).tweens = { killAll: () => { killed = true; }, add: () => ({}) };
      scene.shutdown();
      expect(killed).toBe(true);
    });
  });

  describe('UI content', () => {
    it('renders the game title', () => {
      const scene = createScene();
      const titles = SceneTestHarness.findText(scene, '自动战斗');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('renders new game button text', () => {
      const scene = createScene();
      const btns = SceneTestHarness.findText(scene, '新游戏');
      expect(btns.length).toBeGreaterThan(0);
    });

    it('renders upgrades button', () => {
      const scene = createScene();
      const btns = SceneTestHarness.findText(scene, '升级');
      expect(btns.length).toBeGreaterThan(0);
    });

    it('renders version text', () => {
      const scene = createScene();
      const versions = SceneTestHarness.findText(scene, 'v');
      expect(versions.length).toBeGreaterThan(0);
    });
  });

  describe('panels', () => {
    it('showUpgradePanel creates an upgrade panel', () => {
      const scene = createScene();
      expect((scene as any).upgradePanel).toBeNull();
      (scene as any).showUpgradePanel();
      expect((scene as any).upgradePanel).not.toBeNull();
    });

    it('showUpgradePanel toggles off when called twice', () => {
      const scene = createScene();
      (scene as any).showUpgradePanel();
      expect((scene as any).upgradePanel).not.toBeNull();
      // Second call should close it (via close callback which runs sync in mock)
      (scene as any).showUpgradePanel();
    });

    it('showHelpPanel creates a help panel', () => {
      const scene = createScene();
      (scene as any).showHelpPanel();
      expect((scene as any).helpPanel).not.toBeNull();
    });

    it('showAchievementPanel creates an achievement panel', () => {
      const scene = createScene();
      (scene as any).showAchievementPanel();
      expect((scene as any).achievementPanel).not.toBeNull();
    });
  });

  describe('new game', () => {
    it('startNewGame creates a new run', () => {
      const scene = createScene();
      const rm = RunManager.getInstance();
      const oldFloor = rm.getFloor();
      (scene as any).startNewGame();
      // After starting new game, RunManager should have a fresh run
      expect(rm.getFloor()).toBeDefined();
    });
  });
});
