import { describe, it, expect } from 'vitest';
import skillsData from '../../src/data/skills.json';
import enemiesData from '../../src/data/enemies.json';
import skillVisualsData from '../../src/data/skill-visuals.json';

describe('Act 1 enemy skills (P1-10)', () => {
  const skills = skillsData as any[];
  const enemies = enemiesData as any[];

  describe('new skills exist', () => {
    it('acid_spit exists with correct properties', () => {
      const skill = skills.find(s => s.id === 'acid_spit');
      expect(skill).toBeDefined();
      expect(skill.scalingStat).toBe('attack');
      expect(skill.scalingRatio).toBe(0.8);
      expect(skill.cooldown).toBe(6);
      expect(skill.baseDamage).toBe(15);
      expect(skill.statusEffect).toBe('slow');
      expect(skill.effectDuration).toBe(3);
    });

    it('goblin_rush exists with correct properties', () => {
      const skill = skills.find(s => s.id === 'goblin_rush');
      expect(skill).toBeDefined();
      expect(skill.scalingStat).toBe('attack');
      expect(skill.scalingRatio).toBe(1.2);
      expect(skill.cooldown).toBe(8);
      expect(skill.baseDamage).toBe(25);
      expect(skill.statusEffect).toBe('stun');
      expect(skill.effectDuration).toBe(1);
    });

    it('lizard_flame exists with correct properties', () => {
      const skill = skills.find(s => s.id === 'lizard_flame');
      expect(skill).toBeDefined();
      expect(skill.scalingStat).toBe('magicPower');
      expect(skill.scalingRatio).toBe(1.0);
      expect(skill.cooldown).toBe(7);
      expect(skill.baseDamage).toBe(30);
      expect(skill.element).toBe('fire');
    });
  });

  describe('enemies have skills assigned', () => {
    it('slime has acid_spit', () => {
      const slime = enemies.find(e => e.id === 'slime');
      expect(slime.skills).toContain('acid_spit');
    });
    it('goblin has goblin_rush', () => {
      const goblin = enemies.find(e => e.id === 'goblin');
      expect(goblin.skills).toContain('goblin_rush');
    });
    it('fire_lizard has lizard_flame', () => {
      const lizard = enemies.find(e => e.id === 'fire_lizard');
      expect(lizard.skills).toContain('lizard_flame');
    });
  });

  describe('skill visuals exist', () => {
    it('all 3 new skills have visuals', () => {
      const visuals = skillVisualsData as Record<string, any>;
      for (const id of ['acid_spit', 'goblin_rush', 'lizard_flame']) {
        expect(visuals[id], `${id} visual`).toBeDefined();
      }
    });
  });
});
