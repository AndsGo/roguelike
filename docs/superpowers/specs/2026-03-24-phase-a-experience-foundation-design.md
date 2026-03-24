# v1.22 Phase A — Experience Foundation Layer Design Spec

**Goal:** Make the game "audible" + "readable" — fill the experience baseline gaps identified by the 4-agent review team.

**Scope:** Audio format optimization, font/size fixes, new audio content (Boss BGM, categorized skill/element/ultimate SFX).

**Non-goals:** No gameplay changes, no new systems, no UI layout changes beyond font adjustments.

---

## 1. Audio Format Optimization

### Problem
All 23 audio files are uncompressed WAV (~11MB total). This causes slow initial load, especially on mobile.

### Solution
- Convert all 23 WAV files to OGG (primary) + MP3 (fallback)
- Expected size reduction: 11MB → ~1.5MB (OGG)
- Phaser natively supports multi-format: `this.load.audio(key, ['audio/key.ogg', 'audio/key.mp3'])`
- Archive original WAVs to `assets-src/audio-wav/` (outside `public/`, not included in Vite build)
- **Note on originals:** All audio files are AI-generated (BGM via Suno/Udio, SFX via jsfxr) and can be regenerated. `assets-src/` is gitignored as large binary source — no archival concern.

### Files
- Modify: `src/scenes/BootScene.ts` — change audio load calls to multi-format arrays
- Move: `public/audio/*.wav` → `assets-src/audio-wav/` (outside public, excluded from build)
- Add: `public/audio/*.ogg` + `public/audio/*.mp3` (23 each)
- Add: `assets-src/` to `.gitignore` (large binary source files, regenerable via AI tools)

---

## 2. Font Size + Family Fix

### Problem
- Font sizes tiny(8px)/small(9px) are barely readable on 800×450 canvas
- `monospace` font family renders Chinese text poorly (falls back to platform-specific monospace like SimSun/Courier)

### Solution

**Font size adjustments:**

| Preset   | Before | After | Delta |
|----------|--------|-------|-------|
| title    | 20px   | 22px  | +2px  |
| subtitle | 14px   | 16px  | +2px  |
| body     | 11px   | 13px  | +2px  |
| label    | 10px   | 11px  | +1px  |
| small    | 9px    | 10px  | +1px  |
| tiny     | 8px    | 9px   | +1px  |

**Font family change:**
```
Before: 'monospace'
After:  '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", monospace'
```

Rationale: Title/subtitle get +2px (used in headers, ample space). Label/small/tiny get +1px (used in dense UI — BattleHUD, HeroCard, HeroDraftScene cards — larger increase risks overflow).

**Note on font family string:** The nested double-quotes are required for CSS font-family names with spaces. In TypeScript: `fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", monospace'`. Phaser passes this directly to Canvas 2D context `font` property.

### Scope verification
`scene.add.text()` is only called in `TextFactory.ts` itself. All other code uses `TextFactory.create()`. Therefore, changing the font family in PRESETS is sufficient for global effect — no other files need font family changes.

### Overflow Check Required
After font changes, verify no text overflow in:
- HeroCard (130×160px) — name, level, stats
- BattleHUD portraits — hero/enemy names (truncated to 6 chars)
- HeroDraftScene cards (74×100px) — attributes
- SkillBar/UltimateBar tooltips
- MapRenderer node labels

### Files
- Modify: `src/ui/TextFactory.ts` — update PRESETS object (sizes + fontFamily)
- Create: `tests/ui/TextFactory.test.ts` — verify preset sizes and font family

---

## 3. New Audio Content

### 3a. Boss Battle BGM (1 track)

**Key:** `bgm_boss`
**Style:** 8-bit/chiptune epic boss battle, looping, 120-140 BPM, tense and escalating
**Generation:** Suno/Udio AI tool

**Integration:**
- Add `bgm_boss` to AudioManager's BGM_KEYS
- Do NOT add to SCENE_BGM_MAP (boss BGM is conditional, not scene-level)
- **Boss BGM trigger timing:** In `BattleScene.create()`, trigger `playBgm('bgm_boss')` at the **boss entrance animation** start point (~line 311, where boss slide-in begins), NOT after phase system setup. This synchronizes the BGM crossfade with the visual boss entrance, creating a cohesive dramatic moment. The 500ms crossfade from the briefly-playing `bgm_battle` to `bgm_boss` serves as a natural "lead-in".
- When battle ends (scene transitions away), normal scene BGM resumes via `onSceneStart()`

