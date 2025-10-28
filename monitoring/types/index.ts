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

export interface ProfileData {
  profileId: string
  profileName: string
  status: "running" | "completed" | "failed" | "idle"
  duration?: number
  startTime?: number
  error?: string
}

export interface LogEntry {
  timestamp: number
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS"
  message: string
  profileId?: string
  data?: any
}

export interface MonitoringData {
  systemMetrics: SystemMetrics
  profiles: ProfileData[]
  logs: LogEntry[]
}

export interface MonitoringData {
  systemMetrics: SystemMetrics
  profiles: ProfileData[]
  logs: LogEntry[]
}
}

export interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
  message: string
  profileId?: string
  data?: any
}

export interface MonitoringData {
  profiles: ProfileData[]
  logs: LogEntry[]
  systemMetrics: {
    totalMemory: number
    usedMemory: number
    cpuUsage: number
    timestamp: string
  }
}