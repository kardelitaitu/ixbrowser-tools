import 'dotenv/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AuditLogger } from '../utils/audit-logger';
import { IxBrowserClient } from '../utils/ixBrowserClient';
import { BrowserPool } from './browser-pool';
import { ProfileManager } from './profile-manager';
import { AutomationRunner } from './automation-runner';

/**
 * @fileoverview Main automation class for ixBrowser profile management and execution.
 */

interface IxBrowserAutomationOptions {
  baseUrl?: string;
  apiKey?: string;
  logFile?: string;
  timeout?: number;
  poolMaxSize?: number;
  poolTimeout?: number;
}

class IxBrowserAutomation {
  private baseUrl: string;
  private apiKey: string;
  private ixBrowserClient: IxBrowserClient;
  private logFile: string;
  private timeout: number;
  public auditLogger: AuditLogger;
  private browserPool: BrowserPool;
  private profileManager: ProfileManager;
  private automationRunner: AutomationRunner;

  constructor(options: IxBrowserAutomationOptions = {}) {
    this.baseUrl = process.env.BASE_URL || options.baseUrl;
    this.apiKey = process.env.IXBROWSER_API_KEY || options.apiKey;

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('BASE_URL and IXBROWSER_API_KEY must be defined in your .env file');
    }

    this.ixBrowserClient = new IxBrowserClient(this.baseUrl, this.apiKey);
    this.logFile = path.join(
      __dirname,
      'logs',
      `_launchAutomation_${new Date().toISOString().replace(/:/g, '-')}.log`
    );
    this.timeout = options.timeout || 300000; // 5 minutes default
    this.auditLogger = new AuditLogger({
      sessionId: `automation_${Date.now()}`,
    });

    // Initialize specialized modules
    this.browserPool = new BrowserPool(
      this.ixBrowserClient,
      this.auditLogger,
      {
        maxSize: options.poolMaxSize || 10,
        timeout: options.poolTimeout || 60000
      }
    );
    this.profileManager = new ProfileManager(this.ixBrowserClient, this.auditLogger);
    this.automationRunner = new AutomationRunner(
      this.browserPool,
      this.auditLogger,
      { timeout: this.timeout }
    );
  }

  /**
   * Logs a message to console and file.
   * @param message - The message to log.
   * @param level - The log level (INFO, ERROR, WARN).
   */
  async log(message: string, level = 'INFO'): Promise<void> {
    const logMessage = `[${new Date().toISOString()}] [${level}] ${message}`;
    console.log(logMessage);

    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }



  /**
   * Runs automation in parallel across all opened profiles.
   * @returns A promise that resolves with the results and summary of the parallel automation.
   */
  async runParallelAutomation(): Promise<{results: any[], summary: any}> {
    await this.log('Starting parallel automation across all opened profiles.', 'INFO');
    try {
      const openedProfiles = await this.profileManager.getOpenedProfilesLazy();
      return await this.automationRunner.runParallelAutomation(openedProfiles);
    } catch (error) {
      await this.log(`Parallel automation failed: ${(error as Error).message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Cleans up resources and closes all browser connections.
   */
  async cleanup(): Promise<void> {
    await this.browserPool.closeAll();
  }
}

/**
 * Main execution function.
 * @returns A promise that resolves with the results and summary of the automation.
 */
async function main(): Promise<{results: any[], summary: any}> {
  const automation = new IxBrowserAutomation();

  try {
    await automation.auditLogger.logStepStart('session', 'main_execution');
    await automation.log('=== AUTOMATION SESSION STARTED ===');
    const { results, summary } = await automation.runParallelAutomation();

    await automation.log(
      `Automation completed. Success rate: ${summary.successRate}%`
    );
    await automation.log('=== AUTOMATION SESSION COMPLETED ===');
    await automation.auditLogger.logStepEnd(
      'session',
      'main_execution',
      true,
      null,
      null,
      { summary }
    );

    return { results, summary };
  } catch (error) {
    await automation.log(`Execution failed: ${(error as Error).message}`, 'ERROR');
    await automation.auditLogger.logStepEnd(
      'session',
      'main_execution',
      false,
      null,
      null,
      {},
      (error as Error).message
    );
    await automation.cleanup();
    process.exit(1);
  } finally {
    await automation.cleanup();
  }
}

// Run script or export for module use
if (require.main === module) {
  main().catch(console.error);
}

export default IxBrowserAutomation;
