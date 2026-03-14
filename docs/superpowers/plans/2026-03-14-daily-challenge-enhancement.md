# Daily Challenge Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make daily challenges feel meaningfully different from normal runs — visible rules, expanded modifiers, in-game indicators, and simulated leaderboard.

**Architecture:** Extend existing DailyChallengeManager (rule pool + formatting + ghost scores), add preview modal to MainMenuScene, add visual indicators to MapScene/BattleScene, add leaderboard to BaseEndScene settlement.

**Tech Stack:** TypeScript + Phaser 3, Vitest for testing.

**Spec:** `docs/superpowers/specs/2026-03-14-daily-challenge-enhancement-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/managers/DailyChallengeManager.ts` | Modify | Expand DailyRule type, add 4 rule types, add formatDailyRule(), generateGhostScores(), mutual exclusion |
| `src/scenes/MainMenuScene.ts` | Modify | Add showDailyChallengePreview() modal |
| `src/scenes/BattleScene.ts` | Modify | Apply 4 new rule types + golden border |
| `src/scenes/MapScene.ts` | Modify | Daily challenge rules banner |
| `src/scenes/BaseEndScene.ts` | Modify | Simulated leaderboard display |
| `src/i18n.ts` | Modify | New daily challenge strings |
| `tests/managers/daily-challenge-enhanced.test.ts` | Create | Tests for expanded rules + ghost scores |

---

### Task 1: Expand DailyRule types + rule pool + formatting + ghost scores

**Files:**
- Modify: `src/managers/DailyChallengeManager.ts`
- Modify: `src/i18n.ts`
- Create: `tests/managers/daily-challenge-enhanced.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/managers/daily-challenge-enhanced.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DailyChallengeManager } from '../../src/managers/DailyChallengeManager';

describe('Daily Challenge Enhancements', () => {
  describe('expanded rule pool', () => {
    it('can generate all 7 rule types across many seeds', () => {
      const allTypes = new Set<string>();
      for (let seed = 1; seed <= 500; seed++) {
        const mods = DailyChallengeManager.getDailyModifiers(seed);
        for (const rule of mods.rules) {
          allTypes.add(rule.type);
        }
      }
      // Should find at least 5 of the 7 types (randomness may not hit all)
      expect(allTypes.size).toBeGreaterThanOrEqual(5);
    });

    it('gold_rush and gold_modifier are mutually exclusive', () => {
      for (let seed = 1; seed <= 500; seed++) {
        const mods = DailyChallengeManager.getDailyModifiers(seed);
        const types = mods.rules.map(r => r.type);
        const hasGoldRush = types.includes('gold_rush');
        const hasGoldMod = types.includes('gold_modifier');
        expect(hasGoldRush && hasGoldMod, `Seed ${seed}: both gold rules present`).toBe(false);
      }
    });

    it('new rule types have correct structure', () => {
      // Find seeds that produce each new type
      for (let seed = 1; seed <= 500; seed++) {
        const mods = DailyChallengeManager.getDailyModifiers(seed);
        for (const rule of mods.rules) {
          expect(rule.type).toBeDefined();
          expect(rule.label).toBeDefined();
          expect(typeof rule.label).toBe('string');
          expect(rule.label.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('formatDailyRule', () => {
    it('formats enemy_element rule', () => {
      const result = DailyChallengeManager.formatDailyRule({ type: 'enemy_element', label: '', value: 'fire' });
      expect(result.icon).toBeDefined();
      expect(result.text).toContain('火');
    });

    it('formats double_crit rule', () => {
      const result = DailyChallengeManager.formatDailyRule({ type: 'double_crit', label: '', value: null });
      expect(result.text).toContain('暴击');
    });

    it('formats gold_rush rule', () => {
      const result = DailyChallengeManager.formatDailyRule({ type: 'gold_rush', label: '', value: null });
      expect(result.text).toContain('金币');
    });

    it('formats all 7 known types without error', () => {
      const types = ['enemy_element', 'gold_modifier', 'hp_modifier', 'double_crit', 'gold_rush', 'element_chaos', 'speed_frenzy'];
      for (const type of types) {
        const result = DailyChallengeManager.formatDailyRule({ type: type as any, label: '', value: type === 'enemy_element' ? 'fire' : type === 'gold_modifier' ? 0.7 : type === 'hp_modifier' ? 0.8 : null });
        expect(result.icon.length).toBeGreaterThan(0);
        expect(result.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateGhostScores', () => {
    it('returns 5 ghost entries', () => {
      const ghosts = DailyChallengeManager.generateGhostScores(42);
      expect(ghosts).toHaveLength(5);
    });

    it('scores are in range 200-1200', () => {
      const ghosts = DailyChallengeManager.generateGhostScores(42);
      for (const g of ghosts) {
        expect(g.score).toBeGreaterThanOrEqual(200);
        expect(g.score).toBeLessThanOrEqual(1200);
      }
    });

    it('scores are sorted descending', () => {
      const ghosts = DailyChallengeManager.generateGhostScores(42);
      for (let i = 1; i < ghosts.length; i++) {
        expect(ghosts[i].score).toBeLessThanOrEqual(ghosts[i - 1].score);
      }
    });

    it('is deterministic (same seed = same scores)', () => {
      const a = DailyChallengeManager.generateGhostScores(42);
      const b = DailyChallengeManager.generateGhostScores(42);
      expect(a).toEqual(b);
    });

    it('different seeds produce different scores', () => {
      const a = DailyChallengeManager.generateGhostScores(42);
      const b = DailyChallengeManager.generateGhostScores(43);
      expect(a).not.toEqual(b);
    });

    it('ghost names are non-empty strings', () => {
      const ghosts = DailyChallengeManager.generateGhostScores(42);
      for (const g of ghosts) {
        expect(g.name.length).toBeGreaterThan(0);
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/managers/daily-challenge-enhanced.test.ts`

