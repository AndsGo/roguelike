import { EventBus } from './EventBus';
import { AudioManager } from './AudioManager';
import { ErrorHandler } from './ErrorHandler';
import { StatsManager } from '../managers/StatsManager';
import { AchievementManager } from '../managers/AchievementManager';

/**
 * Centralized teardown for all singleton managers and systems.
 * Call teardownAll() when returning to MainMenu or before a full reset.
 *
 * Lifecycle order matters:
 *   1. Unregister individual system listeners (StatsManager, AchievementManager, AudioManager)
 *   2. Clear transient buffers (ErrorHandler)
 *   3. Reset EventBus last (catches any remaining orphaned listeners)
 */
export class GameLifecycle {
  /**
   * Full teardown: unregister listeners, clear transient state.
   * Does NOT clear persistent data (localStorage).
   */
  static teardownAll(): void {
    // 1. StatsManager — unregister EventBus listeners
    StatsManager.teardown();

    // 2. AchievementManager — unregister EventBus listeners
    AchievementManager.unregisterListeners();

    // 3. AudioManager — unregister SFX listeners, stop BGM
    try {
      const audio = AudioManager.getInstance();
      audio.unregisterSfxListeners();
      audio.stopBgm();
    } catch {
      // AudioManager may not be initialized
    }

    // 4. ErrorHandler — clear transient error buffer
    ErrorHandler.clear();

    // 5. EventBus — clear all remaining listeners (must be last)
    EventBus.getInstance().reset();
  }

  /**
   * Prepare for a new run: reset run-specific state, re-register listeners.
   * Call this after newRun() sets up the RunManager state.
   */
  static prepareNewRun(): void {
    // EventBus is already reset by teardownAll()
    StatsManager.reinitForNewRun();
    AchievementManager.registerListeners();
  }
}
