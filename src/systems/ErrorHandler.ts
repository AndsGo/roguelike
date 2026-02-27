import { EventBus } from './EventBus';

export type ErrorSeverity = 'info' | 'warn' | 'error' | 'fatal';

export interface GameError {
  severity: ErrorSeverity;
  source: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

const BUFFER_SIZE = 50;

/**
 * Centralized error reporting system.
 * Maintains a ring buffer of recent errors and emits events for fatal errors.
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private buffer: GameError[] = [];
  private writeIndex: number = 0;
  private count: number = 0;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /** Report an error/info/warning */
  static report(
    severity: ErrorSeverity,
    source: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    const inst = ErrorHandler.getInstance();
    const entry: GameError = {
      severity,
      source,
      message,
      context,
      timestamp: Date.now(),
    };

    // Ring buffer insertion
    if (inst.buffer.length < BUFFER_SIZE) {
      inst.buffer.push(entry);
    } else {
      inst.buffer[inst.writeIndex] = entry;
    }
    inst.writeIndex = (inst.writeIndex + 1) % BUFFER_SIZE;
    inst.count++;

    // Console output based on severity
    switch (severity) {
      case 'info':
        console.log(`[${source}] ${message}`);
        break;
      case 'warn':
        console.warn(`[${source}] ${message}`);
        break;
      case 'error':
        console.error(`[${source}] ${message}`);
        break;
      case 'fatal':
        console.error(`[FATAL:${source}] ${message}`);
        break;
    }

    // Emit event for error tracking
    try {
      EventBus.getInstance().emit('error:report', {
        severity,
        source,
        message,
      });
    } catch {
      // EventBus may not be available during early init
    }
  }

  /** Get recent errors (newest first), up to BUFFER_SIZE */
  static getRecentErrors(): GameError[] {
    const inst = ErrorHandler.getInstance();
    if (inst.buffer.length === 0) return [];

    // Return in reverse chronological order
    const result: GameError[] = [];
    const len = inst.buffer.length;
    let idx = (inst.writeIndex - 1 + len) % len;
    for (let i = 0; i < len; i++) {
      result.push(inst.buffer[idx]);
      idx = (idx - 1 + len) % len;
    }
    return result;
  }

  /** Get total error count since init */
  static getErrorCount(): number {
    return ErrorHandler.getInstance().count;
  }

  /** Clear error buffer */
  static clear(): void {
    const inst = ErrorHandler.getInstance();
    inst.buffer = [];
    inst.writeIndex = 0;
    inst.count = 0;
  }
}
