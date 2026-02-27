import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) {
            return 'phaser';
          }
          // Game data JSON files
          if (id.includes('/src/data/') && id.endsWith('.json')) {
            return 'gamedata';
          }
          // Battle systems (heaviest game logic)
          if (id.includes('/src/systems/') && (
            id.includes('BattleSystem') || id.includes('DamageSystem') ||
            id.includes('SkillSystem') || id.includes('TargetingSystem') ||
            id.includes('MovementSystem') || id.includes('StatusEffectSystem') ||
            id.includes('ElementSystem') || id.includes('ComboSystem') ||
            id.includes('BattleEffects') || id.includes('ParticleManager')
          )) {
            return 'battle-systems';
          }
        },
      },
    },
  },
});