### 3b. Categorized Skill SFX (4 new tracks)

| Key | Role Mapping | Sound Style |
|-----|-------------|-------------|
| `sfx_melee` | tank, melee_dps | Short metallic slash |
| `sfx_ranged` | ranged_dps | Bowstring twang + projectile whoosh |
| `sfx_magic` | support (offensive skills) | Energy hum/buzz |
| `sfx_heal_cast` | healer, support (heal skills) | Soft chime/bell |

**Generation:** jsfxr (8-bit pixel style)

**Integration — Event payload expansion:**

The current `skill:use` event payload is `{ casterId: string; skillId: string; targets: string[] }` — it lacks role and skill type information. To enable role-based SFX dispatch without coupling AudioManager to game data:

1. **Expand `skill:use` event payload** in `src/types/index.ts`:
   ```typescript
   'skill:use': {
     casterId: string;
     skillId: string;
     targets: string[];
     casterRole?: UnitRole;        // NEW — for audio dispatch
     isAllySkill?: boolean;        // NEW — true if targetType is 'ally'/'all_allies'
   };
   ```

2. **Emit expanded data** in `src/systems/SkillSystem.ts` (the single emit site, ~line 154):
   ```typescript
   EventBus.getInstance().emit('skill:use', {
     casterId: unit.unitId,
     skillId: skill.id,
     targets: actualTargets.map(t => t.unitId),
     casterRole: unit.role,
     isAllySkill: skill.targetType?.includes('ally') || skill.targetType === 'self',
     // Covers: 'ally', 'all_allies', 'lowest_hp_ally', 'random_ally', 'self'
     // Implementation must grep all targetType values in skills.json to verify completeness
   });
   ```

3. **Replace simple SFX_EVENT_ENTRIES** for `skill:use` with a custom listener in AudioManager:
   - Remove `['skill:use', 'sfx_skill']` from SFX_EVENT_ENTRIES
   - In `registerSfxListeners()`, add a custom handler:
   ```typescript
   // Skill SFX dispatch by role
   bus.on('skill:use', (data) => {
     if (data.isAllySkill) { this.playSfx('sfx_heal_cast'); return; }
     switch (data.casterRole) {
       case 'tank': case 'melee_dps': this.playSfx('sfx_melee'); break;
       case 'ranged_dps': this.playSfx('sfx_ranged'); break;
       case 'healer': this.playSfx('sfx_heal_cast'); break;
       case 'support': this.playSfx('sfx_magic'); break;
       default: this.playSfx('sfx_skill'); break;  // fallback to generic
     }
   });
   ```

**Backward compatibility:** Existing listeners (StatsManager, UltimateSystem, UnitAnimationSystem, BattleScene) use `skill:use` but only read `casterId`/`skillId`/`targets` — the new optional fields don't affect them.

### 3c. Element Reaction SFX (4 new tracks)

| Key | Chinese reactionType | Reaction | Sound Style |
|-----|---------------------|----------|-------------|
| `sfx_react_melt` | `融化` | Melt (fire+ice) | Fire burst/crackle |
| `sfx_react_superconduct` | `超导` | Superconduct (ice+lightning) | Ice crack/shatter |
| `sfx_react_overload` | `超载` | Overload (fire+lightning) | Electric zap/crackle |
| `sfx_react_annihilate` | `湮灭` | Annihilation (dark+holy) | Low rumble/echo |

**Generation:** jsfxr (8-bit pixel style)

**Integration — Chinese reaction name mapping:**

The `element:reaction` event's `reactionType` field contains Chinese strings from `ELEMENT_REACTIONS[key].name` in `src/config/elements.ts`: `'融化'`, `'超载'`, `'超导'`, `'湮灭'`.

1. **Replace simple SFX_EVENT_ENTRIES** for `element:reaction` with a custom listener in AudioManager:
   - Remove `['element:reaction', 'sfx_reaction']` from SFX_EVENT_ENTRIES
   - Add a Chinese-to-SFX mapping constant in AudioManager:
   ```typescript
   const REACTION_SFX_MAP: Record<string, string> = {
     '融化': 'sfx_react_melt',
     '超载': 'sfx_react_overload',
     '超导': 'sfx_react_superconduct',
     '湮灭': 'sfx_react_annihilate',
   };
   ```
   - In `registerSfxListeners()`, add a custom handler:
   ```typescript
   bus.on('element:reaction', (data) => {
     const sfxKey = REACTION_SFX_MAP[data.reactionType] ?? 'sfx_reaction';
     this.playSfx(sfxKey);
   });
   ```

