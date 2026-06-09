import { describe, it, expect } from 'vitest';
import { Theme } from '../../src/ui/Theme';

/**
 * Regression guard for the unified modal-backdrop convention (backlog issue #7).
 *
 * All modal popup backdrops (the depth-799 dimmer behind a Panel) read their
 * opacity from `Theme.modalBackdropAlpha`; detail popups stacked ON TOP of an
 * already-darkened modal use the lighter `Theme.modalBackdropAlphaNested` so the
 * two layers don't compound into a near-black screen.
 *
 * Intentionally EXEMPT (not modal backdrops, keep their own values):
 *  - BattleScene targeting dim (α0.3, depth 90) — battlefield must stay visible
 *  - HeroDraftScene per-card lock overlay — dims a single card, not the screen
 *  - SkillBar cooldown fill — overlays one button, not a modal
 */
describe('modal backdrop convention (issue #7)', () => {
  it('exposes a single primary backdrop alpha constant', () => {
    expect(typeof Theme.modalBackdropAlpha).toBe('number');
    expect(Theme.modalBackdropAlpha).toBe(0.7);
  });

  it('exposes a lighter nested-popup backdrop alpha', () => {
    expect(typeof Theme.modalBackdropAlphaNested).toBe('number');
    expect(Theme.modalBackdropAlphaNested).toBe(0.4);
  });

  it('nested backdrop is lighter than the primary so stacked layers do not compound to black', () => {
    expect(Theme.modalBackdropAlphaNested).toBeLessThan(Theme.modalBackdropAlpha);
  });

  it('both alphas are valid, visible opacities (0 < a < 1)', () => {
    for (const a of [Theme.modalBackdropAlpha, Theme.modalBackdropAlphaNested]) {
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThan(1);
    }
  });
});
