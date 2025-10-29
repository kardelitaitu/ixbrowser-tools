import { Page } from 'playwright';
import { AuditLogger } from '../utils/audit-logger';
import { findElementSmart } from '../utils/element-finder';
import { retryWithBackoff } from '../utils/retry-utils';
import { TaskOptions, AutomationInstance, TaskResult, TaskProgressStatus, TaskProgress } from '../types/tasks';

/**
 * @fileoverview Base class for automation tasks to ensure consistency and reduce boilerplate.
 * It provides a standardized structure for navigation, execution, and verification.
 */

export abstract class BaseTask<TOptions extends TaskOptions, TData> {
  protected page: Page;
  protected automation: AutomationInstance;
  protected options: TOptions;
  protected profileId: string | null;
  protected profileName: string | null;
  protected selectors: any;
  protected logger: (msg: string) => void;
  protected auditLogger: AuditLogger;

  constructor(
    page: Page,
    automation: AutomationInstance,
    options: TOptions,
    profileId: string | null,
    profileName: string | null,
    selectors: any,
  ) {
    this.page = page;
    this.automation = automation;
    this.options = options;
    this.profileId = profileId;
    this.profileName = profileName;
    this.selectors = selectors;
    this.logger = automation.logger;
    this.auditLogger = automation.auditLogger;
  }

  protected async emitProgress(status: TaskProgressStatus, step: string, message: string, data?: any): Promise<void> {
    const progress: TaskProgress = {
      status,
      step,
      message,
      timestamp: new Date().toISOString(),
      data,
    };
    await this.auditLogger?.logAction(
      this.getTaskName(),
      'task_progress',
      true, // Always true for progress events, success/failure is in status
      this.profileId,
      this.profileName,
      progress,
    );
  }

