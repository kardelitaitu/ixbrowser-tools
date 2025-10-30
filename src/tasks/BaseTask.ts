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
  protected logger: (_msg: string) => void;
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
      data: data || {},
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
    this.logger(`Start ${taskName} for: ${taskIdentifier}`);
    await this.emitProgress('started', 'initialization', `Starting task for ${taskIdentifier}`, { data, options: this.options });

    try {
      await this.auditLogger?.logStepStart(
        taskName,
        `${taskName}_execution`,
        this.profileId,
        this.profileName,
        { data, options: this.options },
      );

      // 1. Navigate
      await this.navigate(data);
      if (this.options.delayBetweenActions) await this.automation.delay('short');

      // 2. Verify login
      await this.verifyLogin();

      // 3. Check if already completed
      if (await this.isAlreadyCompleted(data)) {
        this.logger(`✅ Task is already completed for ${taskIdentifier}. Skipping.`);
        // The decorator on isAlreadyCompleted handles the 'completed' status for the step,
        // but we emit a special 'skipped' status for the overall task.
        await this.emitProgress('skipped', 'isAlreadyCompleted', 'Task already completed');
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

      // 4. Handle verifyOnly option
      if (this.options.verifyOnly) {
        this.logger(`Verify only for ${taskIdentifier}.`);
        // The decorator on `verify` will handle the logging and emitting.
        return this.verify(data);
      }

      // 5. Execute the core task action
      try {
        await this.execute(data);
        if (this.options.delayBetweenActions) await this.automation.delay('long');
      } catch (executionError) {
        // The decorator on `execute` will have already logged the error.
        // We catch it here simply to allow the process to continue to the final verification.
        this.logger('Execution step failed. Proceeding to final verification to confirm status.');
      }

      // 6. Final Verification
      const finalVerification = await this.verify(data);

      if (finalVerification.success) {
        this.logger(`✅ ${taskName} verified successfully for ${taskIdentifier}`);
        await this.auditLogger?.logStepEnd(
          taskName,
          `${taskName}_execution`,
          true,
          this.profileId,
          this.profileName,
          { data, result: finalVerification.data },
        );
        return { success: true, data: finalVerification.data };
      } else {
        const errorMessage = finalVerification.error || 'Verification failed';
        this.logger(`❌ ${taskName} final verification failed for ${taskIdentifier}: ${errorMessage}`);
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
    } catch (error) {
      // This outer catch block now handles critical, preliminary errors (e.g., from navigate or verifyLogin).
      const errorMessage = (error as Error).message;
      this.logger(`❌ ${taskName} failed with a critical error for ${taskIdentifier}: ${errorMessage}`);
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
    this.logger(`Find & click: ${description}`);
    await this.emitProgress('in_progress', 'find_and_click', `Attempting to find and click: ${description}`);
    const { selectorUsed } = await retryWithBackoff(() => findElementSmart(this.page, selectors, timeout));
    this.logger(`Found "${selectorUsed}". Click...`);
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
  protected abstract getTaskIdentifier(_data: TData): string;
  protected abstract navigate(_data: TData): Promise<void>;
  protected abstract verifyLogin(): Promise<void>;
  protected abstract isAlreadyCompleted(data: TData): Promise<boolean>;
  protected abstract execute(_data: TData): Promise<void>;
  protected abstract verify(_data: TData): Promise<TaskResult>;
}
