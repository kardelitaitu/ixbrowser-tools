import 'dotenv/config';
import { chromium, Browser, BrowserContext, Page, Route } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { run as automationRun } from '../core/_automation';
import { AuditLogger } from '../utils/audit-logger';
import { retryProfileConnection } from '../utils/retry-utils';
import { AutomationTimeoutError } from '../utils/errors';
import { IxBrowserClient } from '../utils/ixBrowserClient';

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

interface PooledConnection {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  profileData: any;
  lastUsed: number;
}

class IxBrowserAutomation {
  private baseUrl: string;
  private apiKey: string;
  private ixBrowserClient: IxBrowserClient;
  private logFile: string;
  private timeout: number;
  public auditLogger: AuditLogger;
  private browserPool: Map<string, PooledConnection>;
  private poolMaxSize: number;
  private poolTimeout: number;
  private _cachedProfiles: any[] | undefined;

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
   * Applies anti-detection scripts to a page.
   * @param page - The Playwright page instance.
   */
  async applyAntiDetection(page: Page): Promise<void> {
    const antiDetectionScripts = [
      () => {
        delete (Object.getPrototypeOf(navigator) as any).webdriver;
        delete (navigator as any).webdriver;
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      },
      () => {
        (window as any).outerHeight = window.innerHeight;
        (window as any).outerWidth = window.innerWidth;
      },
      () => {
        (window as any).chrome = (window as any).chrome || {};
        (window as any).chrome.runtime = (window as any).chrome.runtime || {};
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
  async setupResourceBlocking(page: Page): Promise<void> {
    await page.route(/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
      (route: Route) => route.abort());
    await page.route(/.*\.css(\?.*)?$/,
      (route: Route) => route.abort());
    await page.route(
      (url: URL) => {
        return url.protocol === 'http:' || url.protocol === 'https:';
      },
      (route: Route) => {
        const request = route.request();
        if (
          request.resourceType() === 'image' ||
          request.resourceType() === 'media' ||
          request.resourceType() === 'font'
        ) {
          route.abort();
        } else {
          route.continue();
        }
      }
    );
    await this.log('Resource blocking enabled for page.', 'INFO');
  }

  /**
   * Fetches a list of opened profiles from ixBrowser (lazy loading for performance).
   * @returns A promise that resolves with an array of profile objects.
   */
  async getOpenedProfiles(): Promise<any[]> {
    await this.auditLogger.logStepStart('session', 'fetch_profiles');
    try {
      const profiles = await this.ixBrowserClient.getOpenedProfiles();
      await this.auditLogger.logStepEnd(
        'session',
        'fetch_profiles',
        true,
        null,
        null,
        { profileCount: profiles.length }
      );
      return profiles;
    } catch (error) {
      await this.log(`Profile fetch error: ${(error as Error).message}`, 'WARN');
      await this.auditLogger.logStepEnd(
        'session',
        'fetch_profiles',
        false,
        null,
        null,
        {},
        (error as Error).message
      );
      return [];
    }
  }

  /**
   * Gets profiles lazily: Only fetches if not already loaded (for large profile sets).
   * @returns A promise that resolves with an array of profile objects.
   */
  async getOpenedProfilesLazy(): Promise<any[]> {
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
  async connectToProfile(profile: any): Promise<PooledConnection> {
    const profileId = profile.profile_id;
    await this.auditLogger.logStepStart('profile', 'connect', profileId);
    try {
      // Check pool for existing connection
      const pooled = this.browserPool.get(profileId);
      if (pooled && (Date.now() - pooled.lastUsed < this.poolTimeout)) {
        pooled.lastUsed = Date.now();
        await this.log(`Reusing pooled connection for profile: ${profileId}`, 'INFO');
        await this.auditLogger.logStepEnd(
          'profile',
          'connect',
          true,
          profileId,
          pooled.profileData.name,
          { reused: true }
        );
        return pooled;
      }
      await this.log(`Attempting to connect to profile: ${profileId}. Pool size: ${this.browserPool.size}/${this.poolMaxSize}`, 'INFO');

      // Clean up expired pool entries
      this.cleanupPool();

      const response = await retryProfileConnection(async () => {
        return await this.ixBrowserClient.openProfile(profileId);
      }, 3);

      const { ws: wsEndpoint } = response.data;
      await this.log(`Connecting to CDP endpoint for profile ${profileId}: ${wsEndpoint}`, 'INFO');
      const browser = await chromium.connectOverCDP(wsEndpoint);
      const context = browser.contexts()[0];
      const page = await context.newPage();

      await this.log(`Applying anti-detection scripts for profile ${profileId}`, 'INFO');
      await this.applyAntiDetection(page);
      await this.setupResourceBlocking(page);

      const connection: PooledConnection = { browser, context, page, profileData: { ...profile, ...response.data }, lastUsed: Date.now() };

      // Add to pool if under max size
      if (this.browserPool.size < this.poolMaxSize) {
        this.browserPool.set(profileId, connection);
        await this.log(`Added new connection for profile ${profileId} to pool. Current pool size: ${this.browserPool.size}`, 'INFO');
      }

      await this.auditLogger.logStepEnd(
        'profile',
        'connect',
        true,
        profileId,
        profile.name,
        { wsEndpoint, pooled: !!pooled }
      );
      return connection;
    } catch (error) {
      await this.log(`Profile connection error: ${(error as Error).message}`, 'ERROR');
      await this.auditLogger.logStepEnd(
        'profile',
        'connect',
        false,
        profileId,
        null,
        {},
        (error as Error).message
      );
      throw error;
    }
  }

  /**
   * Cleans up expired pool entries to prevent memory leaks.
   */
  cleanupPool(): void {
    const now = Date.now();
    for (const [id, conn] of this.browserPool) {
      if (now - conn.lastUsed > this.poolTimeout) {
        this.browserPool.delete(id);
        conn.browser.close().catch(() => {}); // Ignore errors
      }
    }
  }

  /**
   * Runs automation on a single profile.
   * @param profile - The profile object.
   * @returns A promise that resolves with the automation result for the profile.
   */
  async runProfileAutomation(profile: any): Promise<{success: boolean, profileId: string, profileName: string, result?: any, duration?: number, error?: string, type?: string}> {
    const profileId = profile.profile_id || profile.id;
    const profileName = profile.name || `Profile-${profileId}`;

    await this.log(`Starting automation for profile: ${profileName} (${profileId})`, 'INFO');
    await this.auditLogger.logStepStart(
      'profile',
      'automation_run',
      profileId,
      profileName
    );

    try {
      const { browser, context, page, profileData } =
        await this.connectToProfile(profile);

      try {
        const startTime = Date.now();
        const result = await automationRun(
          browser,
          context,
          page,
          profileData,
          this.auditLogger
        );
        const duration = Date.now() - startTime;

        await this.log(`Automation for profile ${profileName} (${profileId}) completed successfully in ${duration}ms. Result type: ${result.type}`, 'INFO');
        await this.auditLogger.logStepEnd(
          'profile',
          'automation_run',
          true,
          profileId,
          profileName,
          { resultType: result.type },
          null,
          duration
        );

        return {
          success: true,
          profileId,
          profileName,
          result,
          duration,
        };
      } catch (automationError) {
        await this.log(`Automation for profile ${profileName} (${profileId}) failed: ${(automationError as Error).message}`, 'ERROR');
        await this.auditLogger.logStepEnd(
          'profile',
          'automation_run',
          false,
          profileId,
          profileName,
          {},
          (automationError as Error).message
        );
        return {
          success: false,
          profileId,
          profileName,
          error: (automationError as Error).message,
          type: 'automation_error',
        };
      } finally {
        // Do not close the browser here; it is managed by the browserPool and cleanupPool.
        // Only close the page to free up resources for the next task.
        await page.close();
        await this.log(`Page closed for profile ${profileName} (${profileId})`, 'INFO');
      }
    } catch (connectionError) {
      await this.log(`Connection to profile ${profileName} (${profileId}) failed: ${(connectionError as Error).message}`, 'ERROR');
      await this.auditLogger.logStepEnd(
        'profile',
        'automation_run',
        false,
        profileId,
        profileName,
        {},
        (connectionError as Error).message
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

  /**
   * Runs automation in parallel across all opened profiles.
   * @returns A promise that resolves with the results and summary of the parallel automation.
   */
  async runParallelAutomation(): Promise<{results: any[], summary: any}> {
    await this.log('Starting parallel automation across all opened profiles.', 'INFO');
    await this.auditLogger.logStepStart('session', 'parallel_execution');
    try {
      const openedProfiles = await this.getOpenedProfilesLazy(); // Use lazy loading
      if (openedProfiles.length === 0) {
        await this.log('No profiles found to automate.', 'WARN');
        await this.auditLogger.logStepEnd(
          'session',
          'parallel_execution',
          false,
          null,
          null,
          { reason: 'no_profiles' }
        );
        return { results: [], summary: { total: 0, successful: 0, failed: 0 } };
      }

      await this.log(`Found ${openedProfiles.length} profiles for parallel automation.`, 'INFO');
      const startTime = Date.now();
      const automationPromises = openedProfiles.map((profile) =>
        Promise.race([
          this.runProfileAutomation(profile),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new AutomationTimeoutError(`Profile automation timed out after ${this.timeout}ms`, this.timeout)), this.timeout)
          ),
        ])
      );

      const results = await Promise.allSettled(automationPromises);
      const processedResults = results.map((result, index) =>
        result.status === 'fulfilled'
          ? result.value
          : {
              success: false,
              profileId:
                openedProfiles[index].profile_id || openedProfiles[index].id,
              profileName:
                openedProfiles[index].name ||
                `Profile-${openedProfiles[index].profile_id || openedProfiles[index].id}`,
              error: (result.reason as Error).message,
              type: 'promise_rejection',
            }
      );

      const summary = this.generateSummary(
        processedResults,
        Date.now() - startTime
      );
      await this.log(`Parallel automation completed. Summary: Total: ${summary.total}, Successful: ${summary.successful}, Failed: ${summary.failed}, Success Rate: ${summary.successRate}%`, 'INFO');
      await this.auditLogger.logStepEnd(
        'session',
        'parallel_execution',
        true,
        null,
        null,
        { summary },
        null,
        Date.now() - startTime
      );

      return {
        results: processedResults,
        summary,
      };
    } catch (error) {
      await this.log(`Parallel automation failed: ${(error as Error).message}`, 'ERROR');
      await this.auditLogger.logStepEnd(
        'session',
        'parallel_execution',
        false,
        null,
        null,
        {},
        (error as Error).message
      );
      throw error;
    }
  }

  /**
   * Generates an execution summary from the results.
   * @param results - An array of execution results.
   * @param totalDuration - The total execution time in milliseconds.
   * @returns A summary object with totals and success rate.
   */
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
    process.exit(1);
  }
}

// Run script or export for module use
if (require.main === module) {
  main().catch(console.error);
}

export default IxBrowserAutomation;
