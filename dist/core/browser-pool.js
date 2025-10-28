"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserPool = void 0;
const playwright_1 = require("playwright");
const retry_utils_1 = require("../utils/retry-utils");
class BrowserPool {
    pool = new Map();
    maxSize;
    timeout;
    auditLogger;
    ixBrowserClient;
    constructor(ixBrowserClient, auditLogger, options = {}) {
        this.ixBrowserClient = ixBrowserClient;
        this.auditLogger = auditLogger;
        this.maxSize = options.maxSize || 10;
        this.timeout = options.timeout || 60000;
    }
    /**
     * Applies anti-detection scripts to a page.
     * @param page - The Playwright page instance.
     */
    async applyAntiDetection(page) {
        const antiDetectionScripts = [
            () => {
                delete Object.getPrototypeOf(navigator).webdriver;
                delete navigator.webdriver;
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            },
            () => {
                window.outerHeight = window.innerHeight;
                window.outerWidth = window.innerWidth;
            },
            () => {
                window.chrome = window.chrome || {};
                window.chrome.runtime = window.chrome.runtime || {};
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
    async setupResourceBlocking(page) {
        await page.route(/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/, (route) => route.abort());
        await page.route(/.*\.css(\?.*)?$/, (route) => route.abort());
        await page.route((url) => {
            return url.protocol === 'http:' || url.protocol === 'https:';
        }, (route) => {
            const request = route.request();
            if (request.resourceType() === 'image' ||
                request.resourceType() === 'media' ||
                request.resourceType() === 'font') {
                route.abort();
            }
            else {
                route.continue();
            }
        });
    }
    async connectToProfile(profile) {
        const profileId = profile.profile_id;
        await this.auditLogger.logStepStart('profile', 'connect', profileId);
        try {
            const pooled = this.pool.get(profileId);
            if (pooled && Date.now() - pooled.lastUsed < this.timeout) {
                pooled.lastUsed = Date.now();
                await this.auditLogger.logStepEnd('profile', 'connect', true, profileId, pooled.profileData.name, { reused: true });
                return pooled;
            }
            this.cleanupPool();
            const response = await (0, retry_utils_1.retryProfileConnection)(async () => {
                return await this.ixBrowserClient.openProfile(profileId);
            }, 3);
            const { ws: wsEndpoint } = response.data;
            const browser = await playwright_1.chromium.connectOverCDP(wsEndpoint);
            const context = browser.contexts()[0];
            const page = await context.newPage();
            await this.applyAntiDetection(page);
            await this.setupResourceBlocking(page);
            const connection = {
                browser,
                context,
                page,
                profileData: { ...profile, ...response.data },
                lastUsed: Date.now(),
            };
            if (this.pool.size < this.maxSize) {
                this.pool.set(profileId, connection);
            }
            await this.auditLogger.logStepEnd('profile', 'connect', true, profileId, profile.name, { wsEndpoint, pooled: !!pooled });
            return connection;
        }
        catch (error) {
            await this.auditLogger.logStepEnd('profile', 'connect', false, profileId, null, {}, error.message);
            throw error;
        }
    }
    cleanupPool() {
        const now = Date.now();
        for (const [id, conn] of this.pool) {
            if (now - conn.lastUsed > this.timeout) {
                this.pool.delete(id);
                conn.browser.close().catch(() => { }); // Ignore errors
            }
        }
    }
    /**
     * Closes all pooled connections.
     */
    async closeAll() {
        for (const [id, conn] of this.pool) {
            try {
                await conn.browser.close();
            }
            catch (error) {
                // Ignore errors during cleanup
            }
            this.pool.delete(id);
        }
    }
    /**
     * Gets the current pool size.
     */
    get size() {
        return this.pool.size;
    }
}
exports.BrowserPool = BrowserPool;
