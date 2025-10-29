# 📘 ixBrowser Playwright Automation Suite

## 1. Project Purpose

Advanced human-like browser automation framework that orchestrates Playwright-based web automation across multiple ixBrowser profiles in parallel. Integrates with ixBrowser API for CDP connections, implements sophisticated anti-detection measures, and extends browser pages with human simulation utilities including realistic mouse movement paths, randomized delays, and natural typing behaviors. The entire codebase is written in TypeScript, ensuring type safety and improved maintainability.

**Core Capabilities:**

- **Multi-Profile Parallelism**: Execute automation workflows across multiple browser profiles simultaneously
- **Human-Like Interactions**: Realistic mouse movements with bezier curves, variable timing delays, and viewport-adaptive positioning
- **Anti-Detection**: Stealth plugin integration with custom anti-detection scripts (webdriver override, window dimensions, Chrome runtime simulation)
- **CDP Integration**: Direct WebSocket connections to ixBrowser profiles via API v2 endpoints
- **Structured Workflows**: Configurable automation tasks with comprehensive error handling and result aggregation

**Primary Use Cases:**

- Stealth web scraping and data collection
- Social media automation (following, engagement, posting)
- E-commerce testing and monitoring
- Multi-account management across platforms

## 2. Project Architecture

**Core Components:**

- **`src/core/_launchAutomation.ts`** - Main entry point, orchestrating parallel automation runs across profiles.
- **`src/core/_automation.ts`** - Per-profile workflow execution engine, responsible for running tasks and human behavior simulation.
- **`src/core/config.ts`** - Centralized service for loading and validating application configurations (tasks, selectors, environment variables).
- **`src/core/browser-pool.ts`** - Manages a pool of browser connections, including anti-detection scripts and resource blocking.
- **`src/core/profile-manager.ts`** - Handles fetching and managing ixBrowser profiles, including lazy loading.
- **`src/core/automation-runner.ts`** - Orchestrates the execution of automation tasks for individual profiles.
- **`src/utils/humanSimulation.ts`** - Advanced mouse movement simulation with easing functions, viewport-adaptive positioning, and human hesitation patterns.
- **`src/utils/unified-logger.ts`** - Provides a consistent logging interface across the application, wrapping the `AuditLogger`.
- **`src/utils/errors.ts`** - Defines custom error classes for granular error handling and reporting.
- **`src/tasks/BaseTask.ts`** - An abstract base class for all automation tasks, providing a standardized structure for execution and progress reporting.

**Supporting Infrastructure:**

- **Launch Scripts**: `__launchAutomation.bat` (Windows batch), `_orchestrator.ps1` (PowerShell with environment checks)
- **Configuration**: `package.json` (Node.js 20+, Playwright), `config/` (tasks, selectors, logging, environment settings)
- **Logging**: Structured logging in `logs/` directory with timestamps, error classification, and execution summaries, now with real-time streaming to the monitoring dashboard.
- **Monitoring**: A separate React/TypeScript application (`monitoring/`) providing a real-time dashboard for system metrics, logs, task progress, and configuration visibility.
- **Documentation**: This `readme.md` file with comprehensive best practices and technical documentation.

**Project Structure:**

```
ixBrowser-playwright/
├── src/
│   ├── core/
│   │   ├── _launchAutomation.ts      # Main entry point and orchestrator
│   │   ├── _automation.ts            # Per-profile workflow execution engine
│   │   ├── config.ts                 # Centralized configuration service
│   │   ├── browser-pool.ts           # Manages pooled browser connections
│   │   ├── profile-manager.ts        # Handles ixBrowser profile management
│   │   └── automation-runner.ts      # Orchestrates parallel automation runs
│   ├── utils/
│   │   ├── humanSimulation.ts        # Human-like interaction utilities
│   │   ├── element-finder.ts         # Smart element detection
│   │   ├── page-enhance.ts           # Playwright Page enhancement utilities
│   │   ├── delay-getRange.ts         # Human-like delay management
│   │   ├── audit-logger.ts           # Structured audit logging
│   │   ├── retry-utils.ts            # Retry mechanisms with backoff
│   │   ├── unified-logger.ts         # Unified logging interface
│   │   ├── errors.ts                 # Custom error classes
│   │   └── ...                       # Other utilities
│   ├── tasks/
│   │   ├── BaseTask.ts               # Base class for all automation tasks
│   │   ├── taskFollowTwitter.ts      # Example: Twitter follow logic
│   │   ├── taskJoinDiscord.ts        # Example: Discord join logic
│   │   └── taskReadGmail.ts          # Example: Gmail read logic
│   └── types/
│       ├── core.ts                   # Centralized type definitions for core modules
│       └── tasks.ts                  # Centralized type definitions for tasks
├── config/
│   ├── .eslintrc.js                  # ESLint configuration
│   ├── .goosehints                   # Development hints
│   ├── logging.conf                  # Logging configuration
│   ├── tasks.json                    # Externalized task configuration
│   └── selectors.json                # Externalized element selectors
├── monitoring/                     # Real-time monitoring dashboard (React/Node.js)
├── logs/                             # Execution logs
├── __launchAutomation.bat            # Windows quick launcher script
├── _orchestrator.ps1                 # PowerShell orchestrator script
├── package.json                      # Dependencies and npm scripts
├── tsconfig.json                     # TypeScript configuration
└── readme-full.md                    # This comprehensive documentation
```

