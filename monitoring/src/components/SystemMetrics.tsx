import type React from "react"
import type { MonitoringData } from "../../types"

interface Props {
  metrics?: MonitoringData["systemMetrics"]
}

const SystemMetrics: React.FC<Props> = ({ metrics }) => {
  if (!metrics) return null

  const memoryPercent = ((metrics.usedMemory / metrics.totalMemory) * 100).toFixed(1)
  const cpuPercent = metrics.cpuUsage

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 space-y-3">
      <h2 className="text-xl font-bold text-slate-100">System Metrics</h2>
      <div className="space-y-2 text-sm">
        <p className="text-slate-400">
          CPU Usage: <span className="font-semibold text-white">{cpuPercent}%</span>
        </p>
        <p className="text-slate-400">
          Memory: <span className="font-semibold text-white">{metrics.usedMemory}GB / {metrics.totalMemory}GB ({memoryPercent}%)</span>
        </p>
        <p className="text-slate-400">
          Storage (C:): <span className="font-semibold text-white">{metrics.storageUsed}GB / {metrics.storageTotal}GB ({metrics.storageUsage}%)</span>
        </p>
        <p className="text-slate-400">
          Download Speed: <span className="font-semibold text-white">{metrics.downloadSpeed} Mbps</span>
        </p>
      </div>
      <div className="text-xs text-slate-500 space-y-1">
        <p>Last update: {new Date(metrics.timestamp).toLocaleTimeString()}</p>
        {metrics.lastRestorePoint && metrics.lastRestorePoint !== 'None' && (
          <p>
            Last restore checkpoint: {metrics.lastRestorePoint}
            {metrics.lastRestorePointTimestamp && metrics.lastRestorePointTimestamp !== 'Unknown' && (
              <span> ({metrics.lastRestorePointTimestamp})</span>
            )}
          </p>
        )}
      </div>
    </div>
  )
}

export default SystemMetrics