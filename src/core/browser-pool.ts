import { chromium, Browser, BrowserContext, Page, Route } from 'playwright';
import { AuditLogger } from '../utils/audit-logger';
import { IxBrowserClient } from '../utils/ixBrowserClient';
import { retryProfileConnection } from '../utils/retry-utils';
import { UnifiedLogger } from '../utils/unified-logger';
import { Profile, PooledConnection, BrowserPoolOptions } from '../types/core';
import { ProfileConnectionError } from '../utils/errors';

export class BrowserPool {
  private pool: Map<string, PooledConnection> = new Map();
  private maxSize: number;
  private timeout: number;
  private logger: UnifiedLogger;
  private auditLogger: AuditLogger;
  private ixBrowserClient: IxBrowserClient;

  constructor(
    ixBrowserClient: IxBrowserClient,
    auditLogger: AuditLogger,
    logger: UnifiedLogger,
    options: BrowserPoolOptions = {},
  ) {
    this.ixBrowserClient = ixBrowserClient;
    this.auditLogger = auditLogger;
    this.logger = logger;
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
   * @param blockResources - Optional: array of resource types to block (e.g., 'image', 'media', 'font', 'stylesheet').
   */
  async setupResourceBlocking(page: Page, blockResources: string[] = []): Promise<void> {
    if (blockResources.length === 0) {
      this.logger.log('No resources specified for blocking.');
      return;
    }

    await page.route(/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
      (route: Route) => {
        if (blockResources.includes('image') || blockResources.includes('media')) {
          route.abort();
        } else {
          route.continue();
        }
      });
    await page.route(/.*\.css(\?.*)?$/,
      (route: Route) => {
        if (blockResources.includes('stylesheet')) {
          route.abort();
        } else {
          route.continue();
        }
      });
    await page.route(
      (url: URL) => {
        return url.protocol === 'http:' || url.protocol === 'https:';
      },
      (route: Route) => {
        const request = route.request();
        if (
          blockResources.includes(request.resourceType())
        ) {
          route.abort();
        } else {
          route.continue();
        }
      },
    );
    this.logger.log(`Resource blocking enabled for: ${blockResources.join(', ')}`);
  }

  async connectToProfile(profile: Profile): Promise<PooledConnection> {
    const profileId = profile.profile_id || profile.id;
    await this.auditLogger.logStepStart('profile', 'connect', profileId);

    try {
      const pooled = this.pool.get(profileId);
      if (pooled && Date.now() - pooled.lastUsed < this.timeout) {
        pooled.lastUsed = Date.now(); // Update lastUsed even if reused
        this.logger.log(`Reusing pooled connection for profile ${profile.name} (${profileId})`);
        await this.auditLogger.logStepEnd(
          'profile',
          'connect',
          true,
          profileId,
          profile.name,
          { reused: true },
        );
        return pooled;
      }

      this.cleanupPool();

      this.logger.log(`Attempting to open profile ${profile.name} (${profileId})`);
      const response = await retryProfileConnection(async() => {
        return await this.ixBrowserClient.openProfile(profileId);
      }, 3);

      const { ws: wsEndpoint } = response.data as any;
      const browser = await chromium.connectOverCDP(wsEndpoint);
      const context = browser.contexts()[0];
      const page = await context.newPage();

      await this.applyAntiDetection(page);
      // Example: block images and fonts by default
      await this.setupResourceBlocking(page, ['image', 'font']);

      const connection: PooledConnection = {
        browser,
        context,
        page,
        profileData: { ...profile, ...(response.data as any) },
        lastUsed: Date.now(),
      };

      if (this.pool.size < this.maxSize) {
        this.pool.set(profileId, connection);
        this.logger.log(`Added profile ${profile.name} (${profileId}) to pool. Current size: ${this.pool.size}`);
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
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown connection error';
      this.logger.error(`Failed to connect to profile ${profile.name} (${profileId}): ${errorMessage}`);
      await this.auditLogger.logStepEnd(
        'profile',
        'connect',
        false,
        profileId,
        profile.name,
        {},
        errorMessage,
      );
      throw new ProfileConnectionError(`Failed to connect to profile ${profile.name} (${profileId}): ${errorMessage}`, profileId, { originalError: error });
    }
  }

  cleanupPool(): void {
    const now = Date.now();
    for (const [id, conn] of this.pool) {
      if (now - conn.lastUsed > this.timeout) {
        this.pool.delete(id);
        conn.browser.close().catch((error) => {
          this.logger.warn(`Error closing idle browser for profile ${conn.profileData.name} (${id}): ${(error as Error).message}`);
        });
        this.logger.log(`Cleaned up idle connection for profile ${conn.profileData.name} (${id})`);
      }
    }
  }

  /**
   * Closes all pooled connections.
   */
  async closeAll(): Promise<void> {
    this.logger.log('Closing all pooled browser connections.');
    for (const [id, conn] of this.pool) {
      try {
        await conn.browser.close();
        this.logger.log(`Closed connection for profile ${conn.profileData.name} (${id})`);
      } catch (error) {
        this.logger.error(`Error closing browser for profile ${conn.profileData.name} (${id}): ${(error as Error).message}`);
      }
      this.pool.delete(id);
    }
    this.logger.log('All pooled browser connections closed.');
  }

  /**
   * Gets the current pool size.
   */
  get size(): number {
    return this.pool.size;
  }
}
