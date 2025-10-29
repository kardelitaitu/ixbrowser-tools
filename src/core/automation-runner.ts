import { AuditLogger } from '../utils/audit-logger';
import { AutomationTimeoutError, ProfileConnectionError, TaskError } from '../utils/errors';
import { BrowserPool } from './browser-pool';
import { UnifiedLogger } from '../utils/unified-logger';
import { Profile, AutomationRunResult, Summary } from '../types/core';
import { BrowserAutomation } from './_automation';

export class AutomationRunner {
  private logger: UnifiedLogger;
  private browserPool: BrowserPool;
  private timeout: number;
  private browserAutomation: BrowserAutomation;

  constructor(
    browserPool: BrowserPool,
    auditLogger: AuditLogger,
    browserAutomation: BrowserAutomation,
    options: { timeout?: number } = {},
  ) {
    this.browserPool = browserPool;
    this.logger = new UnifiedLogger(auditLogger, 'AutomationRunner');
    this.timeout = options.timeout || 300000;
    this.browserAutomation = browserAutomation;
  }

  async runProfileAutomation(
    profile: Profile,
  ): Promise<{
    success: boolean;
    profileId: string;
    profileName: string;
    result?: AutomationRunResult;
    duration?: number;
    error?: string;
    type?: string;
  }> {
    const profileId = profile.profile_id || profile.id;
    const profileName = profile.name || `Profile-${profileId}`;

    this.logger.log(`Starting automation for profile: ${profileName} (${profileId})`);
    await this.browserAutomation.auditLogger.logStepStart(
      'profile',
      'automation_run',
      profileId,
      profileName,
    );

    try {
      const { browser, context, page, profileData } =
        await this.browserPool.connectToProfile(profile);

      try {
        const startTime = Date.now();
        const result = await this.browserAutomation.run(
          browser,
          context,
          page,
          profileData,
        );
        const duration = Date.now() - startTime;

        this.logger.log(
          `Automation for profile ${profileName} (${profileId}) completed successfully in ${duration}ms. Result type: ${result.type}`,
        );
        await this.browserAutomation.auditLogger.logStepEnd(
          'profile',
          'automation_run',
          true,
          profileId,
          profileName,
          { resultType: result.type },
          null,
          duration,
        );

        return {
          success: true,
          profileId,
          profileName,
          result,
          duration,
        };
      } catch (automationError) {
        const errorMessage = (automationError instanceof Error) ? automationError.message : 'Unknown automation error';
        this.logger.error(
          `Automation for profile ${profileName} (${profileId}) failed: ${errorMessage}`,
        );
        await this.browserAutomation.auditLogger.logStepEnd(
          'profile',
          'automation_run',
          false,
          profileId,
          profileName,
          {},
          errorMessage,
        );
        return {
          success: false,
          profileId,
          profileName,
          error: errorMessage,
          type: (automationError instanceof TaskError) ? 'task_error' : 'automation_error',
        };
      } finally {
        await page.close();
        this.logger.log(`Page closed for profile ${profileName} (${profileId})`);
      }
    } catch (connectionError) {
      const errorMessage = (connectionError instanceof Error) ? connectionError.message : 'Unknown connection error';
      this.logger.error(
        `Connection to profile ${profileName} (${profileId}) failed: ${errorMessage}`,
      );
      await this.browserAutomation.auditLogger.logStepEnd(
        'profile',
        'automation_run',
        false,
        profileId,
        profileName,
        {},
        errorMessage,
      );
      return {
        success: false,
        profileId,
        profileName,
        error: errorMessage,
        type: (connectionError instanceof ProfileConnectionError) ? 'profile_connection_error' : 'connection_error',
      };
    }
  }

  async runParallelAutomation(profiles: Profile[]): Promise<{ results: { success: boolean; profileId: string; profileName: string; result?: AutomationRunResult; duration?: number; error?: string; type?: string; }[]; summary: Summary }> {
    this.logger.log('Starting parallel automation across all opened profiles.');
    await this.browserAutomation.auditLogger.logStepStart('session', 'parallel_execution');

    try {
      if (profiles.length === 0) {
        this.logger.warn('No profiles found to automate.');
        await this.browserAutomation.auditLogger.logStepEnd(
          'session',
          'parallel_execution',
          false,
          null,
          null,
          { reason: 'no_profiles' },
        );
        return { results: [], summary: { total: 0, successful: 0, failed: 0, successRate: '0.0', totalDuration: 0 } };
      }

      this.logger.log(`Found ${profiles.length} profiles for parallel automation.`);
      const startTime = Date.now();
      const automationPromises = profiles.map((profile) =>
        Promise.race([
          this.runProfileAutomation(profile),
          new Promise<any>((_resolve, reject) =>
            setTimeout(
              () =>
                reject(
                  new AutomationTimeoutError(
                    `Profile automation timed out after ${this.timeout}ms`,
                    this.timeout,
                  ),
                ),
              this.timeout,
            ),
          ),
        ]),
      );

      const results = await Promise.allSettled(automationPromises);
      const processedResults = results.map((result, index) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              success: false,
              profileId: profiles[index].profile_id || profiles[index].id,
              profileName:
                profiles[index].name ||
                `Profile-${profiles[index].profile_id || profiles[index].id}`,
              error: (result.reason as Error).message,
              type: 'promise_rejection',
            },
      );

      const summary = this.generateSummary(processedResults, Date.now() - startTime);
      this.logger.log(
        `Parallel automation completed. Summary: Total: ${summary.total}, Successful: ${summary.successful}, Failed: ${summary.failed}, Success Rate: ${summary.successRate}%`,
      );
      await this.browserAutomation.auditLogger.logStepEnd(
        'session',
        'parallel_execution',
        true,
        null,
        null,
        { summary },
        null,
        Date.now() - startTime,
      );

      return {
        results: processedResults,
        summary,
      };
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown parallel automation error';
      this.logger.error(`Parallel automation failed: ${errorMessage}`);
      await this.browserAutomation.auditLogger.logStepEnd(
        'session',
        'parallel_execution',
        false,
        null,
        null,
        {},
        errorMessage,
      );
      throw error;
    }
  }

  generateSummary(results: { success: boolean; profileId: string; profileName: string; result?: AutomationRunResult; duration?: number; error?: string; type?: string; }[], totalDuration: number): Summary {
    const total = results.length;
    const successful = results.filter((r) => r.success).length;
    const failed = total - successful;

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0',
      totalDuration,
    };
  }
}
