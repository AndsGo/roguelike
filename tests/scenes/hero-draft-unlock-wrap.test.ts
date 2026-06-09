import { describe, it, expect, beforeEach } from 'vitest';
import { createMockLocalStorage } from '../mocks/phaser';

const mockStorage = createMockLocalStorage();
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true });

import { HeroDraftScene } from '../../src/scenes/HeroDraftScene';
import { EventBus } from '../../src/systems/EventBus';
import { SceneTestHarness } from '../helpers/scene-harness';

/** Recursively collect every Text-like object (has .style + .text) from the scene. */
function collectTexts(scene: any): any[] {
  const out: any[] = [];
  const walk = (o: any) => {
    if (!o) return;
    if (o.style && typeof o.text === 'string') out.push(o);
    if (Array.isArray(o.list)) o.list.forEach(walk);
  };
  if (scene.children?.getAll) scene.children.getAll().forEach(walk);
  return out;
}

/**
 * Regression guard for the locked-hero unlock-text overflow: the hero cards are
 * narrow (74px), and the unlock-condition strings are spaceless Chinese. Phaser's
 * default whitespace word-wrap can't break them, so they must use `useAdvancedWrap`
 * to wrap at character boundaries and stay within the card (issue: hero-draft
 * "carbon-copy" text bleeding into neighbouring cells).
 */
describe('HeroDraftScene locked-hero unlock text wrapping (CJK overflow)', () => {
  beforeEach(() => {
    EventBus.getInstance().reset();
  });

  it('wraps narrow card-width text with useAdvancedWrap so spaceless CJK fits', () => {
    const scene = SceneTestHarness.createScene(HeroDraftScene);

    // Unlock-condition labels are the only texts wrapped to the narrow card width.
    const narrowWrapped = collectTexts(scene).filter(
      t => t.style?.wordWrap && typeof t.style.wordWrap.width === 'number' && t.style.wordWrap.width <= 70,
    );

    expect(narrowWrapped.length).toBeGreaterThan(0); // locked heroes exist by default
    for (const t of narrowWrapped) {
      expect(
        t.style.wordWrap.useAdvancedWrap,
        `narrow-wrapped text "${String(t.text).slice(0, 12)}" must use advanced wrap to avoid CJK overflow`,
      ).toBe(true);
    }
  });
});
