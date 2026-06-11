import { describe, expect, it, vi } from 'vitest';
import { MapRenderer } from '../../src/ui/MapRenderer';

describe('MapRenderer visual sprite icons', () => {
  it('uses the map_nodes spritesheet frame when loaded', () => {
    const sprite = {
      setDisplaySize: vi.fn().mockReturnThis(),
      setOrigin: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
    };
    const scene = {
      textures: { exists: vi.fn(() => true) },
      add: { sprite: vi.fn(() => sprite) },
    };

    const icon = MapRenderer.createNodeIcon(scene as any, 120, 80, 'boss', 0.75);

    expect(scene.add.sprite).toHaveBeenCalledWith(120, 80, 'visual_map_nodes', 2);
    expect(sprite.setDisplaySize).toHaveBeenCalledWith(28, 28);
    expect(sprite.setAlpha).toHaveBeenCalledWith(0.75);
    expect(icon).toBe(sprite);
  });

  it('falls back to text labels when the map_nodes spritesheet is unavailable', () => {
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

    const icon = MapRenderer.createNodeIcon(scene as any, 120, 80, 'shop', 0.5);

    expect(scene.add.sprite).not.toHaveBeenCalled();
    expect(scene.add.text).toHaveBeenCalled();
    expect(text.setAlpha).toHaveBeenCalledWith(0.5);
    expect(icon).toBe(text);
  });
});
