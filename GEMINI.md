# Project Overview

This project is a Node.js-based automation tool that uses Playwright and TypeScript to control multiple ixBrowser profiles in parallel. It's designed to simulate human-like browser interactions to perform tasks like social media engagement without being detected. The project is built for stealth automation and integrates with ixBrowser's API for profile management. A key feature is the non-intrusive, real-time monitoring dashboard that provides insights into automation performance and system health without altering core logic.

## Key Technologies

*   **Node.js:** The runtime environment for the project.
*   **TypeScript:** The programming language used for the project.
*   **Playwright:** Used for browser automation.
*   **ixBrowser:** The browser that is being automated.
*   **React & TypeScript:** For the real-time monitoring dashboard.
*   **Socket.io:** For real-time communication between the server and the monitoring UI.
*   **Tailwind CSS:** For modern UI styling in the monitoring dashboard.

## Architecture

The project is structured into four main parts:

*   **Core:** Contains the main orchestration scripts that manage profiles, the API, and execution.
*   **Utils:** Reusable helper functions for tasks like human simulation, element finding, and logging.
*   **Tasks:** Specific automation tasks, such as following a Twitter user.
*   **Monitoring:** A separate React-based application that provides a real-time dashboard for monitoring automation tasks and system metrics.

# Building and Running

## Prerequisites

*   Node.js (version 20+)
*   ixBrowser

## Installation

1.  Clone the repository.
2.  Install the dependencies for the main application:
    ```bash
    npm install
    ```
3.  Install the dependencies for the monitoring tool:
    ```bash
    cd monitoring
    npm install
    ```

## Running the Project

To run the automation, use the following command from the root directory:

```bash
npm start
```

This will execute the `dist/core/_launchAutomation.js` script, which is the main entry point of the application.

## Running the Monitoring Tool

To run the monitoring dashboard, use the following command from the `monitoring` directory:

```bash
npm start
```

This will start the monitoring server and open the dashboard in your browser.

## Testing

The project does not currently have a formal test suite.

# Development Conventions

## Linting

The project uses ESLint for code linting. To run the linter, use the following command:

```bash
npm run lint
```

To automatically fix linting errors, use the following command:

```bash
npm run lint:fix
```

## Code Style

The project follows the `standard` code style.

## Contribution Guidelines

The `readme.md` file contains a detailed "Tutorial for Collaborators" section that outlines the development process, including how to customize tasks, debugging tips, and best practices.

# Optimization Suggestions and Implemented Changes

This section outlines the optimization suggestions identified and the changes implemented to improve the codebase.

## Implemented Changes

1.  **TypeScript Migration:**
    *   **Change:** The entire codebase has been migrated to TypeScript, improving code quality, maintainability, and developer experience.
    *   **Benefit:** All JavaScript files in `src/utils`, `src/tasks`, and `src/core` have been converted to TypeScript. The project now compiles without any errors and with `allowJs` set to `false`.

2.  **API Integration Fixes:**
    *   **Change:** Updated the base URL for the ixBrowser API to `http://127.0.0.1:53200`. Refactored API calls to use `POST` requests and updated endpoints for fetching and connecting to profiles to align with the new API documentation.
    *   **Benefit:** Ensures compatibility with the latest version of the ixBrowser API, improving reliability and stability.

2.  **Human Simulation Enhancements:**
    *   **Change:** Improved mouse movement with Bezier curves, dynamic starting points, micro-jitters, and optional overshooting for more natural paths. Added post-click delays to `humanClick` for more realistic interaction timing. Enhanced scrolling (`humanScroll`) to simulate multiple smaller scroll events with variable delays.
    *   **Benefit:** Creates more realistic human-like interactions, reducing the risk of detection by anti-bot systems.

3.  **Optimized Browser Pool Usage (`src/core/_launchAutomation.js`):**
    *   **Change:** Removed `await browser.close()` from the `finally` block in `runProfileAutomation` and replaced it with `await page.close()`. The `cleanupPool` function is now solely responsible for closing browser instances when they are no longer needed, allowing the `browserPool` to effectively reuse connections.
    *   **Benefit:** Improves performance by reducing the overhead of establishing new browser connections for each profile automation run. Enhances resource management and stability.

