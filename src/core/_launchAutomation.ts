import { AuditLogger } from '../utils/audit-logger';
import { IxBrowserClient } from '../utils/ixBrowserClient';
import { BrowserPool } from './browser-pool';
import { ProfileManager } from './profile-manager';
import { AutomationRunner } from './automation-runner';
import { ConfigService } from './config';
import { UnifiedLogger } from '../utils/unified-logger';
import { IxBrowserAutomationOptions, AutomationRunResult, Summary } from '../types/core';
import { ConfigurationError } from '../utils/errors';

/**
 * @fileoverview Main automation class for ixBrowser profile management and execution.
 */

class IxBrowserAutomation {
  private baseUrl: string;
  private apiKey: string;
  private ixBrowserClient: IxBrowserClient;
  private timeout: number;
  public auditLogger: AuditLogger;
  public logger: UnifiedLogger;
  private browserPool: BrowserPool;
  private profileManager: ProfileManager;
  private automationRunner: AutomationRunner;
  private configService: ConfigService;

  constructor(
    configService: ConfigService,
    auditLogger: AuditLogger,
    options: IxBrowserAutomationOptions = {},
  ) {
    this.configService = configService;
    this.auditLogger = auditLogger;
    this.logger = new UnifiedLogger(auditLogger, 'IxBrowserAutomation');

    this.baseUrl = this.configService.getBaseUrl();
    this.apiKey = this.configService.getApiKey();

    if (!this.baseUrl || !this.apiKey) {
      throw new ConfigurationError('BASE_URL and IXBROWSER_API_KEY must be defined in your .env file or provided in options');
    }

    this.ixBrowserClient = new IxBrowserClient(this.baseUrl, this.apiKey);
    this.timeout = options.timeout || 300000; // 5 minutes default

    // Initialize specialized modules
    this.browserPool = new BrowserPool(
      this.ixBrowserClient,
      this.auditLogger,
      {
        maxSize: options.poolMaxSize || 10,
        timeout: options.poolTimeout || 60000,
      },
    );
    this.profileManager = new ProfileManager(this.ixBrowserClient, this.auditLogger);
    this.automationRunner = new AutomationRunner(
      this.browserPool,
      this.auditLogger,
      { timeout: this.timeout },
    );
  }

  /**
   * Runs automation in parallel across all opened profiles.
   * @returns A promise that resolves with the results and summary of the parallel automation.
   */
  async runParallelAutomation(): Promise<{results: AutomationRunResult[], summary: Summary}> {
    this.logger.log('Starting parallel automation across all opened profiles.');
    try {
      const openedProfiles = await this.profileManager.getOpenedProfilesLazy();
      return await this.automationRunner.runParallelAutomation(openedProfiles);
    } catch (error) {
      this.logger.error(`Parallel automation failed: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Cleans up resources and closes all browser connections.
   */
  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up browser pool resources.');
    await this.browserPool.closeAll();
  }
}

/**
 * Main execution function.
 * @returns A promise that resolves with the results and summary of the automation.
 */
async function main(): Promise<{results: AutomationRunResult[], summary: Summary} | void> {
  const configService = ConfigService.getInstance();
  const auditLogger = new AuditLogger({
    sessionId: `automation_${Date.now()}`,
  });
  const mainLogger = new UnifiedLogger(auditLogger, 'Main');

  let automation: IxBrowserAutomation | undefined;

  try {
    await auditLogger.logStepStart('session', 'main_execution');
    mainLogger.log('=== AUTOMATION SESSION STARTED ===');

    automation = new IxBrowserAutomation(configService, auditLogger);
    const { results, summary } = await automation.runParallelAutomation();

    mainLogger.log(
      `Automation completed. Success rate: ${summary.successRate}%`,
    );
    mainLogger.log('=== AUTOMATION SESSION COMPLETED ===');
    await auditLogger.logStepEnd(
      'session',
      'main_execution',
      true,
      null,
      null,
      { summary },
    );

    return { results, summary };
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : 'Unknown error during main execution';
    mainLogger.error(`Execution failed: ${errorMessage}`);
    await auditLogger.logStepEnd(
      'session',
      'main_execution',
      false,
      null,
      null,
      {}, // No specific data to log for this error
      errorMessage,
    );
    if (automation) {
      await automation.cleanup();
    }
    // Re-throw the error to indicate failure to the process runner
    throw error;
  } finally {
    if (automation) {
      await automation.cleanup();
    }
  }
}

// Run script or export for module use
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled automation error:', error);
    process.exit(1);
  });
}

export default IxBrowserAutomation;
