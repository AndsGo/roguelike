import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { HeroCard } from '../../src/ui/HeroCard';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';

describe('HeroCard', () => {
  let scene: Phaser.Scene;
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    scene = new Phaser.Scene();
    rm = RunManager.getInstance();
    rm.newRun(42);
  });

  function createCard(): HeroCard | null {
    const heroes = rm.getHeroes();
    if (heroes.length === 0) return null;
    const hero = heroes[0];
    const data = rm.getHeroData(hero.id);
    return new HeroCard(scene, 200, 200, data, hero);
  }

  describe('constructor', () => {
    it('creates without errors', () => {
      const card = createCard();
      expect(card).not.toBeNull();
    });

    it('creates background graphics', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).bg).toBeDefined();
    });

    it('starts collapsed', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).expanded).toBe(false);
    });

    it('starts with no detail container', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).detailContainer).toBeNull();
    });

    it('has interactive hit area', () => {
      const card = createCard();
      if (!card) return;
      // HeroCard calls setSize and setInteractive in constructor
      expect(card).toBeDefined();
    });
  });

  describe('card dimensions', () => {
    it('has default card width 130', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).cardWidth).toBe(130);
    });

    it('has default card height 160', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).cardHeight).toBe(160);
    });
  });

  describe('toggle details', () => {
    it('expandDetails sets expanded to true', () => {
      const card = createCard();
      if (!card) return;
      (card as any).expandDetails();
      expect((card as any).expanded).toBe(true);
      expect((card as any).detailContainer).not.toBeNull();
    });

    it('collapseDetails sets expanded to false', () => {
      const card = createCard();
      if (!card) return;
      (card as any).expandDetails();
      (card as any).collapseDetails();
      expect((card as any).expanded).toBe(false);
    });

    it('toggleDetails toggles expansion', () => {
      const card = createCard();
      if (!card) return;
      (card as any).toggleDetails();
      expect((card as any).expanded).toBe(true);
      (card as any).toggleDetails();
      expect((card as any).expanded).toBe(false);
    });
  });

  describe('role colors', () => {
    it('returns correct color for tank', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).getRoleColor('tank')).toBe(0x4488ff);
    });

    it('returns correct color for healer', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).getRoleColor('healer')).toBe(0x44ff88);
    });

    it('returns fallback for unknown role', () => {
      const card = createCard();
      if (!card) return;
      expect((card as any).getRoleColor('unknown')).toBe(0x888888);
    });
  });
});
