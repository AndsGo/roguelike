import { describe, it, expect, afterEach } from 'vitest';
import { isTouchDevice, tapTolerance, __setTouchDeviceForTest } from '../../src/utils/device';

afterEach(() => {
  __setTouchDeviceForTest(null);
});

describe('device detection', () => {
  it('test_device_node_environment_reports_not_touch', () => {
    // Arrange: Node test env has no real window/matchMedia signal
    __setTouchDeviceForTest(null);

    // Act
    const result = isTouchDevice();

    // Assert
    expect(result).toBe(false);
  });

  it('test_device_tap_tolerance_widens_for_touch', () => {
    // Arrange
    __setTouchDeviceForTest(true);

    // Act
    const touch = tapTolerance();

    // Assert
    expect(touch).toBe(35);
  });

  it('test_device_tap_tolerance_default_for_mouse', () => {
    // Arrange
    __setTouchDeviceForTest(false);

    // Act
    const mouse = tapTolerance();

    // Assert
    expect(mouse).toBe(20);
  });
});
