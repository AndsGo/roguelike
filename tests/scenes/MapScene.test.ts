import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import Phaser from 'phaser';
import { MapScene } from '../../src/scenes/MapScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('MapScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
    const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
    rm.setMap(map);
  });

  function createMapScene(initData?: Record<string, unknown>): MapScene {
    return SceneTestHarness.createScene(MapScene, initData);
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createMapScene();
      expect(scene).toBeDefined();
    });

    it('init captures and consumes act transition flag', () => {
      const scene = createMapScene({ showActTransition: 2 });
      // pendingActTransition is consumed during create(), so it should be null after
      expect((scene as any).pendingActTransition).toBeNull();
    });

    it('init defaults to null when no transition', () => {
      const scene = createMapScene();
      expect((scene as any).pendingActTransition).toBeNull();
    });

    it('creates a map container', () => {
      const scene = createMapScene();
      expect((scene as any).mapContainer).toBeDefined();
    });

    it('populates nodePositions', () => {
      const scene = createMapScene();
      const positions = (scene as any).nodePositions;
      expect(positions).toBeInstanceOf(Map);
      expect(positions.size).toBeGreaterThan(0);
    });

    it('stores map nodes reference', () => {
      const scene = createMapScene();
      const nodes = (scene as any).mapNodes;
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);
    });
  });

  describe('map generation', () => {
    it('generates map if RunManager map is empty', () => {
      rm.setMap([]);
      const scene = createMapScene();
      // MapScene should have generated a new map
      expect(rm.getMap().length).toBeGreaterThan(0);
    });

    it('reuses existing map from RunManager', () => {
      const originalMap = rm.getMap();
      const originalLength = originalMap.length;
      const scene = createMapScene();
      expect(rm.getMap().length).toBe(originalLength);
    });
  });

  describe('tooltip', () => {
    it('starts with no active tooltip', () => {
      const scene = createMapScene();
      expect((scene as any).activeTooltip).toBeNull();
    });
  });

  describe('scroll state', () => {
    it('initializes drag state to false', () => {
      const scene = createMapScene();
      expect((scene as any).isDragging).toBe(false);
    });

    it('initializes scrollX to 0', () => {
      const scene = createMapScene();
      expect((scene as any).scrollX).toBe(0);
    });
  });
});
