import { describe, it, expect } from 'vitest';
import {
  ROLE_ICON_TEMPLATES, ELEMENT_ICON_TEMPLATES,
  drawRoleIcon, drawElementIcon,
} from '../../src/ui/PixelIcons';

const ROLE_KEYS = ['tank', 'melee_dps', 'ranged_dps', 'healer', 'support'];
const ELEMENT_KEYS = ['fire', 'ice', 'lightning', 'dark', 'holy'];

describe('PixelIcons', () => {
  it('has templates for all 5 roles matching UnitRole enum', () => {
    for (const role of ROLE_KEYS) {
      expect(ROLE_ICON_TEMPLATES).toHaveProperty(role);
    }
  });

  it('has templates for all 5 elements matching ElementType enum', () => {
    for (const el of ELEMENT_KEYS) {
      expect(ELEMENT_ICON_TEMPLATES).toHaveProperty(el);
    }
  });

  it('each template is an 8x8 grid with valid values (0, 1, or 2)', () => {
    for (const [key, t] of Object.entries(ROLE_ICON_TEMPLATES)) {
      expect(t.length, `${key} should have 8 rows`).toBe(8);
      for (const row of t) {
        expect(row.length, `${key} row should have 8 cols`).toBe(8);
        for (const val of row) expect([0, 1, 2]).toContain(val);
      }
    }
    for (const [key, t] of Object.entries(ELEMENT_ICON_TEMPLATES)) {
      expect(t.length, `${key} should have 8 rows`).toBe(8);
      for (const row of t) {
        expect(row.length, `${key} row should have 8 cols`).toBe(8);
        for (const val of row) expect([0, 1, 2]).toContain(val);
      }
    }
  });

  it('drawRoleIcon does not throw for unknown role key', () => {
    const mockG = { fillStyle: () => {}, fillRect: () => {} } as any;
    expect(() => drawRoleIcon(mockG, 0, 0, 'nonexistent_role')).not.toThrow();
  });

  it('drawElementIcon does not throw for unknown element key', () => {
    const mockG = { fillStyle: () => {}, fillRect: () => {} } as any;
    expect(() => drawElementIcon(mockG, 0, 0, 'nonexistent_element')).not.toThrow();
  });

  it('drawRoleIcon calls fillRect for scale=2', () => {
    let fillCount = 0;
    const mockG = { fillStyle: () => {}, fillRect: () => { fillCount++; } } as any;
    drawRoleIcon(mockG, 0, 0, 'tank', 2);
    expect(fillCount).toBeGreaterThan(0);
  });
});
