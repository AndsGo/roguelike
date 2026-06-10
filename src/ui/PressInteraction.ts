import Phaser from 'phaser';
import { tapTolerance } from '../utils/device';

export interface PressInteractionHandlers {
  /** Quick tap (down→up within tolerance, no long-press triggered). */
  onTap?: (pointer: Phaser.Input.Pointer) => void;
  /** Desktop hover-in OR mobile long-press: show contextual info. */
  onShowInfo?: () => void;
  /** Hover-out / release / drag-away: hide contextual info. */
  onHideInfo?: () => void;
  /**
   * Long-press on touch, right-click on desktop: open detail view.
   * When set, long-press fires this INSTEAD of onShowInfo.
   */
  onSecondary?: () => void;
}

export const LONG_PRESS_MS = 350;

/**
 * Unified press gestures for an interactive GameObject:
 *
 *   desktop hover  → onShowInfo / onHideInfo (tooltip)
 *   touch long-press (≥350ms, finger still) → onSecondary if set, else onShowInfo
 *   right-click    → onSecondary if set
 *   tap/click      → onTap (suppressed when a long-press already fired,
 *                    or the pointer travelled beyond tapTolerance())
 *
 * The target must already be interactive (`setInteractive` called).
 * Timers are scene-clock based and auto-cancelled on pointer out/up,
 * so no cleanup is needed beyond the GameObject's own destroy().
 */
export function attachPressInteraction(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject,
  handlers: PressInteractionHandlers,
): void {
  let downX = 0;
  let downY = 0;
  let longPressFired = false;
  let infoShown = false;
  let timer: Phaser.Time.TimerEvent | null = null;

  const cancelTimer = (): void => {
    timer?.remove(false);
    timer = null;
  };

  const hideInfo = (): void => {
    if (infoShown) {
      infoShown = false;
      handlers.onHideInfo?.();
    }
  };

  target.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    downX = pointer.x;
    downY = pointer.y;
    longPressFired = false;
    cancelTimer();
    timer = scene.time.delayedCall(LONG_PRESS_MS, () => {
      timer = null;
      // Finger must still be near the press origin (not a drag/scroll).
      const pointerNow = scene.input.activePointer;
      const tol = tapTolerance();
      const dx = pointerNow.x - downX;
      const dy = pointerNow.y - downY;
      if (!pointerNow.isDown || dx * dx + dy * dy > tol * tol) return;
      longPressFired = true;
      if (handlers.onSecondary) {
        handlers.onSecondary();
      } else {
        infoShown = true;
        handlers.onShowInfo?.();
      }
    });
  });

  target.on('pointerup', (pointer: Phaser.Input.Pointer) => {
    cancelTimer();
    if (longPressFired) {
      // The long-press already consumed this gesture.
      hideInfo();
      return;
    }
    const tol = tapTolerance();
    const dx = pointer.x - downX;
    const dy = pointer.y - downY;
    if (dx * dx + dy * dy >= tol * tol) return;
    if (pointer.rightButtonReleased() && handlers.onSecondary) {
      handlers.onSecondary();
    } else {
      handlers.onTap?.(pointer);
    }
  });

  target.on('pointerover', (pointer: Phaser.Input.Pointer) => {
    // Hover tooltips are a mouse affordance; touch "over" fires on tap and
    // would flash the tooltip mid-tap.
    if (pointer.wasTouch) return;
    infoShown = true;
    handlers.onShowInfo?.();
  });

  target.on('pointerout', () => {
    cancelTimer();
    hideInfo();
  });
}
