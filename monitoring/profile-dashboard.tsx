import type React from "react"
import type { ProfileData } from "../types"

interface Props {
  profiles: ProfileData[]
}

const ProfileDashboard: React.FC<Props> = ({ profiles }) => {
  const statusConfig = {
    running: {
      color: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: "▶",
    },
    completed: { color: "from-blue-500 to-cyan-500", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: "✓" },
    failed: { color: "from-red-500 to-orange-500", bg: "bg-red-500/10", border: "border-red-500/30", icon: "✕" },
    idle: { color: "from-slate-500 to-slate-600", bg: "bg-slate-500/10", border: "border-slate-500/30", icon: "○" },
  }

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Profile Status</h2>
        <p className="text-sm text-slate-500 mt-1">
          {profiles.length} profile{profiles.length !== 1 ? "s" : ""} active
        </p>
      </div>
      {profiles.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-12 text-center">
          <p className="text-slate-400">No profiles match the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => {
            const config = statusConfig[profile.status as keyof typeof statusConfig] || statusConfig.idle
            return (
              <div
                key={profile.profileId}
                className={`${config.bg} border ${config.border} rounded-lg p-5 hover:border-slate-500/50 transition-all group`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-sm`}
                    >
                      {config.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100">{profile.profileName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">ID: {profile.profileId}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${config.color} text-white`}
                    >
                      {profile.status.toUpperCase()}
                    </span>
                  </div>

                  {profile.duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Duration</span>
                      <span className="text-sm font-medium text-slate-200">{Math.round(profile.duration / 1000)}s</span>
                    </div>
                  )}

                  {profile.startTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Started</span>
                      <span className="text-xs text-slate-400">{new Date(profile.startTime).toLocaleTimeString()}</span>
                    </div>
                  )}

                  {profile.error && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      <p className="font-semibold mb-1">Error</p>
                      <p className="break-words">{profile.error}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProfileDashboard
