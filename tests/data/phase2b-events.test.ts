import { describe, it, expect } from 'vitest';
import eventsData from '../../src/data/events.json';
import actsData from '../../src/data/acts.json';

const events = eventsData as { id: string; title: string; choices: { text: string; outcomes: { probability: number; effects: { type: string }[] }[] }[] }[];
const acts = actsData as { id: string; eventPool: string[] }[];

const ACT1_NEW_EVENTS = ['event_fairy_circle', 'event_wounded_traveler', 'event_ancient_tree', 'event_lost_ranger'];
const ACT2_NEW_EVENTS = ['event_lava_pool', 'event_fire_spirit', 'event_dwarven_forge', 'event_volcanic_vent'];
const ACT3_NEW_EVENTS = ['event_shadow_altar', 'event_lost_soul', 'event_abyssal_merchant', 'event_dark_ritual'];
const ALL_NEW_EVENTS = [...ACT1_NEW_EVENTS, ...ACT2_NEW_EVENTS, ...ACT3_NEW_EVENTS];

describe('Phase 2b: New Events', () => {
  const eventMap = new Map(events.map(e => [e.id, e]));

  it('all 12 new events exist in events.json', () => {
    for (const id of ALL_NEW_EVENTS) {
      expect(eventMap.has(id), `Missing event: ${id}`).toBe(true);
    }
  });

  it('each event has 2-3 choices', () => {
    for (const id of ALL_NEW_EVENTS) {
      const event = eventMap.get(id)!;
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      expect(event.choices.length).toBeLessThanOrEqual(3);
    }
  });

  it('outcome probabilities sum to 1.0 for each choice', () => {
    for (const id of ALL_NEW_EVENTS) {
      const event = eventMap.get(id)!;
      for (const choice of event.choices) {
        const sum = choice.outcomes.reduce((s, o) => s + o.probability, 0);
        expect(sum).toBeCloseTo(1.0, 5);
      }
    }
  });

  it('all effects use valid types', () => {
    const validTypes = ['gold', 'heal', 'damage', 'stat_boost', 'item', 'relic'];
    for (const id of ALL_NEW_EVENTS) {
      const event = eventMap.get(id)!;
      for (const choice of event.choices) {
        for (const outcome of choice.outcomes) {
          for (const effect of outcome.effects) {
            expect(validTypes, `Invalid effect type in ${id}: ${effect.type}`).toContain(effect.type);
          }
        }
      }
    }
  });

  it('Act 1 eventPool contains new Act 1 events', () => {
    const act1 = acts.find(a => a.id === 'act1_forest')!;
    for (const id of ACT1_NEW_EVENTS) {
      expect(act1.eventPool, `Act 1 missing event: ${id}`).toContain(id);
    }
  });

  it('Act 2 eventPool contains new Act 2 events', () => {
    const act2 = acts.find(a => a.id === 'act2_volcano')!;
    for (const id of ACT2_NEW_EVENTS) {
      expect(act2.eventPool, `Act 2 missing event: ${id}`).toContain(id);
    }
  });

  it('Act 3 eventPool contains new Act 3 events', () => {
    const act3 = acts.find(a => a.id === 'act3_abyss')!;
    for (const id of ACT3_NEW_EVENTS) {
      expect(act3.eventPool, `Act 3 missing event: ${id}`).toContain(id);
    }
  });
});
