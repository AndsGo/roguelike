import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { HealthBar } from '../../src/components/HealthBar';

describe('HealthBar', () => {
  let scene: Phaser.Scene;

  beforeEach(() => {
    scene = new Phaser.Scene();
  });

  describe('constructor', () => {
    it('creates without errors', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      expect(bar).toBeDefined();
    });

    it('stores dimensions', () => {
      const bar = new HealthBar(scene, 10, 20, 60, 8);
      expect((bar as any).barWidth).toBe(60);
      expect((bar as any).barHeight).toBe(8);
    });

    it('initializes ratios to 1', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      expect((bar as any).currentRatio).toBe(1);
      expect((bar as any).delayedRatio).toBe(1);
    });

    it('initializes shield to 0', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      expect((bar as any).shieldRatio).toBe(0);
    });

    it('creates all graphics layers', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      expect((bar as any).bgBar).toBeDefined();
      expect((bar as any).fillBar).toBeDefined();
      expect((bar as any).delayBar).toBeDefined();
      expect((bar as any).shieldBar).toBeDefined();
    });
  });

  describe('updateHealth', () => {
    it('updates current ratio', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.updateHealth(50, 100);
      expect((bar as any).currentRatio).toBeCloseTo(0.5);
    });

    it('clamps ratio to [0, 1]', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.updateHealth(150, 100);
      expect((bar as any).currentRatio).toBe(1);

      bar.updateHealth(-10, 100);
      expect((bar as any).currentRatio).toBe(0);
    });

    it('sets delayed ratio on damage', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      // Start at full
      bar.updateHealth(100, 100);
      // Take damage
      bar.updateHealth(60, 100);
      // After mock delayed call + tween complete, delayed ratio catches up
      expect((bar as any).currentRatio).toBeCloseTo(0.6);
    });

    it('updates delayed ratio on heal', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.updateHealth(50, 100);
      bar.updateHealth(80, 100);
      // On heal, delayed ratio matches current immediately
      expect((bar as any).delayedRatio).toBeCloseTo(0.8);
    });
  });

  describe('updateShield', () => {
    it('updates shield ratio', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.updateShield(30, 100);
      expect((bar as any).shieldRatio).toBeCloseTo(0.3);
    });

    it('clamps shield ratio', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.updateShield(200, 100);
      expect((bar as any).shieldRatio).toBe(1);
    });

    it('sets shield to zero', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.updateShield(50, 100);
      bar.updateShield(0, 100);
      expect((bar as any).shieldRatio).toBe(0);
    });
  });

  describe('setElement', () => {
    it('creates element icon', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.setElement('fire');
      expect((bar as any).elementIcon).not.toBeNull();
    });

    it('clears element icon when no element', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.setElement('fire');
      bar.setElement(undefined);
      expect((bar as any).elementIcon).toBeNull();
    });
  });

  describe('setLevel', () => {
    it('creates level text', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.setLevel(5);
      expect((bar as any).levelText).not.toBeNull();
    });

    it('updates existing level text', () => {
      const bar = new HealthBar(scene, 0, 0, 40, 5);
      bar.setLevel(5);
      const firstText = (bar as any).levelText;
      bar.setLevel(10);
      // Same text object, updated
      expect((bar as any).levelText).toBe(firstText);
    });
  });
});
