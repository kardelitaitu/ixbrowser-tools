import { ProfileData, LogEntry, MonitoringData } from '../types'
import si from 'systeminformation'

const LOGS_DIR = '../logs'
const PROJECT_ROOT = '../'

export class DataService {
  private static instance: DataService

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService()
    }
    return DataService.instance
  }

  async getProfilesData(): Promise<ProfileData[]> {
    // Read from logs/audit_*.jsonl for profile data
    try {
      const fs = await import('fs').then(m => m.promises)
      const files = await fs.readdir(LOGS_DIR)
      const auditFiles = files.filter(f => f.startsWith('audit_') && f.endsWith('.jsonl'))

      const profiles: ProfileData[] = []
      for (const file of auditFiles) {
        const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8')
        const lines = content.trim().split('\n')
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            if (entry.profileId) {
              profiles.push({
                profileId: entry.profileId,
                profileName: entry.profileName || `Profile-${entry.profileId}`,
                status: entry.success ? 'completed' : 'failed',
                startTime: entry.timestamp,
                error: entry.error,
                metrics: {}
              })
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      }
      return profiles
    } catch (error) {
      console.error('Error reading profile data:', error)
      return []
    }
  }

  async getLogs(): Promise<LogEntry[]> {
    // Read from logs/*.log for general logs
    try {
      const fs = await import('fs').then(m => m.promises)
      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files.filter(f => f.endsWith('.log'))

      const logs: LogEntry[] = []
      for (const file of logFiles) {
        const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8')
        const lines = content.split('\n')
        for (const line of lines.slice(-50)) { // Last 50 lines
          if (line.trim()) {
            const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/)
            if (match) {
              logs.push({
                timestamp: match[1],
                level: match[2],
                message: match[3]
              })
            }
          }
        }
      }
      return logs.slice(-100) // Last 100 entries
    } catch (error) {
      console.error('Error reading logs:', error)
      return []
    }
  }

  async getSystemMetrics(): Promise<MonitoringData['systemMetrics']> {
    try {
      // Real CPU usage
      const cpu = await si.cpu()
      const cpuUsage = cpu.usage || 0

      // Real RAM usage
      const mem = await si.mem()
      const totalMemory = Math.round(mem.total / (1024 ** 3)) // GB
      const usedMemory = Math.round((mem.total - mem.available) / (1024 ** 3)) // GB

      // Storage for C: drive
      const disks = await si.fsSize()
      const cDrive = disks.find(d => d.mount === 'C:' || d.mount.startsWith('C:'))
      const storageUsage = cDrive ? Math.round((cDrive.used / cDrive.size) * 100) : 0

      // Internet download speed (Mbps)
      const network = await si.networkStats()
      const downloadSpeed = network.length > 0 ? Math.round(network[0].rx_sec / (1024 * 1024) * 8) : 0 // Mbps

      return {
        timestamp: Date.now(),
        totalMemory,
        usedMemory,
        cpuUsage: Math.round(cpuUsage),
        storageUsage,
        downloadSpeed
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error)
      // Fallback to static values
      return {
        timestamp: Date.now(),
        totalMemory: 16,
        usedMemory: 8,
        cpuUsage: 45,
        storageUsage: 50,
        downloadSpeed: 10
      }
    }
  }

  async getAllData(): Promise<MonitoringData> {
    const [profiles, logs, systemMetrics] = await Promise.all([
      this.getProfilesData(),
      this.getLogs(),
      this.getSystemMetrics()
    ])

    return { profiles, logs, systemMetrics }
  }
}
    return DataService.instance
  }

  async getProfilesData(): Promise<ProfileData[]> {
    // Read from logs/audit_*.jsonl for profile data
    try {
      const fs = await import('fs').then(m => m.promises)
      const files = await fs.readdir(LOGS_DIR)
      const auditFiles = files.filter(f => f.startsWith('audit_') && f.endsWith('.jsonl'))

      const profiles: ProfileData[] = []
      for (const file of auditFiles) {
        const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8')
        const lines = content.trim().split('\n')
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            if (entry.profileId) {
              profiles.push({
                profileId: entry.profileId,
                profileName: entry.profileName || `Profile-${entry.profileId}`,
                status: entry.success ? 'completed' : 'failed',
                startTime: entry.timestamp,
                error: entry.error,
                metrics: {}
              })
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      }
      return profiles
    } catch (error) {
      console.error('Error reading profile data:', error)
      return []
    }
  }

  async getLogs(): Promise<LogEntry[]> {
    // Read from logs/*.log for general logs
    try {
      const fs = await import('fs').then(m => m.promises)
      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files.filter(f => f.endsWith('.log'))

      const logs: LogEntry[] = []
      for (const file of logFiles) {
        const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8')
        const lines = content.split('\n')
        for (const line of lines) {
          if (line.trim()) {
            const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/)
            if (match) {
              logs.push({
                timestamp: match[1],
                level: match[2] as LogEntry['level'],
                message: match[3]
              })
            }
          }
        }
      }
      return logs.slice(-100) // Last 100 entries
    } catch (error) {
      console.error('Error reading logs:', error)
      return []
    }
  }

  async getSystemMetrics(): Promise<MonitoringData['systemMetrics']> {
    // Simulate system metrics (in real impl, integrate with PowerShell)
    return {
      totalMemory: 16, // GB
      usedMemory: 8,
      cpuUsage: 45,
      timestamp: new Date().toISOString()
    }
  }

  async getAllData(): Promise<MonitoringData> {
    const [profiles, logs, systemMetrics] = await Promise.all([
      this.getProfilesData(),
      this.getLogs(),
      this.getSystemMetrics()
    ])

    return { profiles, logs, systemMetrics }
  }
}