**Recent Improvements:**

- **JSDoc Documentation**: Added comprehensive JSDoc comments to all public functions
- **Retry Mechanisms**: Implemented retry logic for flaky operations (API calls, element finding)
- **Code Organization**: Reorganized into logical directories for better maintainability
- **Error Resilience**: Enhanced error handling with structured retry patterns

## 3. Human Simulation Technology

**Advanced Mouse Movement Simulation:**

- **Bezier Curve Paths**: Natural deceleration using ease-out cubic functions
- **Viewport Adaptation**: Dynamic positioning based on window size (mobile vs desktop)
- **Human Imperfection**: Randomized micro-movements and hesitation delays (50-200ms)
- **Smart Positioning**: Intelligent starting positions with minimum distance requirements (30px+)
- **Variable Timing**: Randomized step delays (20-80ms) with configurable ranges

**Current Implementation Features:**

- **Enhanced humanClick()**: Extended page object with realistic click simulation
- **Adaptive Behavior**: Different strategies for small (<800px) vs large windows
- **Error Resilience**: Graceful degradation when mouse simulation fails
- **Performance Optimized**: Efficient path calculation with boundary checking

## 4. Technical Architecture

**Core Technologies:**

- **Runtime**: Node.js 20+ with TypeScript
- **Browser Automation**: Playwright 1.41.0 with CDP (Chrome DevTools Protocol)
- **Anti-Detection**: Custom script injection for webdriver override and Chrome API simulation
- **Human Simulation**: Custom bezier curve algorithms with viewport adaptation

**Code Standards:**

- **Architecture**: Class-based with async/await patterns and comprehensive error handling
- **Naming Conventions**: PascalCase classes, camelCase functions/variables, kebab-case files
- **Documentation**: JSDoc comments for all public APIs and inline rationale comments
- **Error Handling**: Structured results with type classification and optional data payloads
- **Logging**: Timestamped console output with file persistence and level-based filtering

## 5. Automation Patterns

**Execution Flow:**

```javascript
// 1. Profile Discovery
const profiles = await ixBrowserAPI.getOpenedProfiles()

// 2. Parallel Execution with Timeouts
const results = await Promise.allSettled(profiles.map(profile =>
  Promise.race([
    runProfileAutomation(profile),
    timeoutPromise(5 minutes)
  ])
))

// 3. Result Aggregation
const summary = {
  total: results.length,
  successful: results.filter(r => r.success).length,
  successRate: ((successful/total) * 100).toFixed(1) + '%'
}
```

**Anti-Detection Strategy:**

- **Early Initialization**: `page.addInitScript()` before any user interactions
- **WebDriver Override**: Delete `navigator.webdriver` and related properties
- **Window Simulation**: Normalize `outerHeight/Width` to `innerHeight/Width`
- **Chrome API Stubbing**: Mock `window.chrome.runtime` and related APIs

**Page Enhancement Pattern:**

- Extend native Playwright Page objects with human behavior methods
- Add `humanClick()`, `humanType()`, `humanScroll()` methods
- Maintain original Playwright API compatibility

## 6. Current Implementation Status

**Implemented Features:**

- ✅ **Multi-Profile Orchestration**: Parallel execution across multiple ixBrowser profiles
- ✅ **Advanced Human Simulation**: Realistic mouse movement with bezier curves and viewport adaptation
- ✅ **Anti-Detection Suite**: Custom script injection for webdriver override and Chrome API simulation
- ✅ **CDP Integration**: WebSocket connections to ixBrowser API v2
- ✅ **Structured Logging**: Comprehensive logging with error classification and execution summaries
- ✅ **Error Resilience**: Graceful error handling with fallback mechanisms
- ✅ **Twitter Automation**: Configurable follow workflows with success tracking

**Recent Improvements:**

