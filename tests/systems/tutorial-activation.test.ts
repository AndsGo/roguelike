import { describe, it, expect, beforeEach } from 'vitest';
import { TutorialSystem } from '../../src/systems/TutorialSystem';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

/** Create a fully-chainable mock graphics/rectangle/text object for TutorialSystem. */
function makeMockScene() {
  const self = () => proxy;
  const proxy: Record<string, unknown> = new Proxy({}, {
    get(_target, prop) {
      if (prop === 'active') return true;
      if (prop === 'destroy') return () => {};
      return self;
    },
  });

  return {
    add: {
      graphics: () => proxy,
      text: () => proxy,
      rectangle: () => proxy,
    },
    time: {
      delayedCall: (_d: number, cb: () => void) => { cb(); return {}; },
    },
    cameras: { main: { width: 800, height: 450 } },
  };
}

describe('Tutorial Activation', () => {
  beforeEach(() => {
    mockStorage.clear();
    TutorialSystem.resetTips();
    TutorialSystem.init();
  });

  it('showTipIfNeeded marks tip as seen', () => {
    const mockScene = makeMockScene();
    TutorialSystem.showTipIfNeeded(mockScene as any, 'first_battle');
    expect(TutorialSystem.hasSeen('first_battle')).toBe(true);
  });

  it('showTipIfNeeded does not show same tip twice', () => {
    let renderCount = 0;
    const originalGraphics = makeMockScene().add.graphics;
    const mockScene = {
      ...makeMockScene(),
      add: {
        ...makeMockScene().add,
        graphics: () => {
          renderCount++;
          return originalGraphics();
        },
      },
    };

    TutorialSystem.showTipIfNeeded(mockScene as any, 'first_battle');
    const afterFirst = renderCount;
    TutorialSystem.showTipIfNeeded(mockScene as any, 'first_battle');
    const afterSecond = renderCount;
    expect(afterSecond).toBe(afterFirst);
  });

  it('allSkipped returns false after seeing only one tip', () => {
    const mockScene = makeMockScene();
    TutorialSystem.showTipIfNeeded(mockScene as any, 'first_battle');
    expect(TutorialSystem.allSkipped()).toBe(false);
  });
});
