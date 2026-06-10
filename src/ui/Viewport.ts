import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';
import { isTouchDevice } from '../utils/device';

/**
 * Responsive viewport layer for Scale.RESIZE mode.
 *
 * The canvas always matches the window/device size; scenes keep authoring
 * in the classic 800×450 design units and the MAIN CAMERA's zoom maps that
 * design space onto the real canvas:
 *
 *  - Pure-UI scenes (menus, draft, shop, ...): `applyUiCamera()` — zoom is
 *    `fit × boost` (boost 1.25 on touch). The visible design viewport is
 *    `vw = sw/zoom × vh = sh/zoom`: exactly 800×450 on a 16:9 desktop
 *    window (zero visual change), wider on ultrawide, and ~640×360 on
 *    phones — which is what makes every element physically larger there.
 *    Scenes must lay out against view().vw/vh instead of GAME_WIDTH/HEIGHT.
 *
 *  - World scenes (Battle, Map): `applyWorldCamera()` — zoom is plain `fit`
 *    centered on the 800×450 world, pixel-identical to the old FIT mode.
 *    Mobile UI boost there is applied per-component (HUD containers).
 *
 * GOTCHA: with a zoomed camera, `pointer.x/y` are CANVAS pixels, not design
 * units. Any bounds math against design coordinates must convert through
 * `pointerView(scene, pointer)` first.
 */

/** Touch devices get a UI magnification so elements hit ~44px physical. */
export function uiBoost(): number {
  return isTouchDevice() ? 1.25 : 1;
}

export interface ViewInfo {
  /** Canvas size in real (CSS) pixels. */
  sw: number;
  sh: number;
  /** World scale: min(sw/800, sh/450). */
  fit: number;
  /** UI scale: fit × boost. */
  ui: number;
  /** Design-unit viewport under the UI camera (sw/ui × sh/ui). */
  vw: number;
  vh: number;
  /** Design-unit viewport under the WORLD camera (sw/fit × sh/fit). */
  wvw: number;
  wvh: number;
  /** Design-unit center of the UI viewport. */
  cx: number;
  cy: number;
  /** Compact (touch) layout flag. */
  compact: boolean;
}

export function view(scene: Phaser.Scene): ViewInfo {
  const sw = scene.scale?.width ?? GAME_WIDTH;
  const sh = scene.scale?.height ?? GAME_HEIGHT;
  const fit = Math.min(sw / GAME_WIDTH, sh / GAME_HEIGHT);
  const ui = fit * uiBoost();
  const vw = sw / ui;
  const vh = sh / ui;
  return {
    sw, sh, fit, ui, vw, vh,
    wvw: sw / fit, wvh: sh / fit,
    cx: vw / 2, cy: vh / 2,
    compact: isTouchDevice(),
  };
}

/** Convert a pointer's canvas position to design-space coordinates. */
export function pointerView(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): { x: number; y: number } {
  const cam = scene.cameras?.main;
  if (!cam || typeof cam.getWorldPoint !== 'function') return { x: pointer.x, y: pointer.y };
  const p = cam.getWorldPoint(pointer.x, pointer.y);
  return { x: p.x, y: p.y };
}

/**
 * The design-space rectangle currently visible through the main camera —
 * works under BOTH camera modes (ui and world). Use it to size modal
 * backdrops and center popups so they cover/center on the real screen.
 */
export interface ViewBounds { x: number; y: number; w: number; h: number; cx: number; cy: number }
export function viewBounds(scene: Phaser.Scene): ViewBounds {
  const cam = scene.cameras?.main as { zoom?: number; scrollX?: number; scrollY?: number } | undefined;
  const sw = scene.scale?.width ?? GAME_WIDTH;
  const sh = scene.scale?.height ?? GAME_HEIGHT;
  const z = cam?.zoom ?? 1;
  // Derive the visible center from scroll (an input we set synchronously),
  // NOT cam.midPoint — midPoint only refreshes during preRender, so it is
  // stale when a scene reads bounds inside its own create() on a camera
  // that has never rendered (the classic "HUD anchored to screen center"
  // bug on a fresh page load straight into battle).
  // Camera zoom pivots on the viewport center, so world point
  // (scrollX + sw/2, scrollY + sh/2) maps to the canvas center.
  const cx = (cam?.scrollX ?? 0) + sw / 2;
  const cy = (cam?.scrollY ?? 0) + sh / 2;
  const w = sw / z;
  const h = sh / z;
  return { x: cx - w / 2, y: cy - h / 2, w, h, cx, cy };
}