### 3d. Ultimate Skill SFX (2 new tracks)

| Key | Event | Sound Style |
|-----|-------|-------------|
| `sfx_ult_ready` | `ultimate:ready` | Ascending chime/flash |
| `sfx_ult_cast` | `ultimate:used` | Power impact/shockwave |

**Generation:** jsfxr (8-bit pixel style)

**Integration:**
- Add 2 new entries to SFX_EVENT_ENTRIES (these are simple 1:1 mappings, no custom logic needed):
  ```
  ['ultimate:ready', 'sfx_ult_ready']
  ['ultimate:used', 'sfx_ult_cast']
  ```

---

## 4. Audio Resource Summary

### New audio files (11 total)
| # | Key | Type | Source |
|---|-----|------|--------|
| 1 | bgm_boss | BGM | Suno/Udio |
| 2 | sfx_melee | SFX | jsfxr |
| 3 | sfx_ranged | SFX | jsfxr |
| 4 | sfx_magic | SFX | jsfxr |
| 5 | sfx_heal_cast | SFX | jsfxr |
| 6 | sfx_react_melt | SFX | jsfxr |
| 7 | sfx_react_superconduct | SFX | jsfxr |
| 8 | sfx_react_overload | SFX | jsfxr |
| 9 | sfx_react_annihilate | SFX | jsfxr |
| 10 | sfx_ult_ready | SFX | jsfxr |
| 11 | sfx_ult_cast | SFX | jsfxr |

### Post-conversion totals
- Existing: 8 BGM + 15 SFX = 23
- New: 1 BGM (boss) + 10 SFX = 11
- **Total: 9 BGM + 25 SFX = 34 audio assets** in OGG + MP3 dual format
- Estimated total size: ~2MB (OGG) + ~3MB (MP3 fallback)

---

## 5. File Change Map

| File | Change | Section |
|------|--------|---------|
| `src/ui/TextFactory.ts` | Modify | §2 Font sizes + family |
| `src/types/index.ts` | Modify | §3b Expand `skill:use` event payload |
| `src/systems/SkillSystem.ts` | Modify | §3b Emit casterRole + isAllySkill |
| `src/systems/AudioManager.ts` | Modify | §3 New SFX keys, custom skill/reaction listeners, ult entries |
| `src/scenes/BootScene.ts` | Modify | §1 Multi-format audio loading |
| `src/scenes/BattleScene.ts` | Modify | §3a Boss BGM trigger |
| `public/audio/*.ogg` | Add | §1 34 OGG files (23 converted + 11 new) |
| `public/audio/*.mp3` | Add | §1 34 MP3 files (23 converted + 11 new) |
| `assets-src/audio-wav/` | Move | §1 Original WAV archive (outside public/) |
| `tests/ui/TextFactory.test.ts` | Create | §2 Font preset verification |
| `tests/systems/AudioManager.test.ts` | Modify | §3 New SFX key + dispatch tests |

---

## 6. Acceptance Criteria

1. **Format**: All audio loads as OGG (Chrome/Firefox) or MP3 (Safari fallback), no WAV in production build
2. **Font**: All text renders in Microsoft YaHei (Windows) / PingFang SC (Mac) with correct sizes
3. **No overflow**: Visual inspection (Chrome MCP screenshots) confirms text in HeroCard, BattleHUD, HeroDraftScene cards does not overflow container, overlap adjacent elements, or wrap/truncate unexpectedly
4. **Boss BGM**: Entering a boss battle crossfades from bgm_battle to bgm_boss smoothly
5. **Skill SFX**: Tank/melee attacks sound different from ranged, magic, and heals
6. **Reaction SFX**: Each of the 4 element reactions (融化/超载/超导/湮灭) has a distinct sound
7. **Ultimate SFX**: Energy full plays a ready chime; casting plays an impact sound
8. **Fallbacks**: Unknown role falls back to sfx_skill; unknown reaction falls back to sfx_reaction
9. **Backward compat**: Existing skill:use/element:reaction listeners unaffected by payload expansion
10. **Tests**: `npx tsc --noEmit && npm test` passes with zero errors
11. **SFX concurrency**: Monitor during QA — if frequent SFX drops in dense battles, raise MAX_CONCURRENT_SFX from 4 to 6
