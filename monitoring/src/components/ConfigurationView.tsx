import React, { useState, useEffect } from 'react';
import { TaskConfiguration, Selectors } from '../../src/types/core';

interface Props {
  tasksConfig?: TaskConfiguration[];
  selectorsConfig?: Selectors;
}

const ConfigurationView: React.FC<Props> = ({ tasksConfig, selectorsConfig }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localTasksConfig, setLocalTasksConfig] = useState<TaskConfiguration[] | undefined>(tasksConfig);
  const [localSelectorsConfig, setLocalSelectorsConfig] = useState<Selectors | undefined>(selectorsConfig);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!tasksConfig) {
          const tasksResponse = await fetch('/api/config/tasks');
          if (!tasksResponse.ok) throw new Error(`HTTP error! status: ${tasksResponse.status}`);
          setLocalTasksConfig(await tasksResponse.json());
        }

        if (!selectorsConfig) {
          const selectorsResponse = await fetch('/api/config/selectors');
          if (!selectorsResponse.ok) throw new Error(`HTTP error! status: ${selectorsResponse.status}`);
          setLocalSelectorsConfig(await selectorsResponse.json());
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('[ConfigurationView] Error fetching config:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!tasksConfig || !selectorsConfig) {
      fetchConfig();
    } else {
      setLoading(false);
    }
  }, [tasksConfig, selectorsConfig]);

  if (loading) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-12 text-center">
        <p className="text-slate-400">Loading configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-800/30 border border-red-700/30 rounded-lg p-12 text-center">
        <p className="text-red-400">Error loading configuration: {error}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-100">Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">Current tasks and selectors configuration.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Tasks ({localTasksConfig?.length || 0})</h3>
          {localTasksConfig && localTasksConfig.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {localTasksConfig.map((task, index) => (
                <div key={index} className="bg-slate-700/50 p-4 rounded-md border border-slate-600/50">
                  <p className="text-sm text-slate-200 font-mono">Type: <span className="text-cyan-400">{task.type}</span></p>
                  {task.handle && <p className="text-sm text-slate-300 font-mono">Handle: {task.handle}</p>}
                  {task.inviteUrl && <p className="text-sm text-slate-300 font-mono">Invite URL: {task.inviteUrl}</p>}
                  {task.options && Object.keys(task.options).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400">Options:</p>
                      <pre className="text-xs text-slate-400 bg-slate-800 p-2 rounded overflow-x-auto">{JSON.stringify(task.options, null, 2)}</pre>
                    </div>
                  )}
                  {task.stopOnFailure !== undefined && <p className="text-sm text-slate-300 font-mono">Stop on Failure: {task.stopOnFailure.toString()}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No tasks configured.</p>
          )}
        </div>

        <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Selectors</h3>
          {localSelectorsConfig ? (
            <pre className="text-xs text-slate-400 bg-slate-800 p-2 rounded overflow-x-auto max-h-96">
              {JSON.stringify(localSelectorsConfig, null, 2)}
            </pre>
          ) : (
            <p className="text-slate-400">No selectors configured.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigurationView;
