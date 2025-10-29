import { ProfileData, LogEntry, MonitoringData, TaskProgress } from '../types'
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
      const profileMap = new Map<string, ProfileData>()

      for (const file of auditFiles) {
        const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8')
        const lines = content.trim().split('\n')
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            if (entry.profileId) {
              const profileId = entry.profileId
              if (!profileMap.has(profileId)) {
                profileMap.set(profileId, {
                  profileId,
                  profileName: entry.profileName || `Profile-${profileId}`,
                  status: 'idle',
                  startTime: new Date(entry.timestamp).getTime(),
                  metrics: {}
                })
              }

              const profile = profileMap.get(profileId)!

              // Update profile status based on step
              if (entry.step === 'profile' && entry.action === 'automation_run_start') {
                profile.status = 'running'
              } else if (entry.step === 'profile' && entry.action === 'automation_run_end') {
                profile.status = entry.success ? 'completed' : 'failed'
                profile.error = entry.error
                if (entry.duration) {
                  profile.duration = entry.duration
                }
              }
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      }
      return Array.from(profileMap.values())
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

  async getTaskProgress(): Promise<{ [profileId: string]: TaskProgress }> {
    try {
      const fs = await import('fs').then(m => m.promises)
      const files = await fs.readdir(LOGS_DIR)
      const auditFiles = files.filter(f => f.startsWith('audit_') && f.endsWith('.jsonl'))

      const taskProgress: { [profileId: string]: TaskProgress } = {}
      const latestProgressTimestamps: { [profileId: string]: number } = {};

      for (const file of auditFiles) {
        const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8')
        const lines = content.trim().split('\n')

        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            if (entry.profileId && entry.action === 'task_progress' && entry.data) {
              const profileId = entry.profileId;
              const progressEvent: TaskProgress = entry.data as TaskProgress;
              const eventTimestamp = new Date(progressEvent.timestamp).getTime();

              // Only store the latest progress event for each profile
              if (!latestProgressTimestamps[profileId] || eventTimestamp > latestProgressTimestamps[profileId]) {
                taskProgress[profileId] = {
                  ...progressEvent,
                  taskType: entry.step, // Use entry.step as taskType as it is the taskName
                };
                latestProgressTimestamps[profileId] = eventTimestamp;
              }
            }
          } catch (e) {
            // Skip invalid lines or lines without expected progress data
            console.warn(`Skipping malformed or unexpected audit log line: ${line} Error: ${(e as Error).message}`);
          }
        }
      }
      return taskProgress
    } catch (error) {
      console.error('Error reading task progress:', error)
      return {}
    }
  }
  async getAllData(): Promise<MonitoringData> {
    const [profiles, logs, systemMetrics, taskProgress] = await Promise.all([
      this.getProfilesData(),
      this.getLogs(),
      this.getSystemMetrics(),
      this.getTaskProgress()
    ])

    return { profiles, logs, systemMetrics, taskProgress }
  }
}