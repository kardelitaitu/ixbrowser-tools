"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const audit_logger_1 = require("../utils/audit-logger");
const ixBrowserClient_1 = require("../utils/ixBrowserClient");
const browser_pool_1 = require("./browser-pool");
const profile_manager_1 = require("./profile-manager");
const automation_runner_1 = require("./automation-runner");
class IxBrowserAutomation {
    baseUrl;
    apiKey;
    ixBrowserClient;
    logFile;
    timeout;
    auditLogger;
    browserPool;
    profileManager;
    automationRunner;
    constructor(options = {}) {
        this.baseUrl = process.env.BASE_URL || options.baseUrl;
        this.apiKey = process.env.IXBROWSER_API_KEY || options.apiKey;
        if (!this.baseUrl || !this.apiKey) {
            throw new Error('BASE_URL and IXBROWSER_API_KEY must be defined in your .env file');
        }
        this.ixBrowserClient = new ixBrowserClient_1.IxBrowserClient(this.baseUrl, this.apiKey);
        this.logFile = path.join(__dirname, 'logs', `_launchAutomation_${new Date().toISOString().replace(/:/g, '-')}.log`);
        this.timeout = options.timeout || 300000; // 5 minutes default
        this.auditLogger = new audit_logger_1.AuditLogger({
            sessionId: `automation_${Date.now()}`,
        });
        // Initialize specialized modules
        this.browserPool = new browser_pool_1.BrowserPool(this.ixBrowserClient, this.auditLogger, {
            maxSize: options.poolMaxSize || 10,
            timeout: options.poolTimeout || 60000
        });
        this.profileManager = new profile_manager_1.ProfileManager(this.ixBrowserClient, this.auditLogger);
        this.automationRunner = new automation_runner_1.AutomationRunner(this.browserPool, this.auditLogger, { timeout: this.timeout });
    }
    /**
     * Logs a message to console and file.
     * @param message - The message to log.
     * @param level - The log level (INFO, ERROR, WARN).
     */
    async log(message, level = 'INFO') {
        const logMessage = `[${new Date().toISOString()}] [${level}] ${message}`;
        console.log(logMessage);
        try {
            await fs.mkdir(path.dirname(this.logFile), { recursive: true });
            await fs.appendFile(this.logFile, logMessage + '\n');
        }
        catch (error) {
            console.error('Logging failed:', error);
        }
    }
    /**
     * Runs automation in parallel across all opened profiles.
     * @returns A promise that resolves with the results and summary of the parallel automation.
     */
    async runParallelAutomation() {
        await this.log('Starting parallel automation across all opened profiles.', 'INFO');
        try {
            const openedProfiles = await this.profileManager.getOpenedProfilesLazy();
            return await this.automationRunner.runParallelAutomation(openedProfiles);
        }
        catch (error) {
            await this.log(`Parallel automation failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    /**
     * Cleans up resources and closes all browser connections.
     */
    async cleanup() {
        await this.browserPool.closeAll();
    }
}
/**
 * Main execution function.
 * @returns A promise that resolves with the results and summary of the automation.
 */
async function main() {
    const automation = new IxBrowserAutomation();
    try {
        await automation.auditLogger.logStepStart('session', 'main_execution');
        await automation.log('=== AUTOMATION SESSION STARTED ===');
        const { results, summary } = await automation.runParallelAutomation();
        await automation.log(`Automation completed. Success rate: ${summary.successRate}%`);
        await automation.log('=== AUTOMATION SESSION COMPLETED ===');
        await automation.auditLogger.logStepEnd('session', 'main_execution', true, null, null, { summary });
        return { results, summary };
    }
    catch (error) {
        await automation.log(`Execution failed: ${error.message}`, 'ERROR');
        await automation.auditLogger.logStepEnd('session', 'main_execution', false, null, null, {}, error.message);
        await automation.cleanup();
        process.exit(1);
    }
    finally {
        await automation.cleanup();
    }
}
// Run script or export for module use
if (require.main === module) {
    main().catch(console.error);
}
exports.default = IxBrowserAutomation;
