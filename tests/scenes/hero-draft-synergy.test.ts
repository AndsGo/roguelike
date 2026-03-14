import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import { HeroDraftScene } from '../../src/scenes/HeroDraftScene';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('HeroDraftScene synergy preview', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  it('shows placeholder text when no heroes selected', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);
    const placeholders = SceneTestHarness.findText(scene, '选择英雄查看羁绊');
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('updates synergy text when heroes are selected', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);
    (scene as any).toggleHeroSelection('warrior');
    (scene as any).toggleHeroSelection('mage');
    const texts = SceneTestHarness.findText(scene, '人类联盟');
    expect(texts.length).toBeGreaterThan(0);
  });

  it('reverts to placeholder when all heroes deselected', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);
    (scene as any).toggleHeroSelection('warrior');
    (scene as any).toggleHeroSelection('warrior');
    const placeholders = SceneTestHarness.findText(scene, '选择英雄查看羁绊');
    expect(placeholders.length).toBeGreaterThan(0);
  });
});
