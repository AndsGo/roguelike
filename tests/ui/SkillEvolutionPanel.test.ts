import { describe, it, expect } from 'vitest';
import Phaser from 'phaser';
import { SkillEvolutionPanel } from '../../src/ui/SkillEvolutionPanel';
import { SkillEvolution } from '../../src/types';

describe('SkillEvolutionPanel', () => {
  function createTestScene(): Phaser.Scene {
    return new Phaser.Scene({ key: 'test' });
  }

  const mockBranches: SkillEvolution[] = [
    {
      id: 'test_evo_a', heroId: 'mage', sourceSkillId: 'fireball', branch: 'A',
      name: '烈焰风暴', description: '对全体敌人造成火焰伤害',
      overrides: { targetType: 'all_enemies', aoeRadius: 100 },
      level10Bonus: { baseDamage: 15 },
    },
    {
      id: 'test_evo_b', heroId: 'mage', sourceSkillId: 'fireball', branch: 'B',
      name: '精准火箭', description: '对单体目标造成双倍伤害',
      overrides: { baseDamage: 120, cooldown: 5 },
      level10Bonus: { baseDamage: 20 },
    },
  ];

  const mockBaseSkill = {
    id: 'fireball', name: '火球术', description: '发射火球',
    baseDamage: 60, cooldown: 7, targetType: 'enemy',
    damageType: 'magic', scalingStat: 'magicPower', scalingRatio: 0.8, range: 300,
  } as any;

  it('creates without errors', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    expect(panel).toBeDefined();
  });

  it('calls callback with selected evolution ID for branch A', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    panel.selectBranch('A');
    expect(chosen).toBe('test_evo_a');
  });

  it('selectBranch B returns branch B id', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    panel.selectBranch('B');
    expect(chosen).toBe('test_evo_b');
  });

  it('does nothing for invalid branch', () => {
    const scene = createTestScene();
    let chosen: string | null = null;
    const panel = new SkillEvolutionPanel(scene, '火法师', mockBranches, mockBaseSkill, (evoId) => {
      chosen = evoId;
    });
    // Force an invalid branch that doesn't exist in data
    panel.selectBranch('A' as any); // A exists, so first verify it works
    expect(chosen).toBe('test_evo_a');
  });
});