4.  **Externalized Task Configuration (`config/tasks.json` & `src/core/_automation.js`):**
    *   **Change:** Created a new configuration file `config/tasks.json` to define automation tasks (e.g., Twitter handles, options). The `src/core/_automation.js` file now reads this configuration.
    *   **Benefit:** Allows for easier modification and expansion of tasks without changing core code, improves separation of concerns, and aligns with the project roadmap for configuration management.

5.  **Dynamic Task Runner (`src/core/_automation.js`):**
    *   **Change:** Refactored the `run` function in `src/core/_automation.js` to iterate over the tasks defined in `config/tasks.json` and dynamically execute them based on their `type` property. The hardcoded Twitter follow logic has been replaced with a generic loop and a `switch` statement to dispatch to the appropriate task handler.
    *   **Benefit:** Simplifies adding new task types, makes the automation workflow more scalable and less coupled to specific tasks.

6.  **Enhanced Error Handling (Stop on Task Failure) (`src/core/_automation.js`):**
    *   **Change:** Introduced a `stopOnTaskFailure` option within the task configuration. If set to `true` for a task and that task fails, the automation for the current profile will stop immediately.
    *   **Benefit:** Provides more controlled error recovery, preventing cascading failures and allowing for different error handling strategies based on task criticality.

7.  **Non-intrusive Monitoring Tool (`monitoring/`):**
    *   **Change:** Added a separate React/TypeScript application for real-time monitoring of ixBrowser processes and system metrics. It reads from logs and provides a dashboard with features like dark mode, search/filter, and real-time updates via Socket.io.
    *   **Benefit:** Allows for real-time visibility into the automation process without modifying the core automation code, improving debugging and operational oversight.

## Further Optimization Suggestions

1.  **Selector Robustness and Maintainability (`src/tasks/taskFollowTwitter.ts` and other tasks):**
    *   **Suggestion:** Prioritize more stable HTML attributes for selectors (e.g., `id`, more generic `aria-label` values if consistently applied). Consider externalizing selectors into a dedicated configuration file or a utility that can be easily updated.
    *   **Reasoning:** Twitter's UI can change frequently, breaking hardcoded selectors. This optimization increases resilience to UI changes, reduces maintenance overhead, and leads to more reliable automation.

2.  **Contextual and Configurable Delay Ranges (`src/core/_automation.ts`, `src/utils/delay-getRange.ts`):**
    *   **Suggestion:** Introduce more dynamic delays based on the perceived complexity of the action or the state of the page. Allow the `min` and `max` values for `short`, `medium`, `long` delays to be configurable, perhaps via environment variables or a configuration file.
    *   **Reasoning:** More realistic human simulation and potential performance gains by reducing unnecessary waits. Provides greater flexibility in tuning human-like behavior.

3.  **Structured Error Objects (Across the codebase):**
    *   **Suggestion:** Implement a more structured error object that includes context such as the step where the error occurred, the selector that failed (if applicable), and potentially a screenshot path. This would involve modifying how errors are thrown and caught across multiple files.
    *   **Reasoning:** Provides more actionable debugging information, allowing for faster identification and resolution of issues.

4.  **Comprehensive Testing Suite:**
    *   **Suggestion:** Develop a comprehensive testing suite including unit tests for utilities, and integration tests for workflows and individual tasks.
    *   **Reasoning:** Ensures code quality, catches regressions, and validates the correctness of automation logic.

5.  **Configuration Management for API Key and Base URL:**
    *   **Suggestion:** Use a dedicated configuration library (e.g., `dotenv`) for managing all environment-specific variables, including `IXBROWSER_API_KEY` and `baseUrl`.
    *   **Reasoning:** Centralizes configuration, makes it easier to manage different environments (development, production), and improves security by keeping sensitive information out of the codebase.