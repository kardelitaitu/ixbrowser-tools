import * as fs from 'fs/promises';
import * as path from 'path';

interface AuditLoggerOptions {
  baseDir?: string;
  auditLogFile?: string;
  sessionId?: string;
  enabled?: boolean;
}

interface LogEvent {
  step: string;
  action: string;
  profileId?: string | null;
  profileName?: string | null;
  success?: boolean | null;
  data?: unknown;
  error?: string | null;
  duration?: number | null;
}

/**
 * Audit logger for tracking automation steps and actions
 */
export class AuditLogger {
  private baseDir: string;
  private auditLogFile: string;
  private sessionId: string;
  private enabled: boolean;

  constructor(options: AuditLoggerOptions = {}) {
    this.baseDir = options.baseDir || path.join(__dirname, 'logs');
    this.auditLogFile =
      options.auditLogFile ||
      path.join(
        this.baseDir,
        `audit_${new Date().toISOString().replace(/:/g, '-')}.jsonl`,
      );
    this.sessionId = options.sessionId || `session_${Date.now()}`;
    this.enabled = options.enabled !== false;
  }

  async log(event: LogEvent): Promise<void> {
    if (!this.enabled) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      step: event.step,
      action: event.action,
      profileId: event.profileId || null,
      profileName: event.profileName || null,
      success: event.success !== undefined ? event.success : null,
      data: event.data || {},
      error: event.error || null,
      duration: event.duration || null,
    };

    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.appendFile(this.auditLogFile, JSON.stringify(auditEntry) + '\n');
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  async logStepStart(
    step: string,
    action: string,
    profileId: string | null = null,
    profileName: string | null = null,
    data: unknown = {},
  ): Promise<void> {
    await this.log({
      step,
      action: `${action}_start`,
      profileId,
      profileName,
      data,
    });
  }

  async logStepEnd(
    step: string,
    action: string,
    success: boolean,
    profileId: string | null = null,
    profileName: string | null = null,
    data: unknown = {},
    error: string | null = null,
    duration: number | null = null,
  ): Promise<void> {
    await this.log({
      step,
      action: `${action}_end`,
      profileId,
      profileName,
      success,
      data,
      error,
      duration,
    });
  }

  async logAction(
    step: string,
    action: string,
    success: boolean,
    profileId: string | null = null,
    profileName: string | null = null,
    data: unknown = {},
    error: string | null = null,
  ): Promise<void> {
    await this.log({
      step,
      action,
      profileId,
      profileName,
      success,
      data,
      error,
    });
  }

  getLogFilePath(): string {
    return this.auditLogFile;
  }
}
