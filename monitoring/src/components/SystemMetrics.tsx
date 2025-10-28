import type React from "react"
import type { MonitoringData } from "../../types"

interface Props {
  metrics?: MonitoringData["systemMetrics"]
}

const SystemMetrics: React.FC<Props> = ({ metrics }) => {
  if (!metrics) return null

  const memoryPercent = ((metrics.usedMemory / metrics.totalMemory) * 100).toFixed(1)
  const cpuPercent = metrics.cpuUsage

  const getMetricColor = (value: number, max = 100) => {
    const percent = (value / max) * 100
    if (percent < 50) return "from-emerald-500 to-cyan-500"
    if (percent < 75) return "from-yellow-500 to-orange-500"
    return "from-orange-500 to-red-500"
  }

  const MetricCard = ({ label, value, unit, percent, color, showProgress = true }: any) => (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:border-slate-600/50 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-100">{value}</span>
            <span className="text-slate-500 text-sm">{unit}</span>
          </div>
        </div>
        {showProgress && (
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${color} text-white`}
            >
              {percent}%
            </span>
          </div>
        )}
      </div>
      {showProgress && (
        <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
            style={{ width: `${percent}%` }}
          ></div>
        </div>
      )}
    </div>
  )

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">System Metrics</h2>
        <p className="text-sm text-slate-500 mt-1">Last system restore checkpoint: {metrics.lastRestorePoint || 'None'} ({metrics.lastRestorePointTimestamp || 'Unknown'})</p>
        <p className="text-sm text-slate-500 mt-1">Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="CPU Usage"
          value={cpuPercent}
          unit="%"
          percent={cpuPercent}
          color={getMetricColor(cpuPercent)}
        />
        <MetricCard
          label={`Memory Usage (${metrics.usedMemory}/${metrics.totalMemory} GB)`}
          value={memoryPercent}
          unit="%"
          percent={Math.round(Number.parseFloat(memoryPercent))}
          color={getMetricColor(Number.parseFloat(memoryPercent))}
        />
        <MetricCard
          label={`Storage Usage (${metrics.storageUsed}/${metrics.storageTotal} GB)`}
          value={metrics.storageUsage}
          unit="%"
          percent={metrics.storageUsage}
          color={getMetricColor(metrics.storageUsage)}
        />
        <MetricCard
          label="Download Speed"
          value={metrics.downloadSpeed}
          unit="Mbps"
          percent={null}
          color="from-blue-500 to-cyan-500"
          showProgress={false}
        />
      </div>
    </div>
  )
}

export default SystemMetrics