/**
 * Pixel-art chibi character templates.
 *
 * Each character is a 16×20 grid of palette indices, composed from layered
 * templates (body by role, head by race, face, weapon by class).
 * At runtime, palette indices are resolved to actual hex colors and rendered
 * to a Phaser texture via Graphics.generateTexture().
 */

import { UnitRole, RaceType, ClassType, MonsterType } from '../types';

// ── Palette index constants ──

export const P = {
  _:  0,   // transparent
  O:  1,   // outline (borderColor)
  F:  2,   // primary fill (fillColor)
  S:  3,   // shadow: darken(fill, 0.15)
  H:  4,   // highlight: lighten(fill, 0.1)
  SK: 5,   // skin (race-based)
  SD: 6,   // skin dark: darken(skin, 0.15)
  E:  7,   // eye color (black hero / red enemy)
  A:  8,   // accent (raceAccent color)
  W:  9,   // weapon base
  WG: 10,  // weapon glow
  CG: 11,  // crown gold
  FD: 12,  // fill dark: darken(fill, 0.25) for legs
  BR: 13,  // brow (enemy angry brows, dark)
} as const;

export type PaletteIndex = (typeof P)[keyof typeof P];

/** A pixel layer — 2D array of palette indices. Non-zero values overwrite. */
export type PixelLayer = PaletteIndex[][];

const { _, O, F, S, H, SK, SD, E, A, W, WG, CG, FD, BR } = P;

// ── Body templates (rows 8-16, i.e. torso + arms region of the 16×20 grid) ──
// These are 16 wide × 9 tall sub-grids applied at row offset 7

export const BODY_TEMPLATES: Record<UnitRole, PixelLayer> = {
  tank: [
    // Row 7-15: wide torso with shoulder pads, thick arms
    [_, O, O, O, O, O, O, O, O, O, O, O, O, O, O, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, F, F, H, F, F, F, F, F, F, F, F, H, F, F, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, O, O, O, O, O, O, O, O, O, O, O, _, _],
  ],
  melee_dps: [
    // Medium torso, slightly tapered
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, F, F, H, F, F, F, F, H, F, F, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  ranged_dps: [
    // Slim torso, arms forward
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, O, F, F, H, F, F, H, F, F, O, _, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, _, _, O, S, F, F, S, O, _, _, _, _, _],
    [_, _, _, _, _, O, S, F, F, S, O, _, _, _, _, _],
    [_, _, _, _, _, _, O, O, O, O, _, _, _, _, _, _],
  ],
  healer: [
    // Medium torso with robe flare at bottom
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, F, F, H, F, F, F, F, H, F, F, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, O, O, O, O, O, O, O, O, O, O, O, O, O, O, O],
  ],
  support: [
    // Robed torso with accent shoulder ornaments, wide flared bottom
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
    [_, _, _, O, A, F, F, F, F, F, F, A, O, _, _, _],
    [_, _, O, S, F, F, H, F, F, H, F, F, S, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, A, F, F, F, F, F, F, F, F, F, F, A, O, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, O, O, O, A, O, O, O, O, O, O, A, O, O, O, O],
  ],
};

// ── Head templates (rows 0-7 of the 16×20 grid) ──
// 16 wide × 8 tall sub-grids, applied at row offset 0

