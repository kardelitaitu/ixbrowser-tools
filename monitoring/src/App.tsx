"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { io, type Socket } from "socket.io-client"
import type { MonitoringData, ProfileData, LogEntry, TaskConfiguration, Selectors, TaskProgress } from "../types"
import ProfileDashboard from "./components/ProfileDashboard"
import LogsView from "./components/LogsView"
import SystemMetrics from "./components/SystemMetrics"
import ErrorBoundary from "./components/ErrorBoundary"
import ConfigurationView from "./components/ConfigurationView"

function App() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLevel, setFilterLevel] = useState<string>("all")
  const [socket, setSocket] = useState<Socket | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [monitoringResponse, tasksResponse, selectorsResponse] = await Promise.all([
        fetch("/api/monitoring"),
        fetch("/api/config/tasks"),
        fetch("/api/config/selectors"),
      ]);

      if (!monitoringResponse.ok) throw new Error(`HTTP error! status: ${monitoringResponse.status} for monitoring data`);
      if (!tasksResponse.ok) throw new Error(`HTTP error! status: ${tasksResponse.status} for tasks config`);
      if (!selectorsResponse.ok) throw new Error(`HTTP error! status: ${selectorsResponse.status} for selectors config`);

      const monitoringResult: MonitoringData = await monitoringResponse.json();
      const tasksConfig: TaskConfiguration[] = await tasksResponse.json();
      const selectorsConfig: Selectors = await selectorsResponse.json();

      setData({
        ...monitoringResult,
        tasksConfig,
        selectorsConfig,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(errorMessage)
      console.error("[App] Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const newSocket = io("http://localhost:3001")
    setSocket(newSocket)

    newSocket.on("monitoring-data", (data) => {
      console.log("[App] Received initial monitoring data:", data)
      setData((prev) => prev ? { ...prev, ...data } : null)
    })

    newSocket.on("system-metrics", (metrics) => {
      console.log("[App] Received real-time system metrics:", metrics)
      setData((prev) => prev ? { ...prev, systemMetrics: metrics } : null)
    })

    newSocket.on("general-log-entry", (logEntry: LogEntry) => {
      console.log("[App] Received general log entry:", logEntry)
      setData((prev) => {
        if (!prev) return null;
        return { ...prev, logs: [...prev.logs, logEntry] };
      });
    });

    newSocket.on("audit-log-entry", (auditEntry: any) => {
      console.log("[App] Received audit log entry:", auditEntry)
      setData((prev) => {
        if (!prev) return null;
        return { ...prev, logs: [...prev.logs, auditEntry] }; // Assuming audit entries can also be displayed as logs
      });
    });

    newSocket.on("task-progress-update", ({ profileId, progress }: { profileId: string, progress: TaskProgress }) => {
      console.log("[App] Received task progress update:", { profileId, progress })
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          taskProgress: {
            ...prev.taskProgress,
            [profileId]: progress,
          },
        };
      });
    });

    return () => {
      newSocket.close()
    }
  }, [])

   useEffect(() => {
     fetchData()
     // No longer polling for logs, only for initial data
     // const interval = setInterval(fetchData, 5000)
     // return () => clearInterval(interval)
   }, [fetchData])

  const filteredLogs = useMemo(() => {
    if (!data?.logs) return []
    return data.logs.filter((log: LogEntry) => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesLevel = filterLevel === "all" || log.level === filterLevel
      return matchesSearch && matchesLevel
    })
  }, [data?.logs, searchTerm, filterLevel])

  const filteredProfiles = useMemo(() => {
    if (!data?.profiles) return []
    return data.profiles.filter((profile: ProfileData) =>
      profile.profileName.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [data?.profiles, searchTerm])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block">
              <div className="w-12 h-12 border-3 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-slate-300">Loading ixBrowser Monitoring...</p>
          <p className="text-sm text-slate-500 mt-2">Initializing dashboard</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-md w-full mx-4 p-6 bg-slate-900 border border-red-500/20 rounded-lg">
          <h1 className="text-xl font-bold text-red-400 mb-2">Error Loading Dashboard</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  ixBrowser Monitoring
                </h1>
                <p className="text-xs text-slate-500 mt-1">Real-time system monitoring & analytics</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative hidden sm:block">
                  <input
                    type="text"
                    placeholder="Search profiles & logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                  <svg
                    className="absolute right-3 top-2.5 w-4 h-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                >
                  <option value="all">All Levels</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                  <option value="SUCCESS">SUCCESS</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <SystemMetrics metrics={data?.systemMetrics} />
          <ProfileDashboard profiles={filteredProfiles} taskProgress={data?.taskProgress || {}} />
          <LogsView logs={filteredLogs} />
          <ConfigurationView tasksConfig={data?.tasksConfig} selectorsConfig={data?.selectorsConfig} />
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App