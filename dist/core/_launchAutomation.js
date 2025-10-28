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
const playwright_1 = require("playwright");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const _automation_1 = require("../core/_automation");
const audit_logger_1 = require("../utils/audit-logger");
const retry_utils_1 = require("../utils/retry-utils");
const errors_1 = require("../utils/errors");
const ixBrowserClient_1 = require("../utils/ixBrowserClient");
class IxBrowserAutomation {
    baseUrl;
    apiKey;
    ixBrowserClient;
    logFile;
    timeout;
    auditLogger;
    browserPool;
    poolMaxSize;
    poolTimeout;
    _cachedProfiles;
    constructor(options = {}) {
        this.baseUrl = process.env.BASE_URL || options.baseUrl || 'http://127.0.0.1:53200';
        this.apiKey = process.env.IXBROWSER_API_KEY || 'your-api-key-here';
        this.ixBrowserClient = new ixBrowserClient_1.IxBrowserClient(this.baseUrl, this.apiKey);
        this.logFile = path.join(__dirname, 'logs', `_launchAutomation_${new Date().toISOString().replace(/:/g, '-')}.log`);
        this.timeout = options.timeout || 300000; // 5 minutes default
        this.auditLogger = new audit_logger_1.AuditLogger({
            sessionId: `automation_${Date.now()}`,
        });
        // Resource pooling for browser contexts to reduce overhead
        this.browserPool = new Map(); // profileId -> { browser, context, page, profileData, lastUsed }
        this.poolMaxSize = options.poolMaxSize || 10; // Max pooled connections
        this.poolTimeout = options.poolTimeout || 60000; // 1 minute idle timeout
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
     * Applies anti-detection scripts to a page.
     * @param page - The Playwright page instance.
     */
    async applyAntiDetection(page) {
        const antiDetectionScripts = [
            () => {
                delete Object.getPrototypeOf(navigator).webdriver;
                delete navigator.webdriver;
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            },
            () => {
                window.outerHeight = window.innerHeight;
                window.outerWidth = window.innerWidth;
            },
            () => {
                window.chrome = window.chrome || {};
                window.chrome.runtime = window.chrome.runtime || {};
            },
        ];
        for (const script of antiDetectionScripts) {
            await page.addInitScript(script);
        }
    }
    /**
     * Sets up resource blocking for a page to improve performance and reduce detection.
     * @param page - The Playwright page instance.
     */
    async setupResourceBlocking(page) {
        await page.route(/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/, (route) => route.abort());
        await page.route(/.*\.css(\?.*)?$/, (route) => route.abort());
        await page.route((url) => {
            return url.protocol === 'http:' || url.protocol === 'https:';
        }, (route) => {
            const request = route.request();
            if (request.resourceType() === 'image' ||
                request.resourceType() === 'media' ||
                request.resourceType() === 'font') {
                route.abort();
            }
            else {
                route.continue();
            }
        });
        await this.log('Resource blocking enabled for page.', 'INFO');
    }
    /**
     * Fetches a list of opened profiles from ixBrowser (lazy loading for performance).
     * @returns A promise that resolves with an array of profile objects.
     */
    async getOpenedProfiles() {
        await this.auditLogger.logStepStart('session', 'fetch_profiles');
        try {
            const profiles = await this.ixBrowserClient.getOpenedProfiles();
            await this.auditLogger.logStepEnd('session', 'fetch_profiles', true, null, null, { profileCount: profiles.length });
            return profiles;
        }
        catch (error) {
            await this.log(`Profile fetch error: ${error.message}`, 'WARN');
            await this.auditLogger.logStepEnd('session', 'fetch_profiles', false, null, null, {}, error.message);
            return [];
        }
    }
    /**
     * Gets profiles lazily: Only fetches if not already loaded (for large profile sets).
     * @returns A promise that resolves with an array of profile objects.
     */
    async getOpenedProfilesLazy() {
        if (this._cachedProfiles) {
            return this._cachedProfiles;
        }
        this._cachedProfiles = await this.getOpenedProfiles();
        return this._cachedProfiles;
    }
    /**
     * Connects to a specific profile and returns the browser context, using resource pooling for efficiency.
     * @param profile - The profile to connect to.
     * @returns A promise that resolves with the pooled connection.
     */
    async connectToProfile(profile) {
        const profileId = profile.profile_id;
        await this.auditLogger.logStepStart('profile', 'connect', profileId);
        try {
            // Check pool for existing connection
            const pooled = this.browserPool.get(profileId);
            if (pooled && (Date.now() - pooled.lastUsed < this.poolTimeout)) {
                pooled.lastUsed = Date.now();
                await this.log(`Reusing pooled connection for profile: ${profileId}`, 'INFO');
                await this.auditLogger.logStepEnd('profile', 'connect', true, profileId, pooled.profileData.name, { reused: true });
                return pooled;
            }
            await this.log(`Attempting to connect to profile: ${profileId}. Pool size: ${this.browserPool.size}/${this.poolMaxSize}`, 'INFO');
            // Clean up expired pool entries
            this.cleanupPool();
            const response = await (0, retry_utils_1.retryProfileConnection)(async () => {
                return await this.ixBrowserClient.openProfile(profileId);
            }, 3);
            const { ws: wsEndpoint } = response.data;
            await this.log(`Connecting to CDP endpoint for profile ${profileId}: ${wsEndpoint}`, 'INFO');
            const browser = await playwright_1.chromium.connectOverCDP(wsEndpoint);
            const context = browser.contexts()[0];
            const page = await context.newPage();
            await this.log(`Applying anti-detection scripts for profile ${profileId}`, 'INFO');
            await this.applyAntiDetection(page);
            await this.setupResourceBlocking(page);
            const connection = { browser, context, page, profileData: { ...profile, ...response.data }, lastUsed: Date.now() };
            // Add to pool if under max size
            if (this.browserPool.size < this.poolMaxSize) {
                this.browserPool.set(profileId, connection);
                await this.log(`Added new connection for profile ${profileId} to pool. Current pool size: ${this.browserPool.size}`, 'INFO');
            }
            await this.auditLogger.logStepEnd('profile', 'connect', true, profileId, profile.name, { wsEndpoint, pooled: !!pooled });
            return connection;
        }
        catch (error) {
            await this.log(`Profile connection error: ${error.message}`, 'ERROR');
            await this.auditLogger.logStepEnd('profile', 'connect', false, profileId, null, {}, error.message);
            throw error;
        }
    }
    /**
     * Cleans up expired pool entries to prevent memory leaks.
     */
    cleanupPool() {
        const now = Date.now();
        for (const [id, conn] of this.browserPool) {
            if (now - conn.lastUsed > this.poolTimeout) {
                this.browserPool.delete(id);
                conn.browser.close().catch(() => { }); // Ignore errors
            }
        }
    }
    /**
     * Runs automation on a single profile.
     * @param profile - The profile object.
     * @returns A promise that resolves with the automation result for the profile.
     */
    async runProfileAutomation(profile) {
        const profileId = profile.profile_id || profile.id;
        const profileName = profile.name || `Profile-${profileId}`;
        await this.log(`Starting automation for profile: ${profileName} (${profileId})`, 'INFO');
        await this.auditLogger.logStepStart('profile', 'automation_run', profileId, profileName);
        try {
            const { browser, context, page, profileData } = await this.connectToProfile(profile);
            try {
                const startTime = Date.now();
                const result = await (0, _automation_1.run)(browser, context, page, profileData, this.auditLogger);
                const duration = Date.now() - startTime;
                await this.log(`Automation for profile ${profileName} (${profileId}) completed successfully in ${duration}ms. Result type: ${result.type}`, 'INFO');
                await this.auditLogger.logStepEnd('profile', 'automation_run', true, profileId, profileName, { resultType: result.type }, null, duration);
                return {
                    success: true,
                    profileId,
                    profileName,
                    result,
                    duration,
                };
            }
            catch (automationError) {
                await this.log(`Automation for profile ${profileName} (${profileId}) failed: ${automationError.message}`, 'ERROR');
                await this.auditLogger.logStepEnd('profile', 'automation_run', false, profileId, profileName, {}, automationError.message);
                return {
                    success: false,
                    profileId,
                    profileName,
                    error: automationError.message,
                    type: 'automation_error',
                };
            }
            finally {
                // Do not close the browser here; it is managed by the browserPool and cleanupPool.
                // Only close the page to free up resources for the next task.
                await page.close();
                await this.log(`Page closed for profile ${profileName} (${profileId})`, 'INFO');
            }
        }
        catch (connectionError) {
            await this.log(`Connection to profile ${profileName} (${profileId}) failed: ${connectionError.message}`, 'ERROR');
            await this.auditLogger.logStepEnd('profile', 'automation_run', false, profileId, profileName, {}, connectionError.message);
            return {
                success: false,
                profileId,
                profileName,
                error: connectionError.message,
                type: 'connection_error',
            };
        }
    }
    /**
     * Runs automation in parallel across all opened profiles.
     * @returns A promise that resolves with the results and summary of the parallel automation.
     */
    async runParallelAutomation() {
        await this.log('Starting parallel automation across all opened profiles.', 'INFO');
        await this.auditLogger.logStepStart('session', 'parallel_execution');
        try {
            const openedProfiles = await this.getOpenedProfilesLazy(); // Use lazy loading
            if (openedProfiles.length === 0) {
                await this.log('No profiles found to automate.', 'WARN');
                await this.auditLogger.logStepEnd('session', 'parallel_execution', false, null, null, { reason: 'no_profiles' });
                return { results: [], summary: { total: 0, successful: 0, failed: 0 } };
            }
            await this.log(`Found ${openedProfiles.length} profiles for parallel automation.`, 'INFO');
            const startTime = Date.now();
            const automationPromises = openedProfiles.map((profile) => Promise.race([
                this.runProfileAutomation(profile),
                new Promise((_resolve, reject) => setTimeout(() => reject(new errors_1.AutomationTimeoutError(`Profile automation timed out after ${this.timeout}ms`, this.timeout)), this.timeout)),
            ]));
            const results = await Promise.allSettled(automationPromises);
            const processedResults = results.map((result, index) => result.status === 'fulfilled'
                ? result.value
                : {
                    success: false,
                    profileId: openedProfiles[index].profile_id || openedProfiles[index].id,
                    profileName: openedProfiles[index].name ||
                        `Profile-${openedProfiles[index].profile_id || openedProfiles[index].id}`,
                    error: result.reason.message,
                    type: 'promise_rejection',
                });
            const summary = this.generateSummary(processedResults, Date.now() - startTime);
            await this.log(`Parallel automation completed. Summary: Total: ${summary.total}, Successful: ${summary.successful}, Failed: ${summary.failed}, Success Rate: ${summary.successRate}%`, 'INFO');
            await this.auditLogger.logStepEnd('session', 'parallel_execution', true, null, null, { summary }, null, Date.now() - startTime);
            return {
                results: processedResults,
                summary,
            };
        }
        catch (error) {
            await this.log(`Parallel automation failed: ${error.message}`, 'ERROR');
            await this.auditLogger.logStepEnd('session', 'parallel_execution', false, null, null, {}, error.message);
            throw error;
        }
    }
    /**
     * Generates an execution summary from the results.
     * @param results - An array of execution results.
     * @param totalDuration - The total execution time in milliseconds.
     * @returns A summary object with totals and success rate.
     */
    generateSummary(results, totalDuration) {
        const total = results.length;
        const successful = results.filter((r) => r.success).length;
        const failed = total - successful;
        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
            totalDuration,
        };
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
        process.exit(1);
    }
}
// Run script or export for module use
if (require.main === module) {
    main().catch(console.error);
}
exports.default = IxBrowserAutomation;
