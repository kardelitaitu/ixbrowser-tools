import { Browser, BrowserContext, Page } from 'playwright';
import { randomDelay } from '../utils/humanSimulation';
import { getDelayRange } from '../utils/delay-getRange';
import { enhancePage } from '../utils/page-enhance';
import { AuditLogger } from '../utils/audit-logger';
import { UnifiedLogger } from '../utils/unified-logger';
import { ConfigService } from './config';
import { TaskConfiguration, Selectors, AutomationRunResult, Profile, BrowserAutomationConfig } from '../types/core';
import { TaskError, ConfigurationError } from '../utils/errors';
import { BaseTask } from '../tasks/BaseTask';
import { run as twitterFollowRun, type as twitterFollowType } from '../tasks/taskFollowTwitter';
import { run as discordJoinRun, type as discordJoinType } from '../tasks/taskJoinDiscord';
import { run as gmailReadRun, type as gmailReadType } from '../tasks/taskReadGmail';

/**
 * @fileoverview Advanced Human-Like Browser Automation
 * - Reuses shared utilities for DRY principle
 * - Provides structured results with type classification
 * - Enhances typing behavior and element-finding diagnostics
 */

// Default behavior toggles and parameters
const DEFAULT_CONFIG: BrowserAutomationConfig = {
  randomDelays: true,
  humanScroll: true,
  typeVariation: true,
  logging: true,
};

// Task registry with statically imported tasks
// We store the 'run' function directly, as the BaseTask refactoring means the 'run' function
// is now a factory that returns a TaskResult.
const taskRegistry = new Map<string, Function>();
taskRegistry.set(twitterFollowType, twitterFollowRun);
taskRegistry.set(discordJoinType, discordJoinRun);
taskRegistry.set(gmailReadType, gmailReadRun);

export class BrowserAutomation {
  public config: BrowserAutomationConfig;
  public logger: UnifiedLogger;
  private auditLogger: AuditLogger;
  private configService: ConfigService;

  constructor(auditLogger: AuditLogger, config: Partial<BrowserAutomationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.auditLogger = auditLogger;
    this.logger = new UnifiedLogger(auditLogger, 'BrowserAutomation');
    this.configService = ConfigService.getInstance();
  }

  /**
   * Versatile delay helper using shared randomDelay().
   * @param profile - The delay profile to use.
   */
  async delay(profile: 'instant' | 'short' | 'medium' | 'long' | 'reading' = 'medium'): Promise<void> {
    const { min, max } = getDelayRange(profile);
    if (this.config.randomDelays) {
      this.logger.log(`⏱️ Waiting ${min}-${max}ms (${profile})...`);
      return randomDelay(min, max);
    }
    // Fallback deterministic short pause
    return randomDelay(150, 250);
  }

  /**
   * Main automation run function.
   * @param browser - The Playwright Browser instance.
   * @param context - The Playwright BrowserContext instance.
   * @param page - The Playwright Page instance.
   * @param profileData - The profile data.
   * @returns A promise that resolves with the automation result.
   */
  public async run(
    browser: Browser,
    context: BrowserContext,
    page: Page,
    profileData: Profile,
  ): Promise<AutomationRunResult> {
    const profileName = profileData.name || 'Unknown Profile';
    const profileId = profileData.id || profileData.profile_id;
    const allTaskResults: any[] = [];

    const profileLogger = new UnifiedLogger(this.auditLogger, profileName);
    profileLogger.log(`Starting automation run for profile ${profileId}`);

    try {
      await this.auditLogger.logStepStart(
        'automation',
        'task_orchestration',
        profileId,
        profileName,
      );

      await this.auditLogger.logAction(
        'automation',
        'page_enhancement',
        true,
        profileId,
        profileName,
        { enhancements: ['human_methods', 'delay', 'type_variation'] },
      );
      const enhancedPage = enhancePage(page, {
        delay: this.delay.bind(this),
        logger: profileLogger.log.bind(profileLogger), // Pass the bound log method
        typeVariation: this.config.typeVariation,
      });

      profileLogger.log('Starting dynamic task execution');

      const tasks = await this.configService.loadTasks();
      const selectors = await this.configService.loadSelectors();

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        profileLogger.log(`Executing task ${i + 1}/${tasks.length}: ${task.type} - ${task.handle || task.inviteUrl || 'N/A'}`);
        let taskResult: any = { success: false, type: task.type, handle: task.handle || 'N/A', error: 'Task not executed' };

        try {
          const taskRunner = taskRegistry.get(task.type);
          if (taskRunner) {
            // The 'run' function of each task now acts as a factory for the BaseTask instance
            taskResult = await taskRunner(
              enhancedPage,
              { delay: this.delay.bind(this), logger: profileLogger.log.bind(profileLogger), auditLogger: this.auditLogger },
              task.handle || task.inviteUrl, // Pass the primary data for the task
              task.options,
              profileId,
              profileName,
              selectors,
            );
          } else {
            throw new TaskError(`Unknown task type: ${task.type}`, task.type);
          }
          profileLogger.log(
            `Task ${task.type} for ${task.handle || task.inviteUrl || 'N/A'} complete: ${taskResult.success ? '✅' : '❌'}. Result: ${JSON.stringify(taskResult)}`,
          );
        } catch (taskError) {
          const errorMessage = (taskError instanceof Error) ? taskError.message : 'Unknown task error';
          profileLogger.error(`Task ${task.type} for ${task.handle || task.inviteUrl || 'N/A'} failed: ${errorMessage}`);
          taskResult.success = false;
          taskResult.error = errorMessage;
          if (task.stopOnFailure) {
            profileLogger.warn(`Stopping further tasks for this profile due to critical failure in task ${task.type}.`);
            allTaskResults.push(taskResult);
            throw new TaskError(`Critical task failure: ${errorMessage}`, task.type, { originalError: taskError });
          }
        }
        allTaskResults.push(taskResult);
      }

      // Success calculation
      const successCount = allTaskResults.filter((r) => r.success).length;
      const overallSuccess = allTaskResults.length > 0 && successCount === allTaskResults.length;

      profileLogger.log(
        `Dynamic task execution complete: ${successCount}/${allTaskResults.length} successes`,
      );

      await this.auditLogger.logStepEnd(
        'automation',
        'task_orchestration',
        overallSuccess,
        profileId,
        profileName,
        {
          tasks: allTaskResults,
          successCount,
          totalTasks: allTaskResults.length,
        },
      );
      profileLogger.log(`Automation run finished. Overall success: ${overallSuccess}`);

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
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown automation error';
      profileLogger.error(`Automation run failed: ${errorMessage}`);
      await this.auditLogger.logStepEnd(
        'automation',
        'task_orchestration',
        false,
        profileId,
        profileName,
        { tasks: allTaskResults },
        errorMessage,
      );
      return {
        success: false,
        type: 'automation_error',
        error: errorMessage,
        data: { tasks: allTaskResults, profile: profileName },
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// The old `run` export is removed as it's now a method of BrowserAutomation.
// The task imports are kept for the taskRegistry, but their `run` functions are now factories.
