# 🤖 ixBrowser Playwright Automation

<div align="center">
  <img src="https://cdn-icons-png.freepik.com/256/8999/8999462.png" alt="A friendly robot assistant" width="250"/>
</div>

<h2 align="center">🧰 A Cozy Toolkit for Browser Automation 🧰</h2>

<div align="center" style="border: 1px solid #ccc; padding: 10px; border-radius: 8px; background-color: #f9f9f9;">
  👋 <b>Welcome!</b> This project is our little workshop for automating IX Browser. We're actively tinkering and making it better every day. Grab a coffee and make yourself at home!
</div>

## 🗺️ Part 1: The Grand Tour (Scope & Structure)

### Overview

Welcome to the project! This is a Node.js-based automation tool, supercharged with **Playwright** and **TypeScript**, designed to control lots of ixBrowser profiles at the same time.

Our secret sauce? We simulate **human-like browser interactions** (think natural mouse movements, random delays, and even realistic typing - typos included! 🤫) to perform tasks without being detected. It's built for 🕵️ **stealth automation**, integrates directly with the ixBrowser API, and even has its own **real-time monitoring dashboard** so you can watch your agents work.

### 🎯 Our Goals

* 🤖 Automate those repetitive web tasks across all your accounts.
* 🥸 Mimic human behavior to fly under the radar.
* 🧩 Provide a modular framework so you can easily add new tasks.
* ⚡ Support running many tasks at once for maximum efficiency.
* 📺 Offer a "mission control" dashboard to see what's happening live.

### ✨ Key Features

* **Parallel Execution**: Run tasks on tons of profiles simultaneously.
* **Human Simulation**: We're talking advanced mouse movements, variable delays, natural typing, and scrolling. It's basically a little "ghost in the machine."
* **Anti-Detection**: We automatically clear out "webdriver" traces and make the browser look normal.
* **Modular Tasks**: All tasks are neatly defined in `config/tasks.json`. Want to add a new task? Just create a new file, and you're good to go!
* **Smart Error Handling**: We have custom error types and retry logic to keep things running smoothly.
* **Live Dashboard**: A separate React/TypeScript app to watch your logs and system metrics in real-time.
* **Resource-Friendly**: We're smart about reusing browser instances to save your PC's memory.

### 🌳 Project Structure

Here's a map of the workshop:
```
ixbrowser-playwright/
├── src/
│   ├── core/                    # Main orchestration scripts
│   │   ├── _launchAutomation.ts # Entry point: manages profiles, API, execution
│   │   └── _automation.ts       # Workflow engine: defines tasks per profile
│   ├── utils/                   # Reusable helper functions
│   │   ├── humanSimulation.ts   # Mouse/keyboard simulation
│   │   ├── element-finder.ts    # Smart element detection
│   │   └── ...                  # Other utilities
│   └── tasks/                   # Specific automation tasks
│       └── taskFollowTwitter.ts # Example: Twitter follow logic
├── config/
│   └── tasks.json             # Externalized task configuration
├── monitoring/                  # Real-time monitoring dashboard
├── logs/                        # Runtime logs and outputs
├── __launchAutomation.bat       # Windows quick launcher
├── package.json                 # Dependencies and npm scripts
└── readme.md                    # This file
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
    cd ixbrowser-playwright

    # Install the main automation dependencies
    npm install

    # Install the monitoring dashboard dependencies
    cd monitoring
    npm install
    cd ..
    ```

### Step 2: Start the Engines! 🤖

Ready to run? Just use this command from the main project folder:

* `npm start`

Or, if you're on Windows, just double-click `__launchAutomation.bat`!

### Step 3: Open the Dashboard 📊

Want to watch your bots in real-time? Open a *second* terminal:

* Navigate into the `monitoring/` folder.
* Run `npm start` from there.
* This will open the dashboard in your browser!

### Step 4: Become the Puppet Master 🪄

This is the fun part. You get to decide what your bots do!

* **Define Tasks**: Open up `config/tasks.json`. This is your mission control.
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
    2.  Inside, just export a `type` (string) and a `run` (async function).
    3.  That's it! The system automatically finds and registers it.

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
