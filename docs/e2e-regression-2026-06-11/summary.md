# E2E Display Regression Summary - 2026-06-11

Scope:
- PC desktop: 1280x720.
- Mobile: 844x390 landscape touch viewport. Portrait behavior was also observed earlier and shows the expected "rotate to landscape" gate.
- Scenes covered: main menu, difficulty dialog, hero draft, map, battle, reward, shop, rest, event.
- Checks covered: HP/gold/exp/level/progress/speed/cooldown/energy/price/stat values, icon/text alignment, clipping/overlap, blank-screen and console-error checks.

Result:
- No console errors or blank screens in either PC or mobile landscape runs.
- PC display is generally passable across the covered scenes.
- Mobile landscape has two visible UI regressions/risks:
  1. Reward scene: the battle-stat table is too low and is partially covered/cut by the Continue button area.
  2. Shop scene: the top synergy summary line can overflow horizontally; some item stat/description lines are close to card edges on narrower mobile layouts.

Notes:
- The raw automated report still lists many "out of bounds" records. Most are expected for scrollable map content or are caused by Phaser camera/layout coordinates, not visible defects.
- Tutorial overlays were skipped for the final run to avoid first-time-user hints masking the actual UI.
- Scene transitions were staged through Phaser scene methods where Playwright's headless pointer events did not reliably trigger Button pointerup events; all screenshots are still from the real browser canvas.
