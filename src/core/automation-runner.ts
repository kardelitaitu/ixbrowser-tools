import { run as automationRun } from '../core/_automation';
import { AuditLogger } from '../utils/audit-logger';
import { AutomationTimeoutError } from '../utils/errors';
import { BrowserPool } from './browser-pool';

export class AutomationRunner {
  private auditLogger: AuditLogger;
  private browserPool: BrowserPool;
  private timeout: number;

  constructor(
    browserPool: BrowserPool,
    auditLogger: AuditLogger,
    options: { timeout?: number } = {},
  ) {
    this.browserPool = browserPool;
    this.auditLogger = auditLogger;
    this.timeout = options.timeout || 300000;
  }

  async runProfileAutomation(
    profile: any,
  ): Promise<{
    success: boolean;
    profileId: string;
    profileName: string;
    result?: any;
    duration?: number;
    error?: string;
    type?: string;
  }> {
    const profileId = profile.profile_id || profile.id;
    const profileName = profile.name || `Profile-${profileId}`;

    console.log(`Starting automation for profile: ${profileName} (${profileId})`);
    await this.auditLogger.logStepStart(
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
        const result = await automationRun(
          browser,
          context,
          page,
          profileData,
          this.auditLogger,
        );
        const duration = Date.now() - startTime;

        console.log(
          `Automation for profile ${profileName} (${profileId}) completed successfully in ${duration}ms. Result type: ${result.type}`,
        );
        await this.auditLogger.logStepEnd(
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
        console.error(
          `Automation for profile ${profileName} (${profileId}) failed: ${
            (automationError as Error).message
          }`,
        );
        await this.auditLogger.logStepEnd(
          'profile',
          'automation_run',
          false,
          profileId,
          profileName,
          {},
          (automationError as Error).message,
        );
        return {
          success: false,
          profileId,
          profileName,
          error: (automationError as Error).message,
          type: 'automation_error',
        };
      } finally {
        await page.close();
        console.log(`Page closed for profile ${profileName} (${profileId})`);
      }
    } catch (connectionError) {
      console.error(
        `Connection to profile ${profileName} (${profileId}) failed: ${
          (connectionError as Error).message
        }`,
      );
      await this.auditLogger.logStepEnd(
        'profile',
        'automation_run',
        false,
        profileId,
        profileName,
        {},
        (connectionError as Error).message,
      );
      return {
        success: false,
        profileId,
        profileName,
        error: (connectionError as Error).message,
        type: 'connection_error',
      };
    }
  }

  async runParallelAutomation(profiles: any[]): Promise<{ results: any[]; summary: any }> {
    console.log('Starting parallel automation across all opened profiles.');
    await this.auditLogger.logStepStart('session', 'parallel_execution');

    try {
      if (profiles.length === 0) {
        console.warn('No profiles found to automate.');
        await this.auditLogger.logStepEnd(
          'session',
          'parallel_execution',
          false,
          null,
          null,
          { reason: 'no_profiles' },
        );
        return { results: [], summary: { total: 0, successful: 0, failed: 0 } };
      }

      console.log(`Found ${profiles.length} profiles for parallel automation.`);
      const startTime = Date.now();
      const automationPromises = profiles.map((profile) =>
        Promise.race([
          this.runProfileAutomation(profile),
          new Promise((_resolve, reject) =>
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
      console.log(
        `Parallel automation completed. Summary: Total: ${summary.total}, Successful: ${summary.successful}, Failed: ${summary.failed}, Success Rate: ${summary.successRate}%`,
      );
      await this.auditLogger.logStepEnd(
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
      console.error(`Parallel automation failed: ${(error as Error).message}`);
      await this.auditLogger.logStepEnd(
        'session',
        'parallel_execution',
        false,
        null,
        null,
        {},
        (error as Error).message,
      );
      throw error;
    }
  }

  generateSummary(results: any[], totalDuration: number): any {
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
