import { describe, it, expect } from 'vitest';
import heroesData from '../../src/data/heroes.json';
import skillsData from '../../src/data/skills.json';
import itemsData from '../../src/data/items.json';
import relicsData from '../../src/data/relics.json';
import eventsData from '../../src/data/events.json';
import actsData from '../../src/data/acts.json';
import skillVisualsData from '../../src/data/skill-visuals.json';
import skillAdvancementsData from '../../src/data/skill-advancements.json';
import { SYNERGY_DEFINITIONS } from '../../src/config/synergies';

const heroes = heroesData as { id: string; name: string; skills: string[]; element: string | null; race: string; class: string }[];
const skills = skillsData as { id: string; name: string; element?: string }[];
const items = itemsData as { id: string; name: string; rarity: string; slot: string }[];
const relics = relicsData as { id: string; name: string; rarity: string }[];
const events = eventsData as { id: string; title: string; choices: { text: string; outcomes: { probability: number; effects: { type: string; heroId?: string; relicId?: string }[] }[] }[] }[];
const acts = actsData as { id: string; eventPool: string[]; enemyPool: string[]; bossPool: string[] }[];
const skillVisuals = skillVisualsData as Record<string, { type: string; color: string }>;
const skillAdvancements = skillAdvancementsData as { skillId: string; level: number }[];

