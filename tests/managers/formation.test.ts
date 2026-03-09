import { describe, it, expect } from 'vitest';
import { autoFormationByRole } from '../../src/managers/RunManager';

describe('autoFormationByRole', () => {
  it('assigns tank to front', () => {
    expect(autoFormationByRole('tank')).toBe('front');
  });

  it('assigns melee_dps to front', () => {
    expect(autoFormationByRole('melee_dps')).toBe('front');
  });

  it('assigns ranged_dps to back', () => {
    expect(autoFormationByRole('ranged_dps')).toBe('back');
  });

  it('assigns healer to back', () => {
    expect(autoFormationByRole('healer')).toBe('back');
  });

  it('assigns support to back', () => {
    expect(autoFormationByRole('support')).toBe('back');
  });
});
