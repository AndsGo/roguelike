import { describe, expect, it, vi } from 'vitest';
import { createCodexUnitPortrait } from '../../src/ui/CodexUnitPortrait';

describe('CodexUnitPortrait', () => {
  it('uses the authored unit spritesheet frame when the texture is loaded', () => {
    const image = {
      setOrigin: vi.fn().mockReturnThis(),
      setDisplaySize: vi.fn().mockReturnThis(),
    };
    const scene = {
      textures: { exists: vi.fn((key: string) => key === 'ai_unit_hero_warrior') },
      add: { image: vi.fn(() => image) },
    };

    const portrait = createCodexUnitPortrait(scene as any, {
      id: 'warrior',
      name: 'Warrior',
      role: 'tank',
      race: 'human',
      class: 'warrior',
      spriteKey: 'hero_warrior',
      baseStats: {},
      skills: [],
    } as any, true, 40, 50, 64);

    expect(scene.add.image).toHaveBeenCalledWith(40, 50, 'ai_unit_hero_warrior', 0);
    expect(image.setDisplaySize).toHaveBeenCalledWith(64, 64);
    expect(portrait).toBe(image);
  });
});
