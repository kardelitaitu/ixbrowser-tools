import type React from "react"
import type { LogEntry } from "../../types"

interface Props {
  logs: LogEntry[]
}

const LogsView: React.FC<Props> = ({ logs }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex flex-col space-y-3 w-full h-full">
      <h2 className="text-xl font-bold text-slate-100">Recent Logs</h2>
      <div className="overflow-y-auto text-xs font-mono bg-slate-900 p-3 rounded-md flex-grow modern-scrollbar">
        {logs.length === 0 ? (
          <p className="text-slate-400">No logs match the current filters.</p>
        ) : (
          logs.map((log, index) => (
            <p key={index} className="text-slate-300 break-words">
              <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={`font-semibold ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-blue-400'}`}> [{log.level}]</span> {log.message}
            </p>
          ))
        )}
      </div>
    </div>
  )
}

export default LogsView