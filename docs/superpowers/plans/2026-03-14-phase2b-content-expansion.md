# Phase 2b: Content Expansion Implementation Plan (v1.13.0)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 heroes, 12 events, 3 boss phase configs, and rewrite RestScene with 3 choices — filling content gaps identified in the game evaluation report.

**Architecture:** Pure data expansion (heroes, skills, events, boss phases in JSON) + RestScene UI rewrite + balance constants + MetaManager unlock entries. No new systems — all features plug into existing BossPhaseSystem, EventSystem, SkillSystem, and RunManager.

**Tech Stack:** TypeScript + Phaser 3, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-14-phase2b-content-expansion-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/heroes.json` | Modify | +3 hero entries |
| `src/data/skills.json` | Modify | +9 skill entries (6 regular + 3 ultimates) |
| `src/data/skill-visuals.json` | Modify | +9 visual entries |
| `src/data/events.json` | Modify | +12 event entries |
| `src/data/acts.json` | Modify | Add new event IDs to Acts 1-3 eventPools |
| `src/data/boss-phases.json` | Modify | +3 boss phase configs |
| `src/config/balance.ts` | Modify | +3 rest constants |
| `src/constants.ts` | Modify | Re-export new constants |
| `src/scenes/RestScene.ts` | Rewrite | 3-choice UI (heal/train/scavenge) |
| `src/i18n.ts` | Modify | New rest UI strings |
| `src/managers/MetaManager.ts` | Modify | +3 hero unlock conditions |
| `tests/data/phase2b-heroes.test.ts` | Create | Hero + skill data validation |
| `tests/data/phase2b-events.test.ts` | Create | Event data validation |
| `tests/data/phase2b-boss-phases.test.ts` | Create | Boss phase validation |
| `tests/scenes/RestScene.test.ts` | Modify | Add 3-choice behavior tests |
| `tests/data/content-integrity.test.ts` | Modify | Update hero/skill/event count assertions |

---

## Chunk 1: Hero Data + Skills

### Task 1: Add 9 new skills to skills.json and skill-visuals.json

**Files:**
- Modify: `src/data/skills.json` — append 9 skill entries
- Modify: `src/data/skill-visuals.json` — append 9 visual entries
- Create: `tests/data/phase2b-heroes.test.ts` — skill + hero validation tests (skill tests first, hero tests added in Task 2)

- [ ] **Step 1: Write the failing test for new skills**

Create `tests/data/phase2b-heroes.test.ts` (hero tests will be appended in Task 2):

```typescript
import { describe, it, expect } from 'vitest';
import skillsData from '../../src/data/skills.json';
import skillVisualsData from '../../src/data/skill-visuals.json';

const skills = skillsData as { id: string; name: string; element?: string; isUltimate?: boolean; cooldown: number; damageType: string; targetType: string; baseDamage: number; scalingStat: string; scalingRatio: number; range: number; statusEffect?: string; effectDuration?: number }[];
const skillVisuals = skillVisualsData as Record<string, { type: string; color: string; count?: number }>;

const NEW_SKILL_IDS = [
  'frost_shield', 'glacial_pulse', 'ult_frozen_sanctuary',
  'holy_blessing', 'radiant_burst', 'ult_divine_empowerment',
  'frost_arrow', 'dragon_ice_breath', 'ult_glacial_barrage',
];

