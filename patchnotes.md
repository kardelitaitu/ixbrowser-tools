# Patch Notes

## Version 1.1.1 (2025-10-29)
- **Codebase Refactoring & Modularization:**
  - **Refactored Core Architecture:** Broke down the large `_launchAutomation.ts` file (~520 lines) into three focused, single-responsibility modules:
    - `browser-pool.ts`: Manages browser connection pooling, anti-detection scripts, and resource blocking
    - `profile-manager.ts`: Handles fetching and managing ixBrowser profiles with lazy loading
    - `automation-runner.ts`: Orchestrates automation task execution and parallel processing
  - **Improved Maintainability:** Reduced main orchestrator file to ~120 lines while preserving all functionality
  - **Enhanced Testability:** Smaller, focused modules are easier to unit test and maintain
  - **Better Separation of Concerns:** Each module has a clear, single responsibility
- **Security Verification:** Confirmed proper environment variable usage for API keys with .env file exclusion from version control

## Version 1.1.0 (2025-10-29)
- **Migrated to TypeScript:**
  - The entire codebase has been migrated to TypeScript, improving code quality, maintainability, and developer experience.
  - All JavaScript files in `src/utils`, `src/tasks`, and `src/core` have been converted to TypeScript.
  - The project now compiles without any errors and with `allowJs` set to `false`.

## Version 1.0.27 (2025-10-29)
- **Codebase Refinements & Modularization:**
  - **Abstracted Task Runner:** Refactored the core automation logic to use a dynamic task registry, eliminating the `switch` statement and making it easier to add new tasks.
  - **Dedicated API Client:** Created a dedicated `IxBrowserClient` class to encapsulate all interactions with the ixBrowser API, improving modularity and maintainability.
  - **Externalized Selectors:** Moved all CSS selectors from task files into a centralized `config/selectors.json` file, making them easier to update.
- **Configuration & Validation:**
  - **Centralized Configuration:** Integrated `dotenv` for managing environment variables from a `.env` file, improving configuration management.
  - **Configuration Validation:** Added `zod` schema validation for `config/tasks.json` to prevent runtime errors from invalid configurations.
- **Error Handling & Debugging:**
  - **Enhanced Error Context:** The `ElementNotFoundError` now includes the URL where the error occurred, providing more context for debugging.
- **Code Quality:**
  - Fixed all linting errors to improve code quality and consistency.

## Version 1.0.26 (2025-10-29)
- **API Integration Fixes:**
  - Updated the base URL for the ixBrowser API to `http://127.0.0.1:53200`.
  - Refactored API calls to use `POST` requests as required by the new documentation.
  - Updated endpoints for fetching opened profiles (`/api/v2/profile-opened-list` and `/api/v2/profile-list`) and connecting to a profile (`/api/v2/profile-open`).
  - Improved response handling to align with the new API's error and data structure.

## Version 1.0.25 (2025-10-29)
- **Documentation Updates:**
  - Updated `GEMINI.md` and `readme.md` to provide a more comprehensive overview of the project, including the new monitoring tool, externalized task configuration, and other recent enhancements.
  - Added instructions for installing and running the monitoring tool.

## Version 1.0.24 (2025-10-28)
- **Human Simulation Enhancements:**
  - Improved mouse movement with Bezier curves, dynamic starting points, micro-jitters, and optional overshooting for more natural paths.
  - Added post-click delays to `humanClick` for more realistic interaction timing.
  - Enhanced scrolling (`humanScroll`) to simulate multiple smaller scroll events with variable delays.
- **Codebase Optimization & Modularity:**
  - Optimized browser pool usage by ensuring browser instances are reused and only pages are closed after each automation run.
  - Removed fixed `waitForTimeout` calls from core automation logic, relying on dynamic delays within tasks.
  - Externalized task configuration into `config/tasks.json` for easier modification and expansion of tasks.
  - Implemented a dynamic task runner in `_automation.js` to execute tasks based on configuration.
  - Added `stopOnTaskFailure` option to task configuration for controlled error recovery.
- **Utility Improvements:**
  - Consolidated `humanScroll` logic by removing `scroll-human.js` and updating `page-enhance.js` to use the enhanced `humanScroll` from `humanSimulation.js`.
  - Enhanced `type-human.js` with typo simulation and variable key press/release delays for more natural typing.
  - Made error handling in `viewport-scrollIntoView.js` configurable with a `throwOnError` option.
  - Added random jitter to `retryWithBackoff` in `retry-utils.js` to make retry delays less predictable.

## Version 1.0.23 (2025-10-21)
- Fixed admin launcher for node path: Updated start-admin.bat to dynamically find the full path to node.exe using 'where node' and use -Wait to keep the admin window open; ensures server starts correctly as admin.

