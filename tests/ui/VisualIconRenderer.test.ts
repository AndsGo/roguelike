import { describe, expect, it, vi } from 'vitest';
import { createVisualIcon } from '../../src/ui/VisualIconRenderer';

describe('VisualIconRenderer', () => {
  it('creates a sprite from a visual sheet frame when loaded', () => {
    const sprite = {
      setDisplaySize: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis(),
    };
    const scene = {
      textures: { exists: vi.fn(() => true) },
      add: { sprite: vi.fn(() => sprite) },
    };

    const icon = createVisualIcon(scene as any, {
      sheetKey: 'item_icons',
      frameName: 'weapon',
      x: 10,
      y: 20,
      size: 18,
      alpha: 0.8,
      tint: 0xffcc00,
      fallbackText: 'W',
    });

    expect(scene.add.sprite).toHaveBeenCalledWith(10, 20, 'visual_item_icons', 0);
    expect(sprite.setDisplaySize).toHaveBeenCalledWith(18, 18);
    expect(sprite.setAlpha).toHaveBeenCalledWith(0.8);
    expect(sprite.setTint).toHaveBeenCalledWith(0xffcc00);
    expect(icon).toBe(sprite);
  });

  it('creates fallback text when the visual sheet is not loaded', () => {
    const text = {
      setResolution: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
    };
    const scene = {
      textures: { exists: vi.fn(() => false) },
      add: {
        sprite: vi.fn(),
        text: vi.fn(() => text),
      },
    };

    const icon = createVisualIcon(scene as any, {
      sheetKey: 'status_icons',
      frameName: 'stun',
      x: 10,
      y: 20,
      size: 14,
      alpha: 0.5,
      fallbackText: '!',
    });

    expect(scene.add.sprite).not.toHaveBeenCalled();
    expect(scene.add.text).toHaveBeenCalled();
    expect(text.setAlpha).toHaveBeenCalledWith(0.5);
    expect(icon).toBe(text);
  });
});
