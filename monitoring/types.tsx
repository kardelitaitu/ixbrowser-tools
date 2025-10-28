export interface SystemMetrics {
  timestamp: number
  totalMemory: number
  usedMemory: number
  cpuUsage: number
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
}

export interface MonitoringData {
  systemMetrics: SystemMetrics
  profiles: ProfileData[]
  logs: LogEntry[]
}