/** Scale factor from canvas pixels to design units under the main camera. */
export function pointerScale(scene: Phaser.Scene): number {
  const z = (scene.cameras?.main as { zoom?: number } | undefined)?.zoom ?? 1;
  return z > 0 ? 1 / z : 1;
}

/**
 * Pure-UI scene camera: zoom `ui`, design origin (0,0) at the canvas
 * top-left so view().vw/vh describe the full visible layout area.
 */
export function applyUiCamera(scene: Phaser.Scene): void {
  const v = view(scene);
  const cam = scene.cameras?.main;
  if (!cam || typeof cam.setZoom !== 'function') return;
  cam.setZoom(v.ui);
  // NOT centerOn(): it computes from displayWidth, which is stale right
  // after setZoom. Derive the scroll that puts design (0,0) at the canvas
  // top-left directly.
  cam.setScroll(v.vw / 2 - v.sw / 2, v.vh / 2 - v.sh / 2);
}

/**
 * World scene camera: zoom `fit`, centered on the 800×450 world —
 * pixel-identical to the previous Scale.FIT presentation.
 */
export function applyWorldCamera(scene: Phaser.Scene): void {
  const v = view(scene);
  const cam = scene.cameras?.main;
  if (!cam || typeof cam.setZoom !== 'function') return;
  cam.setZoom(v.fit);
  // See applyUiCamera for why this avoids centerOn().
  cam.setScroll(GAME_WIDTH / 2 - v.sw / 2, GAME_HEIGHT / 2 - v.sh / 2);
}

/**
 * Subscribe to canvas resizes for the lifetime of the scene; the callback
 * also runs once immediately. Cleans itself up on scene shutdown.
 */
export function onViewResize(scene: Phaser.Scene, cb: () => void): void {
  const handler = (): void => cb();
  scene.scale?.on?.('resize', handler);
  scene.events?.once?.('shutdown', () => scene.scale?.off?.('resize', handler));
  cb();
}

/**
 * For stateless-UI scenes (menus, drafts, end screens): rebuild the whole
 * scene when the canvas size genuinely changes (desktop window drag,
 * orientation change). Debounced; passes `data` back through init().
 * Scenes whose create() has side effects (RNG draws, battle state) must NOT
 * use this — they reposition via their own layout() instead.
 */
export function restartOnResize(scene: Phaser.Scene, data?: object): void {
  let lastW = scene.scale?.width ?? GAME_WIDTH;
  let lastH = scene.scale?.height ?? GAME_HEIGHT;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const handler = (): void => {
    const w = scene.scale.width;
    const h = scene.scale.height;
    if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      lastW = w;
      lastH = h;
      if (scene.sys?.isActive?.()) scene.scene.restart(data);
    }, 250);
  };
  scene.scale?.on?.('resize', handler);
  scene.events?.once?.('shutdown', () => {
    clearTimeout(timer);
    scene.scale?.off?.('resize', handler);
  });
}

/**
 * Full-viewport background fill in design units (replaces fixed 800×450
 * background rects, which would letterbox on wider viewports). Pass the
 * world-space flag for world-camera scenes.
 */
export function fillBackground(scene: Phaser.Scene, color: number, opts?: { world?: boolean; depth?: number }): Phaser.GameObjects.Rectangle {
  const pick = (v: ViewInfo): { w: number; h: number; cx: number; cy: number } =>
    opts?.world
      ? { w: v.wvw, h: v.wvh, cx: GAME_WIDTH / 2, cy: GAME_HEIGHT / 2 }
      : { w: v.vw, h: v.vh, cx: v.vw / 2, cy: v.vh / 2 };
  const first = pick(view(scene));
  const rect = scene.add.rectangle(first.cx, first.cy, first.w + 4, first.h + 4, color).setDepth(opts?.depth ?? -10);
  onViewResize(scene, () => {
    const d = pick(view(scene));
    rect.setPosition(d.cx, d.cy);
    if (typeof (rect as { setDisplaySize?: (w: number, h: number) => void }).setDisplaySize === 'function') {
      (rect as unknown as { setDisplaySize: (w: number, h: number) => void }).setDisplaySize(d.w + 4, d.h + 4);
    }
  });
  return rect;
}
