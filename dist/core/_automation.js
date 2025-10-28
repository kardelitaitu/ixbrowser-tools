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
exports.BrowserAutomation = void 0;
exports.run = run;
const humanSimulation_1 = require("../utils/humanSimulation");
const delay_getRange_1 = require("../utils/delay-getRange");
const page_enhance_1 = require("../utils/page-enhance");
const audit_logger_1 = require("../utils/audit-logger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zod_1 = require("zod");
/**
 * @fileoverview Advanced Human-Like Browser Automation
 * - Reuses shared utilities for DRY principle
 * - Provides structured results with type classification
 * - Enhances typing behavior and element-finding diagnostics
 */
// Default behavior toggles and parameters
const DEFAULT_CONFIG = {
    randomDelays: true,
    humanScroll: true,
    typeVariation: true,
    logging: true,
};
// Load all tasks from the tasks directory and create a registry
const tasksDir = path.join(__dirname, '../tasks');
const taskRegistry = new Map();
fs.readdirSync(tasksDir).forEach(file => {
    if (file.endsWith('.ts')) {
        const task = require(path.join(tasksDir, file));
        if (task.type && task.run) {
            taskRegistry.set(task.type, task.run);
        }
    }
});
const taskSchema = zod_1.z.object({
    type: zod_1.z.string(),
    handle: zod_1.z.string().optional(),
    options: zod_1.z.object({}).passthrough().optional(),
    stopOnFailure: zod_1.z.boolean().optional(),
});
const loadTasks = async () => {
    const tasksPath = path.join(__dirname, '../../config/tasks.json');
    try {
        const data = await fs.promises.readFile(tasksPath, 'utf8');
        const tasks = JSON.parse(data);
        return zod_1.z.array(taskSchema).parse(tasks);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error(`Invalid tasks.json structure: ${error.message}`);
        }
        else {
            console.error(`Error loading tasks.json: ${error.message}`);
        }
        return [];
    }
};
const ALL_TASKS = loadTasks();
class BrowserAutomation {
    config;
    logger;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logger = this.config.logging ? console.log : () => { };
    }
    /**
     * Versatile delay helper using shared randomDelay().
     * @param profile - The delay profile to use.
     */
    async delay(profile = 'medium') {
        const { min, max } = (0, delay_getRange_1.getDelayRange)(profile);
        if (this.config.randomDelays) {
            this.logger(`⏱️ Waiting ${min}-${max}ms (${profile})...`);
            return (0, humanSimulation_1.randomDelay)(min, max);
        }
        // Fallback deterministic short pause
        return (0, humanSimulation_1.randomDelay)(150, 250);
    }
}
exports.BrowserAutomation = BrowserAutomation;
/**
 * Main automation run function (keeps public contract stable).
 * @param browser - The Playwright Browser instance.
 * @param context - The Playwright BrowserContext instance.
 * @param page - The Playwright Page instance.
 * @param profileData - The profile data.
 * @param auditLogger - The audit logger instance.
 * @returns A promise that resolves with the automation result.
 */
async function run(browser, context, page, profileData, auditLogger = null) {
    const automation = new BrowserAutomation();
    const profileName = profileData.name || 'Unknown Profile';
    const profileId = profileData.id || profileData.profile_id;
    const allTaskResults = [];
    // Use provided audit logger or create a default one
    const logger = auditLogger || new audit_logger_1.AuditLogger({ enabled: false });
    logger(`[${profileName}] Starting automation run for profile ${profileId}`);
    try {
        await logger.logStepStart('automation', 'task_orchestration', profileId, profileName);
        await logger.logAction('automation', 'page_enhancement', true, profileId, profileName, { enhancements: ['human_methods', 'delay', 'type_variation'] });
        const enhancedPage = (0, page_enhance_1.enhancePage)(page, {
            delay: automation.delay.bind(automation),
            logger: automation.logger,
            typeVariation: automation.config.typeVariation,
        });
        // Prefix logs with profile
        const prefixedLogger = (...args) => automation.logger(`[${profileName}]`, ...args);
        prefixedLogger('Starting dynamic task execution');
        const tasks = await ALL_TASKS; // Await the promise to get the tasks array
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            prefixedLogger(`Executing task ${i + 1}/${tasks.length}: ${task.type} - ${task.handle || 'N/A'}`);
            let taskResult = { success: false, type: task.type, handle: task.handle || 'N/A', error: 'Task not executed' };
            try {
                const taskRunner = taskRegistry.get(task.type);
                if (taskRunner) {
                    taskResult = await taskRunner(enhancedPage, { ...automation, logger: prefixedLogger, auditLogger: logger }, task.handle, task.options, profileId, profileName);
                }
                else {
                    throw new Error(`Unknown task type: ${task.type}`);
                }
                prefixedLogger(`Task ${task.type} for ${task.handle || 'N/A'} complete: ${taskResult.success ? '✅' : '❌'}. Result: ${JSON.stringify(taskResult)}`);
            }
            catch (taskError) {
                prefixedLogger(`Task ${task.type} for ${task.handle || 'N/A'} failed: ${taskError.message}`);
                taskResult.success = false;
                taskResult.error = taskError.message;
                if (task.stopOnFailure) {
                    prefixedLogger(`Stopping further tasks for this profile due to critical failure in task ${task.type}.`);
                    allTaskResults.push(taskResult);
                    throw taskError; // Re-throw to stop the profile automation
                }
            }
            allTaskResults.push(taskResult);
        }
        // Success calculation
        const successCount = allTaskResults.filter((r) => r.success).length;
        const overallSuccess = successCount === allTaskResults.length && allTaskResults.length > 0;
        prefixedLogger(`Dynamic task execution complete: ${successCount}/${allTaskResults.length} successes`);
        await logger.logStepEnd('automation', 'task_orchestration', overallSuccess, profileId, profileName, {
            tasks: allTaskResults,
            successCount,
            totalTasks: allTaskResults.length,
        });
        logger(`[${profileName}] Automation run finished. Overall success: ${overallSuccess}`);
        return {
            success: overallSuccess,
            type: overallSuccess ? 'automation_success' : 'automation_partial_failure',
            data: {
                tasks: allTaskResults,
                profile: profileName,
                total: allTaskResults.length,
            },
            timestamp: new Date().toISOString(),
        };
    }
    catch (error) {
        logger(`[${profileName}] Automation run failed: ${error.message}`);
        await logger.logStepEnd('automation', 'task_orchestration', false, profileId, profileName, { tasks: allTaskResults }, error.message);
        return {
            success: false,
            type: 'automation_error',
            error: error.message,
            data: { tasks: allTaskResults, profile: profileName },
            timestamp: new Date().toISOString(),
        };
    }
}
