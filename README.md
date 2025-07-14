# 🧰 IXBrowser Tools

Useful script collection for interacting with the IX Browser API. Built to optimize performance, enhance privacy, and automate browser workflows. Extremely useful if you handle hundreds or thousands profile_id

---

## 🚀 Roadmap: IXBrowser Tools

### 1. Custom Browser Launcher (Phase 1)
**Focus:** Lightweight, customizable, and stealthy launcher for IX-based browsers
- 🧠 Launcher for specific instances (eg. open profile_0001 to profile_0002)
- ⌨️ Export Cookies Specific domain via 🍃NodeJs
<pre><code class="language-text">/coookies/
  ├── profile_0001/│
     ├── domain_1.json
     ├── domain_2.json
     ├── domain_3.json
     ├── domain_4.json
  ├── profile_0002/│
     ├── domain_1.json
     ├── domain_2.json
     ├── domain_3.json
     ├── domain_4.json</code></pre>

- ⌨️ Session Refresh with .csv output via 🍃NodeJs
<pre><code class="language-text">profile_id,domain_1,domain_2,domain_3,domain_4,dateStamp
profile_0001,valid,expired,valid,valid,14/07/2025
profile_0002,expired,valid,valid,valid,14/07/2025
profile_0003,valid,valid,valid,expired,14/07/2025
</code></pre>
- 🛡️ ID+Password Injection .txt/.csv via 🍃NodeJs
<pre><code class="language-text">profile_id,domain,username,password
profile_0001,domain_1.com,user1@gmail.com,password123
profile_0001,domain_2.com,@username1,password456
profile_0002,domain_1.com,user2#1234,password789
profile_0002,domain_2.com,username2,password321
</code></pre>
- 🧠 Profile injection: Launch with predefined user profiles or sandboxed environments
- 🔍 Resource presets: Automatically allocate RAM/CPU affinity per instance
- 🛡️ Privacy toggles: Enable/disable extensions, set proxy/VPN settings
- 🔗 Multiple instance launching (with unique args or user-agent switching)

---

### 2. Environment Tuning (Phase 2)
**Focus:** Prepare the system for optimal performance and privacy

- ⚙️ Scripted cleanup: Temp files, cookies, tracking remnants
- 🚀 Portable mode support: Zero-install launchers with user profile persistence
- 🧊 Firejail sandbox profile generation (Linux workflows)
- 🖥️ DPI-aware display tuning and font rendering enhancements

---

### 3. Monitoring & Feedback Tools (Phase 3)
**Focus:** Real-time resource tracking and browser behavior diagnostics

- 📊 In-browser resource meter overlay (RAM, CPU, net usage)
- 🪪 Extension scanner: Detect telemetry and suspicious behaviors
- 🧪 DOM mutation logger: Monitor changes for automation robustness

---

### 4. Automation Modules (Phase 4)
**Focus:** Streamline common tasks and repetitive workflows

- 🤖 Form filler & clicker: Smart interaction scripting
- 📂 Auto-download handler: Custom naming and directory routing
- 💡 Script injector: Inject custom JS/CSS payloads on launch
- 🕵️‍♂️ Browser fingerprinting mitigation tools

---

### 5. Packaging & Distribution (Phase 5)
**Focus:** Shareable and scalable deployment

- 📦 Bundling with `esbuild`, PowerShell, or zip self-extracting setups
- 🧹 Lean mode using `npm prune` or similar
- 🔒 Optional code signing, manifest versioning, and changelog tracking

---

## 📁 Structure
Organize scripts by phase and platform:


---

## 🛠️ Requirements
- Windows 10+ / Linux (for sandbox features)
- PowerShell 5.1+
- Node.js (for esbuild-based bundling, if used)

---

## ✨ Contributions
Pull requests are welcome! Feel free to propose new modules or tweak workflows — especially if you’ve got a clever trick for sandboxing, fingerprint defense, or UI hacks.

---

## 📄 License
MIT License — Use freely, modify boldly.

---
