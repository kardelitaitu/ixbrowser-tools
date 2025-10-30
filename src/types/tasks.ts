import { AuditLogger } from '../utils/audit-logger';

/**
 * @fileoverview Centralized type definitions for automation tasks.
 */

export interface TaskOptions {
  verifyOnly?: boolean;
  delayBetweenActions?: boolean;
}

export interface AutomationInstance {
  delay: (_profile: string) => Promise<void>;
  logger: (_msg: string) => void;
  auditLogger: AuditLogger;
}

export interface TaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

export type TaskProgressStatus = 'started' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface TaskProgress {
  status: TaskProgressStatus;
  step: string;
  message: string;
  timestamp: string;
  data?: any;
}
