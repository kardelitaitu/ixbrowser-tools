# 🤖 ixBrowser Playwright Automation
This is more than a simple tool; it is a scalable automation architecture. The design is modular, separating the core orchestration logic from the specific browser-driver implementation. This allows for a future-proof system that can adapt to new browser technologies.
While the initial implementation targets ixBrowser, the framework is explicitly designed to be browser-agnostic.
<div align="center">
  <img src="https://cdn-icons-png.freepik.com/256/8999/8999462.png" alt="A friendly robot assistant" width="250"/>
</div>

## 🗺️ Part 1: The Grand Tour (Scope & Structure)
### Overview
Welcome to the project! This is a Node.js-based automation tool, supercharged with Playwright and TypeScript, designed to control lots of ixBrowser profiles at the same time.
Our secret sauce? We simulate human-like browser interactions (think natural mouse movements, random delays, and even realistic typing - typos included! 🤫) to perform tasks without being detected. It's built for 🕵️ stealth automation, integrates directly with the ixBrowser API, and now features an enhanced real-time monitoring dashboard with live log streaming, granular task progress, and configuration visibility, so you can watch your agents work and understand their every move.

Future support is planned for:
CDP Endpoints: Any browser (Chrome, Edge, etc.) or application that exposes a standard Chrome DevTools Protocol (CDP) WebSocket.
Proprietary APIs: Other multi-profile browsers that provide their own REST or local APIs for profile management and automation.
This architecture ensures that your automation workflows remain durable, portable, and independent of any single browser vendor.

### 🎯 Our Goals

* 🤖 Automate those repetitive web tasks across all your accounts.
* 😀 Mimic human behavior to fly under the radar.
* 🧩 Provide a modular framework so you can easily add new tasks.
* ⚡ Support running many tasks at once for maximum efficiency.
* 📺 Offer a "mission control" dashboard to see what's happening live.

### ✨ Key Features

* **Parallel Execution**: Run tasks on tons of profiles simultaneously.
* **Human Simulation**: We're talking advanced mouse movements, variable delays, natural typing, and scrolling. It's basically a little "ghost in the machine."
* **Anti-Detection**: We automatically clear out "webdriver" traces and make the browser look normal.
* **Modular Tasks**: All tasks are neatly defined in `config/tasks.json`, and selectors in `config/selectors.json`. Want to add a new task? Just create a new file, extending `BaseTask`, and you're good to go!
* **Smart Error Handling**: We have custom error types and retry logic to keep things running smoothly.
* **Live Dashboard**: A separate React/TypeScript app to watch your logs, system metrics, granular task progress, and configuration in real-time, with live streaming updates.
* **Resource-Friendly**: We're smart about reusing browser instances to save your PC's memory.

### 🌳 Project Structure

Here's a map of the workshop:
```
ixbrowser-tools/
├── src/                            # Source code for the automation suite
│   ├── core/                       # Core orchestration and configuration modules
│   │   ├── _launchAutomation.ts    # Main entry point; orchestrates parallel runs
│   │   ├── _automation.ts          # Per-profile workflow execution engine
│   │   ├── config.ts               # Centralized configuration service
│   │   ├── browser-pool.ts         # Manages pooled browser connections
│   │   ├── profile-manager.ts      # Handles ixBrowser profile management
│   │   └── automation-runner.ts    # Orchestrates individual profile automation
│   ├── utils/                      # Reusable helper functions and utilities
│   │   ├── humanSimulation.ts      # Human-like interaction utilities
│   │   ├── element-finder.ts       # Smart element detection
│   │   ├── unified-logger.ts       # Consistent logging interface
│   │   ├── errors.ts               # Custom error classes
│   │   └── ...                     # Other utilities (delay, page enhancement, retry)
│   ├── tasks/                      # Specific automation tasks and base class
│   │   ├── BaseTask.ts             # Abstract base class for all tasks
│   │   ├── taskFollowTwitter.ts    # Example: Twitter follow logic
│   │   ├── taskJoinDiscord.ts      # Example: Discord join logic
│   │   └── taskReadGmail.ts        # Example: Gmail read logic
│   └── types/                      # Centralized TypeScript type definitions
│       ├── core.ts                 # Types for core modules
│       └── tasks.ts                # Types for automation tasks
├── config/                         # Application configuration files
│   ├── tasks.json                  # Externalized task configuration
│   └── selectors.json              # Externalized element selectors
├── monitoring/                     # Real-time monitoring dashboard (React/Node.js)
├── logs/                           # Runtime logs and outputs (audit_*.jsonl, *.log)
├── __launchAutomation.bat          # Windows quick launcher script
├── package.json                    # Dependencies and npm scripts
├── tsconfig.json                   # TypeScript configuration
└── readme.md                       # This file
```
## 🚀 Part 2: Let's Get You Started! (Tutorial)