describe('Phase 2b: New Skills', () => {
  const skillMap = new Map(skills.map(s => [s.id, s]));

  it('all 9 new skills exist in skills.json', () => {
    for (const id of NEW_SKILL_IDS) {
      expect(skillMap.has(id), `Missing skill: ${id}`).toBe(true);
    }
  });

  it('3 skills are ultimates with cooldown 0', () => {
    const ultIds = ['ult_frozen_sanctuary', 'ult_divine_empowerment', 'ult_glacial_barrage'];
    for (const id of ultIds) {
      const skill = skillMap.get(id)!;
      expect(skill.isUltimate).toBe(true);
      expect(skill.cooldown).toBe(0);
    }
  });

  it('all new skills have valid targetType', () => {
    const validTargets = ['enemy', 'ally', 'all_enemies', 'all_allies', 'self'];
    for (const id of NEW_SKILL_IDS) {
      const skill = skillMap.get(id)!;
      expect(validTargets).toContain(skill.targetType);
    }
  });

  it('all new skills have ice or holy element', () => {
    for (const id of NEW_SKILL_IDS) {
      const skill = skillMap.get(id)!;
      expect(['ice', 'holy']).toContain(skill.element);
    }
  });

  it('all 9 new skills have visual entries', () => {
    for (const id of NEW_SKILL_IDS) {
      expect(skillVisuals[id], `Missing visual for: ${id}`).toBeDefined();
      expect(skillVisuals[id].color).toMatch(/^0x[0-9a-fA-F]{6}$/);
    }
  });

  it('frost_shield is a healing/buff skill', () => {
    const s = skillMap.get('frost_shield')!;
    expect(s.baseDamage).toBeLessThan(0); // negative = heal
    expect(s.targetType).toBe('ally');
    expect(s.statusEffect).toBe('buff');
  });

  it('dragon_ice_breath uses attack scaling with magical damageType', () => {
    const s = skillMap.get('dragon_ice_breath')!;
    expect(s.damageType).toBe('magical');
    expect(s.scalingStat).toBe('attack');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/phase2b-heroes.test.ts`
Expected: FAIL — skills not found

- [ ] **Step 3: Add 9 skills to skills.json**

Append these 9 entries to the end of the `skills.json` array (before the closing `]`). The full JSON for each skill is in the spec sections 1.1, 1.2, 1.3. Here are all 9:

```json
  {
    "id": "frost_shield",
    "name": "霜盾",
    "description": "为目标施加冰霜护盾，降低受到的伤害",
    "damageType": "magical",
    "scalingStat": "magicPower",
    "scalingRatio": -0.6,
    "targetType": "ally",
    "cooldown": 8,
    "baseDamage": -40,
    "range": 300,
    "element": "ice",
    "statusEffect": "buff",
    "effectDuration": 5
  },
  {
    "id": "glacial_pulse",
    "name": "冰川脉冲",
    "description": "释放冰川能量，对所有敌人造成冰属性伤害并减速",
    "damageType": "magical",
    "scalingStat": "magicPower",
    "scalingRatio": 0.7,
    "targetType": "all_enemies",
    "cooldown": 10,
    "baseDamage": 25,
    "range": 300,
    "element": "ice",
    "statusEffect": "slow",
    "effectDuration": 3
  },
  {
    "id": "ult_frozen_sanctuary",
    "name": "冰封圣域",
    "description": "召唤冰封圣域，大幅治疗全体友军",
    "damageType": "magical",
    "scalingStat": "magicPower",
    "scalingRatio": -1.2,
    "targetType": "all_allies",
    "cooldown": 0,
    "baseDamage": -60,
    "range": 999,
    "element": "ice",
    "isUltimate": true
  },
  {
    "id": "holy_blessing",
    "name": "圣光祝福",
    "description": "为目标施加圣光祝福，提升攻击力",
    "damageType": "magical",
    "scalingStat": "magicPower",
    "scalingRatio": -0.5,
    "targetType": "ally",
    "cooldown": 9,
    "baseDamage": -30,
    "range": 280,
    "element": "holy",
    "statusEffect": "buff",
    "effectDuration": 6
  },
  {
    "id": "radiant_burst",
    "name": "光辉爆发",
    "description": "释放圣光能量，对所有敌人造成圣属性伤害",
    "damageType": "magical",
    "scalingStat": "magicPower",
    "scalingRatio": 0.8,
    "targetType": "all_enemies",
    "cooldown": 10,
    "baseDamage": 30,
    "range": 300,
    "element": "holy"
  },
  {
    "id": "ult_divine_empowerment",
    "name": "神圣赋能",
    "description": "神圣之力赋予全体友军，大幅提升攻击力和攻击速度",
    "damageType": "magical",
    "scalingStat": "magicPower",
    "scalingRatio": -0.8,
    "targetType": "all_allies",
    "cooldown": 0,
    "baseDamage": -40,
    "range": 999,
    "element": "holy",
    "isUltimate": true,
    "statusEffect": "buff",
    "effectDuration": 8
  },
  {
    "id": "frost_arrow",
    "name": "霜冻箭",
    "description": "射出冰冻箭矢，造成物理伤害并减速目标",
    "damageType": "physical",
    "scalingStat": "attack",
    "scalingRatio": 1.1,
    "targetType": "enemy",
    "cooldown": 6,
    "baseDamage": 40,
    "range": 350,
    "element": "ice",
    "statusEffect": "slow",
    "effectDuration": 2
  },
  {
    "id": "dragon_ice_breath",
    "name": "龙息寒流",
    "description": "喷射冰属性龙息，对所有敌人造成伤害",
    "damageType": "magical",
    "scalingStat": "attack",
    "scalingRatio": 0.6,
    "targetType": "all_enemies",
    "cooldown": 12,
    "baseDamage": 35,
    "range": 250,
    "element": "ice"
  },
  {
    "id": "ult_glacial_barrage",
    "name": "冰川弹幕",
    "description": "释放连续冰箭弹幕，对单体造成大量物理伤害",
    "damageType": "physical",
    "scalingStat": "attack",
    "scalingRatio": 2.0,
    "targetType": "enemy",
    "cooldown": 0,
    "baseDamage": 80,
    "range": 350,
    "element": "ice",
    "isUltimate": true
  }
```

- [ ] **Step 4: Add 9 entries to skill-visuals.json**

Add these entries to the `skill-visuals.json` object (before the closing `}`):

```json
  "frost_shield": { "type": "aoe_ally", "color": "0x88ccff" },
  "glacial_pulse": { "type": "aoe_enemy", "color": "0x66aaff" },
  "ult_frozen_sanctuary": { "type": "aoe_ally", "color": "0xaaddff" },
  "holy_blessing": { "type": "aoe_ally", "color": "0xffd700" },
  "radiant_burst": { "type": "aoe_enemy", "color": "0xffee44" },
  "ult_divine_empowerment": { "type": "aoe_ally", "color": "0xffdd88" },
  "frost_arrow": { "type": "projectile", "color": "0x88ccff" },
  "dragon_ice_breath": { "type": "aoe_enemy", "color": "0x66bbff" },
  "ult_glacial_barrage": { "type": "projectile", "color": "0xaaeeff", "count": 3 }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/data/phase2b-heroes.test.ts`
Expected: PASS — all 7 tests

- [ ] **Step 6: Commit**

```bash
git add src/data/skills.json src/data/skill-visuals.json tests/data/phase2b-heroes.test.ts
git commit -m "feat: add 9 new skills for Phase 2b heroes (frost_whisperer, holy_emissary, ice_dragon_hunter)"
```

---

### Task 2: Add 3 new heroes to heroes.json + MetaManager unlock conditions

**Files:**
- Modify: `src/data/heroes.json` — append 3 hero entries
- Modify: `src/managers/MetaManager.ts:72-96` — add 3 unlock conditions
- Modify: `tests/data/phase2b-heroes.test.ts` — add hero validation tests

- [ ] **Step 1: Add hero validation tests to phase2b-heroes.test.ts**

Append to the existing test file:

```typescript
import heroesData from '../../src/data/heroes.json';
import { MetaManager } from '../../src/managers/MetaManager';

const heroes = heroesData as { id: string; name: string; role: string; element: string | null; race: string; class: string; skills: string[]; baseStats: Record<string, number>; scalingPerLevel: Record<string, number>; spriteKey: string }[];

const NEW_HERO_IDS = ['frost_whisperer', 'holy_emissary', 'ice_dragon_hunter'];

describe('Phase 2b: New Heroes', () => {
  const heroMap = new Map(heroes.map(h => [h.id, h]));

  it('all 3 new heroes exist', () => {
    for (const id of NEW_HERO_IDS) {
      expect(heroMap.has(id), `Missing hero: ${id}`).toBe(true);
    }
  });

  it('each hero has 3 skills (2 regular + 1 ultimate)', () => {
    for (const id of NEW_HERO_IDS) {
      const hero = heroMap.get(id)!;
      expect(hero.skills).toHaveLength(3);
      // Third skill should be an ultimate
      expect(hero.skills[2]).toMatch(/^ult_/);
    }
  });

  it('frost_whisperer is elf/cleric/ice/support', () => {
    const h = heroMap.get('frost_whisperer')!;
    expect(h.race).toBe('elf');
    expect(h.class).toBe('cleric');
    expect(h.element).toBe('ice');
    expect(h.role).toBe('support');
  });

  it('holy_emissary is human/paladin/holy/support', () => {
    const h = heroMap.get('holy_emissary')!;
    expect(h.race).toBe('human');
    expect(h.class).toBe('paladin');
    expect(h.element).toBe('holy');
    expect(h.role).toBe('support');
  });

  it('ice_dragon_hunter is dragon/ranger/ice/ranged_dps', () => {
    const h = heroMap.get('ice_dragon_hunter')!;
    expect(h.race).toBe('dragon');
    expect(h.class).toBe('ranger');
    expect(h.element).toBe('ice');
    expect(h.role).toBe('ranged_dps');
  });

  it('all hero skills reference valid skills', () => {
    const skillIds = new Set(skills.map(s => s.id));
    for (const id of NEW_HERO_IDS) {
      const hero = heroMap.get(id)!;
      for (const skillId of hero.skills) {
        expect(skillIds.has(skillId), `Hero ${id} references missing skill: ${skillId}`).toBe(true);
      }
    }
  });

  it('all heroes have required baseStats fields', () => {
    const requiredStats = ['maxHp', 'hp', 'attack', 'defense', 'magicPower', 'magicResist', 'speed', 'attackSpeed', 'attackRange', 'critChance', 'critDamage'];
    for (const id of NEW_HERO_IDS) {
      const hero = heroMap.get(id)!;
      for (const stat of requiredStats) {
        expect(hero.baseStats[stat], `Hero ${id} missing baseStats.${stat}`).toBeDefined();
      }
    }
  });

  it('all heroes have unlock conditions in MetaManager', () => {
    for (const id of NEW_HERO_IDS) {
      const cond = MetaManager.getHeroUnlockCondition(id);
      expect(cond, `Missing unlock condition for ${id}`).toBeDefined();
      expect(cond!.type).not.toBe('default');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/phase2b-heroes.test.ts`
Expected: FAIL — heroes not found

- [ ] **Step 3: Add 3 heroes to heroes.json**

Append these 3 entries to the `heroes.json` array (before the closing `]`):

```json
  {
    "id": "frost_whisperer",
    "name": "霜语者",
    "role": "support",
    "element": "ice",
    "race": "elf",
    "class": "cleric",
    "baseStats": {
      "maxHp": 520, "hp": 520, "attack": 25, "defense": 20,
      "magicPower": 60, "magicResist": 28, "speed": 60,
      "attackSpeed": 0.85, "attackRange": 280, "critChance": 0.08, "critDamage": 1.5
    },
    "scalingPerLevel": { "maxHp": 32, "attack": 2, "defense": 2, "magicPower": 5, "magicResist": 2 },
    "skills": ["frost_shield", "glacial_pulse", "ult_frozen_sanctuary"],
    "spriteKey": "hero_frost_whisperer"
  },
  {
    "id": "holy_emissary",
    "name": "圣光使者",
    "role": "support",
    "element": "holy",
    "race": "human",
    "class": "paladin",
    "baseStats": {
      "maxHp": 580, "hp": 580, "attack": 35, "defense": 22,
      "magicPower": 55, "magicResist": 30, "speed": 65,
      "attackSpeed": 0.9, "attackRange": 250, "critChance": 0.1, "critDamage": 1.6
    },
    "scalingPerLevel": { "maxHp": 38, "attack": 3, "defense": 2, "magicPower": 4, "magicResist": 2 },
    "skills": ["holy_blessing", "radiant_burst", "ult_divine_empowerment"],
    "spriteKey": "hero_holy_emissary"
  },
  {
    "id": "ice_dragon_hunter",
    "name": "冰龙猎手",
    "role": "ranged_dps",
    "element": "ice",
    "race": "dragon",
    "class": "ranger",
    "baseStats": {
      "maxHp": 480, "hp": 480, "attack": 62, "defense": 14,
      "magicPower": 20, "magicResist": 15, "speed": 75,
      "attackSpeed": 1.2, "attackRange": 350, "critChance": 0.15, "critDamage": 1.8
    },
    "scalingPerLevel": { "maxHp": 30, "attack": 8, "defense": 1, "magicPower": 1, "magicResist": 1 },
    "skills": ["frost_arrow", "dragon_ice_breath", "ult_glacial_barrage"],
    "spriteKey": "hero_ice_dragon_hunter"
  }
```

- [ ] **Step 4: Add 3 unlock conditions to MetaManager.ts**

In `src/managers/MetaManager.ts`, find the `HERO_UNLOCK_CONDITIONS` object (around line 72-96). Add these 3 entries before the closing `};`:

```typescript
    frost_whisperer: { type: 'element_wins', element: 'ice', threshold: 3, description: '使用冰属性英雄获胜3次' },
    holy_emissary: { type: 'hero_used', heroId: 'knight', description: '使用骑士获胜一次' },
    ice_dragon_hunter: { type: 'boss_kill', threshold: 1, bossId: 'frost_queen', description: '击败冰霜女王' },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/data/phase2b-heroes.test.ts`
Expected: PASS — all tests

- [ ] **Step 6: Commit**

```bash
git add src/data/heroes.json src/managers/MetaManager.ts tests/data/phase2b-heroes.test.ts
git commit -m "feat: add 3 new heroes (frost_whisperer, holy_emissary, ice_dragon_hunter)"
```

---

## Chunk 2: Events + Boss Phases

### Task 3: Add 12 new events to events.json and update acts.json

**Files:**
- Modify: `src/data/events.json` — append 12 event entries
- Modify: `src/data/acts.json` — add event IDs to Acts 1-3 eventPools
- Create: `tests/data/phase2b-events.test.ts` — event validation tests

- [ ] **Step 1: Write the failing test**

Create `tests/data/phase2b-events.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/phase2b-events.test.ts`
Expected: FAIL — events not found

- [ ] **Step 3: Add 12 events to events.json**

Append 12 event entries to the `events.json` array. Each event follows the existing format. Here is the complete JSON for all 12 events:

```json
  {
    "id": "event_fairy_circle",
    "title": "精灵之环",
    "description": "一圈发光的蘑菇形成了一个完美的圆环，空气中弥漫着魔法的气息...",
    "choices": [
      {
        "text": "进入精灵之环祈祷",
        "outcomes": [
          { "probability": 0.6, "description": "精灵之力治愈了你的队伍！", "effects": [{ "type": "heal", "value": 0.15, "target": "all" }] },
          { "probability": 0.4, "description": "精灵的恶作剧！随机英雄受到伤害。", "effects": [{ "type": "damage", "value": 0.1, "target": "random" }] }
        ]
      },
      {
        "text": "绕路离开",
        "outcomes": [
          { "probability": 1.0, "description": "你捡到了一些散落的金币。", "effects": [{ "type": "gold", "value": 20 }] }
        ]
      }
    ]
  },
  {
    "id": "event_wounded_traveler",
    "title": "受伤的旅人",
    "description": "路边躺着一个受伤的旅人，他虚弱地向你求助...",
    "choices": [
      {
        "text": "花费30金币治疗旅人",
        "outcomes": [
          { "probability": 0.7, "description": "旅人感激地赠送了一件稀有装备！", "effects": [{ "type": "gold", "value": -30 }, { "type": "item", "value": 1 }] },
          { "probability": 0.3, "description": "旅人感谢后默默离去。", "effects": [{ "type": "gold", "value": -30 }] }
        ]
      },
      {
        "text": "搜刮旅人的物品",
        "outcomes": [
          { "probability": 1.0, "description": "你获得了金币，但内心感到不安...", "effects": [{ "type": "gold", "value": 40 }, { "type": "stat_boost", "value": -3 }] }
        ]
      },
      {
        "text": "无视继续前进",
        "outcomes": [
          { "probability": 1.0, "description": "你选择不干涉。", "effects": [] }
        ]
      }
    ]
  },
  {
    "id": "event_ancient_tree",
    "title": "远古之树",
    "description": "一棵巨大的古树散发着淡淡的绿光，树干上刻满了远古符文...",
    "choices": [
      {
        "text": "触摸古树",
        "outcomes": [
          { "probability": 0.5, "description": "古树的力量增强了你们的防御！", "effects": [{ "type": "stat_boost", "value": 3 }] },
          { "probability": 0.5, "description": "树根缠绕了你们的脚踝...", "effects": [{ "type": "stat_boost", "value": -3 }] }
        ]
      },
      {
        "text": "采集树果",
        "outcomes": [
          { "probability": 1.0, "description": "甜美的果实恢复了体力。", "effects": [{ "type": "heal", "value": 0.1, "target": "all" }] }
        ]
      }
    ]
  },
  {
    "id": "event_lost_ranger",
    "title": "迷路的游侠",
    "description": "一个年轻的游侠在树林中迷了路，他看起来很焦急...",
    "choices": [
      {
        "text": "指引方向",
        "outcomes": [
          { "probability": 1.0, "description": "游侠感激地给了你报酬。", "effects": [{ "type": "gold", "value": 25 }, { "type": "stat_boost", "value": 2 }] }
        ]
      },
      {
        "text": "赠送补给（花费20金币）",
        "outcomes": [
          { "probability": 0.7, "description": "游侠报恩赠送了一件装备！", "effects": [{ "type": "gold", "value": -20 }, { "type": "item", "value": 1 }] },
          { "probability": 0.3, "description": "游侠感谢后匆匆离去。", "effects": [{ "type": "gold", "value": -20 }] }
        ]
      }
    ]
  },
  {
    "id": "event_lava_pool",
    "title": "熔岩池",
    "description": "一片灼热的熔岩池冒着滚滚热气，池边散落着矿石...",
    "choices": [
      {
        "text": "在熔岩池淬炼武器",
        "outcomes": [
          { "probability": 0.6, "description": "淬炼成功！武器更加锋利了！", "effects": [{ "type": "stat_boost", "value": 5 }] },
          { "probability": 0.4, "description": "熔岩飞溅，灼伤了英雄！", "effects": [{ "type": "damage", "value": 0.15, "target": "random" }] }
        ]
      },
      {
        "text": "安全通过",
        "outcomes": [
          { "probability": 1.0, "description": "你小心翼翼地绕过了熔岩池。", "effects": [] }
        ]
      }
    ]
  },
  {
    "id": "event_fire_spirit",
    "title": "火焰精灵",
    "description": "一团跳动的火焰凝聚成了人形，它好奇地注视着你...",
    "choices": [
      {
        "text": "花费40金币请求祝福",
        "outcomes": [
          { "probability": 1.0, "description": "火焰精灵赐予了魔法增强！", "effects": [{ "type": "gold", "value": -40 }, { "type": "stat_boost", "value": 8 }] }
        ]
      },
      {
        "text": "挑战精灵",
        "outcomes": [
          { "probability": 0.7, "description": "你击败了精灵，获得了遗物！", "effects": [{ "type": "relic", "relicId": "fire_emblem" }] },
          { "probability": 0.3, "description": "精灵的火焰灼烧了全队！", "effects": [{ "type": "damage", "value": 0.2, "target": "all" }] }
        ]
      }
    ]
  },
  {
    "id": "event_dwarven_forge",
    "title": "矮人锻炉",
    "description": "你发现了一座被遗弃的矮人锻炉，炉火仍未熄灭...",
    "choices": [
      {
        "text": "花费60金币升级装备",
        "outcomes": [
          { "probability": 1.0, "description": "矮人工艺打造的装备！", "effects": [{ "type": "gold", "value": -60 }, { "type": "item", "value": 1 }] }
        ]
      },
      {
        "text": "学习锻造技术",
        "outcomes": [
          { "probability": 1.0, "description": "你从锻炉中学到了防御技巧。", "effects": [{ "type": "stat_boost", "value": 2 }] }
        ]
      }
    ]
  },
  {
    "id": "event_volcanic_vent",
    "title": "火山通风口",
    "description": "地面上冒出的热气中隐约可见宝物的光芒...",
    "choices": [
      {
        "text": "冒险穿越",
        "outcomes": [
          { "probability": 0.5, "description": "你发现了一大笔宝藏！", "effects": [{ "type": "gold", "value": 80 }] },
          { "probability": 0.5, "description": "热浪灼伤了全队！", "effects": [{ "type": "damage", "value": 0.1, "target": "all" }] }
        ]
      },
      {
        "text": "绕路而行",
        "outcomes": [
          { "probability": 1.0, "description": "你安全地绕过了通风口。", "effects": [] }
        ]
      }
    ]
  },
  {
    "id": "event_shadow_altar",
    "title": "暗影祭坛",
    "description": "一座散发着不祥气息的暗影祭坛矗立在你面前...",
    "choices": [
      {
        "text": "献祭HP（全队-20%HP）",
        "outcomes": [
          { "probability": 1.0, "description": "暗影之力赐予你一件强大的遗物！", "effects": [{ "type": "damage", "value": 0.2, "target": "all" }, { "type": "relic", "relicId": "dark_grimoire" }] }
        ]
      },
      {
        "text": "破坏祭坛",
        "outcomes": [
          { "probability": 1.0, "description": "祭坛碎裂，散落了一些金币。", "effects": [{ "type": "gold", "value": 50 }] }
        ]
      },
      {
        "text": "无视离开",
        "outcomes": [
          { "probability": 1.0, "description": "你选择远离这不祥之物。", "effects": [] }
        ]
      }
    ]
  },
  {
    "id": "event_lost_soul",
    "title": "迷失的灵魂",
    "description": "一个半透明的灵魂在空中徘徊，发出悲伤的低语...",
    "choices": [
      {
        "text": "净化灵魂",
        "outcomes": [
          { "probability": 1.0, "description": "灵魂得到安息，祝福了你的队伍。", "effects": [{ "type": "heal", "value": 0.25, "target": "all" }, { "type": "gold", "value": 40 }] }
        ]
      },
      {
        "text": "吸收灵魂之力",
        "outcomes": [
          { "probability": 1.0, "description": "黑暗力量增强了魔力，但代价是生命...", "effects": [{ "type": "stat_boost", "value": 10 }, { "type": "damage", "value": 0.15, "target": "all" }] }
        ]
      },
      {
        "text": "放过灵魂",
        "outcomes": [
          { "probability": 1.0, "description": "灵魂感激地留下了些许金币。", "effects": [{ "type": "gold", "value": 20 }] }
        ]
      }
    ]
  },
  {
    "id": "event_abyssal_merchant",
    "title": "深渊商人",
    "description": "一个戴着面具的商人从暗影中走出，他的商品散发着诡异的光芒...",
    "choices": [
      {
        "text": "花费80金币购买深渊宝物",
        "outcomes": [
          { "probability": 1.0, "description": "你获得了一件传说级装备！", "effects": [{ "type": "gold", "value": -80 }, { "type": "item", "value": 1 }] }
        ]
      },
      {
        "text": "交易灵魂碎片",
        "outcomes": [
          { "probability": 1.0, "description": "你感到一阵虚弱，但获得了强大的遗物。", "effects": [{ "type": "damage", "value": 0.1, "target": "random" }, { "type": "relic", "relicId": "ice_crystal_pendant" }] }
        ]
      },
      {
        "text": "谢绝离开",
        "outcomes": [
          { "probability": 1.0, "description": "商人消失在暗影中。", "effects": [] }
        ]
      }
    ]
  },
  {
    "id": "event_dark_ritual",
    "title": "黑暗仪式",
    "description": "你撞见了一群暗影教徒正在进行神秘的仪式...",
    "choices": [
      {
        "text": "打断仪式",
        "outcomes": [
          { "probability": 0.7, "description": "教徒四散而逃，留下了金币！", "effects": [{ "type": "gold", "value": 60 }] },
          { "probability": 0.3, "description": "仪式反噬！暗属性能量伤害了全队。", "effects": [{ "type": "damage", "value": 0.15, "target": "all" }] }
        ]
      },
      {
        "text": "观察仪式",
        "outcomes": [
          { "probability": 1.0, "description": "你从仪式中领悟了魔法知识。", "effects": [{ "type": "stat_boost", "value": 5 }] }
        ]
      },
      {
        "text": "参与仪式",
        "outcomes": [
          { "probability": 0.5, "description": "黑暗力量大幅增强了你的魔力！", "effects": [{ "type": "stat_boost", "value": 15 }] },
          { "probability": 0.5, "description": "仪式失控，你失去了部分力量...", "effects": [{ "type": "stat_boost", "value": -10 }] }
        ]
      }
    ]
  }
```

- [ ] **Step 4: Update acts.json eventPools**

Add the new event IDs to each act's `eventPool` array:

**Act 1 (`act1_forest`):** Add `"event_fairy_circle", "event_wounded_traveler", "event_ancient_tree", "event_lost_ranger"` to `eventPool`.

**Act 2 (`act2_volcano`):** Add `"event_lava_pool", "event_fire_spirit", "event_dwarven_forge", "event_volcanic_vent"` to `eventPool`.

**Act 3 (`act3_abyss`):** Add `"event_shadow_altar", "event_lost_soul", "event_abyssal_merchant", "event_dark_ritual"` to `eventPool`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/data/phase2b-events.test.ts`
Expected: PASS — all 7 tests

- [ ] **Step 6: Commit**

```bash
git add src/data/events.json src/data/acts.json tests/data/phase2b-events.test.ts
git commit -m "feat: add 12 new events across Acts 1-3"
```

---

### Task 4: Add 3 boss phase configs to boss-phases.json

**Files:**
- Modify: `src/data/boss-phases.json` — add frost_queen, thunder_titan, shadow_lord configs
- Create: `tests/data/phase2b-boss-phases.test.ts` — boss phase validation tests

- [ ] **Step 1: Write the failing test**

Create `tests/data/phase2b-boss-phases.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import bossPhases from '../../src/data/boss-phases.json';
import enemiesData from '../../src/data/enemies.json';

const phases = bossPhases as Record<string, { phases: { hpPercent: number; spawns: string[]; bossEffect: { type: string; value: number } }[] }>;
const enemies = enemiesData as { id: string }[];
const enemyIds = new Set(enemies.map(e => e.id));

const NEW_BOSSES = ['frost_queen', 'thunder_titan', 'shadow_lord'];

describe('Phase 2b: Boss Phases', () => {
  it('all 3 new boss phase configs exist', () => {
    for (const id of NEW_BOSSES) {
      expect(phases[id], `Missing boss phase config: ${id}`).toBeDefined();
    }
  });

  it('frost_queen has 2 phases', () => {
    expect(phases.frost_queen.phases).toHaveLength(2);
  });

  it('thunder_titan has 3 phases', () => {
    expect(phases.thunder_titan.phases).toHaveLength(3);
  });

  it('shadow_lord has 3 phases', () => {
    expect(phases.shadow_lord.phases).toHaveLength(3);
  });

  it('hpPercent values are decreasing within each boss', () => {
    for (const id of NEW_BOSSES) {
      const bossPhases = phases[id].phases;
      for (let i = 1; i < bossPhases.length; i++) {
        expect(bossPhases[i].hpPercent).toBeLessThan(bossPhases[i - 1].hpPercent);
      }
    }
  });

  it('all spawned enemies exist in enemies.json', () => {
    for (const id of NEW_BOSSES) {
      for (const phase of phases[id].phases) {
        for (const spawnId of phase.spawns) {
          expect(enemyIds.has(spawnId), `Boss ${id} spawns unknown enemy: ${spawnId}`).toBe(true);
        }
      }
    }
  });

  it('boss effects use valid types', () => {
    const validTypes = ['enrage', 'shield', 'damage_reduction'];
    for (const id of NEW_BOSSES) {
      for (const phase of phases[id].phases) {
        expect(validTypes).toContain(phase.bossEffect.type);
        expect(phase.bossEffect.value).toBeGreaterThan(0);
      }
    }
  });

  it('frost_queen has no spawns (Act 1 simplicity)', () => {
    for (const phase of phases.frost_queen.phases) {
      expect(phase.spawns).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/data/phase2b-boss-phases.test.ts`
Expected: FAIL — boss configs not found

- [ ] **Step 3: Add 3 boss phase configs to boss-phases.json**

The current `boss-phases.json` contains only `heart_of_the_forge`. Add 3 new entries at the same level. The file should become:

```json
{
  "heart_of_the_forge": {
    "phases": [ ... existing ... ]
  },
  "frost_queen": {
    "phases": [
      {
        "hpPercent": 0.50,
        "spawns": [],
        "bossEffect": { "type": "enrage", "value": 30 }
      },
      {
        "hpPercent": 0.25,
        "spawns": [],
        "bossEffect": { "type": "shield", "value": 500 }
      }
    ]
  },
  "thunder_titan": {
    "phases": [
      {
        "hpPercent": 0.75,
        "spawns": [],
        "bossEffect": { "type": "enrage", "value": 20 }
      },
      {
        "hpPercent": 0.50,
        "spawns": ["storm_hawk", "storm_hawk"],
        "bossEffect": { "type": "damage_reduction", "value": 15 }
      },
      {
        "hpPercent": 0.25,
        "spawns": [],
        "bossEffect": { "type": "enrage", "value": 40 }
      }
    ]
  },
  "shadow_lord": {
    "phases": [
      {
        "hpPercent": 0.75,
        "spawns": [],
        "bossEffect": { "type": "damage_reduction", "value": 20 }
      },
      {
        "hpPercent": 0.50,
        "spawns": ["skeleton_archer", "skeleton_archer"],
        "bossEffect": { "type": "enrage", "value": 25 }
      },
      {
        "hpPercent": 0.25,
        "spawns": ["dark_mage"],
        "bossEffect": { "type": "enrage", "value": 35 }
      }
    ]
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/data/phase2b-boss-phases.test.ts`
Expected: PASS — all 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/data/boss-phases.json tests/data/phase2b-boss-phases.test.ts
git commit -m "feat: add boss phase mechanics for frost_queen, thunder_titan, shadow_lord"
```

---

## Chunk 3: RestScene Rewrite + Finalization

### Task 5: Add rest constants and i18n strings

**Files:**
- Modify: `src/config/balance.ts:48` — add 3 new constants after `REST_HEAL_PERCENT`
- Modify: `src/constants.ts` — re-export new constants
- Modify: `src/i18n.ts:150-157` — expand `rest:` section with new strings

- [ ] **Step 1: Add constants to balance.ts**

In `src/config/balance.ts`, after `REST_HEAL_PERCENT = 0.3;` (line 48), add:

```typescript
export const REST_TRAIN_EXP = 120;
export const REST_SCAVENGE_GOLD_MIN = 40;
export const REST_SCAVENGE_GOLD_MAX = 60;
```

- [ ] **Step 2: Re-export from constants.ts**

In `src/constants.ts`, add the 3 new constants to the export list. Find the `// Map` section and add them after `REST_HEAL_PERCENT`:

```typescript
  REST_TRAIN_EXP,
  REST_SCAVENGE_GOLD_MIN,
  REST_SCAVENGE_GOLD_MAX,
```

- [ ] **Step 3: Add i18n strings**

In `src/i18n.ts`, replace the existing `rest:` block (lines 150-157) with:

```typescript
  rest: {
    title: '休息',
    campfireText: '你的队伍在篝火旁休息...',
    teamStatus: '队伍状态:',
    restBtn: (percent: number) => `休息 (恢复${percent}%生命)`,
    trainBtn: '训练 (全队+经验)',
    scavengeBtn: '搜索 (获得金币)',
    restDesc: (percent: number) => `全队恢复${percent}%生命值`,
    trainDesc: (exp: number) => `每名英雄获得${exp}经验`,
    scavengeDesc: (min: number, max: number) => `获得${min}-${max}金币`,
    restored: '队伍已恢复！',
    trainResult: (exp: number) => `全队每人获得了 ${exp} 经验！`,
    scavengeResult: (gold: number) => `搜索到了 ${gold} 金币！`,
    continueBtn: '继续',
  },
```

- [ ] **Step 4: Run tsc to verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/config/balance.ts src/constants.ts src/i18n.ts
git commit -m "feat: add rest scene constants and i18n strings for 3-choice overhaul"
```

---

### Task 6: Rewrite RestScene with 3 choices

**Files:**
- Rewrite: `src/scenes/RestScene.ts` — 3 buttons (heal/train/scavenge) + result screens
- Modify: `tests/scenes/RestScene.test.ts` — add 3-choice behavior tests

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to the existing `tests/scenes/RestScene.test.ts`. Add these imports at the top and the new test block at the bottom:

New imports to add:
```typescript
import { REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX } from '../../src/constants';
```

New describe block to append (inside the outer `describe('RestScene', ...)`):

```typescript
  describe('3-choice overhaul', () => {
    it('displays train and scavenge buttons alongside rest', () => {
      const scene = createRestScene();
      const trainTexts = SceneTestHarness.findText(scene, '训练');
      const scavengeTexts = SceneTestHarness.findText(scene, '搜索');
      expect(trainTexts.length).toBeGreaterThan(0);
      expect(scavengeTexts.length).toBeGreaterThan(0);
    });

    it('REST_TRAIN_EXP is 120', () => {
      expect(REST_TRAIN_EXP).toBe(120);
    });

    it('REST_SCAVENGE_GOLD range is 40-60', () => {
      expect(REST_SCAVENGE_GOLD_MIN).toBe(40);
      expect(REST_SCAVENGE_GOLD_MAX).toBe(60);
    });

    it('train choice awards exp to all heroes', () => {
      const heroes = rm.getHeroes();
      const expBefore = heroes.map(h => h.exp);
      const scene = createRestScene();
      // Trigger train choice directly
      (scene as any).executeChoice('train', rm);
      for (let i = 0; i < heroes.length; i++) {
        // exp may have wrapped via level-up, but should have changed
        expect(heroes[i].exp !== expBefore[i] || heroes[i].level > 1).toBe(true);
      }
    });

    it('scavenge choice adds gold', () => {
      const goldBefore = rm.getGold();
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      const goldAfter = rm.getGold();
      expect(goldAfter).toBeGreaterThan(goldBefore);
      expect(goldAfter - goldBefore).toBeGreaterThanOrEqual(REST_SCAVENGE_GOLD_MIN);
      expect(goldAfter - goldBefore).toBeLessThanOrEqual(REST_SCAVENGE_GOLD_MAX);
    });

    it('rest choice heals heroes', () => {
      // Damage heroes first
      rm.damageAllHeroes(0.5);
      const hpBefore = rm.getHeroes().map(h => h.currentHp);
      const scene = createRestScene();
      (scene as any).executeChoice('rest', rm);
      const hpAfter = rm.getHeroes().map(h => h.currentHp);
      for (let i = 0; i < hpAfter.length; i++) {
        expect(hpAfter[i]).toBeGreaterThanOrEqual(hpBefore[i]);
      }
    });

    it('choice can only be made once', () => {
      const scene = createRestScene();
      (scene as any).executeChoice('scavenge', rm);
      const goldAfterFirst = rm.getGold();
      (scene as any).executeChoice('scavenge', rm);
      expect(rm.getGold()).toBe(goldAfterFirst);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/scenes/RestScene.test.ts`
Expected: FAIL — train/scavenge texts not found, executeChoice not defined

- [ ] **Step 3: Rewrite RestScene.ts**

Replace the entire `src/scenes/RestScene.ts` with the 3-choice implementation. The scene should:

1. Display title ("休息") and campfire text
2. Show hero HP status list (existing code)
3. Show 3 buttons horizontally centered:
   - **休息** (heal): calls `rm.healAllHeroes(REST_HEAL_PERCENT)`, shows `showHealedStatus()`
   - **训练** (train): calls `rm.addExp(hero, REST_TRAIN_EXP)` for each hero, shows `showTrainResult()`
   - **搜索** (scavenge): generates random gold via `rm.getRng().nextInt(min, max)`, calls `rm.addGold()`, shows `showScavengeResult()`
4. All 3 mark node completed and auto-save
5. Result screens follow existing `showHealedStatus()` pattern: fade out → new content with fade in → continue button

```typescript
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, REST_HEAL_PERCENT, REST_TRAIN_EXP, REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX } from '../constants';
import { RunManager } from '../managers/RunManager';
import { Button } from '../ui/Button';
import { Theme, colorToString, getNodeColor } from '../ui/Theme';
import { SceneTransition } from '../systems/SceneTransition';
import { SaveManager } from '../managers/SaveManager';
import { ParticleManager } from '../systems/ParticleManager';
import { UI } from '../i18n';
import { TutorialSystem } from '../systems/TutorialSystem';

export class RestScene extends Phaser.Scene {
  private nodeIndex!: number;
  private choiceMade = false;

  constructor() {
    super({ key: 'RestScene' });
  }

  init(data?: { nodeIndex: number }): void {
    this.nodeIndex = data?.nodeIndex ?? 0;
    this.choiceMade = false;
  }

  create(): void {
    const rm = RunManager.getInstance();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    // Campfire glow
    const particles = new ParticleManager(this);
    particles.createBuffEffect(GAME_WIDTH / 2, 80, 0xff6633);

    this.add.text(GAME_WIDTH / 2, 55, UI.rest.title, {
      fontSize: '20px',
      color: colorToString(getNodeColor('rest')),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 100, UI.rest.campfireText, {
      fontSize: '11px',
      color: '#aaaacc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Show current HP
    const heroes = rm.getHeroes();
    this.add.text(GAME_WIDTH / 2, 140, UI.rest.teamStatus, {
      fontSize: '10px',
      color: '#8899cc',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const ratio = hero.currentHp / maxHp;
      const hpColor = ratio > 0.6 ? '#44ff44' : ratio > 0.3 ? '#ffaa00' : '#ff4444';

      this.add.text(GAME_WIDTH / 2, 165 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP`, {
        fontSize: '10px',
        color: hpColor,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    // 3 choice buttons
    const btnY = 290;
    const btnSpacing = 160;
    const btnStartX = GAME_WIDTH / 2 - btnSpacing;
    const healPercent = Math.round(REST_HEAL_PERCENT * 100);

    // Rest button
    new Button(this, btnStartX, btnY, UI.rest.restBtn(healPercent), 140, 40, () => {
      this.executeChoice('rest', rm);
    }, Theme.colors.success);

    this.add.text(btnStartX, btnY + 28, UI.rest.restDesc(healPercent), {
      fontSize: '9px', color: '#88aa88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Train button
    new Button(this, btnStartX + btnSpacing, btnY, UI.rest.trainBtn, 140, 40, () => {
      this.executeChoice('train', rm);
    }, Theme.colors.primary);

    this.add.text(btnStartX + btnSpacing, btnY + 28, UI.rest.trainDesc(REST_TRAIN_EXP), {
      fontSize: '9px', color: '#8888aa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Scavenge button
    new Button(this, btnStartX + btnSpacing * 2, btnY, UI.rest.scavengeBtn, 140, 40, () => {
      this.executeChoice('scavenge', rm);
    }, Theme.colors.secondary);

    this.add.text(btnStartX + btnSpacing * 2, btnY + 28, UI.rest.scavengeDesc(REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX), {
      fontSize: '9px', color: '#aaaa88', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  shutdown(): void {
    this.tweens.killAll();
  }

  private executeChoice(choice: 'rest' | 'train' | 'scavenge', rm: RunManager): void {
    if (this.choiceMade) return;
    this.choiceMade = true;

    rm.markNodeCompleted(this.nodeIndex);

    const allChildren = this.children.getAll();
    this.tweens.add({
      targets: allChildren,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.children.removeAll(true);
        switch (choice) {
          case 'rest':
            rm.healAllHeroes(REST_HEAL_PERCENT);
            this.showHealedStatus(rm);
            break;
          case 'train':
            this.executeTrain(rm);
            break;
          case 'scavenge':
            this.executeScavenge(rm);
            break;
        }
        SaveManager.autoSave();
      },
    });
  }

  private executeTrain(rm: RunManager): void {
    for (const hero of rm.getHeroes()) {
      rm.addExp(hero, REST_TRAIN_EXP);
    }
    this.showResultScreen(
      UI.rest.trainResult(REST_TRAIN_EXP),
      Theme.colors.primary,
      rm
    );
  }

  private executeScavenge(rm: RunManager): void {
    const rng = rm.getRng();
    const gold = rng.nextInt(REST_SCAVENGE_GOLD_MIN, REST_SCAVENGE_GOLD_MAX);
    rm.addGold(gold);
    this.showResultScreen(
      UI.rest.scavengeResult(gold),
      Theme.colors.secondary,
      rm
    );
  }

  private showHealedStatus(rm: RunManager): void {
    this.showResultScreen(UI.rest.restored, Theme.colors.success, rm);
  }

  private showResultScreen(message: string, color: number, rm: RunManager): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, Theme.colors.background);

    const healParticles = new ParticleManager(this);
    healParticles.createHealEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, message, {
      fontSize: '18px',
      color: colorToString(color),
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);

    const fadeTargets: Phaser.GameObjects.GameObject[] = [title];

    const heroes = rm.getHeroes();
    heroes.forEach((hero, i) => {
      const data = rm.getHeroData(hero.id);
      const maxHp = rm.getMaxHp(hero, data);
      const heroText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + i * 22, `${data.name}: ${hero.currentHp}/${maxHp} HP (Lv.${hero.level})`, {
        fontSize: '10px',
        color: colorToString(color),
        fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0);
      fadeTargets.push(heroText);
    });

    const btn = new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, UI.rest.continueBtn, 140, 40, () => {
      SceneTransition.fadeTransition(this, 'MapScene');
    });
    btn.setAlpha(0);
    fadeTargets.push(btn);

    this.tweens.add({
      targets: fadeTargets,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut',
    });

    TutorialSystem.showTipIfNeeded(this, 'first_rest');
  }
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run tests/scenes/RestScene.test.ts`
Expected: PASS — all existing + new tests

Run: `npx vitest run` (full suite)
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/scenes/RestScene.ts tests/scenes/RestScene.test.ts
git commit -m "feat: rewrite RestScene with 3 choices (heal/train/scavenge)"
```

---

### Task 7: Update content-integrity counts + version bump

**Files:**
- Modify: `tests/data/content-integrity.test.ts:187-191` — update hero, skill, event counts
- Modify: `package.json` — version 1.12.1→1.13.0

- [ ] **Step 1: Update content-integrity.test.ts**

In `tests/data/content-integrity.test.ts`, update the `Content counts` section (lines 186-192):

```typescript
// Change:
it('has 23 heroes', () => expect(heroes.length).toBe(23));
it('has at least 44 skills', () => expect(skills.length).toBeGreaterThanOrEqual(44));
// ...
it('has at least 34 events', () => expect(events.length).toBeGreaterThanOrEqual(34));

// To:
it('has 26 heroes', () => expect(heroes.length).toBe(26));
it('has at least 72 skills', () => expect(skills.length).toBeGreaterThanOrEqual(72));
// ...
it('has at least 46 events', () => expect(events.length).toBeGreaterThanOrEqual(46));
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Bump version in package.json**

In `package.json`, change `"version": "1.12.1"` to `"version": "1.13.0"`.

- [ ] **Step 5: Commit**

```bash
git add tests/data/content-integrity.test.ts package.json
git commit -m "chore: update content counts and bump version to v1.13.0"
```
