import express from 'express'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import si from 'systeminformation'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('[DEV] Initializing monitoring server...')

const app = express()
console.log('[DEV] Express app created')

const server = http.createServer(app)
console.log('[DEV] HTTP server created')

const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})
console.log('[DEV] Socket.IO server initialized with CORS')

app.use(cors())
console.log('[DEV] CORS middleware applied')

app.use(express.json())
console.log('[DEV] JSON parsing middleware applied')

// Function to get last system restore point (loaded once at startup)
let restorePointData = { name: 'Unknown', timestamp: 'Unknown', sequenceNumber: null, eventType: null, restorePointType: null }
const loadRestorePoint = async () => {
   try {
     // Use Get-CimInstance for detailed restore point data
     const { stdout, stderr } = await execAsync('powershell -Command "try { $rp = Get-CimInstance -Namespace \'root/default\' -ClassName SystemRestore | Sort-Object -Property CreationTime -Descending | Select-Object -First 1; if ($rp) { $rp.SequenceNumber.ToString() + \'|\' + $rp.Description + \'|\' + [System.Management.ManagementDateTimeConverter]::ToDateTime($rp.CreationTime).ToString(\'MM/dd/yyyy hh:mm:ss tt\') + \'|\' + $rp.EventType.ToString() + \'|\' + $rp.RestorePointType.ToString() } else { \'null|No restore points|Unknown|null|null\' } } catch { \'null|Error|\' + $_.Exception.Message + \'|null|null\' }"')
     console.log(`[DEV] Restore point stdout: "${stdout.trim()}"`)
     console.log(`[DEV] Restore point stderr: "${stderr.trim()}"`)
     const parts = stdout.trim().split('|')
     if (parts.length >= 5 && parts[0] !== 'null') {
       restorePointData = {
         sequenceNumber: parts[0] || null,
         name: parts[1] || 'None',
         timestamp: parts[2] || 'Unknown',
         eventType: parts[3] || null,
         restorePointType: parts[4] || null
       }
     } else {
       restorePointData = { sequenceNumber: null, name: 'No restore points or error', timestamp: 'Unknown', eventType: null, restorePointType: null }
     }
     console.log(`[DEV] Loaded restore point: ${restorePointData.name} at ${restorePointData.timestamp} (Seq: ${restorePointData.sequenceNumber})`)
   } catch (error) {
     console.error('[DEV] Error loading restore point:', error)
     restorePointData = { sequenceNumber: null, name: 'Access denied or none', timestamp: 'Unknown', eventType: null, restorePointType: null }
   }
 }

// Function to get the last restore point data
const lastRestorePoint = () => {
  return restorePointData
}

// Real-time system metrics polling (excludes restore point)
let currentMetrics = null
const updateMetrics = async () => {
  try {
    console.log('[DEV] Fetching system metrics...')
    const cpuLoad = await si.currentLoad()
    console.log(`[DEV] CPU load fetched: ${cpuLoad.currentLoad}%`)
    const mem = await si.mem()
    console.log(`[DEV] Memory fetched: ${Math.round(mem.total / (1024 ** 3))}GB total`)
    const disks = await si.fsSize()
    console.log(`[DEV] Disks fetched: ${disks.length} drives`)
    const network = await si.networkStats()
    console.log(`[DEV] Network fetched: ${network.length} interfaces`)

    const cDrive = disks.find(d => d.mount === 'C:' || d.mount.startsWith('C:'))
    if (!cDrive) {
      console.log('[DEV] No C: drive found')
    }
    const storageUsage = cDrive ? Math.round((cDrive.used / cDrive.size) * 1000) / 10 : 0 // 1 decimal
    const storageUsed = cDrive ? Math.round(cDrive.used / (1024 ** 3)) : 0 // GB
    const storageTotal = cDrive ? Math.round(cDrive.size / (1024 ** 3)) : 0 // GB
    const downloadSpeed = network.length > 0 ? Math.round(network[0].rx_sec / (1024 * 1024) * 8) : 0

    currentMetrics = {
      timestamp: Date.now(),
      totalMemory: Math.round(mem.total / (1024 ** 3)),
      usedMemory: Math.round((mem.total - mem.available) / (1024 ** 3)),
      cpuUsage: Math.round((cpuLoad.currentLoad || 0) * 10) / 10, // 1 decimal place
      storageUsage,
      storageUsed,
      storageTotal,
      downloadSpeed,
      lastRestorePoint: restorePointData.name,
      lastRestorePointTimestamp: restorePointData.timestamp
    }
    console.log(`[DEV] Metrics calculated: CPU ${currentMetrics.cpuUsage}%, RAM ${currentMetrics.usedMemory}/${currentMetrics.totalMemory}GB, Storage ${currentMetrics.storageUsage}%, Download ${currentMetrics.downloadSpeed}Mbps`)
  } catch (error) {
    console.error('[DEV] Error updating metrics:', error)
  }
}

// Load restore point once at startup
await loadRestorePoint()

// Initial update and interval
updateMetrics()
setInterval(updateMetrics, 5000) // Every 5 seconds

// Serve static files from dist/ (built React app)
app.use(express.static(path.join(__dirname, 'dist')))

