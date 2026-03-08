import { describe, it, expect } from 'vitest';
import { BuildReviewPanel } from '../../src/ui/BuildReviewPanel';

describe('BuildReviewPanel', () => {
  it('should export BuildReviewPanel class', () => {
    expect(BuildReviewPanel).toBeDefined();
    expect(typeof BuildReviewPanel).toBe('function');
  });
});
