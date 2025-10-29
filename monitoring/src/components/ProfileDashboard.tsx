import React, { useState, useMemo } from "react"
import type { ProfileData, TaskProgress } from "../../types"

interface Props {
  profiles: ProfileData[]
  taskProgress: { [profileId: string]: TaskProgress }
}

const ProfileDashboard: React.FC<Props> = ({ profiles, taskProgress }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const statusConfig = {
    running: {
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: "▶",
      label: "Running",
    },
    completed: { color: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "✓", label: "Completed" },
    failed: { color: "from-red-500 to-orange-500", bg: "bg-red-500/10", border: "border-red-500/30", icon: "✕", label: "Failed" },
    idle: { color: "from-slate-500 to-slate-600", bg: "bg-slate-500/10", border: "border-slate-500/30", icon: "○", label: "Idle" },
  }

  const statusCounts = useMemo(() => {
    return profiles.reduce((acc, profile) => {
      acc[profile.status] = (acc[profile.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    if (statusFilter === 'all') {
      return profiles;
    }
    return profiles.filter(profile => profile.status === statusFilter);
  }, [profiles, statusFilter]);

  const getTaskStatusColor = (status: TaskProgress['status']) => {
    switch (status) {
      case 'completed': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      case 'in_progress': return 'text-blue-400';
      case 'started': return 'text-cyan-400';
      case 'skipped': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const FilterButton = ({ status, label, count }: { status: string, label: string, count: number }) => {
    const isActive = statusFilter === status;
    const activeClasses = 'bg-slate-700/80 border-slate-600';
    const inactiveClasses = 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50';
    return (
      <button
        onClick={() => setStatusFilter(status)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${isActive ? activeClasses : inactiveClasses}`}
      >
        <span className={isActive ? 'text-cyan-400' : 'text-slate-300'}>{label}</span>
        <span className={`px-2 rounded-full text-xs font-semibold ${isActive ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Profile Status</h2>
          <p className="text-sm text-slate-500 mt-1">
            {filteredProfiles.length} of {profiles.length} profiles showing
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0 flex-wrap">
          <FilterButton status="all" label="All" count={profiles.length} />
          {Object.entries(statusCounts).map(([status, count]) => (
            <FilterButton
              key={status}
              status={status}
              label={statusConfig[status as keyof typeof statusConfig]?.label || status}
              count={count}
            />
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto overflow-x-hidden pr-2 no-scrollbar">
        {filteredProfiles.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-12 text-center h-full flex items-center justify-center">
            <p className="text-slate-400">No profiles match the '{statusFilter}' filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {filteredProfiles.map((profile) => {
              const config = statusConfig[profile.status as keyof typeof statusConfig] || statusConfig.idle
              const currentTask = taskProgress[profile.profileId];
              return (
                <div
                  key={profile.profileId}
                  className={`${config.bg} border ${config.border} rounded-lg p-3 transition-all group relative`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg text-white ${profile.status === 'running' ? 'animate-pulse' : ''}`}>{config.icon}</span>
                      <h3 className="font-semibold text-sm text-slate-100 truncate">{profile.profileName}</h3>
                    </div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${config.color} text-white`}
                    >
                      {profile.status}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="mt-2 space-y-1 text-xs text-slate-400">
                    {currentTask ? (
                      <p className="truncate">
                        <span className="text-slate-500">Task:</span> {currentTask.message}
                      </p>
                    ) : (
                      <p className="truncate"><span className="text-slate-500">Task:</span> N/A</p>
                    )}
                    
                    {profile.duration && (
                      <p><span className="text-slate-500">Time:</span> {Math.round(profile.duration / 1000)}s</p>
                    )}

                    {currentTask?.data?.emailAddress && (
                       <p className="truncate">
                         <span className="text-slate-500">Email:</span> {currentTask.data.emailAddress}
                       </p>
                    )}
                  </div>

                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs shadow-lg z-10 scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all pointer-events-none">
                    <p className="font-bold text-slate-200 mb-1">{profile.profileName}</p>
                    <p><strong className="text-slate-400">ID:</strong> <span className="text-slate-300 break-all">{profile.profileId}</span></p>
                    {profile.startTime && <p><strong className="text-slate-400">Started:</strong> <span className="text-slate-300">{new Date(profile.startTime).toLocaleString()}</span></p>}
                    {profile.error && <p className="mt-2 text-red-400"><strong className="block">Error:</strong> <span className="break-words">{profile.error}</span></p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
    </div>
  )
}

export default ProfileDashboard