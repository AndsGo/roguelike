import { describe, it, expect, vi, afterEach } from 'vitest';
import Phaser from 'phaser';
import { attachPressInteraction } from '../../src/ui/PressInteraction';
import { __setTouchDeviceForTest } from '../../src/utils/device';

afterEach(() => {
  __setTouchDeviceForTest(null);
});

interface FakePointer {
  x: number;
  y: number;
  isDown: boolean;
  wasTouch: boolean;
  rightButtonReleased: () => boolean;
}

function makePointer(overrides: Partial<FakePointer> = {}): FakePointer {
  return {
    x: 0,
    y: 0,
    isDown: false,
    wasTouch: false,
    rightButtonReleased: () => false,
    ...overrides,
  };
}

/** Minimal event-emitting target (the phaser-stub's .on() is a no-op). */
function makeTarget() {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    on(event: string, fn: (...args: unknown[]) => void) {
      (handlers[event] ??= []).push(fn);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      for (const fn of handlers[event] ?? []) fn(...args);
    },
  };
}

/** Scene fake: captures the long-press timer so tests fire it manually. */
function makeScene(activePointer: FakePointer) {
  let pendingTimer: (() => void) | null = null;
  let removed = false;
  return {
    scene: {
      time: {
        delayedCall: (_delay: number, cb: () => void) => {
          pendingTimer = cb;
          removed = false;
          return { remove: () => { removed = true; } };
        },
      },
      input: { activePointer },
    } as unknown as Phaser.Scene,
    fireTimer() {
      if (pendingTimer && !removed) pendingTimer();
    },
  };
}

describe('attachPressInteraction', () => {
  it('test_press_quick_tap_within_tolerance_fires_onTap', () => {
    // Arrange
    const pointer = makePointer();
    const { scene } = makeScene(pointer);
    const target = makeTarget();
    const onTap = vi.fn();
    attachPressInteraction(scene, target as never, { onTap });

    // Act
    target.emit('pointerdown', { ...pointer, x: 100, y: 100 });
    target.emit('pointerup', { ...pointer, x: 105, y: 103 });

    // Assert
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('test_press_drag_beyond_tolerance_suppresses_onTap', () => {
    // Arrange
    __setTouchDeviceForTest(false); // tolerance = 20
    const pointer = makePointer();
    const { scene } = makeScene(pointer);
    const target = makeTarget();
    const onTap = vi.fn();
    attachPressInteraction(scene, target as never, { onTap });

    // Act
    target.emit('pointerdown', { ...pointer, x: 100, y: 100 });
    target.emit('pointerup', { ...pointer, x: 140, y: 100 });

    // Assert
    expect(onTap).not.toHaveBeenCalled();
  });

  it('test_press_touch_tolerance_accepts_wobbly_tap', () => {
    // Arrange: 30px wobble fails the 20px mouse budget but passes touch's 35px
    __setTouchDeviceForTest(true);
    const pointer = makePointer();
    const { scene } = makeScene(pointer);
    const target = makeTarget();
    const onTap = vi.fn();
    attachPressInteraction(scene, target as never, { onTap });

    // Act
    target.emit('pointerdown', { ...pointer, x: 100, y: 100 });
    target.emit('pointerup', { ...pointer, x: 130, y: 100 });

    // Assert
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('test_press_long_press_shows_info_and_suppresses_tap', () => {
    // Arrange
    const activePointer = makePointer({ x: 100, y: 100, isDown: true });
    const { scene, fireTimer } = makeScene(activePointer);
    const target = makeTarget();
    const onTap = vi.fn();
    const onShowInfo = vi.fn();
    const onHideInfo = vi.fn();
    attachPressInteraction(scene, target as never, { onTap, onShowInfo, onHideInfo });

    // Act: hold past the long-press delay, then release in place
    target.emit('pointerdown', makePointer({ x: 100, y: 100 }));
    fireTimer();
    target.emit('pointerup', makePointer({ x: 100, y: 100 }));

    // Assert
    expect(onShowInfo).toHaveBeenCalledTimes(1);
    expect(onHideInfo).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('test_press_long_press_prefers_onSecondary_over_info', () => {
    // Arrange
    const activePointer = makePointer({ x: 50, y: 50, isDown: true });
    const { scene, fireTimer } = makeScene(activePointer);
    const target = makeTarget();
    const onSecondary = vi.fn();
    const onShowInfo = vi.fn();
    attachPressInteraction(scene, target as never, { onSecondary, onShowInfo });

    // Act
    target.emit('pointerdown', makePointer({ x: 50, y: 50 }));
    fireTimer();

    // Assert
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onShowInfo).not.toHaveBeenCalled();
  });

  it('test_press_quick_release_cancels_long_press_timer', () => {
    // Arrange
    const activePointer = makePointer({ x: 10, y: 10, isDown: false });
    const { scene, fireTimer } = makeScene(activePointer);
    const target = makeTarget();
    const onTap = vi.fn();
    const onShowInfo = vi.fn();
    attachPressInteraction(scene, target as never, { onTap, onShowInfo });

    // Act: release before the timer fires, then try firing the (removed) timer
    target.emit('pointerdown', makePointer({ x: 10, y: 10 }));
    target.emit('pointerup', makePointer({ x: 10, y: 10 }));
    fireTimer();

    // Assert
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onShowInfo).not.toHaveBeenCalled();
  });

  it('test_press_mouse_hover_shows_info_touch_hover_does_not', () => {
    // Arrange
    const pointer = makePointer();
    const { scene } = makeScene(pointer);
    const target = makeTarget();
    const onShowInfo = vi.fn();
    const onHideInfo = vi.fn();
    attachPressInteraction(scene, target as never, { onShowInfo, onHideInfo });

    // Act + Assert: touch-originated over is ignored
    target.emit('pointerover', makePointer({ wasTouch: true }));
    expect(onShowInfo).not.toHaveBeenCalled();

    // Act + Assert: mouse hover shows, out hides
    target.emit('pointerover', makePointer({ wasTouch: false }));
    expect(onShowInfo).toHaveBeenCalledTimes(1);
    target.emit('pointerout');
    expect(onHideInfo).toHaveBeenCalledTimes(1);
  });

  it('test_press_right_click_release_fires_onSecondary', () => {
    // Arrange
    const pointer = makePointer();
    const { scene } = makeScene(pointer);
    const target = makeTarget();
    const onTap = vi.fn();
    const onSecondary = vi.fn();
    attachPressInteraction(scene, target as never, { onTap, onSecondary });

    // Act
    target.emit('pointerdown', makePointer({ x: 5, y: 5 }));
    target.emit('pointerup', makePointer({ x: 5, y: 5, rightButtonReleased: () => true }));

    // Assert
    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
  });
});
