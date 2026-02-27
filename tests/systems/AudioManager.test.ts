import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioManager } from '../../src/systems/AudioManager';

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

    // Create a new instance to test loading from localStorage
    (AudioManager as any).instance = null;
    const audio2 = AudioManager.getInstance();

    expect(audio2.getMasterVolume()).toBe(0.3);
  });
});
