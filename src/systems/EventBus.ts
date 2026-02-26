import { GameEventType, GameEventMap } from '../types';

interface EventListener<T> {
  callback: (data: T) => void;
  priority: number;
  once: boolean;
}

/**
 * Type-safe publish/subscribe event bus singleton.
 * Used for decoupled communication between game systems.
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventListener<unknown>[]> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /** Reset all listeners (useful between runs) */
  reset(): void {
    this.listeners.clear();
  }

  /**
   * Subscribe to an event.
   * @param event The event type to listen for
   * @param callback Handler function
   * @param priority Higher priority listeners fire first (default 0)
   */
  on<K extends GameEventType>(
    event: K,
    callback: (data: GameEventMap[K]) => void,
    priority: number = 0,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const list = this.listeners.get(event)!;
    list.push({
      callback: callback as (data: unknown) => void,
      priority,
      once: false,
    });
    // Sort by priority descending (higher priority first)
    list.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Subscribe to an event for a single firing only.
   */
  once<K extends GameEventType>(
    event: K,
    callback: (data: GameEventMap[K]) => void,
    priority: number = 0,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const list = this.listeners.get(event)!;
    list.push({
      callback: callback as (data: unknown) => void,
      priority,
      once: true,
    });
    list.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Unsubscribe a specific callback from an event.
   */
  off<K extends GameEventType>(
    event: K,
    callback: (data: GameEventMap[K]) => void,
  ): void {
    const list = this.listeners.get(event);
    if (!list) return;
    const idx = list.findIndex(l => l.callback === callback);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  /**
   * Emit an event with data, calling all listeners in priority order.
   */
  emit<K extends GameEventType>(event: K, data: GameEventMap[K]): void {
    const list = this.listeners.get(event);
    if (!list || list.length === 0) return;

    // Collect once-listeners to remove after iteration
    const toRemove: number[] = [];

    for (let i = 0; i < list.length; i++) {
      list[i].callback(data);
      if (list[i].once) {
        toRemove.push(i);
      }
    }

    // Remove once-listeners in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      list.splice(toRemove[i], 1);
    }
  }
}
