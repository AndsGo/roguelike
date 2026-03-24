# v1.22 Phase A — Experience Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game "audible" + "readable" by optimizing audio format, fixing font sizes, and adding categorized audio content (Boss BGM, skill/element/ultimate SFX).

**Architecture:** TextFactory font presets are updated in-place. AudioManager gets new SFX keys + custom dispatch listeners for `skill:use` (by casterRole) and `element:reaction` (by Chinese reactionType). BootScene switches from single WAV to OGG+MP3 array loading. BattleScene triggers boss BGM at boss entrance animation. Event payload for `skill:use` is expanded with optional `casterRole` and `isAllySkill` fields.

**Tech Stack:** TypeScript, Phaser 3, Vitest

**Spec:** `docs/superpowers/specs/2026-03-24-phase-a-experience-foundation-design.md`

---

## File Map

| File | Responsibility | Tasks |
|------|---------------|-------|
| `src/ui/TextFactory.ts` | Text preset system | Task 1 (font sizes + family) |
| `tests/ui/TextFactory.test.ts` | Text preset tests | Task 1 (update assertions) |
| `src/types/index.ts` | Event type definitions | Task 2 (expand skill:use payload) |
| `src/systems/SkillSystem.ts` | Skill execution | Task 2 (emit expanded payload) |
| `src/systems/AudioManager.ts` | Audio singleton | Tasks 3, 4, 5 (new keys + dispatch) |
| `tests/systems/AudioManager.test.ts` | Audio tests | Tasks 3, 4, 5 (dispatch tests) |
| `src/scenes/BootScene.ts` | Asset loading | Task 6 (multi-format loading) |
| `src/scenes/BattleScene.ts` | Battle orchestration | Task 5 (boss BGM trigger) |
| `public/audio/*.ogg` | OGG audio files | Task 6 (placeholder files) |
| `public/audio/*.mp3` | MP3 audio files | Task 6 (placeholder files) |

---

## Task 1: Font Size + Family Fix

**Context:** TextFactory.ts has 6 presets all using `'monospace'` at sizes 8-20px. Chinese text renders poorly and small sizes (8-9px) are unreadable on 800×450 canvas. Only `TextFactory.ts` calls `scene.add.text()` — changing PRESETS is sufficient for global effect.

**Files:**
- Modify: `src/ui/TextFactory.ts`
- Modify: `tests/ui/TextFactory.test.ts`

- [ ] **Step 1: Update test assertions for new font sizes**

In `tests/ui/TextFactory.test.ts`, update the existing `'applies preset font sizes'` test and add font family test:

```typescript
import { describe, it, expect } from 'vitest';
import { TextFactory } from '../../src/ui/TextFactory';
import Phaser from 'phaser';

function createTestScene(): Phaser.Scene {
  const scene = new Phaser.Scene({ key: 'test' });
  return scene;
}

describe('TextFactory', () => {
  it('creates text with resolution 2', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 100, 50, 'test', 'body');
    expect(text).toBeDefined();
    expect(text.text).toBe('test');
  });

  it('applies updated preset font sizes', () => {
    const scene = createTestScene();
    const title = TextFactory.create(scene, 0, 0, 'T', 'title');
    const subtitle = TextFactory.create(scene, 0, 0, 'T', 'subtitle');
    const body = TextFactory.create(scene, 0, 0, 'T', 'body');
    const label = TextFactory.create(scene, 0, 0, 'T', 'label');
    const small = TextFactory.create(scene, 0, 0, 'T', 'small');
    const tiny = TextFactory.create(scene, 0, 0, 'T', 'tiny');
    expect(title.style.fontSize).toBe('22px');
    expect(subtitle.style.fontSize).toBe('16px');
    expect(body.style.fontSize).toBe('13px');
    expect(label.style.fontSize).toBe('11px');
    expect(small.style.fontSize).toBe('10px');
    expect(tiny.style.fontSize).toBe('9px');
  });

  it('uses Chinese-friendly font family', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T', 'body');
    expect(text.style.fontFamily).toContain('Microsoft YaHei');
    expect(text.style.fontFamily).toContain('monospace');
  });

  it('allows style overrides', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T', 'body', { color: '#ff0000' });
    expect(text.style.color).toBe('#ff0000');
  });

  it('defaults to body preset', () => {
    const scene = createTestScene();
    const text = TextFactory.create(scene, 0, 0, 'T');
    expect(text.style.fontSize).toBe('13px');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/ui/TextFactory.test.ts
```

Expected: FAIL — `'22px'` expected but got `'20px'`, font family doesn't contain `'Microsoft YaHei'`.