## Version 1.0.22 (2025-10-21)
- Improved admin launcher: Updated start-admin.bat to use cmd /k for proper directory handling and -Wait to keep the admin window open; ensures server runs in correct directory.

## Version 1.0.21 (2025-10-21)
- Fixed admin launcher: Updated start-admin.bat to use -Wait in Start-Process to keep the admin window open and prevent premature exit; added pause for diagnosis.

## Version 1.0.20 (2025-10-21)
- Added process exit logging: Implemented logging for process exit events (exit, SIGINT, SIGTERM) to diagnose why the server is force closing when run as administrator.

## Version 1.0.19 (2025-10-21)
- Enhanced server stability: Added uncaught exception and unhandled rejection handlers to prevent force close; increased logging in updateMetrics for better debugging.

## Version 1.0.18 (2025-10-21)
- Fixed admin launcher: Updated start-admin.bat to use PowerShell Start-Process with -Wait to prevent force close and keep console open for monitoring.

## Version 1.0.17 (2025-10-21)
- Added admin launcher: Created start-admin.bat to run monitoring server with administrator privileges for system restore point access; includes pause for error diagnosis.

## Version 1.0.16 (2025-10-21)
- Enhanced restore point debugging: Added detailed logging for stdout and stderr in PowerShell command to diagnose why no restore points are detected; updated fallback messages for clarity.

## Version 1.0.15 (2025-10-21)
- Improved restore point detection: Enhanced PowerShell command with better error handling and raw output logging for debugging; added fallback for cases with no restore points.

## Version 1.0.14 (2025-10-21)
- Optimized redundancy reminder: Last system restore checkpoint now loads only once at server startup (not every 5s) and includes timestamp for better context.

## Version 1.0.13 (2025-10-21)
- Added redundancy reminder: Displays last system restore checkpoint created as text above "Last updated" in system metrics for backup awareness.

## Version 1.0.12 (2025-10-21)
- Enhanced metric precision: Updated CPU usage and storage usage to display 1 decimal place (e.g., 15.1%) for better accuracy.

## Version 1.0.11 (2025-10-21)
- Simplified system metrics UI: Reduced to 4 boxes (CPU %, Memory % with GB, Storage % with GB, Download Mbps); removed unnecessary boxes and % for download speed; updated types and server to include storage used/total.

## Version 1.0.10 (2025-10-21)
- Fixed CPU usage monitoring: Corrected to use si.currentLoad().currentLoad for accurate real-time CPU % (previously returning 0); all metrics now update every 5 seconds via polling and Socket.io.

## Version 1.0.9 (2025-10-21)
- Implemented real-time system monitoring: Added 5-second polling for accurate CPU usage % (and other metrics) via server-side intervals and Socket.io emissions; updated client to receive and display live data.

## Version 1.0.8 (2025-10-21)
- Enhanced system monitoring tools: Integrated systeminformation for real-time CPU usage %, RAM usage %, storage usage for drive C: %, and internet download speed Mbps; updated UI to display new metrics with dynamic progress bars.

## Version 1.0.7 (2025-10-21)
- Implemented modern Tailwind CSS styling in monitoring tool: Updated all components with responsive design, gradients, animations, and improved UX; integrated Tailwind config and PostCSS for production build.

## Version 1.0.6 (2025-10-21)
- Modernized monitoring tool: Enhanced App.tsx with useCallback, useMemo, error boundaries, dark mode, search/filter, Socket.io real-time updates, and improved UI styling for better UX.

## Version 1.0.5 (2025-10-21)
- Added non-intrusive monitoring tool in monitoring/ folder: React/TypeScript localhost dashboard for real-time ixBrowser process monitoring, reading from logs/ without modifying core code.
- Work-in-progress Monitoring Tool

## Version 1.0.4 (2025-10-21)
- Performance optimizations: Implemented resource pooling for browser contexts, lazy loading for large profiles, and enhanced memory monitoring in PowerShell orchestrator for efficient handling of >10 profiles.
- Documentation & onboarding: Expanded readme-full.md with comprehensive tutorial including step-by-step setup, customization examples, advanced usage, and detailed troubleshooting guides for common issues.

## Version 1.0.3 (2025-10-21)
- Enhanced error handling: Introduced custom error classes (ProfileConnectionError, AutomationTimeoutError, NetworkError, ElementNotFoundError, TaskError, VerificationError) for specific failures and improved retry strategies with exponential backoff tailored to error types.

## Version 1.0.2 (2025-10-21)
- Updated all dependencies to latest compatible versions, fixed eslint-plugin-promise version conflict, bumped version to 1.0.2, regenerated package-lock.json, and verified with lint/typecheck.

## Version 1.0.1 (2025-10-21)
- Updated version to 1.0.1 for codebase maintenance.