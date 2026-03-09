import { describe, it, expect } from 'vitest';
import { NodeType } from '../../src/types';
import { Theme } from '../../src/ui/Theme';
import { NODE_LABELS } from '../../src/ui/MapRenderer';
import { UI } from '../../src/i18n';

describe('Gauntlet node type registration', () => {
  it('gauntlet is a valid NodeType', () => {
    const nodeType: NodeType = 'gauntlet';
    expect(nodeType).toBe('gauntlet');
  });

  it('gauntlet has a theme color', () => {
    expect((Theme.colors.node as Record<string, number>).gauntlet).toBeDefined();
  });

  it('gauntlet has a map label', () => {
    expect(NODE_LABELS.gauntlet).toBeDefined();
  });

  it('gauntlet has an i18n name', () => {
    expect(UI.nodeType.gauntlet).toBe('连战');
  });

  it('wave indicator formats correctly', () => {
    expect(UI.wave.indicator(2, 3)).toContain('2');
    expect(UI.wave.indicator(2, 3)).toContain('3');
  });

  it('gauntlet tooltip formats correctly', () => {
    expect(UI.wave.gauntletTooltip(3)).toContain('3');
  });
});
