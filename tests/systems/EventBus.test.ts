import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/systems/EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = EventBus.getInstance();
    bus.reset();
  });

  it('should be a singleton', () => {
    const a = EventBus.getInstance();
    const b = EventBus.getInstance();
    expect(a).toBe(b);
  });

  it('on() registers a callback that fires on emit()', () => {
    const handler = vi.fn();
    bus.on('unit:damage', handler);
    const data = {
      sourceId: 'a', targetId: 'b', amount: 10,
      damageType: 'physical' as const, isCrit: false,
    };
    bus.emit('unit:damage', data);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(data);
  });

  it('off() unregisters a callback', () => {
    const handler = vi.fn();
    bus.on('unit:kill', handler);
    bus.off('unit:kill', handler);
    bus.emit('unit:kill', { killerId: 'a', targetId: 'b' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires exactly one time then auto-removes', () => {
    const handler = vi.fn();
    bus.once('combo:break', handler);
    bus.emit('combo:break', { unitId: 'a' });
    bus.emit('combo:break', { unitId: 'b' });
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ unitId: 'a' });
  });

  it('respects priority ordering (higher fires first)', () => {
    const order: number[] = [];
    bus.on('battle:start', () => order.push(1), 1);
    bus.on('battle:start', () => order.push(3), 3);
    bus.on('battle:start', () => order.push(2), 2);

    bus.emit('battle:start', { heroCount: 3, enemyCount: 3 });
    expect(order).toEqual([3, 2, 1]);
  });

  it('reset() clears all listeners', () => {
    const handler = vi.fn();
    bus.on('unit:damage', handler);
    bus.reset();
    bus.emit('unit:damage', {
      sourceId: 'a', targetId: 'b', amount: 10,
      damageType: 'physical' as const, isCrit: false,
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('passes event data correctly to callbacks', () => {
    const handler = vi.fn();
    bus.on('unit:heal', handler);
    const data = { sourceId: 'healer', targetId: 'target', amount: 42 };
    bus.emit('unit:heal', data);
    expect(handler).toHaveBeenCalledWith(data);
  });

  it('supports multiple listeners on the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('combo:break', h1);
    bus.on('combo:break', h2);
    bus.emit('combo:break', { unitId: 'x' });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('emitting an event with no listeners does not throw', () => {
    expect(() => {
      bus.emit('relic:acquire', { relicId: 'test' });
    }).not.toThrow();
  });

  it('off() on non-existent listener does not throw', () => {
    const handler = vi.fn();
    expect(() => {
      bus.off('unit:kill', handler);
    }).not.toThrow();
  });
});
