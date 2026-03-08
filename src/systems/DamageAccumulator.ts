import Phaser from 'phaser';
import { DamageNumber, DamageNumberConfig } from '../components/DamageNumber';
import { ElementType } from '../types';

const ACCUMULATE_WINDOW = 150;
const MAX_VISIBLE_PER_UNIT = 3;
const VERTICAL_SPACING = 18;
const BASE_Y_OFFSET = -20;
const SLOT_LIFETIME = 800;

interface PendingEntry {
  targetId: string;
  scene: Phaser.Scene;
  x: number;
  y: number;
  totalAmount: number;
  isHeal: boolean;
  isCrit: boolean;
  element?: ElementType;
  comboCount?: number;
  timer: number;
}

interface ActiveSlot {
  createdAt: number;
}

export class DamageAccumulator {
  private pending: Map<string, PendingEntry> = new Map();
  private activeSlots: Map<string, ActiveSlot[]> = new Map();
  private clock = 0;

  addDamage(
    targetId: string,
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number,
    config?: DamageNumberConfig,
  ): void {
    const key = targetId;
    const existing = this.pending.get(key);
    if (existing) {
      existing.totalAmount += amount;
      if (config?.isCrit) existing.isCrit = true;
      if (config?.element && !existing.element) existing.element = config.element;
      if (config?.comboCount !== undefined && (existing.comboCount === undefined || config.comboCount > existing.comboCount)) {
        existing.comboCount = config.comboCount;
      }
    } else {
      this.pending.set(key, {
        targetId,
        scene,
        x,
        y,
        totalAmount: amount,
        isHeal: false,
        isCrit: config?.isCrit ?? false,
        element: config?.element,
        comboCount: config?.comboCount,
        timer: ACCUMULATE_WINDOW,
      });
    }
  }

  addHeal(
    targetId: string,
    scene: Phaser.Scene,
    x: number,
    y: number,
    amount: number,
  ): void {
    const key = `${targetId}_heal`;
    const existing = this.pending.get(key);
    if (existing) {
      existing.totalAmount += amount;
    } else {
      this.pending.set(key, {
        targetId,
        scene,
        x,
        y,
        totalAmount: amount,
        isHeal: true,
        isCrit: false,
        timer: ACCUMULATE_WINDOW,
      });
    }
  }

  update(delta: number): void {
    this.clock += delta;

    const toFlush: string[] = [];
    for (const [key, entry] of this.pending) {
      entry.timer -= delta;
      if (entry.timer <= 0) {
        toFlush.push(key);
      }
    }

    for (const key of toFlush) {
      const entry = this.pending.get(key)!;
      this.pending.delete(key);
      this.flush(entry);
    }
  }

  private flush(entry: PendingEntry): void {
    const yOffset = this.getNextYOffset(entry.targetId);
    new DamageNumber(
      entry.scene,
      entry.x,
      entry.y + BASE_Y_OFFSET + yOffset,
      Math.round(entry.totalAmount),
      entry.isHeal,
      entry.isCrit,
      entry.element,
      entry.comboCount,
    );
  }

  private getNextYOffset(unitId: string): number {
    // Clean expired slots
    let slots = this.activeSlots.get(unitId);
    if (slots) {
      slots = slots.filter(s => this.clock - s.createdAt < SLOT_LIFETIME);
      this.activeSlots.set(unitId, slots);
    } else {
      slots = [];
      this.activeSlots.set(unitId, slots);
    }

    // Cap at MAX_VISIBLE_PER_UNIT
    if (slots.length >= MAX_VISIBLE_PER_UNIT) {
      slots.shift();
    }

    const offset = -slots.length * VERTICAL_SPACING;
    slots.push({ createdAt: this.clock });
    return offset;
  }

  flushAll(): void {
    for (const [key, entry] of this.pending) {
      this.flush(entry);
    }
    this.pending.clear();
  }

  reset(): void {
    this.pending.clear();
    this.activeSlots.clear();
    this.clock = 0;
  }
}