- [ ] **Step 3: Expand DailyRule type and buildRulePool**

In `src/managers/DailyChallengeManager.ts`:

**Update DailyRule interface** (line 12-16):
```typescript
export interface DailyRule {
  type: 'enemy_element' | 'hero_restriction' | 'gold_modifier' | 'hp_modifier'
    | 'double_crit' | 'gold_rush' | 'element_chaos' | 'speed_frenzy';
  label: string;
  value: any;
}
```

**Update `buildRulePool()`** (line 145-170) — add 4 new rules and mutual exclusion:

```typescript
  private static buildRulePool(rng: SeededRNG): DailyRule[] {
    const element = rng.pick(ELEMENTS);
    const pool: DailyRule[] = [
      {
        type: 'enemy_element',
        label: `敌人强化: ${ELEMENT_LABELS[element]}+20%`,
        value: element,
      },
      {
        type: 'gold_modifier',
        label: rng.chance(0.5) ? '金币-30%' : '金币+50%',
        value: 0, // set below
      },
      {
        type: 'hp_modifier',
        label: '英雄HP-20%',
        value: 0.8,
      },
      {
        type: 'double_crit',
        label: '暴击伤害翻倍',
        value: null,
      },
      {
        type: 'gold_rush',
        label: '金币×2，敌人HP+30%',
        value: null,
      },
      {
        type: 'element_chaos',
        label: '英雄元素随机化',
        value: null,
      },
      {
        type: 'speed_frenzy',
        label: '全体攻速+30%',
        value: null,
      },
    ];

    // Set gold modifier value
    const goldRule = pool.find(r => r.type === 'gold_modifier')!;
    goldRule.value = goldRule.label === '金币-30%' ? 0.7 : 1.5;

    const shuffled = rng.shuffle(pool);

    // Mutual exclusion: gold_rush and gold_modifier cannot co-exist
    const result: DailyRule[] = [];
    let hasGoldType = false;
    for (const rule of shuffled) {
      if ((rule.type === 'gold_modifier' || rule.type === 'gold_rush') && hasGoldType) {
        continue; // skip second gold-related rule
      }
      if (rule.type === 'gold_modifier' || rule.type === 'gold_rush') {
        hasGoldType = true;
      }
      result.push(rule);
    }

    return result;
  }
```

- [ ] **Step 4: Add formatDailyRule static method**

Add to `DailyChallengeManager` class:

```typescript
  /** Format a rule for display with icon and Chinese text */
  static formatDailyRule(rule: DailyRule): { icon: string; text: string } {
    switch (rule.type) {
      case 'enemy_element': return { icon: '⚔', text: `${ELEMENT_LABELS[rule.value] ?? rule.value}属性敌人攻击+20%` };
      case 'gold_modifier': return { icon: '💰', text: `金币收益 ×${rule.value}` };
      case 'hp_modifier': return { icon: '❤', text: `英雄最大HP ×${rule.value}` };
      case 'double_crit': return { icon: '💥', text: '所有单位暴击伤害 ×2' };
      case 'gold_rush': return { icon: '🏆', text: '金币 ×2，敌人HP +30%' };
      case 'element_chaos': return { icon: '🌀', text: '英雄元素随机化' };
      case 'speed_frenzy': return { icon: '⚡', text: '所有单位攻速 +30%' };
      case 'hero_restriction': return { icon: '🚫', text: `禁用${rule.value ?? ''}职业英雄` };
      default: return { icon: '•', text: rule.type };
    }
  }

  /** Compact format for in-game banner */
  static formatDailyRuleShort(rule: DailyRule): string {
    const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
    return `${icon}${text}`;
  }
```

- [ ] **Step 5: Add generateGhostScores static method**

Add to `DailyChallengeManager` class:

```typescript
  /** Generate 5 deterministic ghost scores for the simulated leaderboard */
  static generateGhostScores(seed: number): { name: string; score: number }[] {
    const rng = new SeededRNG(seed + 99999);

    const namePool = ['影行者', '剑圣', '魔导师', '守护者', '猎手',
                       '审判者', '风行者', '炼金师', '驭龙者', '星术士',
                       '铁壁', '暗刃', '圣盾', '雷鸣', '冰心',
                       '烈焰使', '月光', '战鬼', '灵铸', '破晓'];

    const names = rng.pickN(namePool, 5);
    const scores = names.map(name => ({
      name,
      score: rng.nextInt(200, 1200),
    }));

    return scores.sort((a, b) => b.score - a.score);
  }
```

- [ ] **Step 6: Add i18n strings**

In `src/i18n.ts`, expand the `daily:` section (around line 409):

```typescript
  daily: {
    title: '每日挑战',
    completed: '今日已完成',
    start: '开始挑战',
    rules: '今日规则',
    info: '每天一次固定挑战，全球同步种子',
    score: (n: number) => `得分: ${n}`,
    challengeComplete: '每日挑战完成!',
    // New strings:
    previewTitle: '每日挑战',
    difficulty: (name: string) => `难度: ${name}`,
    rulesLabel: '今日规则:',
    startBtn: '开始挑战',
    backBtn: '返回',
    leaderboardTitle: '每日排行',
    yourRank: (rank: number, total: number) => `排名: 第${rank}名 / ${total}人`,
  },
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/managers/daily-challenge-enhanced.test.ts`
Run: `npx tsc --noEmit`

- [ ] **Step 8: Commit**

```bash
git add src/managers/DailyChallengeManager.ts src/i18n.ts tests/managers/daily-challenge-enhanced.test.ts
git commit -m "feat: expand daily challenge rule pool (3→7) with formatting and ghost scores"
```

---

### Task 2: Rules preview modal in MainMenuScene

**Files:**
- Modify: `src/scenes/MainMenuScene.ts`

- [ ] **Step 1: Add showDailyChallengePreview method**

In `src/scenes/MainMenuScene.ts`:

Change the daily challenge button handler (line ~111) from direct `startDailyChallenge()` to `showDailyChallengePreview()`:

```typescript
    const dailyBtn = new Button(this, GAME_WIDTH / 2, btnY, dailyLabel, 180, 36, () => {
      if (dailyCompleted) return;
      this.showDailyChallengePreview(); // was: this.startDailyChallenge();
    }, dailyCompleted ? 0x555555 : Theme.colors.gold);
```

Add the new method:

```typescript
  private showDailyChallengePreview(): void {
    const seed = DailyChallengeManager.getTodaysSeed();
    const modifiers = DailyChallengeManager.getDailyModifiers(seed);

    // Backdrop
    const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive().setDepth(799);

    // Panel background
    const panelW = 320, panelH = 220;
    const panelX = (GAME_WIDTH - panelW) / 2, panelY = (GAME_HEIGHT - panelH) / 2;
    const panel = this.add.graphics().setDepth(800);
    panel.fillStyle(Theme.colors.panel, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panel.lineStyle(2, Theme.colors.panelBorder, 0.8);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    // Title
    TextFactory.create(this, GAME_WIDTH / 2, panelY + 25, `${UI.daily.previewTitle} - ${modifiers.title}`, 'subtitle', {
      color: '#ffcc44',
    }).setOrigin(0.5).setDepth(801);

    // Difficulty
    const diffLabel = modifiers.difficulty === 'hard' ? '困难' : '噩梦';
    TextFactory.create(this, GAME_WIDTH / 2, panelY + 55, UI.daily.difficulty(diffLabel), 'body', {
      color: '#aaaacc',
    }).setOrigin(0.5).setDepth(801);

    // Rules label
    TextFactory.create(this, GAME_WIDTH / 2, panelY + 80, UI.daily.rulesLabel, 'label', {
      color: '#ccaa44',
    }).setOrigin(0.5).setDepth(801);

    // Rule list
    modifiers.rules.forEach((rule, i) => {
      const { icon, text } = DailyChallengeManager.formatDailyRule(rule);
      TextFactory.create(this, GAME_WIDTH / 2, panelY + 100 + i * 20, `${icon} ${text}`, 'label', {
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(801);
    });

    // Buttons
    const btnY = panelY + panelH - 35;
    const elements: Phaser.GameObjects.GameObject[] = [backdrop, panel];

    const startBtn = new Button(this, GAME_WIDTH / 2 - 60, btnY, UI.daily.startBtn, 100, 30, () => {
      // Clean up preview
      elements.forEach(e => e.destroy());
      this.children.getAll().filter((c: any) => c.depth >= 801).forEach((c: any) => c.destroy());
      startBtn.destroy();
      backBtn.destroy();
      // Start the daily challenge
      this.startDailyChallenge();
    }, Theme.colors.success);
    startBtn.setDepth(801);

    const backBtn = new Button(this, GAME_WIDTH / 2 + 60, btnY, UI.daily.backBtn, 80, 30, () => {
      elements.forEach(e => e.destroy());
      this.children.getAll().filter((c: any) => c.depth >= 801).forEach((c: any) => c.destroy());
      startBtn.destroy();
      backBtn.destroy();
    }, 0x555555);
    backBtn.setDepth(801);
  }
```

Import `DailyChallengeManager.formatDailyRule` — it's already imported for other uses.

- [ ] **Step 2: Run tsc + tests**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MainMenuScene.ts
git commit -m "feat: add daily challenge rules preview modal"
```

---

### Task 3: Apply new rule types in BattleScene + golden border

**Files:**
- Modify: `src/scenes/BattleScene.ts`

- [ ] **Step 1: Add new rule application in create()**

In `src/scenes/BattleScene.ts`, find the daily rules application block (line ~221-244). After the existing `enemy_element` and `hp_modifier` handling, add new rule cases:

```typescript
      // New rule types
      for (const rule of rules) {
        switch (rule.type) {
          case 'double_crit':
            for (const unit of [...heroes, ...enemies]) {
              unit.currentStats.critDamage *= 2;
            }
            break;
          case 'gold_rush':
            // Enemy HP +30% (gold ×2 handled in handleBattleEnd)
            for (const enemy of enemies) {
              enemy.currentStats.maxHp = Math.round(enemy.currentStats.maxHp * 1.3);
              enemy.currentHp = Math.round(enemy.currentHp * 1.3);
              enemy.healthBar.updateHealth(enemy.currentHp, enemy.currentStats.maxHp);
            }
            break;
          case 'element_chaos': {
            const elements: string[] = ['fire', 'ice', 'lightning', 'dark', 'holy'];
            const battleRng = rm.getRng();
            for (const hero of heroes) {
              (hero as any).element = battleRng.pick(elements);
            }
            break;
          }
          case 'speed_frenzy':
            for (const unit of [...heroes, ...enemies]) {
              unit.currentStats.attackSpeed *= 1.3;
            }
            break;
        }
      }
```

- [ ] **Step 2: Add gold_rush gold handling in handleBattleEnd()**

Find the existing daily gold modifier block (line ~948-950). After `applyGoldModifier`, add:

```typescript
      // gold_rush: gold ×2
      const goldRushRule = (endRunState.dailyModifiers!.rules as DailyRule[]).find(r => r.type === 'gold_rush');
      if (goldRushRule) {
        goldEarned = Math.round(goldEarned * 2);
      }
```

- [ ] **Step 3: Add golden border for daily battles**

In `create()`, after the daily rules application block, add:

```typescript
    // Golden border for daily challenge
    if (runState.isDaily) {
      const border = this.add.graphics();
      border.lineStyle(2, 0xccaa44, 0.6);
      border.strokeRect(1, 1, GAME_WIDTH - 2, GAME_HEIGHT - 2);
      border.setDepth(100);
    }
