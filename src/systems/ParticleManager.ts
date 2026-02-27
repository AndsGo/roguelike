import Phaser from 'phaser';
import { Theme, getElementColor } from '../ui/Theme';
import { ElementType } from '../types';
import { PARTICLE } from '../config/visual';

const PARTICLE_KEY = '__particle_circle__';

/**
 * Manages particle effects for the game.
 * All particles use code-generated circle textures, no external assets needed.
 * Uses an object pool to reduce GC pressure from frequent create/destroy cycles.
 */
export interface ParticlePoolStats {
  poolSize: number;
  activeEmitters: number;
  peakPool: number;
  totalCreated: number;
  totalRecycled: number;
  totalDestroyed: number;
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private static textureCreated = false;
  private pool: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  // Pool monitoring stats
  private _activeCount = 0;
  private _peakPool = 0;
  private _totalCreated = 0;
  private _totalRecycled = 0;
  private _totalDestroyed = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureTexture();
  }

  private ensureTexture(): void {
    if (ParticleManager.textureCreated && this.scene.textures.exists(PARTICLE_KEY)) return;
    // Generate a small white circle texture for particles
    const g = this.scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(PARTICLE_KEY, 8, 8);
    g.destroy();
    ParticleManager.textureCreated = true;
  }

  /** Acquire an emitter from the pool or create a new one. */
  private acquire(x: number, y: number, config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig): Phaser.GameObjects.Particles.ParticleEmitter {
    let emitter = this.pool.pop();
    if (emitter) {
      emitter.setPosition(x, y);
      emitter.setVisible(true);
      emitter.setActive(true);
      this._totalRecycled++;
    } else {
      emitter = this.scene.add.particles(x, y, PARTICLE_KEY, config);
      this._totalCreated++;
    }
    this._activeCount++;
    if (this._activeCount > this._peakPool) {
      this._peakPool = this._activeCount;
    }
    return emitter;
  }

  /** Release an emitter back to the pool (or destroy if pool is full). */
  private release(emitter: Phaser.GameObjects.Particles.ParticleEmitter, delay: number): void {
    this.scene.time.delayedCall(delay, () => {
      this._activeCount = Math.max(0, this._activeCount - 1);
      if (this.pool.length < PARTICLE.POOL_MAX) {
        emitter.stop();
        emitter.setVisible(false);
        emitter.setActive(false);
        this.pool.push(emitter);
      } else {
        emitter.destroy();
        this._totalDestroyed++;
      }
    });
  }

  /** Hit spark effect at position, colored by element */
  createHitEffect(x: number, y: number, element?: ElementType): void {
    const color = element ? getElementColor(element) : 0xffffff;
    const config = {
      speed: { min: 40, max: 120 },
      scale: { start: 0.6, end: 0 },
      lifespan: 300,
      quantity: 6,
      tint: color,
      emitting: false,
    };
    const emitter = this.acquire(x, y, config);
    emitter.explode(6);
    this.release(emitter, 500);
  }

  /** Green healing particles rising upward */
  createHealEffect(x: number, y: number): void {
    const config = {
      speed: { min: 10, max: 40 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      quantity: 8,
      tint: Theme.colors.success,
      emitting: false,
    };
    const emitter = this.acquire(x, y, config);
    emitter.explode(8);
    this.release(emitter, 800);
  }

  /** Death explosion - unit disintegrates, colored by element */
  createDeathEffect(x: number, y: number, element?: ElementType, isBoss?: boolean): void {
    const elementColor = element ? getElementColor(element) : undefined;
    const tintColors = elementColor
      ? [elementColor, 0xffffff, elementColor]
      : [0xff4444, 0xff8844, 0xffcc00];
    const qty = isBoss ? 25 : 15;
    const config = {
      speed: { min: isBoss ? 80 : 50, max: isBoss ? 220 : 150 },
      scale: { start: isBoss ? 1.2 : 0.8, end: 0 },
      lifespan: isBoss ? 700 : 500,
      quantity: qty,
      tint: tintColors,
      emitting: false,
    };
    const emitter = this.acquire(x, y, config);
    emitter.explode(qty);
    this.release(emitter, isBoss ? 900 : 700);
  }

  /** Element reaction burst - big colorful explosion */
  createElementReactionEffect(x: number, y: number, element1?: ElementType, element2?: ElementType): void {
    const color1 = element1 ? getElementColor(element1) : 0xffffff;
    const color2 = element2 ? getElementColor(element2) : 0xffffff;
    const config = {
      speed: { min: 60, max: 180 },
      scale: { start: 1.0, end: 0 },
      lifespan: 600,
      quantity: 20,
      tint: [color1, color2],
      emitting: false,
    };
    const emitter = this.acquire(x, y, config);
    emitter.explode(20);
    this.release(emitter, 800);
  }

  /** Gold pillar effect on level up */
  createLevelUpEffect(x: number, y: number): void {
    const config = {
      speed: { min: 20, max: 80 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.7, end: 0 },
      lifespan: 800,
      quantity: 2,
      frequency: 50,
      tint: Theme.colors.gold,
      emitting: true,
    };
    const emitter = this.acquire(x, y, config);
    this.scene.time.delayedCall(600, () => {
      emitter.stop();
    });
    this.release(emitter, 1500);
  }

  /** Buff aura - gentle ring of particles */
  createBuffEffect(x: number, y: number, color?: number): void {
    const tint = color ?? Theme.colors.primary;
    const config = {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      lifespan: 500,
      quantity: 1,
      frequency: 80,
      tint,
      emitting: true,
    };
    const emitter = this.acquire(x, y, config);
    this.scene.time.delayedCall(800, () => {
      emitter.stop();
    });
    this.release(emitter, 1400);
  }

  /** Skill cast effect — burst of particles at caster position */
  createSkillCastEffect(x: number, y: number, color: number = 0xffff88): void {
    const config = {
      speed: { min: 20, max: 60 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      quantity: 8,
      tint: color,
      emitting: false,
    };
    const emitter = this.acquire(x, y, config);
    emitter.explode(8);
    this.release(emitter, 600);
  }

  /** Projectile trail — particles along a line from source to target */
  createProjectileTrail(fromX: number, fromY: number, toX: number, toY: number, color: number = 0xffffff): void {
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const config = {
      speed: { min: 10, max: 30 },
      scale: { start: 0.3, end: 0 },
      lifespan: 300,
      quantity: 4,
      tint: color,
      emitting: false,
    };
    const emitter = this.acquire(midX, midY, config);
    emitter.explode(4);
    this.release(emitter, 500);
  }

  /** Get pool monitoring stats (useful for dev/debug overlay) */
  getStats(): ParticlePoolStats {
    return {
      poolSize: this.pool.length,
      activeEmitters: this._activeCount,
      peakPool: this._peakPool,
      totalCreated: this._totalCreated,
      totalRecycled: this._totalRecycled,
      totalDestroyed: this._totalDestroyed,
    };
  }

  /** Destroy all pooled emitters (call on scene shutdown) */
  destroy(): void {
    for (const emitter of this.pool) {
      emitter.destroy();
    }
    this.pool.length = 0;
    this._activeCount = 0;
  }
}