### Step 1: Get Your Toolkit Ready 🛠️

1.  **Node.js**: You'll need `v20` or newer. Grab it from [nodejs.org](https://nodejs.org/).
2.  **ixBrowser**: Get it set up and running on your machine.
3.  **API Key**: Find your ixBrowser API key and set it as an environment variable named `IXBROWSER_API_KEY`.
4.  **Clone & Install**: Time to grab the code!
    ```bash
    # Clone the project
    git clone <repo-url>
    cd ixbrowser-tools

    # Install the main automation dependencies
    npm install

    # Install the monitoring dashboard dependencies
    cd monitoring
    npm install
    cd ..
    ```

### Step 2: Start the Engines! 🤖

Ready to run? You'll need two terminals for the full experience:

**Terminal 1: Start the Automation**
From the main project folder:
* `npm start`
Or, if you're on Windows, just double-click `__launchAutomation.bat`!

**Terminal 2: Open the Dashboard**
Navigate into the `monitoring/` folder:
* `npm start`
This will open the dashboard in your browser (usually at `http://localhost:3000` or `http://localhost:3001`)!

### Step 3: Open the Dashboard 📊

Want to watch your bots in real-time? Open a *second* terminal:

* Navigate into the `monitoring/` folder.
* Run `npm start` from there.
* This will open the dashboard in your browser!

### Step 4: Become the Puppet Master 💡

This is the fun part. You get to decide what your bots do!

* **Define Tasks**: Open up `config/tasks.json`. This is your mission control. You can also inspect `config/selectors.json` for the element selectors used by tasks.
* **Example `config/tasks.json`**:
    ```json
    [
      {
        "type": "twitterFollow",
        "handle": "@yourhandle",
        "options": {
          "likeFirstTweet": true
        },
        "stopOnFailure": false
      }
    ]
    ```
* **Add New Task Types**:
    1.  Create a new file in `src/tasks/` (e.g., `taskDoSomethingCool.ts`).
    2.  Inside, extend the `BaseTask` class and implement its abstract methods.
    3.  Export the `type` (string) and a `run` (async function) that acts as a factory for your new task.
    4.  That's it! The system automatically finds and registers it.

### Step 5: Pro-Tips for Happy Coding 🧠

* **Keep it Clean**: Run `npm run lint` before you commit. Run `npm run lint:fix` to automatically clean up.
* **Debugging**: The live monitoring tool is your best friend! You can also use `console.log` or our built-in `auditLogger` for more detailed logs.

---

## 🛠️ Requirements

* Windows 10+ / Linux
* PowerShell 5.1+
* Node.js (v20+)

---

## 👋 Let's Collaborate!

Got an idea? A new module? A clever trick? Pull requests are warmly welcomed! This is a community workshop, so feel free to jump in.

📬 **Telegram**: [@adikara55](https://t.me/adikara55)

---

## 📄 License

MIT License. Go for it. Build amazing things.