```

Add import for `GAME_WIDTH, GAME_HEIGHT` if not already present (it likely is).

- [ ] **Step 4: Run tsc + tests**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: apply new daily rule types and add golden border indicator"
```

---

### Task 4: MapScene rules banner

**Files:**
- Modify: `src/scenes/MapScene.ts`

- [ ] **Step 1: Add rules banner in create()**

In `src/scenes/MapScene.ts`, in `create()`, after the header text (act label, gold display) and before the map container setup, add:

```typescript
    // Daily challenge rules banner
    const runState = rm.getState();
    if (runState.isDaily && runState.dailyModifiers?.rules) {
      const rules = runState.dailyModifiers.rules as DailyRule[];
      const ruleText = rules.map(r => DailyChallengeManager.formatDailyRuleShort(r)).join('  ');

      const bannerBg = this.add.graphics();
      bannerBg.fillStyle(0xccaa00, 0.15);
      bannerBg.fillRoundedRect(10, 30, GAME_WIDTH - 20, 18, 4);

      TextFactory.create(this, GAME_WIDTH / 2, 39, `每日挑战: ${ruleText}`, 'small', {
        color: '#ccaa44',
      }).setOrigin(0.5);
    }
```

Add imports at top if not already present:
```typescript
import { DailyChallengeManager, DailyRule } from '../managers/DailyChallengeManager';
```

- [ ] **Step 2: Run tsc**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/scenes/MapScene.ts
git commit -m "feat: add daily challenge rules banner to map scene"
```

---

### Task 5: Simulated leaderboard in BaseEndScene + version bump

**Files:**
- Modify: `src/scenes/BaseEndScene.ts`
- Modify: `package.json`

- [ ] **Step 1: Add leaderboard to settleDailyChallenge**

In `src/scenes/BaseEndScene.ts`, find `settleDailyChallenge()` (line ~103-128). After the existing score display (the two TextFactory.create calls), add the leaderboard:

```typescript
    // Simulated leaderboard
    const ghosts = DailyChallengeManager.generateGhostScores(state.dailyModifiers?.seed ?? 0);
    const playerEntry = { name: '你', score: totalScore, isPlayer: true };
    const ghostEntries = ghosts.map(g => ({ ...g, isPlayer: false }));
    const leaderboard = [...ghostEntries, playerEntry].sort((a, b) => b.score - a.score);

    TextFactory.create(this, GAME_WIDTH / 2, baseY + 42, UI.daily.leaderboardTitle, 'label', {
      color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);

    leaderboard.forEach((entry, i) => {
      const color = entry.isPlayer ? '#ffdd44' : '#aaaacc';
      const prefix = entry.isPlayer ? '→ ' : '  ';
      const suffix = entry.isPlayer ? ' ←' : '';
      const line = `${prefix}${i + 1}. ${entry.name}  ${entry.score}${suffix}`;

      TextFactory.create(this, GAME_WIDTH / 2, baseY + 60 + i * 16, line, 'small', {
        color,
      }).setOrigin(0.5);
    });

    const playerRank = leaderboard.findIndex(e => e.isPlayer) + 1;
    TextFactory.create(this, GAME_WIDTH / 2, baseY + 60 + leaderboard.length * 16 + 4, UI.daily.yourRank(playerRank, leaderboard.length), 'small', {
      color: '#888888',
    }).setOrigin(0.5);
```

Note: The `seed` for ghost scores comes from `state.dailyModifiers?.seed`. Check the `RunState` type — it stores `dailyModifiers` which includes `seed` from `DailyModifiers` interface. If `dailyModifiers` on RunState uses a different structure (inline `{ title, rules }` without `seed`), you'll need to get the seed from `DailyChallengeManager.getTodaysSeed()` instead.

Looking at the existing code (MainMenuScene line 208-211):
```typescript
rm.newRun(seed, modifiers.difficulty, undefined, {
  title: modifiers.title,
  rules: modifiers.rules,
});
```
The `dailyModifiers` stored in RunState only has `{ title, rules }` — no `seed`. So use `DailyChallengeManager.getTodaysSeed()` to get the seed for ghost generation.

- [ ] **Step 2: Version bump**

In `package.json`, change `"version": "1.15.0"` to `"version": "1.16.0"`.

- [ ] **Step 3: Run tsc + full test suite**

Run: `npx tsc --noEmit && npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BaseEndScene.ts package.json
git commit -m "feat: add simulated leaderboard to daily challenge end screen"
```
