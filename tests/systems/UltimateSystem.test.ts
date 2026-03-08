import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UltimateSystem } from '../../src/systems/UltimateSystem';
import { EventBus } from '../../src/systems/EventBus';

// Mock hero-like objects
function mockHero(id: string, skills: { id: string; isUltimate?: boolean }[] = []) {
  return {
    unitId: id,
    isHero: true,
    isAlive: true,
    skills,
    skillCooldowns: new Map<string, number>(),
  } as any;
}

describe('UltimateSystem', () => {
  let system: UltimateSystem;

  beforeEach(() => {
    system = new UltimateSystem();
    EventBus.getInstance().reset();
  });

  describe('activation', () => {
    it('should initialize energy to 0 for all heroes', () => {
      const heroes = [
        mockHero('h1', [{ id: 'ult_test', isUltimate: true }]),
        mockHero('h2', [{ id: 'ult_test2', isUltimate: true }]),
      ];
      system.activate(heroes);
      expect(system.getEnergy('h1')).toBe(0);
      expect(system.getEnergy('h2')).toBe(0);
    });

    it('should track ultimate skill IDs per hero', () => {
      const heroes = [
        mockHero('h1', [{ id: 'normal' }, { id: 'ult_test', isUltimate: true }]),
      ];
      system.activate(heroes);
      expect(system.getUltimateSkillId('h1')).toBe('ult_test');
    });

    it('should return null for heroes without ultimates', () => {
      const heroes = [mockHero('h1', [{ id: 'normal' }])];
      system.activate(heroes);
      expect(system.getUltimateSkillId('h1')).toBeNull();
    });
  });

  describe('energy charging', () => {
    it('should add passive energy via update()', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.update(1000); // 1 second = +2 energy
      expect(system.getEnergy('h1')).toBeCloseTo(2, 1);
    });

    it('should clamp energy at 100', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.addEnergy('h1', 150);
      expect(system.getEnergy('h1')).toBe(100);
    });

    it('should add energy on unit:attack event', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      EventBus.getInstance().emit('unit:attack', { sourceId: 'h1', targetId: 'e1', damage: 10 });
      expect(system.getEnergy('h1')).toBe(3);
    });

    it('should add energy on skill:use event (non-ultimate)', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      EventBus.getInstance().emit('skill:use', { casterId: 'h1', skillId: 'normal_skill', targets: [] });
      expect(system.getEnergy('h1')).toBe(5);
    });

    it('should NOT add energy when ultimate skill is used', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      EventBus.getInstance().emit('skill:use', { casterId: 'h1', skillId: 'ult_test', targets: [] });
      expect(system.getEnergy('h1')).toBe(0);
    });

    it('should add energy on unit:damage for hero targets', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      EventBus.getInstance().emit('unit:damage', {
        sourceId: 'e1', targetId: 'h1', amount: 50, damageType: 'physical', isCrit: false,
      });
      expect(system.getEnergy('h1')).toBe(2);
    });

    it('should add energy on unit:kill for hero killers', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      EventBus.getInstance().emit('unit:kill', { killerId: 'h1', targetId: 'e1' });
      expect(system.getEnergy('h1')).toBe(10);
    });

    it('should NOT add energy for non-hero events', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      EventBus.getInstance().emit('unit:attack', { sourceId: 'e1', targetId: 'h1', damage: 10 });
      expect(system.getEnergy('e1')).toBe(0);
    });
  });

  describe('readiness', () => {
    it('should report ready when energy >= 100', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.addEnergy('h1', 100);
      expect(system.isReady('h1')).toBe(true);
    });

    it('should not be ready when energy < 100', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.addEnergy('h1', 99);
      expect(system.isReady('h1')).toBe(false);
    });

    it('should emit ultimate:ready when crossing 100 threshold', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      const spy = vi.fn();
      EventBus.getInstance().on('ultimate:ready', spy);
      system.addEnergy('h1', 100);
      expect(spy).toHaveBeenCalledWith({ unitId: 'h1', heroIndex: 0 });
    });
  });

  describe('using ultimate', () => {
    it('should reset energy to 0 after use', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.addEnergy('h1', 100);
      system.consumeEnergy('h1');
      expect(system.getEnergy('h1')).toBe(0);
      expect(system.isReady('h1')).toBe(false);
    });

    it('should emit ultimate:used event', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.addEnergy('h1', 100);
      const spy = vi.fn();
      EventBus.getInstance().on('ultimate:used', spy);
      system.consumeEnergy('h1');
      expect(spy).toHaveBeenCalledWith({ unitId: 'h1', skillId: 'ult_test' });
    });
  });

  describe('deactivation', () => {
    it('should clear all state and unsubscribe events', () => {
      const heroes = [mockHero('h1', [{ id: 'ult_test', isUltimate: true }])];
      system.activate(heroes);
      system.addEnergy('h1', 50);
      system.deactivate();
      expect(system.getEnergy('h1')).toBe(0);
      EventBus.getInstance().emit('unit:attack', { sourceId: 'h1', targetId: 'e1', damage: 10 });
      expect(system.getEnergy('h1')).toBe(0);
    });
  });
});
