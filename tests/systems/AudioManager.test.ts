import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager, BGM_KEYS, SFX_KEYS, getSkillSfxKey, getReactionSfxKey } from '../../src/systems/AudioManager';

describe('AudioManager', () => {
  beforeEach(() => {
    (AudioManager as any).instance = null;

    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((k) => delete store[k]);
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    });
  });

  it('loads default settings', () => {
    const audio = AudioManager.getInstance();
    expect(audio.getMasterVolume()).toBe(0.7);
    expect(audio.getBgmVolume()).toBe(0.5);
  });

  it('toggleBgm toggles and persists', () => {
    const audio = AudioManager.getInstance();
    const result = audio.toggleBgm();
    expect(result).toBe(false);
    expect(audio.isBgmEnabled()).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('toggleSfx toggles', () => {
    const audio = AudioManager.getInstance();
    const result = audio.toggleSfx();
    expect(result).toBe(false);
    expect(audio.isSfxEnabled()).toBe(false);
  });

  it('setMasterVolume clamps 0-1', () => {
    const audio = AudioManager.getInstance();
    audio.setMasterVolume(1.5);
    expect(audio.getMasterVolume()).toBe(1);
    audio.setMasterVolume(-0.5);
    expect(audio.getMasterVolume()).toBe(0);
  });

  it('saves and loads settings from localStorage', () => {
    const audio = AudioManager.getInstance();
    audio.setMasterVolume(0.3);
    (AudioManager as any).instance = null;
    const audio2 = AudioManager.getInstance();
    expect(audio2.getMasterVolume()).toBe(0.3);
  });
});

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

  it('retains original SFX keys', () => {
    for (const key of ['sfx_hit', 'sfx_kill', 'sfx_heal', 'sfx_skill', 'sfx_reaction']) {
      expect(SFX_KEYS, `missing ${key}`).toContain(key);
    }
  });
});

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
