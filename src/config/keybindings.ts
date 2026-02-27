import { SaveManager } from '../managers/SaveManager';

const KEYBINDINGS_KEY = 'roguelike_keybindings';

/** All rebindable actions */
export type KeyAction =
  | 'skill1' | 'skill2' | 'skill3' | 'skill4'
  | 'skill5' | 'skill6' | 'skill7' | 'skill8'
  | 'pause' | 'cancel';

/** Display label for each action (Chinese) */
export const ACTION_LABELS: Record<KeyAction, string> = {
  skill1: '技能 1',
  skill2: '技能 2',
  skill3: '技能 3',
  skill4: '技能 4',
  skill5: '技能 5',
  skill6: '技能 6',
  skill7: '技能 7',
  skill8: '技能 8',
  pause: '暂停/继续',
  cancel: '取消选择',
};

/** Phaser key name → display string */
const KEY_DISPLAY: Record<string, string> = {
  ONE: '1', TWO: '2', THREE: '3', FOUR: '4',
  FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8',
  NINE: '9', ZERO: '0',
  SPACE: 'Space', ESC: 'Esc', ENTER: 'Enter', TAB: 'Tab',
  SHIFT: 'Shift', CTRL: 'Ctrl', ALT: 'Alt',
  UP: '↑', DOWN: '↓', LEFT: '←', RIGHT: '→',
  A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F',
  G: 'G', H: 'H', I: 'I', J: 'J', K: 'K', L: 'L',
  M: 'M', N: 'N', O: 'O', P: 'P', Q: 'Q', R: 'R',
  S: 'S', T: 'T', U: 'U', V: 'V', W: 'W', X: 'X',
  Y: 'Y', Z: 'Z',
  F1: 'F1', F2: 'F2', F3: 'F3', F4: 'F4',
  F5: 'F5', F6: 'F6', F7: 'F7', F8: 'F8',
};

/** Default keybinding map: action → Phaser KeyCodes key name */
const DEFAULT_BINDINGS: Record<KeyAction, string> = {
  skill1: 'ONE',
  skill2: 'TWO',
  skill3: 'THREE',
  skill4: 'FOUR',
  skill5: 'FIVE',
  skill6: 'SIX',
  skill7: 'SEVEN',
  skill8: 'EIGHT',
  pause: 'SPACE',
  cancel: 'ESC',
};

/** Reverse map from Phaser keyCode → key name */
const CODE_TO_NAME = new Map<number, string>();

function ensureCodeMap(): void {
  if (CODE_TO_NAME.size > 0) return;
  // We'll lazily build this from Phaser.Input.Keyboard.KeyCodes
  // For now, store commonly used codes
  const keyCodes: Record<string, number> = {
    ONE: 49, TWO: 50, THREE: 51, FOUR: 52,
    FIVE: 53, SIX: 54, SEVEN: 55, EIGHT: 56,
    NINE: 57, ZERO: 48,
    SPACE: 32, ESC: 27, ENTER: 13, TAB: 9,
    SHIFT: 16, CTRL: 17, ALT: 18,
    UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39,
    A: 65, B: 66, C: 67, D: 68, E: 69, F: 70,
    G: 71, H: 72, I: 73, J: 74, K: 75, L: 76,
    M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82,
    S: 83, T: 84, U: 85, V: 86, W: 87, X: 88,
    Y: 89, Z: 90,
    F1: 112, F2: 113, F3: 114, F4: 115,
    F5: 116, F6: 117, F7: 118, F8: 119,
  };
  for (const [name, code] of Object.entries(keyCodes)) {
    CODE_TO_NAME.set(code, name);
  }
}

/**
 * Manages keybinding configuration with persistence.
 */
export class KeybindingConfig {
  private static bindings: Record<KeyAction, string> | null = null;

  /** Load keybindings from storage or use defaults */
  static getBindings(): Record<KeyAction, string> {
    if (!KeybindingConfig.bindings) {
      const saved = SaveManager.loadData<Record<string, string>>(KEYBINDINGS_KEY);
      KeybindingConfig.bindings = { ...DEFAULT_BINDINGS };
      if (saved) {
        for (const key of Object.keys(DEFAULT_BINDINGS) as KeyAction[]) {
          if (saved[key] && typeof saved[key] === 'string') {
            KeybindingConfig.bindings[key] = saved[key];
          }
        }
      }
    }
    return KeybindingConfig.bindings;
  }

  /** Get the Phaser key name for an action */
  static getKey(action: KeyAction): string {
    return KeybindingConfig.getBindings()[action];
  }

  /** Get display-friendly string for a binding */
  static getDisplayKey(action: KeyAction): string {
    const keyName = KeybindingConfig.getKey(action);
    return KEY_DISPLAY[keyName] ?? keyName;
  }

  /** Rebind an action to a new key */
  static rebind(action: KeyAction, newKeyName: string): void {
    const bindings = KeybindingConfig.getBindings();
    bindings[action] = newKeyName;
    SaveManager.saveData(KEYBINDINGS_KEY, bindings);
  }

  /** Reset all bindings to defaults */
  static resetToDefaults(): void {
    KeybindingConfig.bindings = { ...DEFAULT_BINDINGS };
    SaveManager.saveData(KEYBINDINGS_KEY, KeybindingConfig.bindings);
  }

  /** Convert a keyCode (from keyboard event) to key name */
  static keyCodeToName(keyCode: number): string | null {
    ensureCodeMap();
    return CODE_TO_NAME.get(keyCode) ?? null;
  }

  /** Get all skill keybindings in order (skill1..skill8) */
  static getSkillKeys(): string[] {
    const bindings = KeybindingConfig.getBindings();
    return [
      bindings.skill1, bindings.skill2, bindings.skill3, bindings.skill4,
      bindings.skill5, bindings.skill6, bindings.skill7, bindings.skill8,
    ];
  }
}