- [ ] **Step 3: Update TextFactory presets**

Replace the PRESETS object in `src/ui/TextFactory.ts`:

```typescript
const FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", monospace';

const PRESETS: Record<TextPreset, Phaser.Types.GameObjects.Text.TextStyle> = {
  title:    { fontSize: '22px', fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  subtitle: { fontSize: '16px', fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  body:     { fontSize: '13px', fontFamily: FONT_FAMILY },
  label:    { fontSize: '11px', fontFamily: FONT_FAMILY, fontStyle: 'bold' },
  small:    { fontSize: '10px', fontFamily: FONT_FAMILY },
  tiny:     { fontSize: '9px',  fontFamily: FONT_FAMILY },
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/ui/TextFactory.test.ts
```

Expected: PASS (all 5 tests)

- [ ] **Step 5: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero TS errors, all tests pass. Some other tests may check old font sizes — grep and fix if needed:

```bash
grep -r "fontSize.*'20px'" tests/ --include="*.ts"
grep -r "fontSize.*'14px'" tests/ --include="*.ts"
grep -r "fontSize.*'8px'" tests/ --include="*.ts"
```

Note: `'11px'` and `'9px'` are both OLD and NEW values (label=11px new, tiny=9px new), so grep those values may hit the updated test itself — only fix references in OTHER test files.

- [ ] **Step 6: Commit**

```bash
git add src/ui/TextFactory.ts tests/ui/TextFactory.test.ts
git commit -m "feat: improve text readability — larger font sizes + Chinese font family"
```

---

## Task 2: Expand skill:use Event Payload

**Context:** The `skill:use` event payload currently has `{ casterId, skillId, targets }`. AudioManager needs `casterRole` and `isAllySkill` to dispatch categorized skill SFX. The 5 targetType values in skills.json are: `ally`, `all_allies`, `all_enemies`, `enemy`, `self`. ally/all_allies/self are "ally skills" (heals/buffs).

**Files:**
- Modify: `src/types/index.ts:395`
- Modify: `src/systems/SkillSystem.ts:153-158`

- [ ] **Step 1: Expand event type definition**

In `src/types/index.ts`, find line 395:

```typescript
  'skill:use': { casterId: string; skillId: string; targets: string[] };
```

Replace with:

```typescript
  'skill:use': { casterId: string; skillId: string; targets: string[]; casterRole?: UnitRole; isAllySkill?: boolean };
```

Note: `UnitRole` is already defined in this file as `'tank' | 'melee_dps' | 'ranged_dps' | 'healer' | 'support'`.

- [ ] **Step 2: Emit expanded payload in SkillSystem**

In `src/systems/SkillSystem.ts`, find lines 153-158:

```typescript
    // Emit skill:use event
    EventBus.getInstance().emit('skill:use', {
      casterId: unit.unitId,
      skillId: skill.id,
      targets: targets.map(t => t.unitId),
    });
```

Replace with:

```typescript
    // Emit skill:use event (with role + ally info for audio dispatch)
    EventBus.getInstance().emit('skill:use', {
      casterId: unit.unitId,
      skillId: skill.id,
      targets: targets.map(t => t.unitId),
      casterRole: unit.role,
      isAllySkill: skill.targetType?.includes('ally') || skill.targetType === 'self',
    });
```

- [ ] **Step 3: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: Zero errors. The new fields are optional (`?`), so all existing listeners are unaffected.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: All pass — no test checks the exact shape of skill:use emissions.

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/systems/SkillSystem.ts
git commit -m "feat: expand skill:use event with casterRole and isAllySkill"
```

---

## Task 3: Add New SFX Keys + Ultimate Event Entries to AudioManager

**Context:** AudioManager exports `BGM_KEYS` and `SFX_KEYS` arrays (used by BootScene for preloading) and `SFX_EVENT_ENTRIES` for simple event→SFX mapping. This task adds the new keys and the 2 simple ultimate event mappings. Custom dispatch logic for skill:use and element:reaction comes in Task 4.

**Files:**
- Modify: `src/systems/AudioManager.ts`
- Modify: `tests/systems/AudioManager.test.ts`

- [ ] **Step 1: Write tests for new audio keys**

Add to `tests/systems/AudioManager.test.ts`:

```typescript
import { BGM_KEYS, SFX_KEYS } from '../../src/systems/AudioManager';

// ... existing tests ...

