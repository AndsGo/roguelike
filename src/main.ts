import Phaser from 'phaser';
import { gameConfig } from './config';

declare global {
  interface Window {
    __PHASER_GAME__?: Phaser.Game;
  }
}

const game = new Phaser.Game(gameConfig);
window.__PHASER_GAME__ = game;

// Mobile browsers resize the layout viewport on rotation, address-bar
// collapse, and (iOS) with a lag that Phaser's own resize handler can miss.
// scale.refresh() re-reads the parent size and re-applies FIT, so the canvas
// never sticks at a stale size. Debounced: these events fire in bursts.
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleRefresh = (): void => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => game.scale.refresh(), 100);
};
window.addEventListener('orientationchange', scheduleRefresh);
window.visualViewport?.addEventListener('resize', scheduleRefresh);
