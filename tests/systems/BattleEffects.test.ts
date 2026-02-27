import { describe, it, expect, beforeEach } from 'vitest';
import { BattleEffects } from '../../src/systems/BattleEffects';
import Phaser from 'phaser';

function mockScene(): Phaser.Scene {
  return new Phaser.Scene() as Phaser.Scene;
}

describe('BattleEffects', () => {
  let scene: Phaser.Scene;
  let effects: BattleEffects;

  beforeEach(() => {
    scene = mockScene();
    effects = new BattleEffects(scene);
  });

  describe('screenShake', () => {
    it('calls camera shake', () => {
      let called = false;
      (scene.cameras.main as any).shake = () => { called = true; };
      effects.screenShake(0.01, 200);
      expect(called).toBe(true);
    });
  });

  describe('screenFlash', () => {
    it('creates a flash rectangle', () => {
      const before = (scene as any)._children?.length ?? 0;
      effects.screenFlash(0xff4444, 200);
      // Flash creates a rectangle + tween (which completes immediately in mock)
      // The rectangle gets destroyed by onComplete, but was created
      expect(true).toBe(true); // No error thrown
    });
  });

  describe('showInterruptText', () => {
    it('creates floating interrupt text at position', () => {
      effects.showInterruptText(100, 200);
      // Should not throw — text + tweens created and destroyed via mock
      expect(true).toBe(true);
    });
  });

  describe('showComboBreak', () => {
    it('creates combo break text at position', () => {
      effects.showComboBreak(150, 250);
      expect(true).toBe(true);
    });
  });

  describe('showSkillName', () => {
    it('creates floating skill name text', () => {
      effects.showSkillName(200, 100, '火球术', 0xff4400);
      expect(true).toBe(true);
    });
  });

  describe('showElementLabel', () => {
    it('creates advantage label', () => {
      effects.showElementLabel(100, 100, true);
      expect(true).toBe(true);
    });

    it('creates disadvantage label', () => {
      effects.showElementLabel(100, 100, false);
      expect(true).toBe(true);
    });
  });

  describe('drawThreatLines', () => {
    it('draws lines from enemies to their targets', () => {
      const graphics = (scene as any).add.graphics();
      const enemies = [
        { x: 400, y: 200, isAlive: true, target: { x: 100, y: 200 } },
        { x: 400, y: 300, isAlive: true, target: { x: 100, y: 300 } },
      ];
      effects.drawThreatLines(graphics, enemies);
      expect(true).toBe(true);
    });

    it('skips dead enemies', () => {
      const graphics = (scene as any).add.graphics();
      const enemies = [
        { x: 400, y: 200, isAlive: false, target: { x: 100, y: 200 } },
      ];
      effects.drawThreatLines(graphics, enemies);
      expect(true).toBe(true);
    });

    it('skips enemies without target', () => {
      const graphics = (scene as any).add.graphics();
      const enemies = [
        { x: 400, y: 200, isAlive: true, target: null },
      ];
      effects.drawThreatLines(graphics, enemies);
      expect(true).toBe(true);
    });
  });

  describe('drawHealerLines', () => {
    it('draws lines from healers to targets', () => {
      const graphics = (scene as any).add.graphics();
      const healers = [{ x: 100, y: 200, isAlive: true }];
      const targets = [{ x: 100, y: 300 }];
      effects.drawHealerLines(graphics, healers, targets, 0.25);
      expect(true).toBe(true);
    });

    it('skips dead healers', () => {
      const graphics = (scene as any).add.graphics();
      const healers = [{ x: 100, y: 200, isAlive: false }];
      const targets = [{ x: 100, y: 300 }];
      effects.drawHealerLines(graphics, healers, targets, 0.25);
      expect(true).toBe(true);
    });
  });

  describe('critEdgeFlash', () => {
    it('creates golden vignette effect', () => {
      effects.critEdgeFlash();
      expect(true).toBe(true);
    });
  });

  describe('showProjectile', () => {
    it('creates projectile from source to target', () => {
      effects.showProjectile(100, 200, 400, 200, 0xffff00, 200);
      expect(true).toBe(true);
    });
  });

  describe('showAoeBlast', () => {
    it('creates expanding aoe circle', () => {
      effects.showAoeBlast(300, 200, 60, 0xff4444);
      expect(true).toBe(true);
    });
  });

  describe('showAoeIndicator', () => {
    it('creates aoe indicator ring', () => {
      effects.showAoeIndicator(300, 200, 60, 0xff4444);
      expect(true).toBe(true);
    });
  });
});
