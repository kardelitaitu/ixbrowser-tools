"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { io, type Socket } from "socket.io-client"
import type { MonitoringData, ProfileData, LogEntry, TaskConfiguration, Selectors, TaskProgress, SystemMetrics } from "../types"
import ProfileDashboard from "./components/ProfileDashboard"
import LogsView from "./components/LogsView"
import SystemMetrics from "./components/SystemMetrics"
import ErrorBoundary from "./components/ErrorBoundary"

const generateMockData = (): MonitoringData => {
  const profiles: ProfileData[] = [];
  const taskProgress: { [profileId: string]: TaskProgress } = {};
  const statuses: ProfileData['status'][] = ['running', 'completed', 'failed', 'idle', 'running', 'running']; // Skew towards running
  const taskTypes = ['task_follow_twitter', 'task_read_gmail', 'task_join_discord'];
  const taskSteps: { [key: string]: string[] } = {
    task_follow_twitter: ['navigate_profile', 'verify_login', 'find_follow_button', 'click_follow_button'],
    task_read_gmail: ['navigate_inbox', 'find_first_mail', 'simulate_reading'],
    task_join_discord: ['navigate_invite', 'accept_invite', 'verify_join'],
  };

  for (let i = 0; i < 50; i++) {
    const profileId = `mock-profile-${i}`;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const startTime = Date.now() - Math.floor(Math.random() * 1000 * 60 * 10); // in the last 10 mins

    const profile: ProfileData = {
      profileId,
      profileName: `Profile ${i + 1}`,
      status,
      startTime,
    };

    if (status === 'completed' || status === 'failed') {
      profile.duration = Math.floor(Math.random() * 1000 * 60 * 2); // up to 2 mins
    }
    if (status === 'failed') {
      profile.error = 'Random mock error occurred during task execution.';
    }

    profiles.push(profile);

    if (status === 'running') {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      const steps = taskSteps[taskType];
      const step = steps[Math.floor(Math.random() * steps.length)];
      taskProgress[profileId] = {
        taskType,
        step,
        message: `Currently performing: ${step.replace('_', ' ')}`,
        status: 'in_progress',
        timestamp: new Date().toISOString(),
      };
    }
  }

  const systemMetrics: SystemMetrics = {
    timestamp: Date.now(),
    totalMemory: 16,
    usedMemory: Math.round(6 + Math.random() * 4),
    cpuUsage: Math.round(15 + Math.random() * 40),
    storageUsage: 50,
    storageUsed: 1280,
    storageTotal: 2560,
    downloadSpeed: Math.round(80 + Math.random() * 120),
    lastRestorePoint: 'Demo Restore Point',
    lastRestorePointTimestamp: new Date(Date.now() - 86400000).toLocaleString(),
  };

  const logs: LogEntry[] = [
    { timestamp: Date.now(), level: 'INFO', message: 'Initializing mock data for demonstration.'},
    { timestamp: Date.now() - 1000, level: 'INFO', message: 'Socket connection established.'},
    { timestamp: Date.now() - 2000, level: 'WARN', message: 'High CPU usage detected on Profile 23.'},
    { timestamp: Date.now() - 5000, level: 'ERROR', message: 'Failed to connect to proxy for Profile 12.'},
  ]

  return {
    profiles,
    taskProgress,
    logs,
    systemMetrics,
    tasksConfig: [],
    selectorsConfig: {},
  };
};


function App() {
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLevel, setFilterLevel] = useState<string>("all")
  const [socket, setSocket] = useState<Socket | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Simulate network delay for mock data
    await new Promise(resolve => setTimeout(resolve, 300));
    const mockData = generateMockData();
    setData(mockData);
    setLoading(false);
  }, [])

  useEffect(() => {
    // We are using mock data, so we don't initialize the socket
    // to prevent real data from overwriting the demo data.
    /*
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
    */
  }, [])

   useEffect(() => {
     fetchData()
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="mb-6">
            <div className="inline-block">
              <div className="w-12 h-12 border-3 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-slate-300">Generating Demo Data...</p>
          <p className="text-sm text-slate-500 mt-2">Building dashboard</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
      <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="px-6 py-4">
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
                    className="w-64 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
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
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all
    
    appearance-none
    bg-no-repeat
    bg-right-3
    bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22currentColor%22%20class%3D%22w-5%20h-5%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.22%208.22a.75.75%200%200%201%201.06%200L10%2011.94l3.72-3.72a.75.75%200%201%201%201.06%201.06l-4.25%204.25a.75.75%200%200%201-1.06%200L5.22%209.28a.75.75%200%200%201%200-1.06Z%22%20clip-rule%3D%22evenodd%22%20%2F%3E%3C%2Fsvg%3E')]
    bg-[length:1.25em_1.25em]"
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
        <main className="flex-grow flex flex-col lg:flex-row px-6 py-8 gap-6 overflow-hidden">
          {/* Left Sidebar */}
          <div className="lg:w-1/4 flex flex-col gap-6">
            <SystemMetrics metrics={data?.systemMetrics} />
            <div className="flex-grow flex min-h-0">
              <LogsView logs={filteredLogs} />
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:w-3/4 flex flex-col">
            <ProfileDashboard profiles={filteredProfiles} taskProgress={data?.taskProgress || {}} />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App
