# AGENTS.md - ixBrowser Playwright Automation

**REMINDER: Log all modifications to patchnotes.md with timestamp (simplify the context of modification)**

## Build/Lint/Test Commands

- **Start**: `npm start` (runs main automation)
- **Install deps**: `npm run install-deps` (installs Playwright extras)
- **Windows launch**: `__launchAutomation.bat` (with automatic logging)
- **Advanced orchestration**: `_orchestrator.ps1` (PowerShell with resource monitoring)
- **Test**: No individual tests; run full automation with `node _launchAutomation.js`
- **Lint**: `npm run lint` (ESLint with standard config)
- **Lint fix**: `npm run lint:fix` (auto-fix ESLint issues)
- **Typecheck**: `npm run typecheck` (no TypeScript files)

## Code Style Guidelines

### Architecture Patterns

- **Page Enhancement**: Extend Playwright Page objects with human methods
- **Shared Utilities**: DRY principle with reusable modules
- **Structured Results**: `{ success, error, data, type }` pattern
- **Profile-Based Execution**: Parallel processing across ixBrowser profiles
- **Anti-Detection**: Webdriver override, window dimension normalization
- **Human Simulation**: Bezier curve mouse movements, viewport-adaptive positioning

### Imports & Modules

- Use CommonJS: `const { func } = require('./module')`
- Export: `module.exports = { functionName }`
- One export per utility file

### Naming Conventions

- **Files**: `category-action.js` (e.g., `delay-getRange.js`, `element-finder.js`)
- **Functions**: camelCase (e.g., `getDelayRange`, `findElementSmart`)
- **Classes**: PascalCase (e.g., `IxBrowserAutomation`)
- **Variables**: camelCase
- **Constants**: UPPER_CASE (e.g., `DEFAULT_OPTIONS`, `DEFAULT_CONFIG`)

### Formatting & Documentation

- 2-space indentation
- JSDoc comments: `@param {Type} name - description`, `@returns {Type}`
- Async/await preferred over promises
- Comprehensive inline comments for complex logic
- TypeScript-style JSDoc for Playwright types: `@param {import('playwright').Page} page`

### Error Handling & Best Practices

- Structured error returns: `{ success: boolean, error?: string, data?: object, type: string }`
- Try-catch with specific error types and fallback mechanisms
- Use human simulation methods (`humanClick`, `humanScroll`) over native Playwright
- Include profile context in logging with prefixed loggers
- Implement viewport-aware behaviors (mobile vs desktop)
- Graceful degradation for non-critical operations
- Promise.race for per-profile timeouts (default: 5 minutes)

### Development Workflow

- **Environment Variables**: `IXBROWSER_API_KEY` for API authentication
- **Logging**: Structured logging with timestamps, error classification, file persistence
- **Configuration**: `config/logging.conf`, `.goosehints` for context
- **Resource Monitoring**: PowerShell orchestrator tracks memory/CPU usage
- **Execution Patterns**: Profile discovery → parallel execution → result aggregation

### Task Implementation

- **Twitter Automation**: `taskFollowTwitter.js`, `taskActivityTwitter.js`
- **Human Interactions**: Realistic delays, mouse movements, typing patterns
- **Element Finding**: Smart selector fallbacks with `findElementSmart`
- **Success Metrics**: Task completion rates, profile execution statistics

### File Organization

- **Core**: `_launchAutomation.js` (orchestrator), `_automation.js` (workflows)
- **Utilities**: `humanSimulation.js`, `element-finder.js`, `delay-getRange.js`
- **Enhancements**: `page-enhance.js`, `viewport-scrollIntoView.js`
- **Tasks**: `task*.js` files for specific automation workflows
- **Scripts**: Batch/PowerShell launchers with logging and monitoring