// API endpoint for monitoring data (non-intrusive: reads from ../logs/)
app.get('/api/monitoring', async (req, res) => {
  console.log('[DEV] /api/monitoring endpoint called')
  try {
    const logsDir = path.join(__dirname, '..', 'logs')
    console.log(`[DEV] Reading logs directory: ${logsDir}`)
    const files = await fs.readdir(logsDir).catch(() => [])
    console.log(`[DEV] Found ${files.length} files in logs directory`)

    const profiles = []
    const logs = []

    for (const file of files) {
      console.log(`[DEV] Processing file: ${file}`)
      if (file.startsWith('audit_') && file.endsWith('.jsonl')) {
        console.log(`[DEV] Reading audit file: ${file}`)
        const content = await fs.readFile(path.join(logsDir, file), 'utf-8').catch(() => '')
        const lines = content.trim().split('\n')
        console.log(`[DEV] Audit file ${file} has ${lines.length} lines`)
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            if (entry.profileId) {
              console.log(`[DEV] Parsed profile entry: ${entry.profileId}`)
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
            console.log(`[DEV] Skipped invalid JSON line in ${file}`)
          }
        }
      } else if (file.endsWith('.log')) {
        console.log(`[DEV] Reading log file: ${file}`)
        const content = await fs.readFile(path.join(logsDir, file), 'utf-8').catch(() => '')
        const lines = content.split('\n')
        console.log(`[DEV] Log file ${file} has ${lines.length} lines, processing last 50`)
        for (const line of lines.slice(-50)) { // Last 50 lines
          if (line.trim()) {
            const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/)
             if (match) {
               console.log(`[DEV] Parsed log entry: ${match[2]} - ${match[3]}`)
               const timestampStr = match[1]
               const timeMatch = timestampStr.match(/(\w+)\s+(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+):(\d+)\.(\d+)/)
               let timestamp = Date.now() // fallback
               if (timeMatch) {
                 const [, , month, day, year, hour, min, sec, ms] = timeMatch
                 timestamp = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(min), parseInt(sec), parseInt(ms)).getTime()
               } else {
                 console.log(`[DEV] Failed to parse timestamp: ${timestampStr}`)
               }
               logs.push({
                 timestamp,
                 level: match[2],
                 message: match[3]
               })
             }
          }
        }
      }
    }

     console.log(`[DEV] Collected ${profiles.length} profiles and ${logs.length} logs`)

     // Sort logs by timestamp descending (newest first)
     logs.sort((a, b) => b.timestamp - a.timestamp)
     console.log('[DEV] Logs sorted by timestamp')

     // Use real-time metrics if available, else fallback
     const systemMetrics = currentMetrics || {
       timestamp: Date.now(),
       totalMemory: 16,
       usedMemory: 8,
       cpuUsage: 45,
       storageUsage: 50,
       downloadSpeed: 10
     }
     console.log(`[DEV] Using system metrics: ${JSON.stringify(systemMetrics)}`)

     console.log('[DEV] Sending response with monitoring data')
     res.json({ profiles, logs, systemMetrics })
  } catch (error) {
    console.error('[DEV] Error fetching monitoring data:', error)
    res.status(500).json({ error: 'Failed to fetch data' })
  }
})

// Catch-all handler: send back React's index.html for client-side routing
app.get('*', (req, res) => {
  console.log(`[DEV] Catch-all route triggered for: ${req.originalUrl}`)
  const indexPath = path.join(__dirname, 'dist', 'index.html')
  console.log(`[DEV] Serving index.html from: ${indexPath}`)
  res.sendFile(indexPath)
})

// Socket.io for real-time updates
io.on('connection', (socket) => {
  console.log(`[DEV] Socket.IO client connected: ${socket.id}`)

  socket.emit('monitoring-data', { message: 'Connected to monitoring' })
  console.log('[DEV] Emitted initial monitoring-data event')

  socket.on('disconnect', () => {
    console.log(`[DEV] Socket.IO client disconnected: ${socket.id}`)
  })
})

// Emit real-time metrics every 5 seconds
setInterval(() => {
  if (currentMetrics) {
    io.emit('system-metrics', currentMetrics)
    console.log(`[DEV] Emitted real-time metrics: ${JSON.stringify(currentMetrics)}`)
  }
}, 5000)

const PORT = process.env.PORT || 3001
console.log(`[DEV] Starting server on port ${PORT}`)

// Handle uncaught errors to prevent force close
process.on('uncaughtException', (error) => {
  console.error('[DEV] Uncaught Exception:', error)
  console.error('[DEV] Stack trace:', error.stack)
  // Keep process alive
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('[DEV] Unhandled Rejection at:', promise, 'reason:', reason)
  // Keep process alive
})

// Log process exit events
process.on('exit', (code) => {
  console.log(`[DEV] Process exiting with code: ${code}`)
})

process.on('SIGINT', () => {
  console.log('[DEV] Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[DEV] Received SIGTERM, shutting down gracefully...')
  process.exit(0)
})

server.listen(PORT, () => {
  console.log(`[DEV] Monitoring server running on port ${PORT}`)
})