import { Browser, BrowserContext, Page } from 'playwright';
import { randomDelay } from '../utils/humanSimulation';
import { getDelayRange } from '../utils/delay-getRange';
import { enhancePage } from '../utils/page-enhance';
import { AuditLogger } from '../utils/audit-logger';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

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
const taskRegistry = new Map<string, Function>();
fs.readdirSync(tasksDir).forEach(file => {
  if (file.endsWith('.ts')) {
    const task = require(path.join(tasksDir, file));
    if (task.type && task.run) {
      taskRegistry.set(task.type, task.run);
    }
  }
});

const taskSchema = z.object({
  type: z.string(),
  handle: z.string().optional(),
  options: z.object({}).passthrough().optional(),
  stopOnFailure: z.boolean().optional(),
});

const loadTasks = async () => {
  const tasksPath = path.join(__dirname, '../../config/tasks.json');
  try {
    const data = await fs.promises.readFile(tasksPath, 'utf8');
    const tasks = JSON.parse(data);
    return z.array(taskSchema).parse(tasks);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Invalid tasks.json structure: ${error.message}`);
    } else {
      console.error(`Error loading tasks.json: ${(error as Error).message}`);
    }
    return [];
  }
};

const ALL_TASKS = loadTasks();
const SELECTORS = (async () => {
  const selectorsPath = path.join(__dirname, '../../config/selectors.json');
  try {
    const data = await fs.promises.readFile(selectorsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading selectors.json: ${(error as Error).message}`);
    return {};
  }
})();

export class BrowserAutomation {
  public config: typeof DEFAULT_CONFIG;
  public logger: (message?: any, ...optionalParams: any[]) => void;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = this.config.logging ? console.log : () => {};
  }

  /**
   * Versatile delay helper using shared randomDelay().
   * @param profile - The delay profile to use.
   */
  async delay(profile: 'instant' | 'short' | 'medium' | 'long' = 'medium'): Promise<void> {
    const { min, max } = getDelayRange(profile);
    if (this.config.randomDelays) {
      this.logger(`⏱️ Waiting ${min}-${max}ms (${profile})...`);
      return randomDelay(min, max);
    }
    // Fallback deterministic short pause
    return randomDelay(150, 250);
  }
}

interface AutomationResult {
  success: boolean;
  data?: any;
  error?: string;
  type: string;
  timestamp: string;
}

/**
 * Main automation run function (keeps public contract stable).
 * @param browser - The Playwright Browser instance.
 * @param context - The Playwright BrowserContext instance.
 * @param page - The Playwright Page instance.
 * @param profileData - The profile data.
 * @param auditLogger - The audit logger instance.
 * @returns A promise that resolves with the automation result.
 */
export async function run(
  browser: Browser,
  context: BrowserContext,
  page: Page,
  profileData: any,
  auditLogger: AuditLogger | null = null
): Promise<AutomationResult> {
  const automation = new BrowserAutomation();
  const profileName = profileData.name || 'Unknown Profile';
  const profileId = profileData.id || profileData.profile_id;
  const allTaskResults: any[] = [];

  // Use provided audit logger or create a default one
  const logger = auditLogger || new AuditLogger({ enabled: false });

  (logger as any)(`[${profileName}] Starting automation run for profile ${profileId}`);
  try {
    await logger.logStepStart(
      'automation',
      'task_orchestration',
      profileId,
      profileName
    );

    await logger.logAction(
      'automation',
      'page_enhancement',
      true,
      profileId,
      profileName,
      { enhancements: ['human_methods', 'delay', 'type_variation'] }
    );
    const enhancedPage = enhancePage(page, {
      delay: automation.delay.bind(automation),
      logger: automation.logger,
      typeVariation: automation.config.typeVariation,
    });

    // Prefix logs with profile
    const prefixedLogger = (...args: any[]) =>
      automation.logger(`[${profileName}]`, ...args);
    prefixedLogger('Starting dynamic task execution');

    const tasks = await ALL_TASKS; // Await the promise to get the tasks array
    const selectors = await SELECTORS; // Await the promise to get the selectors

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      prefixedLogger(`Executing task ${i + 1}/${tasks.length}: ${task.type} - ${task.handle || 'N/A'}`);
      let taskResult: any = { success: false, type: task.type, handle: task.handle || 'N/A', error: 'Task not executed' };

      try {
        const taskRunner = taskRegistry.get(task.type);
        if (taskRunner) {
          taskResult = await taskRunner(
            enhancedPage,
            { ...automation, logger: prefixedLogger, auditLogger: logger },
            task.handle,
            task.options,
            profileId,
            profileName,
            selectors
          );
        } else {
          throw new Error(`Unknown task type: ${task.type}`);
        }
        prefixedLogger(
          `Task ${task.type} for ${task.handle || 'N/A'} complete: ${taskResult.success ? '✅' : '❌'}. Result: ${JSON.stringify(taskResult)}`
        );
      } catch (taskError) {
        prefixedLogger(`Task ${task.type} for ${task.handle || 'N/A'} failed: ${(taskError as Error).message}`);
        taskResult.success = false;
        taskResult.error = (taskError as Error).message;
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

    prefixedLogger(
      `Dynamic task execution complete: ${successCount}/${allTaskResults.length} successes`
    );

    await logger.logStepEnd(
      'automation',
      'task_orchestration',
      overallSuccess,
      profileId,
      profileName,
      {
        tasks: allTaskResults,
        successCount,
        totalTasks: allTaskResults.length,
      }
    );
    (logger as any)(`[${profileName}] Automation run finished. Overall success: ${overallSuccess}`);

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
  } catch (error) {
    (logger as any)(`[${profileName}] Automation run failed: ${(error as Error).message}`);
    await logger.logStepEnd(
      'automation',
      'task_orchestration',
      false,
      profileId,
      profileName,
      { tasks: allTaskResults },
      (error as Error).message
    );
    return {
      success: false,
      type: 'automation_error',
      error: (error as Error).message,
      data: { tasks: allTaskResults, profile: profileName },
      timestamp: new Date().toISOString(),
    };
  }
}
