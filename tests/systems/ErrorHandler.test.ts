import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorHandler } from '../../src/systems/ErrorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    (ErrorHandler as any).instance = null;
  });

  it('reports and stores errors in ring buffer', () => {
    ErrorHandler.report('error', 'test', 'err1');
    ErrorHandler.report('error', 'test', 'err2');
    ErrorHandler.report('error', 'test', 'err3');

    expect(ErrorHandler.getRecentErrors()).toHaveLength(3);
  });

  it('getRecentErrors returns newest first', () => {
    ErrorHandler.report('error', 'test', 'A');
    ErrorHandler.report('error', 'test', 'B');

    const recent = ErrorHandler.getRecentErrors();
    expect(recent[0].message).toBe('B');
  });

  it('ring buffer wraps at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      ErrorHandler.report('error', 'test', `error-${i}`);
    }

    expect(ErrorHandler.getRecentErrors()).toHaveLength(50);
  });

  it('getErrorCount tracks total', () => {
    for (let i = 0; i < 5; i++) {
      ErrorHandler.report('error', 'test', `error-${i}`);
    }

    expect(ErrorHandler.getErrorCount()).toBe(5);
  });

  it('clear resets buffer', () => {
    ErrorHandler.report('error', 'test', 'err1');
    ErrorHandler.report('error', 'test', 'err2');
    ErrorHandler.clear();

    expect(ErrorHandler.getRecentErrors()).toHaveLength(0);
  });
});