  public async run(data: TData): Promise<TaskResult> {
    const taskName = this.getTaskName();
    const taskIdentifier = this.getTaskIdentifier(data);
    this.logger(`Starting ${taskName} task for: ${taskIdentifier}`);
    await this.emitProgress('started', 'initialization', `Starting task for ${taskIdentifier}`, { data, options: this.options });

    try {
      await this.auditLogger?.logStepStart(
        taskName,
        `${taskName}_execution`,
        this.profileId,
        this.profileName,
        { data, options: this.options },
      );

      // 1. Navigate to the target page
      this.logger(`Navigating to target page for ${taskIdentifier}`);
      await this.emitProgress('in_progress', 'navigate', `Navigating to target page`, { url: this.page.url() });
      await this.navigate(data);
      if (this.options.delayBetweenActions) await this.automation.delay('short');
      await this.emitProgress('completed', 'navigate', `Navigation complete`, { url: this.page.url() });

      // 2. Verify login status
      this.logger(`Verifying login status for ${taskIdentifier}`);
      await this.emitProgress('in_progress', 'verify_login', `Verifying login status`);
      await this.verifyLogin();
      await this.emitProgress('completed', 'verify_login', `Login verification complete`);

      // 3. Check if the task is already completed
      this.logger(`Checking if task is already completed for ${taskIdentifier}`);
      await this.emitProgress('in_progress', 'check_completion', `Checking if task is already completed`);
      if (await this.isAlreadyCompleted(data)) {
        this.logger(`✅ Task already completed for ${taskIdentifier}`);
        await this.emitProgress('skipped', 'check_completion', `Task already completed`, { action: 'already_completed' });
        await this.auditLogger?.logStepEnd(
          taskName,
          `${taskName}_execution`,
          true,
          this.profileId,
          this.profileName,
          { data, action: 'already_completed' },
        );
        return { success: true, data: { action: 'already_completed' } };
      }
      await this.emitProgress('completed', 'check_completion', `Task not yet completed`);

      // 4. If verifyOnly, run verification and return
      if (this.options.verifyOnly) {
        this.logger(`Verification only for ${taskIdentifier}.`);
        await this.emitProgress('in_progress', 'verify_only', `Performing verification only`);
        const verificationResult = await this.verify(data);
        await this.emitProgress(verificationResult.success ? 'completed' : 'failed', 'verify_only', `Verification only complete`, { result: verificationResult });
        return verificationResult;
      }

      // 5. Execute the core task action
      this.logger(`Executing core task action for ${taskIdentifier}`);
      await this.emitProgress('in_progress', 'execute_action', `Executing core task action`);
      await this.execute(data);
      if (this.options.delayBetweenActions) await this.automation.delay('long');
      await this.emitProgress('completed', 'execute_action', `Core task action executed`);

      // 6. Verify the task was successfully completed
      this.logger(`Verifying task completion for ${taskIdentifier}`);
      await this.emitProgress('in_progress', 'verify_completion', `Verifying task completion`);
      const verification = await this.verify(data);
      if (verification.success) {
        this.logger(`✅ Successfully completed ${taskName} for ${taskIdentifier}`);
        await this.emitProgress('completed', 'verify_completion', `Task successfully verified`, { result: verification.data });
        await this.auditLogger?.logStepEnd(
          taskName,
          `${taskName}_execution`,
          true,
          this.profileId,
          this.profileName,
          { data, result: verification.data },
        );
        return { success: true, data: verification.data };
      } else {
        await this.emitProgress('failed', 'verify_completion', `Task verification failed`, { error: verification.error });
        throw new Error(verification.error || 'Verification failed');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.logger(`❌ ${taskName} failed for ${taskIdentifier}: ${errorMessage}`);
      await this.emitProgress('failed', 'execution', `Task failed: ${errorMessage}`, { error: errorMessage });
      
      // Fallback: Re-verify in case the error was transient
      this.logger(`Attempting fallback verification for ${taskIdentifier}`);
      await this.emitProgress('in_progress', 'fallback_verification', `Attempting fallback verification`);
      const fallbackVerify = await this.verify(data);
      if (fallbackVerify.success) {
        this.logger(`  ℹ️  Fallback verification successful, assuming task is complete.`);
        await this.emitProgress('completed', 'fallback_verification', `Fallback verification successful`, { action: 'completed_on_fallback' });
        await this.auditLogger?.logStepEnd(
          taskName,
          `${taskName}_execution`,
          true,
          this.profileId,
          this.profileName,
          { data, action: 'completed_on_fallback' },
        );
        return { success: true, data: { action: 'completed_on_fallback' } };
      }
      await this.emitProgress('failed', 'fallback_verification', `Fallback verification failed`, { error: fallbackVerify.error });

      await this.auditLogger?.logStepEnd(
        taskName,
        `${taskName}_execution`,
        false,
        this.profileId,
        this.profileName,
        { data, error: errorMessage },
      );
      return { success: false, error: errorMessage };
    }
  }

  protected async findAndClick(selectors: string[], description: string, timeout = 10000): Promise<void> {
    this.logger(`Attempting to find and click: ${description}`);
    await this.emitProgress('in_progress', 'find_and_click', `Attempting to find and click: ${description}`);
    const { selectorUsed } = await retryWithBackoff(() => findElementSmart(this.page, selectors, timeout));
    this.logger(`Found element with "${selectorUsed}". Clicking...`);
    await (this.page as any).humanClick(selectorUsed);
    await this.auditLogger?.logAction(
      this.getTaskName(),
      `click_${description.replace(/\s+/g, '_')}`,
      true,
      this.profileId,
      this.profileName,
      { selector: selectorUsed },
    );
    await this.emitProgress('completed', 'find_and_click', `Clicked: ${description}`, { selector: selectorUsed });
  }

  protected abstract getTaskName(): string;
  protected abstract getTaskIdentifier(data: TData): string;
  protected abstract navigate(data: TData): Promise<void>;
  protected abstract verifyLogin(): Promise<void>;
  protected abstract isAlreadyCompleted(data: TData): Promise<boolean>;
  protected abstract execute(data: TData): Promise<void>;
  protected abstract verify(data: TData): Promise<TaskResult>;
}
