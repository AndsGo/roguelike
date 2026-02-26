import Phaser from 'phaser';
import { Theme } from '../ui/Theme';
import { ElementType } from '../types';

const PARTICLE_KEY = '__particle_circle__';

/**
 * Manages particle effects for the game.
 * All particles use code-generated circle textures, no external assets needed.
 */
export class ParticleManager {
  private scene: Phaser.Scene;
  private static textureCreated = false;

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

  /** Hit spark effect at position, colored by element */
  createHitEffect(x: number, y: number, element?: ElementType): void {
    const color = element ? (Theme.colors.element[element] ?? 0xffffff) : 0xffffff;
    const emitter = this.scene.add.particles(x, y, PARTICLE_KEY, {
      speed: { min: 40, max: 120 },
      scale: { start: 0.6, end: 0 },
      lifespan: 300,
      quantity: 6,
      tint: color,
      emitting: false,
    });
    emitter.explode(6);
    this.scene.time.delayedCall(500, () => emitter.destroy());
  }

  /** Green healing particles rising upward */
  createHealEffect(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, PARTICLE_KEY, {
      speed: { min: 10, max: 40 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      quantity: 8,
      tint: Theme.colors.success,
      emitting: false,
    });
    emitter.explode(8);
    this.scene.time.delayedCall(800, () => emitter.destroy());
  }

  /** Death explosion - unit disintegrates */
  createDeathEffect(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, PARTICLE_KEY, {
      speed: { min: 50, max: 150 },
      scale: { start: 0.8, end: 0 },
      lifespan: 500,
      quantity: 15,
      tint: [0xff4444, 0xff8844, 0xffcc00],
      emitting: false,
    });
    emitter.explode(15);
    this.scene.time.delayedCall(700, () => emitter.destroy());
  }

  /** Element reaction burst - big colorful explosion */
  createElementReactionEffect(x: number, y: number, element1?: ElementType, element2?: ElementType): void {
    const color1 = element1 ? (Theme.colors.element[element1] ?? 0xffffff) : 0xffffff;
    const color2 = element2 ? (Theme.colors.element[element2] ?? 0xffffff) : 0xffffff;
    const emitter = this.scene.add.particles(x, y, PARTICLE_KEY, {
      speed: { min: 60, max: 180 },
      scale: { start: 1.0, end: 0 },
      lifespan: 600,
      quantity: 20,
      tint: [color1, color2],
      emitting: false,
    });
    emitter.explode(20);
    this.scene.time.delayedCall(800, () => emitter.destroy());
  }

  /** Gold pillar effect on level up */
  createLevelUpEffect(x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, PARTICLE_KEY, {
      speed: { min: 20, max: 80 },
      angle: { min: 260, max: 280 },
      scale: { start: 0.7, end: 0 },
      lifespan: 800,
      quantity: 2,
      frequency: 50,
      tint: Theme.colors.gold,
      emitting: true,
    });
    this.scene.time.delayedCall(600, () => {
      emitter.stop();
    });
    this.scene.time.delayedCall(1500, () => emitter.destroy());
  }

  /** Buff aura - gentle ring of particles */
  createBuffEffect(x: number, y: number, color?: number): void {
    const tint = color ?? Theme.colors.primary;
    const emitter = this.scene.add.particles(x, y, PARTICLE_KEY, {
      speed: { min: 5, max: 20 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      lifespan: 500,
      quantity: 1,
      frequency: 80,
      tint,
      emitting: true,
    });
    this.scene.time.delayedCall(800, () => {
      emitter.stop();
    });
    this.scene.time.delayedCall(1400, () => emitter.destroy());
  }
}
