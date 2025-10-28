import type React from "react"
import type { LogEntry } from "../types"

interface Props {
  logs: LogEntry[]
}

const LogsView: React.FC<Props> = ({ logs }) => {
  const levelConfig = {
    INFO: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "ℹ" },
    WARN: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: "⚠" },
    ERROR: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: "✕" },
    SUCCESS: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "✓" },
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Recent Logs</h2>
        <p className="text-sm text-slate-500 mt-1">
          {logs.length} log{logs.length !== 1 ? "s" : ""} found
        </p>
      </div>
      {logs.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-12 text-center">
          <p className="text-slate-400">No logs match the current filters.</p>
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {logs.map((log, index) => {
              const config = levelConfig[log.level as keyof typeof levelConfig] || levelConfig.INFO
              return (
                <div
                  key={index}
                  className={`${config.bg} border-b ${config.border} px-5 py-4 flex items-start gap-4 hover:bg-slate-700/20 transition-colors ${
                    index === logs.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center ${config.color} font-bold text-sm`}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${config.color}`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 break-words">{log.message}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default LogsView
