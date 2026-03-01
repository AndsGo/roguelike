/**
 * Pixel-matrix chibi renderer.
 *
 * Composes layered pixel templates into a final grid, resolves palette colors,
 * and renders to a Phaser texture via Graphics.generateTexture().
 * Units display as Image objects; flash effects use setTintFill()/clearTint().
 */

import Phaser from 'phaser';
import { UnitRole, RaceType, ClassType } from '../types';
import { darkenColor, lightenColor } from '../ui/Theme';
import { Theme } from '../ui/Theme';
import {
  P, PaletteIndex, PixelLayer,
  BODY_TEMPLATES, HEAD_TEMPLATES, FACE_HERO, FACE_ENEMY,
  LEG_TEMPLATE, WEAPON_TEMPLATES, CROWN_TEMPLATE,
  SKIN_TONES, WEAPON_COLORS, GRID_W, GRID_H,
} from '../data/pixel-templates';

export interface ChibiConfig {
  role: UnitRole;
  race: RaceType;
  classType: ClassType;
  fillColor: number;
  borderColor: number;
  isHero: boolean;
  isBoss: boolean;
}

// ── Texture cache ──

const generatedKeys = new Set<string>();

/** Compute a cache key from config */
function computeConfigHash(c: ChibiConfig): string {
  return `chibi_${c.role}_${c.race}_${c.classType}_${c.fillColor.toString(16)}_${c.borderColor.toString(16)}_${c.isHero ? 'h' : 'e'}_${c.isBoss ? 'b' : 'n'}`;
}

/**
 * Get or create a texture for the given chibi config.
 * Returns the Phaser texture key string.
 */
export function getOrCreateTexture(scene: Phaser.Scene, config: ChibiConfig): string {
  const key = computeConfigHash(config);

  if (generatedKeys.has(key) && scene.textures.exists(key)) {
    return key;
  }

  const grid = compositePixelGrid(config);
  const palette = resolvePalette(config);
  const scale = config.isBoss ? 3 : 2;

  renderToTexture(scene, grid, palette, scale, key);
  generatedKeys.add(key);

  return key;
}

/** Get the display size for a unit based on role and boss status */
export function getDisplaySize(role: UnitRole, isBoss: boolean): { w: number; h: number } {
  if (isBoss) {
    return { w: GRID_W * 3, h: (GRID_H + 3) * 3 };  // 48×69 (includes crown rows)
  }
  if (role === 'tank') {
    return { w: GRID_W * 2 + 4, h: GRID_H * 2 + 4 };  // 36×44
  }
  return { w: GRID_W * 2, h: GRID_H * 2 };  // 32×40
}

// ── Palette resolution ──

function resolvePalette(config: ChibiConfig): Map<PaletteIndex, number> {
  const { fillColor, borderColor, race, classType, isHero } = config;
  const skinColor = SKIN_TONES[race];
  const accentColor = Theme.colors.raceAccent[race] ?? 0xddccaa;
  const weaponInfo = WEAPON_COLORS[classType];

  const map = new Map<PaletteIndex, number>();
  map.set(P._, 0);  // transparent (won't be drawn)
  map.set(P.O, borderColor);
  map.set(P.F, fillColor);
  map.set(P.S, darkenColor(fillColor, 0.15));
  map.set(P.H, lightenColor(fillColor, 0.1));
  map.set(P.SK, skinColor);
  map.set(P.SD, darkenColor(skinColor, 0.15));
  map.set(P.E, isHero ? 0x000000 : 0xcc0000);
  map.set(P.A, accentColor);
  map.set(P.W, weaponInfo.base);
  map.set(P.WG, weaponInfo.glow);
  map.set(P.CG, 0xffd700);
  map.set(P.FD, darkenColor(fillColor, 0.25));
  map.set(P.BR, 0x222222);

  return map;
}

// ── Grid compositing ──

/** Create an empty grid */
function createEmptyGrid(w: number, h: number): PaletteIndex[][] {
  const grid: PaletteIndex[][] = [];
  for (let r = 0; r < h; r++) {
    grid.push(new Array(w).fill(P._));
  }
  return grid;
}

/** Blit a layer onto the target grid. Non-zero pixels overwrite. */
function blitLayer(target: PaletteIndex[][], source: PixelLayer, offsetRow: number, offsetCol: number): void {
  for (let r = 0; r < source.length; r++) {
    const targetRow = r + offsetRow;
    if (targetRow < 0 || targetRow >= target.length) continue;
    const srcRow = source[r];
    for (let c = 0; c < srcRow.length; c++) {
      const targetCol = c + offsetCol;
      if (targetCol < 0 || targetCol >= target[targetRow].length) continue;
      if (srcRow[c] !== P._) {
        target[targetRow][targetCol] = srcRow[c];
      }
    }
  }
}

/** Compose all layers into a final pixel grid */
function compositePixelGrid(config: ChibiConfig): PaletteIndex[][] {
  const { role, race, classType, isHero, isBoss } = config;
  const h = isBoss ? GRID_H + 3 : GRID_H;  // Extra rows for crown
  const grid = createEmptyGrid(GRID_W, h);

  const rowBase = isBoss ? 3 : 0;  // Shift everything down for crown space

  // Layer 1: Head (rows 0-7)
  blitLayer(grid, HEAD_TEMPLATES[race], rowBase, 0);

  // Layer 2: Body (rows 7-15, overlapping 1 row with head bottom)
  blitLayer(grid, BODY_TEMPLATES[role], rowBase + 7, 0);

  // Layer 3: Legs (rows 17-19)
  blitLayer(grid, LEG_TEMPLATE, rowBase + 17, 0);

  // Layer 4: Face (overlaid on head region)
  blitLayer(grid, isHero ? FACE_HERO : FACE_ENEMY, rowBase, 0);

  // Layer 5: Weapon (overlaid on body region)
  blitLayer(grid, WEAPON_TEMPLATES[classType], rowBase + 7, 0);

  // Layer 6: Boss crown (rows 0-2 when boss, above head)
  if (isBoss) {
    blitLayer(grid, CROWN_TEMPLATE, 0, 0);
  }

  return grid;
}

// ── Texture rendering ──

/** Render a pixel grid to a Phaser texture */
function renderToTexture(
  scene: Phaser.Scene,
  grid: PaletteIndex[][],
  palette: Map<PaletteIndex, number>,
  scale: number,
  key: string,
): void {
  const g = scene.add.graphics();
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = grid[r][c];
      if (idx === P._) continue;  // Skip transparent
      const color = palette.get(idx) ?? 0xff00ff;  // Magenta fallback for debug
      g.fillStyle(color, 1);
      g.fillRect(c * scale, r * scale, scale, scale);
    }
  }

  g.generateTexture(key, cols * scale, rows * scale);
  g.destroy();
}
