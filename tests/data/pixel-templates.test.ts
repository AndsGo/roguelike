import { describe, it, expect } from 'vitest';
import {
  HEAD_TEMPLATES,
  BODY_TEMPLATES,
  WEAPON_TEMPLATES,
  MONSTER_BODY_TEMPLATES,
  MONSTER_HEAD_TEMPLATES,
  PixelLayer,
} from '../../src/data/pixel-templates';

/** Count pixels that differ between two same-sized layers */
function pixelDiff(a: PixelLayer, b: PixelLayer): number {
  let diff = 0;
  for (let r = 0; r < a.length; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) diff++;
    }
  }
  return diff;
}

describe('HEAD_TEMPLATES dimensions', () => {
  for (const [race, layer] of Object.entries(HEAD_TEMPLATES)) {
    it(`${race} head is 16x8`, () => {
      expect(layer.length).toBe(8);
      for (const row of layer) {
        expect(row.length).toBe(16);
      }
    });
  }
});

describe('BODY_TEMPLATES dimensions', () => {
  for (const [role, layer] of Object.entries(BODY_TEMPLATES)) {
    it(`${role} body is 16x9`, () => {
      expect(layer.length).toBe(9);
      for (const row of layer) {
        expect(row.length).toBe(16);
      }
    });
  }
});

describe('WEAPON_TEMPLATES dimensions', () => {
  for (const [cls, layer] of Object.entries(WEAPON_TEMPLATES)) {
    it(`${cls} weapon is 16x9`, () => {
      expect(layer.length).toBe(9);
      for (const row of layer) {
        expect(row.length).toBe(16);
      }
    });
  }
});

describe('MONSTER_BODY_TEMPLATES dimensions', () => {
  for (const [type, layer] of Object.entries(MONSTER_BODY_TEMPLATES)) {
    it(`${type} monster body is 16x9`, () => {
      expect(layer.length).toBe(9);
      for (const row of layer) {
        expect(row.length).toBe(16);
      }
    });
  }
});

describe('MONSTER_HEAD_TEMPLATES dimensions', () => {
  for (const [type, layer] of Object.entries(MONSTER_HEAD_TEMPLATES)) {
    it(`${type} monster head is 16x8`, () => {
      expect(layer.length).toBe(8);
      for (const row of layer) {
        expect(row.length).toBe(16);
      }
    });
  }
});

describe('Race head differentiation', () => {
  const races = Object.keys(HEAD_TEMPLATES) as (keyof typeof HEAD_TEMPLATES)[];
  for (let i = 0; i < races.length; i++) {
    for (let j = i + 1; j < races.length; j++) {
      it(`${races[i]} vs ${races[j]} differ by >= 10 pixels`, () => {
        const diff = pixelDiff(HEAD_TEMPLATES[races[i]], HEAD_TEMPLATES[races[j]]);
        expect(diff).toBeGreaterThanOrEqual(10);
      });
    }
  }
});

describe('Support vs melee_dps body differentiation', () => {
  it('differ by >= 8 pixels', () => {
    const diff = pixelDiff(BODY_TEMPLATES.support, BODY_TEMPLATES.melee_dps);
    expect(diff).toBeGreaterThanOrEqual(8);
  });
});
