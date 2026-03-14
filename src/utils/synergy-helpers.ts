import heroesData from '../data/heroes.json';
import { SYNERGY_DEFINITIONS } from '../config/synergies';
import { UI } from '../i18n';

const heroes = heroesData as { id: string; race: string; class: string; element?: string | null }[];

export interface SynergyTag {
  name: string;
  count: number;
  threshold: number;
  active: boolean;
}

export function calculateSynergyTags(heroIds: string[]): SynergyTag[] {
  const selected = heroes.filter(h => heroIds.includes(h.id));

  const raceCounts = new Map<string, number>();
  const classCounts = new Map<string, number>();
  const elementCounts = new Map<string, number>();

  for (const hero of selected) {
    raceCounts.set(hero.race, (raceCounts.get(hero.race) ?? 0) + 1);
    classCounts.set(hero.class, (classCounts.get(hero.class) ?? 0) + 1);
    if (hero.element) {
      elementCounts.set(hero.element, (elementCounts.get(hero.element) ?? 0) + 1);
    }
  }

  const tags: SynergyTag[] = [];

  for (const syn of SYNERGY_DEFINITIONS) {
    let count = 0;
    if (syn.type === 'race') count = raceCounts.get(syn.key) ?? 0;
    else if (syn.type === 'class') count = classCounts.get(syn.key) ?? 0;
    else if (syn.type === 'element') count = elementCounts.get(syn.key) ?? 0;

    if (count === 0) continue;

    const thresholds = syn.thresholds.map(t => t.count).sort((a, b) => a - b);
    const nextThreshold = thresholds.find(t => t > count) ?? thresholds[thresholds.length - 1];
    const activeThreshold = thresholds.filter(t => count >= t).pop();

    tags.push({
      name: syn.name,
      count,
      threshold: activeThreshold ?? nextThreshold,
      active: activeThreshold !== undefined,
    });
  }

  return tags;
}

export function formatSynergyTags(tags: SynergyTag[]): string {
  if (tags.length === 0) return '';
  return tags.map(t =>
    t.active
      ? UI.shop.synergyActive(t.name, t.count, t.threshold)
      : UI.shop.synergyProgress(t.name, t.count, t.threshold)
  ).join('  ');
}
