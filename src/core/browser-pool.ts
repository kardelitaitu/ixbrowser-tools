import { chromium, Browser, BrowserContext, Page, Route } from 'playwright';
import { AuditLogger } from '../utils/audit-logger';
import { IxBrowserClient } from '../utils/ixBrowserClient';
import { retryProfileConnection } from '../utils/retry-utils';

export interface PooledConnection {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  profileData: any;
  lastUsed: number;
}

export interface BrowserPoolOptions {
  maxSize?: number;
  timeout?: number;
}

export class BrowserPool {
  private pool: Map<string, PooledConnection> = new Map();
  private maxSize: number;
  private timeout: number;
  private auditLogger: AuditLogger;
  private ixBrowserClient: IxBrowserClient;

  constructor(
    ixBrowserClient: IxBrowserClient,
    auditLogger: AuditLogger,
    options: BrowserPoolOptions = {},
  ) {
    this.ixBrowserClient = ixBrowserClient;
    this.auditLogger = auditLogger;
    this.maxSize = options.maxSize || 10;
    this.timeout = options.timeout || 60000;
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
      },
    );
  }

  async connectToProfile(profile: any): Promise<PooledConnection> {
    const profileId = profile.profile_id;
    await this.auditLogger.logStepStart('profile', 'connect', profileId);

    try {
      const pooled = this.pool.get(profileId);
      if (pooled && Date.now() - pooled.lastUsed < this.timeout) {
        pooled.lastUsed = Date.now();
        await this.auditLogger.logStepEnd(
          'profile',
          'connect',
          true,
          profileId,
          pooled.profileData.name,
          { reused: true },
        );
        return pooled;
      }

      this.cleanupPool();

      const response = await retryProfileConnection(async() => {
        return await this.ixBrowserClient.openProfile(profileId);
      }, 3);

      const { ws: wsEndpoint } = response.data as any;
      const browser = await chromium.connectOverCDP(wsEndpoint);
      const context = browser.contexts()[0];
      const page = await context.newPage();

      await this.applyAntiDetection(page);
      await this.setupResourceBlocking(page);

      const connection: PooledConnection = {
        browser,
        context,
        page,
        profileData: { ...profile, ...(response.data as any) },
        lastUsed: Date.now(),
      };

      if (this.pool.size < this.maxSize) {
        this.pool.set(profileId, connection);
      }

      await this.auditLogger.logStepEnd(
        'profile',
        'connect',
        true,
        profileId,
        profile.name,
        { wsEndpoint, pooled: !!pooled },
      );
      return connection;
    } catch (error) {
      await this.auditLogger.logStepEnd(
        'profile',
        'connect',
        false,
        profileId,
        null,
        {},
        (error as Error).message,
      );
      throw error;
    }
  }

  cleanupPool(): void {
    const now = Date.now();
    for (const [id, conn] of this.pool) {
      if (now - conn.lastUsed > this.timeout) {
        this.pool.delete(id);
        conn.browser.close().catch(() => {}); // Ignore errors
      }
    }
  }

  /**
   * Closes all pooled connections.
   */
  async closeAll(): Promise<void> {
    for (const [id, conn] of this.pool) {
      try {
        await conn.browser.close();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.pool.delete(id);
    }
  }

  /**
   * Gets the current pool size.
   */
  get size(): number {
    return this.pool.size;
  }
}