describe('Audio keys', () => {
  it('includes boss BGM key', () => {
    expect(BGM_KEYS).toContain('bgm_boss');
  });

  it('includes categorized skill SFX keys', () => {
    for (const key of ['sfx_melee', 'sfx_ranged', 'sfx_magic', 'sfx_heal_cast']) {
      expect(SFX_KEYS, `missing ${key}`).toContain(key);
    }
  });

  it('includes element reaction SFX keys', () => {
    for (const key of ['sfx_react_melt', 'sfx_react_overload', 'sfx_react_superconduct', 'sfx_react_annihilate']) {
      expect(SFX_KEYS, `missing ${key}`).toContain(key);
    }
  });

  it('includes ultimate SFX keys', () => {
    for (const key of ['sfx_ult_ready', 'sfx_ult_cast']) {
      expect(SFX_KEYS, `missing ${key}`).toContain(key);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/systems/AudioManager.test.ts
```

Expected: FAIL — new keys not found in arrays.

- [ ] **Step 3: Add new keys to AudioManager**

In `src/systems/AudioManager.ts`:

**Add `bgm_boss` to BGM_KEYS (line 43-46):**

```typescript
export const BGM_KEYS = [
  'bgm_menu', 'bgm_map', 'bgm_battle', 'bgm_boss', 'bgm_shop',
  'bgm_ambient', 'bgm_event', 'bgm_victory', 'bgm_defeat',
];
```

**Add 10 new SFX keys to SFX_KEYS (line 49-54):**

```typescript
export const SFX_KEYS = [
  'sfx_hit', 'sfx_kill', 'sfx_heal', 'sfx_skill',
  'sfx_reaction', 'sfx_click', 'sfx_buy', 'sfx_equip', 'sfx_levelup',
  'sfx_select', 'sfx_coin', 'sfx_event_good', 'sfx_event_bad',
  'sfx_crit', 'sfx_error',
  // Categorized skill SFX
  'sfx_melee', 'sfx_ranged', 'sfx_magic', 'sfx_heal_cast',
  // Element reaction SFX
  'sfx_react_melt', 'sfx_react_overload', 'sfx_react_superconduct', 'sfx_react_annihilate',
  // Ultimate SFX
  'sfx_ult_ready', 'sfx_ult_cast',
];
```

**Add ultimate event entries to SFX_EVENT_ENTRIES (line 32-40):**

```typescript
const SFX_EVENT_ENTRIES: [GameEventType, string][] = [
  ['unit:damage', 'sfx_hit'],
  ['unit:kill', 'sfx_kill'],
  ['unit:heal', 'sfx_heal'],
  // NOTE: 'skill:use' and 'element:reaction' removed — handled by custom listeners (Task 4)
  ['item:equip', 'sfx_equip'],
  ['achievement:unlock', 'sfx_levelup'],
  ['ultimate:ready', 'sfx_ult_ready'],
  ['ultimate:used', 'sfx_ult_cast'],
];
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/systems/AudioManager.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/systems/AudioManager.ts tests/systems/AudioManager.test.ts
git commit -m "feat: add new BGM/SFX keys and ultimate event entries"
```

---

## Task 4: Custom SFX Dispatch for Skill and Reaction Events

**Context:** `skill:use` and `element:reaction` have been removed from `SFX_EVENT_ENTRIES` (Task 3). Now add custom listeners that dispatch to categorized SFX based on event data. The `element:reaction` reactionType field uses Chinese strings: `'融化'`/`'超载'`/`'超导'`/`'湮灭'`.

**Files:**
- Modify: `src/systems/AudioManager.ts`
- Modify: `tests/systems/AudioManager.test.ts`

- [ ] **Step 1: Write tests for skill SFX dispatch**

Add to the **top-level imports** of `tests/systems/AudioManager.test.ts`:

```typescript
import { getSkillSfxKey, getReactionSfxKey } from '../../src/systems/AudioManager';
```

Then add these test suites after existing ones:

```typescript
describe('Skill SFX dispatch', () => {
  it('maps tank/melee_dps to sfx_melee', () => {
    expect(getSkillSfxKey({ casterRole: 'tank', isAllySkill: false })).toBe('sfx_melee');
    expect(getSkillSfxKey({ casterRole: 'melee_dps', isAllySkill: false })).toBe('sfx_melee');
  });

  it('maps ranged_dps to sfx_ranged', () => {
    expect(getSkillSfxKey({ casterRole: 'ranged_dps', isAllySkill: false })).toBe('sfx_ranged');
  });

  it('maps healer to sfx_heal_cast', () => {
    expect(getSkillSfxKey({ casterRole: 'healer', isAllySkill: false })).toBe('sfx_heal_cast');
  });

  it('maps support to sfx_magic', () => {
    expect(getSkillSfxKey({ casterRole: 'support', isAllySkill: false })).toBe('sfx_magic');
  });

  it('isAllySkill overrides to sfx_heal_cast regardless of role', () => {
    expect(getSkillSfxKey({ casterRole: 'tank', isAllySkill: true })).toBe('sfx_heal_cast');
    expect(getSkillSfxKey({ casterRole: 'ranged_dps', isAllySkill: true })).toBe('sfx_heal_cast');
  });

  it('falls back to sfx_skill for unknown role', () => {
    expect(getSkillSfxKey({ casterRole: undefined, isAllySkill: false })).toBe('sfx_skill');
  });
});

describe('Reaction SFX dispatch', () => {
  it('maps Chinese reaction names to SFX keys', () => {
    expect(getReactionSfxKey('融化')).toBe('sfx_react_melt');
    expect(getReactionSfxKey('超载')).toBe('sfx_react_overload');
    expect(getReactionSfxKey('超导')).toBe('sfx_react_superconduct');
    expect(getReactionSfxKey('湮灭')).toBe('sfx_react_annihilate');
  });

  it('falls back to sfx_reaction for unknown reaction', () => {
    expect(getReactionSfxKey('unknown')).toBe('sfx_reaction');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/systems/AudioManager.test.ts
```

Expected: FAIL — `getSkillSfxKey` and `getReactionSfxKey` not exported.

- [ ] **Step 3: Implement dispatch functions and custom listeners**

In `src/systems/AudioManager.ts`, add **before** the `AudioManager` class:

```typescript
/** Chinese reaction name → SFX key mapping */
const REACTION_SFX_MAP: Record<string, string> = {
  '融化': 'sfx_react_melt',
  '超载': 'sfx_react_overload',
  '超导': 'sfx_react_superconduct',
  '湮灭': 'sfx_react_annihilate',
};

/** Determine SFX key for a skill:use event based on caster role and ally flag */
export function getSkillSfxKey(data: { casterRole?: string; isAllySkill?: boolean }): string {
  if (data.isAllySkill) return 'sfx_heal_cast';
  switch (data.casterRole) {
    case 'tank': case 'melee_dps': return 'sfx_melee';
    case 'ranged_dps': return 'sfx_ranged';
    case 'healer': return 'sfx_heal_cast';
    case 'support': return 'sfx_magic';
    default: return 'sfx_skill';
  }
}

/** Determine SFX key for an element:reaction event based on Chinese reactionType */
export function getReactionSfxKey(reactionType: string): string {
  return REACTION_SFX_MAP[reactionType] ?? 'sfx_reaction';
}
```

Then modify `registerSfxListeners()` to add custom handlers after the SFX_EVENT_ENTRIES loop. **Replace the entire method** (lines 207-217):

```typescript
  /** Register EventBus listeners for SFX triggers */
  registerSfxListeners(): void {
    if (this.sfxListenersRegistered) return;
    this.sfxListenersRegistered = true;

    const bus = EventBus.getInstance();

    // Simple 1:1 event→SFX mappings
    for (const [eventName, sfxKey] of SFX_EVENT_ENTRIES) {
      const listener = () => this.playSfx(sfxKey);
      this.sfxListeners.set(eventName, listener);
      bus.on(eventName, listener);
    }

    // Custom skill:use dispatch by caster role
    const skillListener = (data: { casterRole?: string; isAllySkill?: boolean }) => {
      this.playSfx(getSkillSfxKey(data));
    };
    this.sfxListeners.set('skill:use', skillListener as () => void);
    bus.on('skill:use', skillListener);

    // Custom element:reaction dispatch by Chinese reaction name
    const reactionListener = (data: { reactionType: string }) => {
      this.playSfx(getReactionSfxKey(data.reactionType));
    };
    this.sfxListeners.set('element:reaction', reactionListener as () => void);
    bus.on('element:reaction', reactionListener);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/systems/AudioManager.test.ts
```

Expected: PASS (all new dispatch tests + existing tests)

- [ ] **Step 5: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/systems/AudioManager.ts tests/systems/AudioManager.test.ts
git commit -m "feat: custom SFX dispatch for skill roles and element reactions"
```

---

## Task 5: Boss BGM Trigger in BattleScene

**Context:** Boss entrance animation starts at line 311 of `BattleScene.ts`. When a boss is found, it slides in from offscreen with a title card. The boss BGM should trigger here, crossfading from the already-playing `bgm_battle` to `bgm_boss`.

**Files:**
- Modify: `src/scenes/BattleScene.ts:311-312`

- [ ] **Step 1: Add boss BGM trigger at entrance animation**

In `src/scenes/BattleScene.ts`, find lines 311-312:

```typescript
    const bossUnit = enemies.find(e => e.isBoss);
    if (bossUnit) {
```

Add the BGM trigger immediately after the `if` line:

```typescript
    const bossUnit = enemies.find(e => e.isBoss);
    if (bossUnit) {
      // Switch to boss BGM (crossfades from bgm_battle)
      AudioManager.getInstance().playBgm('bgm_boss');
```

Verify that `AudioManager` is already imported at the top of BattleScene.ts. If not, add:

```typescript
import { AudioManager } from '../systems/AudioManager';
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: All pass — BattleScene tests use mock scenes, AudioManager singleton returns safely.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BattleScene.ts
git commit -m "feat: trigger boss BGM at boss entrance animation"
```

---

## Task 6: Audio Format Migration (WAV → OGG+MP3)

**Context:** BootScene loads all audio as `.wav`. After conversion, it needs to load `['audio/key.ogg', 'audio/key.mp3']` arrays for Phaser's auto-format selection. The actual audio file conversion (WAV→OGG/MP3) is done externally by the user using AI tools. This task only handles the code changes + placeholder setup.

**Files:**
- Modify: `src/scenes/BootScene.ts:37-43`

- [ ] **Step 1: Update BootScene audio loading to multi-format**

In `src/scenes/BootScene.ts`, find lines 37-43:

```typescript
    // Load audio assets
    for (const key of BGM_KEYS) {
      this.load.audio(key, `audio/${key}.wav`);
    }
    for (const key of SFX_KEYS) {
      this.load.audio(key, `audio/${key}.wav`);
    }
```

Replace with:

```typescript
    // Load audio assets (OGG primary, MP3 fallback)
    for (const key of BGM_KEYS) {
      this.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.mp3`]);
    }
    for (const key of SFX_KEYS) {
      this.load.audio(key, [`audio/${key}.ogg`, `audio/${key}.mp3`]);
    }
```

- [ ] **Step 2: Verify type check passes**

```bash
npx tsc --noEmit
```

Expected: Zero errors. Phaser's `load.audio()` accepts `string | string[]`.

- [ ] **Step 3: Create placeholder audio files**

The actual audio conversion and generation happens externally (user generates via Suno/jsfxr). For now, create empty placeholder files so the build doesn't break if someone runs `npm run dev` before audio files are ready:

```bash
# Create directory structure
mkdir -p assets-src/audio-wav

# Move existing WAV files to archive (outside public/)
mv public/audio/*.wav assets-src/audio-wav/ 2>/dev/null || true

# Add assets-src to .gitignore if not already there
grep -qxF 'assets-src/' .gitignore || echo 'assets-src/' >> .gitignore
```

**Note for user:** After this step, you need to:
1. Convert the 23 existing WAV files to OGG+MP3 (ffmpeg or online converter)
2. Generate 11 new audio files via Suno/jsfxr
3. Place all 34 .ogg and 34 .mp3 files in `public/audio/`

The game will show loading errors for missing audio files until the actual files are provided, but will still run (AudioManager gracefully handles missing audio).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BootScene.ts .gitignore
git commit -m "feat: switch audio loading to OGG+MP3 multi-format"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run full type check + test suite**

```bash
npx tsc --noEmit && npm test
```

Expected: Zero TS errors, all tests pass.

- [ ] **Step 2: Verify no regressions in test count**

Check that test count is ≥ previous (1054 tests, 84 suites). New tests added:
- TextFactory: 5 tests (was 4, added font family test)
- AudioManager: ~15 tests (was 5, added key + dispatch tests)

Expected: ~1065+ tests passing.

- [ ] **Step 3: (After audio files are provided) Visual + audio QA**

Start dev server and verify:

```bash
npm run dev
```

Check:
1. All text is readable — especially HeroCard, BattleHUD, HeroDraftScene
2. Boss battle plays different BGM from normal battle
3. Different skill sounds for tank vs ranged vs healer
4. Each element reaction has a distinct sound
5. Ultimate ready chime + cast impact sound

---

## Execution Order

```
Task 1 (TextFactory fonts)     — independent
Task 2 (skill:use payload)     — independent
Task 3 (AudioManager keys)     — independent, but Task 4 depends on it
Task 4 (custom SFX dispatch)   — depends on Task 3
Task 5 (Boss BGM trigger)      — depends on Task 3 (bgm_boss key)
Task 6 (format migration)      — depends on Task 3 (new keys in BGM_KEYS/SFX_KEYS)
Task 7 (verification)          — depends on all above
```

**Recommended parallel execution:**
- Tasks 1, 2, 3 can run in parallel
- Tasks 4, 5, 6 can run in parallel (after Task 3 completes)
- Task 7 runs last