- ✅ **Core Architecture Refinement**:
  - Centralized Configuration Management for tasks, selectors, and environment variables.
  - Implemented a consistent logging strategy across core modules.
  - Introduced comprehensive type definitions for critical data structures.
  - Refined error handling with custom error classes for granular reporting.
  - Modularized core components (`_automation.ts`, `_launchAutomation.ts`, `automation-runner.ts`, `browser-pool.ts`, `profile-manager.ts`) for improved maintainability and testability.
- ✅ **Enhanced Monitoring Tool**:
  - **Granular Task Progress**: Real-time, step-by-step progress tracking for tasks displayed in the dashboard.
  - **Configuration Visibility**: Dashboard now displays loaded `tasks.json` and `selectors.json` configurations.
  - **Real-time Log Streaming**: Logs and task progress updates are streamed in real-time via `socket.io`, replacing polling.
- 🔧 **Fixed Dependencies**: Resolved npm package version conflicts for better compatibility
- 🔧 **Code Repairs**: Fixed missing imports and dependency issues
- ✅ **Testing Ready**: Project successfully runs and handles errors gracefully
- 📦 **Streamlined Setup**: Simplified package.json with only essential dependencies

**Current Workflow:**
The project currently implements Twitter, Discord, and Gmail automation workflows, which are defined in `config/tasks.json`.

## 7. Development Guidelines

**Best Practices:**

- **Human Simulation**: Always use `humanClick()` instead of `page.click()` for realistic interactions
- **Error Classification**: Return structured results with `success`, `type`, `data`, and `error` fields
- **Viewport Awareness**: Implement different behaviors for mobile vs desktop viewports
- **Timeout Management**: Use Promise.race() for per-profile timeouts (default: 5 minutes)
- **Logging Standards**: Include profile names, timestamps, and execution context in all logs

**Extensibility:**

- **New Utilities**: Add `function-newUtils.ts` files for new human simulation methods
- **Workflow Customization**: Modify `config/tasks.json` to implement different automation tasks. New task types can be added by creating a new file in `src/tasks` that exports a `type` and a `run` function.
- **Platform Support**: Framework supports any website that can be automated with Playwright

## 8. Operational Notes

**API Integration:**

- **ixBrowser API v2**: Uses `/api/v2/profile-opened-list`, `/api/v2/profile-list`, and `/api/v2/profile-open` endpoints.
- **Authentication**: Bearer token via `IXBROWSER_API_KEY` environment variable.
- **Local Development**: API server runs on `http://127.0.0.1:53200` by default.

**Performance Considerations:**

- **Parallelism Limits**: Framework handles multiple profiles efficiently; monitor memory usage for >10 profiles
- **Timing Optimization**: Human delays (20-80ms steps, 50-200ms hesitation) balance realism vs speed
- **Resource Management**: Automatic browser cleanup on errors and completion

**Security & Compliance:**

- **Environment Variables**: Store API keys and sensitive data in environment variables
- **Local API**: Designed for local ixBrowser installations (not cloud APIs)
- **Anti-Detection**: Includes state-of-the-art bot evasion techniques for research purposes

## 9. Comprehensive Tutorial

### Step-by-Step Setup Guide

