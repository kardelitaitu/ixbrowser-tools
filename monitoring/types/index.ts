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

export interface TaskProgress {
  taskType: string
  currentAction: string
  progress: number // 0-100%
  status: "starting" | "navigating" | "verifying" | "clicking" | "reading" | "waiting" | "completed" | "failed"
  data?: any
  startTime?: number
  duration?: number
}

export interface ProfileData {
  profileId: string
  profileName: string
  status: "running" | "completed" | "failed" | "idle"
  duration?: number
  startTime?: number
  error?: string
  currentTask?: TaskProgress
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
}