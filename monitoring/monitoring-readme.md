# ixBrowser Monitoring Tool

A non-intrusive React/TypeScript localhost webpage for monitoring ixBrowser automation processes in real-time.

## Features

- **Real-Time Dashboard**: View profile statuses, execution times, and errors.
- **Logs Viewer**: Display recent automation logs with filtering.
- **System Metrics**: Show memory, CPU usage (placeholder for now).
- **Non-Intrusive**: Reads only from `../logs/` without modifying core code.

## Setup

1. **Install Dependencies**:
   ```bash
   cd monitoring
   npm install
   ```

2. **Build React App**:
   ```bash
   npm run build
   ```

3. **Start Server**:
   ```bash
   npm start
   or
m metrics: {"timestamp":1761017998225,"totalMemory":95,"usedMemory":28,"cpuUsage":19.4,"storageUsage":75.2,"storageUsed":2801,"storageTotal":3725,"downloadSpeed":0,"lastRestorePoint":"None or error","lastRestorePointTimestamp":"Unknown"}

   Start-Process "node" -ArgumentList "server.js" -Verb RunAs 
   ```
   - Server runs on http://localhost:3001
   - React dev server on http://localhost:3000 (for development: `npm run dev`)

4. **Access Dashboard**:
   - Open http://localhost:3000 in your browser.
   - Data refreshes every 5 seconds.

## Usage

- **Profiles Tab**: Lists all detected profiles with status.
- **Logs Tab**: Shows recent logs from automation runs.
- **Metrics Tab**: Displays system resource usage.

## Development

- **Tech Stack**: React 18, TypeScript, Vite, Express, Socket.io.
- **Structure**:
  - `src/components/`: React UI components.
  - `services/`: Data fetching logic.
  - `types/`: TypeScript interfaces.
  - `server.js`: Backend API server.

## Integration

- Reads from `../logs/` (audit_*.jsonl and *.log files).
- No changes to main project code—fully isolated.

## Future Enhancements

- WebSocket for live updates.
- Integration with PowerShell for real system metrics.
- Export features for reports.