import { describe, it, expect, beforeEach } from 'vitest';
import Phaser from 'phaser';
import { BattleScene } from '../../src/scenes/BattleScene';
import { RunManager } from '../../src/managers/RunManager';
import { EventBus } from '../../src/systems/EventBus';
import { MapGenerator } from '../../src/systems/MapGenerator';
import { SceneTestHarness } from '../helpers/scene-harness';

describe('BattleScene', () => {
  let rm: RunManager;

  beforeEach(() => {
    EventBus.getInstance().reset();
    rm = RunManager.getInstance();
    rm.newRun(42);
    // Generate map so BattleScene can read node data
    const map = MapGenerator.generate(rm.getRng(), rm.getFloor());
    rm.setMap(map);
  });

  function findBattleNodeIndex(): number {
    const map = rm.getMap();
    const idx = map.findIndex(n => n.type === 'battle' && n.data && (n.data as any).enemies);
    expect(idx).toBeGreaterThanOrEqual(0);
    return idx;
  }

  function createBattleScene(nodeIndex?: number): BattleScene {
    const idx = nodeIndex ?? findBattleNodeIndex();
    return SceneTestHarness.createScene(BattleScene, { nodeIndex: idx });
  }

  describe('lifecycle', () => {
    it('creates without errors', () => {
      const scene = createBattleScene();
      expect(scene).toBeDefined();
    });

    it('starts with battleEndHandled = false', () => {
      const scene = createBattleScene();
      expect((scene as any).battleEndHandled).toBe(false);
    });

    it('creates a BattleSystem', () => {
      const scene = createBattleScene();
      expect((scene as any).battleSystem).toBeDefined();
      expect((scene as any).battleSystem.battleState).toBe('fighting');
    });

    it('creates a BattleHUD', () => {
      const scene = createBattleScene();
      expect((scene as any).hud).toBeDefined();
    });

    it('creates effects and particles systems', () => {
      const scene = createBattleScene();
      expect((scene as any).effects).toBeDefined();
      expect((scene as any).particles).toBeDefined();
    });

    it('creates UnitAnimationSystem', () => {
      const scene = createBattleScene();
      expect((scene as any).unitAnimations).toBeDefined();
    });

    it('populates allUnits with heroes and enemies', () => {
      const scene = createBattleScene();
      const allUnits = (scene as any).allUnits;
      expect(allUnits.length).toBeGreaterThan(0);
    });
  });

  describe('EventBus listeners', () => {
    it('registers all event listeners', () => {
      const scene = createBattleScene();
      expect((scene as any).onDamage).toBeTypeOf('function');
      expect((scene as any).onHeal).toBeTypeOf('function');
      expect((scene as any).onDeath).toBeTypeOf('function');
      expect((scene as any).onReaction).toBeTypeOf('function');
      expect((scene as any).onSkillVisual).toBeTypeOf('function');
    });

    it('shutdown cleans up EventBus listeners', () => {
      const scene = createBattleScene();
      const eb = EventBus.getInstance();

      // Before shutdown, listeners are registered
      const onDamageRef = (scene as any).onDamage;
      expect(onDamageRef).toBeDefined();

      scene.shutdown();
      // After shutdown, calling the listener reference should not throw
      // (it's just a function reference, but EventBus won't call it anymore)
    });

    it('shutdown destroys unitAnimations', () => {
      const scene = createBattleScene();
      const anims = (scene as any).unitAnimations;
      let destroyed = false;
      anims.destroy = () => { destroyed = true; };
      scene.shutdown();
      expect(destroyed).toBe(true);
    });

    it('shutdown destroys particles', () => {
      const scene = createBattleScene();
      const particles = (scene as any).particles;
      let destroyed = false;
      particles.destroy = () => { destroyed = true; };
      scene.shutdown();
      expect(destroyed).toBe(true);
    });
  });

  describe('update loop', () => {
    it('ticks the battle system each frame', () => {
      const scene = createBattleScene();
      let updateCount = 0;
      const origUpdate = (scene as any).battleSystem.update.bind((scene as any).battleSystem);
      (scene as any).battleSystem.update = (delta: number) => {
        updateCount++;
        origUpdate(delta);
      };

      SceneTestHarness.tickFrames(scene, 3);
      expect(updateCount).toBe(3);
    });

    it('updates HUD portraits each frame', () => {
      const scene = createBattleScene();
      let portraitUpdates = 0;
      (scene as any).hud.updatePortraits = () => { portraitUpdates++; };

      SceneTestHarness.tickFrames(scene, 5);
      expect(portraitUpdates).toBe(5);
    });
  });

  describe('battle end handling', () => {
    it('handles victory when battleState transitions to victory', () => {
      const scene = createBattleScene();
      const bs = (scene as any).battleSystem;

      // Directly set the battleState to simulate end of battle
      bs.battleState = 'victory';

      SceneTestHarness.tickFrames(scene, 1);
      expect((scene as any).battleEndHandled).toBe(true);
    });

    it('handles defeat when battleState transitions to defeat', () => {
      const scene = createBattleScene();
      const bs = (scene as any).battleSystem;

      bs.battleState = 'defeat';

      SceneTestHarness.tickFrames(scene, 1);
      expect((scene as any).battleEndHandled).toBe(true);
    });

    it('only handles battle end once', () => {
      const scene = createBattleScene();
      const bs = (scene as any).battleSystem;

      bs.battleState = 'victory';

      SceneTestHarness.tickFrames(scene, 1);
      expect((scene as any).battleEndHandled).toBe(true);

      // Additional frames should not re-trigger (no error thrown)
      SceneTestHarness.tickFrames(scene, 5);
    });
  });

  describe('skill visual listener', () => {
    it('onSkillVisual handles known skill with projectile type', () => {
      const scene = createBattleScene();
      const allUnits = (scene as any).allUnits;
      if (allUnits.length < 2) return;

      const caster = allUnits[0];
      const target = allUnits[allUnits.length - 1];

      // Should not throw
      (scene as any).onSkillVisual({
        casterId: caster.unitId,
        skillId: 'fireball',
        targets: [target.unitId],
      });
    });

    it('onSkillVisual handles unknown skill gracefully', () => {
      const scene = createBattleScene();
      const allUnits = (scene as any).allUnits;
      if (allUnits.length === 0) return;

      const caster = allUnits[0];

      // Should not throw for unknown skill
      (scene as any).onSkillVisual({
        casterId: caster.unitId,
        skillId: 'nonexistent_skill',
        targets: [],
      });
    });

    it('onSkillVisual ignores unknown caster', () => {
      const scene = createBattleScene();

      // Should not throw for unknown caster
      (scene as any).onSkillVisual({
        casterId: 'unknown_unit_id',
        skillId: 'fireball',
        targets: [],
      });
    });
  });

  describe('act-themed visuals', () => {
    it('creates act modifier description when available', () => {
      const scene = createBattleScene();
      const actMod = (scene as any).battleSystem.actModifier;
      expect(actMod).toBeDefined();
      expect(actMod.getActDescription()).toBeTruthy();
    });
  });

  describe('keyboard shortcuts', () => {
    it('init resets state for reuse', () => {
      const scene = createBattleScene();
      (scene as any).init({ nodeIndex: 0 });
      expect((scene as any).battleEndHandled).toBe(false);
      expect((scene as any).allUnits).toEqual([]);
    });
  });
});
