import { AuditLogger } from './audit-logger';

/**
 * @fileoverview Unified logging utility that wraps AuditLogger for consistent output.
 */

export class UnifiedLogger {
  private auditLogger: AuditLogger;
  private prefix: string;

  constructor(auditLogger: AuditLogger, prefix: string = '') {
    this.auditLogger = auditLogger;
    this.prefix = prefix ? `[${prefix}] ` : '';
  }

  public log(message: string, ...args: any[]): void {
    console.log(`${this.prefix}${message}`, ...args);
    // Optionally, log to auditLogger for INFO level messages
    // this.auditLogger.logAction('system', 'log', true, null, null, { message: `${this.prefix}${message}` });
  }

  public warn(message: string, ...args: any[]): void {
    console.warn(`${this.prefix}WARN: ${message}`, ...args);
    this.auditLogger.logAction('system', 'warn', false, null, null, { message: `${this.prefix}${message}` });
  }

  public error(message: string, ...args: any[]): void {
    console.error(`${this.prefix}ERROR: ${message}`, ...args);
    this.auditLogger.logAction('system', 'error', false, null, null, { message: `${this.prefix}${message}` });
  }
}