1. **Install Prerequisites**:
   - Download and install Node.js 20+ from [nodejs.org](https://nodejs.org/).
   - Install ixBrowser locally and ensure it's running on `http://127.0.0.1:53200`.
   - Set the `IXBROWSER_API_KEY` environment variable with your API key (e.g., in Windows: `set IXBROWSER_API_KEY=your-key`).

2. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url>  # If applicable
   cd ixbrowser-playwright
   npm install

   # Install dependencies for the monitoring dashboard
   cd monitoring
   npm install
   cd ..
   ```

3. **Verify Installation**:
   ```bash
   node --version  # Should output v20.x.x or higher
   npm list playwright  # Should show 1.41.0
   npm run lint  # Should pass without errors
   ```

4. **Configure ixBrowser**:
   - Open ixBrowser and create/launch at least one profile.
   - Ensure the API is accessible (test with `curl -X POST http://127.0.0.1:53200/api/v2/profile-opened-list`).

5. **Run Automation & Monitoring**:
   ```bash
   # In your main project directory, start the automation
   npm start

   # In a separate terminal, navigate to the monitoring directory and start the monitoring server
   cd monitoring
   npm start
   ```

   **What Happens**:
   - The main automation process connects to ixBrowser API, discovers open profiles, and runs configured tasks (e.g., Twitter follow, Discord join, Gmail read) in parallel.
   - The monitoring dashboard (usually at `http://localhost:3000` or `http://localhost:3001`) will display real-time system metrics, logs, granular task progress, and configuration details.
   - Logs are streamed in real-time, providing instant updates on automation activities.

6. **Customize Tasks**:
   - Edit `config/tasks.json` to define your automation workflow. Each task should specify its `type`, `handle` (if applicable), `options`, and optionally `stopOnFailure`.
   - Add new tasks in `src/tasks/` (e.g., `taskScrape.ts`). The task file must export a `type` and a `run` function, extending `BaseTask`.

7. **Advanced Usage**:
   - **Resource Pooling**: The system now pools browser connections for efficiency (up to 10 by default).
   - **Lazy Loading**: Profiles are loaded on-demand to handle large sets (>10 profiles).
   - **Memory Monitoring**: PowerShell script warns if RAM >85% and suggests concurrency limits.

### Troubleshooting Guides

#### Common Issues and Solutions

1. **API Connection Errors**:
   - **Symptom**: "API request failed" or "Connection failed for profileId".
   - **Cause**: ixBrowser not running, wrong API key, or network issues.
   - **Fix**:
     - Verify ixBrowser is open and API accessible: `curl -X POST http://127.0.0.1:53200/api/v2/profile-opened-list`.
     - Check `IXBROWSER_API_KEY` environment variable.
     - Restart ixBrowser and ensure port 53200 is free.
   - **Prevention**: Use `.env` file for config (future enhancement).

2. **No Profiles Found**:
   - **Symptom**: "No profiles found" with 0% success rate.
   - **Cause**: No profiles open in ixBrowser.
   - **Fix**: Open profiles in ixBrowser before running automation.
   - **Tip**: Use lazy loading for better performance with many profiles.

3. **Timeout Errors**:
   - **Symptom**: "Profile automation timed out after 300000ms".
   - **Cause**: Task taking too long (e.g., slow page loads).
   - **Fix**: Increase timeout in code or optimize tasks (e.g., reduce delays).
   - **Prevention**: Monitor with PowerShell for high CPU/RAM.

4. **Memory/Performance Issues**:
   - **Symptom**: High RAM usage (>85%) or slow execution.
   - **Cause**: Too many concurrent profiles or resource leaks.
   - **Fix**:
     - Reduce `MaxConcurrent` in PowerShell (default: 4).
     - Use resource pooling (enabled by default).
     - Monitor with `Get-ResourceSnapshot` in PowerShell.
   - **Tip**: For >10 profiles, enable lazy loading and check suggestions in logs.

5. **Element Not Found Errors**:
   - **Symptom**: "Element not found using selectors".
   - **Cause**: Page structure changed or selectors outdated.
   - **Fix**: Update selectors in `config/selectors.json` or use `findElementSmart` with fallbacks.
   - **Prevention**: Add retry logic and audit logs for debugging.

6. **Linting Errors**:
   - **Symptom**: ESLint fails on run.
   - **Fix**: Run `npm run lint:fix` to auto-fix, or manually correct (e.g., indentation).
   - **Tip**: Run lint before committing.

7. **Windows-Specific Issues**:
   - **Symptom**: Batch file not running.
   - **Fix**: Ensure Node.js in PATH; run as Administrator if permission errors.
   - **Alternative**: Use PowerShell for better monitoring.

#### Debugging Tips

- **Logs**: Check `logs/` for detailed output (e.g., `audit_*.jsonl` for steps).
- **Verbose Mode**: Add `console.log` in code for custom debugging.
- **Resource Checks**: Use PowerShell's `Test-SystemHealth` function.
- **Profile Inspection**: Manually open profiles in ixBrowser to verify.
- **Error Types**: Custom errors (e.g., `ProfileConnectionError`) provide clues—check `src/utils/errors.ts`.

#### Performance Tips

- **For Large Profiles**: Use lazy loading and pooling to handle >10 efficiently.
- **Concurrency**: Start with 4 profiles; scale based on RAM (aim for <80% usage).
- **Optimization**: Reduce human delays in `humanSimulation.ts` for speed (but may increase detection risk).
- **Monitoring**: Enable reports in PowerShell for metrics.

**Future Enhancements:**

- **Test Coverage**: Unit tests for utilities, integration tests for workflows.
- **Enhanced Profile Management in UI**: Add interactive elements to the `ProfileDashboard` (e.g., start/stop automation for a specific profile, view detailed history).
- **Persistent State and History**: Implement a simple database to store historical audit logs and metrics for long-term analysis.
- **Configurable Resource Blocking**: Add a UI element in the monitoring dashboard to allow users to select which resource types to block.
- **Alerting and Notifications**: Implement a basic alerting system for critical events or metrics thresholds.