describe('Content Integrity', () => {
  describe('Hero skill references', () => {
    const skillIds = new Set(skills.map(s => s.id));

    it('all hero skills exist in skills.json', () => {
      for (const hero of heroes) {
        for (const skillId of hero.skills) {
          expect(skillIds.has(skillId), `Hero ${hero.id} references missing skill: ${skillId}`).toBe(true);
        }
      }
    });

    it('every hero has at least 1 skill', () => {
      for (const hero of heroes) {
        expect(hero.skills.length, `Hero ${hero.id} has no skills`).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Unique IDs', () => {
    it('hero IDs are unique', () => {
      const ids = heroes.map(h => h.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('skill IDs are unique', () => {
      const ids = skills.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('item IDs are unique', () => {
      const ids = items.map(i => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('relic IDs are unique', () => {
      const ids = relics.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('event IDs are unique', () => {
      const ids = events.map(e => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('synergy IDs are unique', () => {
      const ids = SYNERGY_DEFINITIONS.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Act event pool references', () => {
    const eventIds = new Set(events.map(e => e.id));

    it('all act event pool entries exist in events.json', () => {
      for (const act of acts) {
        for (const eventId of act.eventPool) {
          expect(eventIds.has(eventId), `Act ${act.id} references missing event: ${eventId}`).toBe(true);
        }
      }
    });
  });

  describe('Event recruit/relic references', () => {
    const heroIds = new Set(heroes.map(h => h.id));
    const relicIds = new Set(relics.map(r => r.id));

    it('event recruit heroIds exist in heroes.json', () => {
      for (const event of events) {
        for (const choice of event.choices) {
          for (const outcome of choice.outcomes) {
            for (const effect of outcome.effects) {
              if (effect.type === 'recruit' && effect.heroId) {
                expect(heroIds.has(effect.heroId), `Event ${event.id} recruits missing hero: ${effect.heroId}`).toBe(true);
              }
            }
          }
        }
      }
    });

    it('event relic relicIds exist in relics.json', () => {
      for (const event of events) {
        for (const choice of event.choices) {
          for (const outcome of choice.outcomes) {
            for (const effect of outcome.effects) {
              if (effect.type === 'relic' && effect.relicId) {
                expect(relicIds.has(effect.relicId), `Event ${event.id} references missing relic: ${effect.relicId}`).toBe(true);
              }
            }
          }
        }
      }
    });
  });

  describe('Event probability validation', () => {
    it('all outcome probabilities sum to 1.0', () => {
      for (const event of events) {
        for (const choice of event.choices) {
          const sum = choice.outcomes.reduce((acc, o) => acc + o.probability, 0);
          expect(sum, `Event ${event.id} choice "${choice.text}" probabilities sum to ${sum}`).toBeCloseTo(1.0);
        }
      }
    });
  });

  describe('Skill visuals', () => {
    it('all skills have visual definitions', () => {
      for (const skill of skills) {
        expect(skill.id in skillVisuals, `Skill ${skill.id} missing visual definition`).toBe(true);
      }
    });
  });

  describe('Skill advancements', () => {
    const skillIds = new Set(skills.map(s => s.id));

    it('all skill advancement skillIds exist in skills.json', () => {
      for (const adv of skillAdvancements) {
        expect(skillIds.has(adv.skillId), `Advancement references missing skill: ${adv.skillId}`).toBe(true);
      }
    });

    it('skill advancement levels are positive', () => {
      for (const adv of skillAdvancements) {
        expect(adv.level, `Advancement for ${adv.skillId} has invalid level`).toBeGreaterThan(0);
      }
    });
  });

  describe('Synergy definitions', () => {
    it('all 5 elements have synergies', () => {
      const elementKeys = SYNERGY_DEFINITIONS.filter(s => s.type === 'element').map(s => s.key);
      expect(elementKeys).toContain('fire');
      expect(elementKeys).toContain('ice');
      expect(elementKeys).toContain('lightning');
      expect(elementKeys).toContain('dark');
      expect(elementKeys).toContain('holy');
    });

    it('all 6 races have synergies', () => {
      const raceKeys = SYNERGY_DEFINITIONS.filter(s => s.type === 'race').map(s => s.key);
      expect(raceKeys).toContain('human');
      expect(raceKeys).toContain('elf');
      expect(raceKeys).toContain('undead');
      expect(raceKeys).toContain('demon');
      expect(raceKeys).toContain('beast');
      expect(raceKeys).toContain('dragon');
    });

    it('all 6 classes have synergies', () => {
      const classKeys = SYNERGY_DEFINITIONS.filter(s => s.type === 'class').map(s => s.key);
      expect(classKeys).toContain('warrior');
      expect(classKeys).toContain('mage');
      expect(classKeys).toContain('ranger');
      expect(classKeys).toContain('cleric');
      expect(classKeys).toContain('assassin');
      expect(classKeys).toContain('paladin');
    });
  });

  describe('Content counts', () => {
    it('has 19 heroes', () => expect(heroes.length).toBe(19));
    it('has at least 44 skills', () => expect(skills.length).toBeGreaterThanOrEqual(44));
    it('has at least 48 items', () => expect(items.length).toBeGreaterThanOrEqual(48));
    it('has at least 35 relics', () => expect(relics.length).toBeGreaterThanOrEqual(35));
    it('has at least 34 events', () => expect(events.length).toBeGreaterThanOrEqual(34));
    it('has 17 synergy definitions', () => expect(SYNERGY_DEFINITIONS.length).toBe(17));
  });

  describe('Item rarity distribution', () => {
    it('has at least 7 legendary items', () => {
      const legendaries = items.filter(i => i.rarity === 'legendary');
      expect(legendaries.length).toBeGreaterThanOrEqual(7);
    });

    it('all items have valid slots', () => {
      const validSlots = new Set(['weapon', 'armor', 'accessory']);
      for (const item of items) {
        expect(validSlots.has(item.slot), `Item ${item.id} has invalid slot: ${item.slot}`).toBe(true);
      }
    });
  });

  describe('Hero element coverage', () => {
    it('has at least 2 ice heroes', () => {
      const iceHeroes = heroes.filter(h => h.element === 'ice');
      expect(iceHeroes.length).toBeGreaterThanOrEqual(2);
    });

    it('has at least 3 lightning heroes', () => {
      const lightningHeroes = heroes.filter(h => h.element === 'lightning');
      expect(lightningHeroes.length).toBeGreaterThanOrEqual(3);
    });

    it('has at least 2 heroes per element', () => {
      const elements = ['fire', 'ice', 'lightning', 'dark', 'holy'];
      for (const el of elements) {
        const count = heroes.filter(h => h.element === el).length;
        expect(count, `Element ${el} has only ${count} heroes`).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
