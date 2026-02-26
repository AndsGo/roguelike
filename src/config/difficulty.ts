import { DifficultyConfig } from '../types';

export const DIFFICULTY_LEVELS: DifficultyConfig[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Standard difficulty for new players',
    enemyStatMultiplier: 1.0,
    enemyCountBonus: 0,
    goldMultiplier: 1.0,
    expMultiplier: 1.0,
    eliteChanceBonus: 0,
  },
  {
    id: 'hard',
    name: 'Hard',
    description: 'Tougher enemies, better rewards',
    enemyStatMultiplier: 1.3,
    enemyCountBonus: 1,
    goldMultiplier: 1.2,
    expMultiplier: 1.2,
    eliteChanceBonus: 0.1,
  },
  {
    id: 'nightmare',
    name: 'Nightmare',
    description: 'For experienced players only',
    enemyStatMultiplier: 1.6,
    enemyCountBonus: 2,
    goldMultiplier: 1.5,
    expMultiplier: 1.5,
    eliteChanceBonus: 0.2,
  },
  {
    id: 'hell',
    name: 'Hell',
    description: 'The ultimate challenge',
    enemyStatMultiplier: 2.0,
    enemyCountBonus: 3,
    goldMultiplier: 2.0,
    expMultiplier: 2.0,
    eliteChanceBonus: 0.3,
  },
];

export function getDifficultyConfig(id: string): DifficultyConfig {
  return DIFFICULTY_LEVELS.find(d => d.id === id) ?? DIFFICULTY_LEVELS[0];
}