export const HEAD_TEMPLATES: Record<RaceType, PixelLayer> = {
  human: [
    // Round head with short hair outline, wider top
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, _, O, A, A, A, O, A, A, A, A, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  elf: [
    // Elegant head with large 4-5px pointed ears on rows 2-5
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, A, O, SK,SK,SK,SK,SK,SK,SK,SK, O, A, _, _],
    [_, A, A, O, SK,SK,SK,SK,SK,SK,SK,SK, O, A, A, _],
    [_, _, A, O, SK,SK,SK,SK,SK,SK,SK,SK, O, A, _, _],
    [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  undead: [
    // Round head + dark eye sockets, crack lines
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, SK, O,SK,SK, O,SK, O, _, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SD,SD,SK,SK,SK,SK,SD,SD, O, _, _, _],
    [_, _, _, _, O, SK,SK,SD,SD,SK,SK, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  demon: [
    // Tall 4px horns (rows 0-1 both sides), aggressive look
    [_, _, O, A, _, _, _, _, _, _, _, _, A, O, _, _],
    [_, _, _, O, A, _, _, _, _, _, _, A, O, _, _, _],
    [_, _, _, O, A, O, O, O, O, O, O, A, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  beast: [
    // Large triangular ears (rows 0-1), snout hint row 6
    [_, _, O, A, A, _, _, _, _, _, _, A, A, O, _, _],
    [_, _, _, O, A, O, O, O, O, O, O, A, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
    [_, _, _, _, O, SK,SK,SD,SD,SK,SK, O, _, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
  dragon: [
    // Round head + small horns + jaw accent
    [_, _, _, _, O, A, _, _, _, _, A, O, _, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
    [_, _, _, O, A, SK,SK,SK,SK,SK,SK, A, O, _, _, _],
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
  ],
};

// ── Monster body templates (16×9, same size as hero bodies) ──

export const MONSTER_BODY_TEMPLATES: Record<MonsterType, PixelLayer> = {
  beast: [
    // Wide, forward-leaning, strong limbs
    [_, O, O, O, O, O, O, O, O, O, O, O, O, O, _, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, O, _],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, O, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, O, F, F, _, _, F, F, F, F, _, _, F, F, O, _],
    [_, O, F, F, _, _, _, _, _, _, _, _, F, F, O, _],
    [_, O, O, O, _, _, _, _, _, _, _, _, O, O, _, _],
  ],
  undead: [
    // Narrow with gaps (transparent holes in body), skeletal feel
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
    [_, _, _, O, S, F, _, F, F, _, F, S, O, _, _, _],
    [_, _, _, O, F, F, F, F, F, F, F, F, O, _, _, _],
    [_, _, _, O, S, _, F, F, F, F, _, S, O, _, _, _],
    [_, _, _, _, O, F, F, F, F, F, F, O, _, _, _, _],
    [_, _, _, _, O, S, _, F, F, _, S, O, _, _, _, _],
    [_, _, _, _, O, F, _, F, F, _, F, O, _, _, _, _],
    [_, _, _, _, _, O, _, F, F, _, O, _, _, _, _, _],
    [_, _, _, _, _, O, O, _, _, O, O, _, _, _, _, _],
  ],
  construct: [
    // Full-width block, no taper, heavy metallic feel, many H pixels
    [O, O, O, O, O, O, O, O, O, O, O, O, O, O, O, O],
    [O, H, F, H, F, H, F, F, F, F, H, F, H, F, H, O],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, F, O],
    [O, H, F, F, F, F, F, F, F, F, F, F, F, F, H, O],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, F, O],
    [O, H, F, F, F, F, F, F, F, F, F, F, F, F, H, O],
    [O, F, F, F, F, F, F, F, F, F, F, F, F, F, F, O],
    [O, H, F, H, F, H, F, F, F, F, H, F, H, F, H, O],
    [O, O, O, O, O, O, O, O, O, O, O, O, O, O, O, O],
  ],
  caster: [
    // Narrow top, wide bottom but sparse/dissolving at edges
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, S, F, F, F, F, S, O, _, _, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, O, F, F, F, F, F, F, F, F, O, _, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, _, F, _, F, F, F, F, F, F, _, F, _, O, _],
    [O, _, F, _, _, _, F, F, F, F, _, _, _, F, _, O],
    [_, _, _, _, _, _, O, O, O, O, _, _, _, _, _, _],
  ],
  humanoid: [
    // Like melee_dps but wider and bulkier
    [_, _, O, O, O, O, O, O, O, O, O, O, O, O, _, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, F, F, H, F, F, F, F, F, F, H, F, F, O, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, O, S, F, F, F, F, F, F, S, O, _, _, _],
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  ],
  draconic: [
    // Widest body (full 16 cols), tail hint (A pixels bottom-right)
    [O, O, O, O, O, O, O, O, O, O, O, O, O, O, O, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, F, F, H, F, F, F, F, F, F, F, F, H, F, F, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [O, S, F, F, F, F, F, F, F, F, F, F, F, F, S, O],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, O, S, F, F, F, F, F, F, F, F, F, F, S, O, _],
    [_, _, O, S, F, F, F, F, F, F, F, F, S, O, A, _],
    [_, _, O, O, O, O, O, O, O, O, O, O, O, O, _, A],
  ],
};

// ── Monster head templates (16×8, same size as hero heads) ──

export const MONSTER_HEAD_TEMPLATES: Record<MonsterType, PixelLayer> = {
  beast: [
    // Forward-jutting snout, fangs (O pixels at bottom), wide ears
    [_, O, A, _, _, O, O, O, O, O, O, _, _, A, O, _],
    [_, _, O, _, O, SK,SK,SK,SK,SK,SK, O, _, O, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, O, SK,SK,SD,SK,SK,SK,SK,SD,SK,SK, O, _, _],
    [_, _, O, SK,SK,SK,SK,SK,SK,SK,SK,SK,SK, O, _, _],
    [_, _, _, O, O, O, _, O, O, _, O, O, O, _, _, _],
  ],
  undead: [
    // Skull shape, deep eye sockets (O around E), cracked jaw
    [_, _, _, _, _, O, O, O, O, O, O, _, _, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK, O, E, SK,SK, E, O,SK, O, _, _, _],
    [_, _, _, O, SK, O,SK,SK,SK,SK, O,SK, O, _, _, _],
    [_, _, _, O, SD,SK,SK,SK,SK,SK,SK,SD, O, _, _, _],
    [_, _, _, _, O, SK, O,SD,SD, O,SK, O, _, _, _, _],
    [_, _, _, _, _, O, _, O, O, _, O, _, _, _, _, _],
  ],
  construct: [
    // Flat-top square, visor slit eyes (E in horizontal line), no organic features
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
    [_, _, _, O, H, F, F, F, F, F, F, H, O, _, _, _],
    [_, _, _, O, F, F, F, F, F, F, F, F, O, _, _, _],
    [_, _, _, O, F, E, E, F, F, E, E, F, O, _, _, _],
    [_, _, _, O, F, F, F, F, F, F, F, F, O, _, _, _],
    [_, _, _, O, H, F, F, F, F, F, F, H, O, _, _, _],
    [_, _, _, O, F, F, F, F, F, F, F, F, O, _, _, _],
    [_, _, _, O, O, O, O, O, O, O, O, O, O, _, _, _],
  ],
  caster: [
    // Hood/cowl shape, A pixels covering top, dissolving at bottom
    [_, _, _, _, A, A, A, A, A, A, A, A, _, _, _, _],
    [_, _, _, A, A, A, A, A, A, A, A, A, A, _, _, _],
    [_, _, _, A, O, SK,SK,SK,SK,SK,SK, O, A, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, _, O, SK,SK,SK,SK,SK,SK, O, _, _, _, _],
    [_, _, _, _, O, SK,SD,SK,SK,SD,SK, O, _, _, _, _],
    [_, _, _, _, _, O, SK,SK,SK,SK, O, _, _, _, _, _],
    [_, _, _, _, _, _, O, _, _, O, _, _, _, _, _, _],
  ],
  humanoid: [
    // Thick brow, wide jaw, rougher than hero human
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, O, SK,SK,SK,SK,SK,SK,SK,SK,SK,SK, O, _, _],
    [_, _, O, SK,SD,SD,SK,SK,SK,SK,SD,SD,SK, O, _, _],
    [_, _, O, SK,SK,SK,SK,SK,SK,SK,SK,SK,SK, O, _, _],
    [_, _, O, SK,SK,SD,SK,SK,SK,SK,SD,SK,SK, O, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  ],
  draconic: [
    // Large horns (A top), jaw ridge (A bottom), imposing
    [_, _, A, A, _, _, _, _, _, _, _, _, A, A, _, _],
    [_, _, _, O, A, O, O, O, O, O, O, A, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SK,SK,SK,SK,SK,SK,SK, O, _, _, _],
    [_, _, _, O, SK,SD,SK,SK,SK,SK,SD,SK, O, _, _, _],
    [_, _, _, O, A, SK,SK,SK,SK,SK,SK, A, O, _, _, _],
    [_, _, _, A, _, O, O, O, O, O, O, _, A, _, _, _],
  ],
};

// ── Face overlays (sparse — only eye/mouth/brow pixels, rest transparent) ──
// 16×8 grids applied at row offset 0 (same region as head)

/** Hero face: friendly dot eyes + small smile */
export const FACE_HERO: PixelLayer = [
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, E, _, _, _, _, E, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, E, E, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

/** Enemy face: red eyes + angry V-brows */
export const FACE_ENEMY: PixelLayer = [
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, BR, _, _, _, _, _, _, BR, _, _, _, _],
  [_, _, _, _, _, E, _, _, _, _, E, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

// ── Leg templates (rows 17-19 of the 16×20 grid) ──
// 16 wide × 3 tall, applied at row offset 17

export const LEG_TEMPLATE: PixelLayer = [
  [_, _, _, _, _, O, FD, _, _, FD, O, _, _, _, _, _],
  [_, _, _, _, _, O, FD, _, _, FD, O, _, _, _, _, _],
  [_, _, _, _, _, O, O, _, _, O, O, _, _, _, _, _],
];

// ── Weapon overlays (sparse, applied over body area at offset row 8) ──
// 16 wide × 9 tall

export const WEAPON_TEMPLATES: Record<ClassType, PixelLayer> = {
  warrior: [
    // Sword line extending from right side
    [_, _, _, _, _, _, _, _, _, _, _, _, _, W, O, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, W, O, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, W, O, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, W, O, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, W, W, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
  mage: [
    // Enlarged orb + staff handle
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _,WG,WG, _, _, _],
    [_, _, _, _, _, _, _, _, _, _,WG,WG,WG,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _,WG,WG, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _,W, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
  ranger: [
    // Bow arc on right side
    [_, _, _, _, _, _, _, _, _, _, _, _, _, O, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, O, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, W, O, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, W, _, O],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, W, _, O],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, W, O, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, O, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, O, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
  cleric: [
    // Enlarged 5×3 wide cross
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _,WG,WG,WG,WG,WG],
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
  assassin: [
    // Dual daggers with glow highlights, diagonal layout
    [_, _, _, _, _, _, _, _, _, _, _, _, _,WG, W, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, W,WG, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, W, W, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, W,WG, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, W,WG, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, W, W, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _,WG, W, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
  paladin: [
    // Shield on left arm
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, O, W, W, O, _, _, _, _, _, _, _, _, _, _, _],
    [_, O, W,WG, W, O, _, _, _, _, _, _, _, _, _, _],
    [_, O, W,WG, W, O, _, _, _, _, _, _, _, _, _, _],
    [_, O, W, W, O, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, O, O, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
    [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  ],
};

// ── Boss crown overlay (3 rows, applied at row offset -3 above head, or row 0 overlapping) ──
// 16 wide × 3 tall

export const CROWN_TEMPLATE: PixelLayer = [
  [_, _, _, _, _,CG, _,CG, _,CG, _, _, _, _, _, _],
  [_, _, _, _, _,CG,CG,CG,CG,CG, _, _, _, _, _, _],
  [_, _, _, _, _, O, O, O, O, O, _, _, _, _, _, _],
];

// ── Color lookup tables ──

export const SKIN_TONES: Record<RaceType, number> = {
  human:  0xffddbb,
  elf:    0xeeffdd,
  undead: 0xaabb99,
  demon:  0xddaaaa,
  beast:  0xddbb88,
  dragon: 0xbbddcc,
};

export const WEAPON_COLORS: Record<ClassType, { base: number; glow: number }> = {
  warrior:  { base: 0xaaaacc, glow: 0xccccee },
  mage:     { base: 0x7744ff, glow: 0xaa88ff },   // saturated purple-blue
  ranger:   { base: 0x886644, glow: 0xaa8866 },
  cleric:   { base: 0xffdd44, glow: 0xffff99 },   // bright gold
  assassin: { base: 0xaabbcc, glow: 0xddeeff },  // bright silver-blue, high contrast
  paladin:  { base: 0x8899bb, glow: 0xbbccdd },
};

/** Grid dimensions */
export const GRID_W = 16;
export const GRID_H = 20;
