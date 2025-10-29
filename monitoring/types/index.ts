import { TaskConfiguration, Selectors } from '../../src/types/core';

export interface SystemMetrics {
  timestamp: number
  totalMemory: number
  usedMemory: number
  cpuUsage: number
  storageUsage: number
  storageUsed: number
  storageTotal: number
  downloadSpeed: number
  lastRestorePoint?: string
  lastRestorePointTimestamp?: string
}

export type TaskProgressStatus = 'started' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface TaskProgress {
  taskType: string;
  status: TaskProgressStatus;
  step: string;
  message: string;
  timestamp: string;
  data?: any;
}

export interface ProfileData {
  profileId: string
  profileName: string
  status: "running" | "completed" | "failed" | "idle"
  duration?: number
  startTime?: number
  error?: string
  currentTask?: TaskProgress // Updated to use the new TaskProgress interface
}

export interface LogEntry {
  timestamp: number
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS"
  message: string
  profileId?: string
  data?: any
}

export interface MonitoringData {
  profiles: ProfileData[]
  logs: LogEntry[]
  systemMetrics: SystemMetrics
  taskProgress: { [profileId: string]: TaskProgress }
  tasksConfig?: TaskConfiguration[];
  selectorsConfig?: Selectors;
}