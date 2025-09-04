//_launchAutomation.js

/**
 * This script orchestrates the automation of multiple ixBrowser instances in parallel.
 * It connects to the ixBrowser API, fetches the list of opened profiles, and then runs the automation tasks on each profile concurrently.
 * The script uses Playwright to launch and control the ixBrowser instances, and applies comprehensive anti-detection measures to ensure the automation is stealthy.
 * The results of the automation are logged to a file and the console, and a summary of the execution is provided.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const { run: automationRun } = require('./_automation.js');

class ixBrowserProfileManager {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:30000'; // Default ixBrowser local API port
        this.apiKey = process.env.IXBROWSER_API_KEY || 'your-api-key-here';
        this.logFile = path.join(__dirname, '_launchAutomationLog.txt');
    }

    /**
     * Log messages with timestamp to file and console
     */
    async log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Log to console
        console.log(logMessage);
        
        // Log to file
        try {
            await fs.appendFile(this.logFile, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    /**
     * Initialize log file
     */
    async initializeLog() {
        const separator = '='.repeat(100);
        const header = `\n${separator}\nNEW AUTOMATION SESSION STARTED\n${separator}\n`;
        try {
            await fs.appendFile(this.logFile, header);
        } catch (error) {
            console.error('Failed to initialize log file:', error.message);
        }
    }

    /**
     * Make HTTP request to ixBrowser API
     */
    async makeApiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            await this.log(`Making API request: ${method} ${url}`);
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            await this.log(`API response received successfully`);
            return data;
        } catch (error) {
            await this.log(`API request failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Apply comprehensive anti-detection measures (Playwright equivalent of puppeteer-stealth)
     */
    async applyAntiDetection(page, context) {
        await this.log('Applying anti-detection measures...');

        try {
            // 1. Remove webdriver property
            await page.addInitScript(() => {
                delete Object.getPrototypeOf(navigator).webdriver;
                delete navigator.webdriver;
            });

            // 2. Override user agent detection
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });

            // 3. Mock plugins
            await page.addInitScript(() => {
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
            });

            // 4. Override languages
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en', 'zh-CN', 'zh'],
                });
            });

            // 5. Mock platform
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'platform', {
                    get: () => 'Win32',
                });
            });

            // 6. Override chrome runtime
            await page.addInitScript(() => {
                window.chrome = {
                    runtime: {
                        onConnect: undefined,
                        onMessage: undefined,
                    },
                };
            });

            // 7. Mock hardware concurrency
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 4,
                });
            });

            // 8. Override device memory
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 8,
                });
            });

            // 9. Mock connection
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'connection', {
                    get: () => ({
                        effectiveType: '4g',
                        rtt: 100,
                        downlink: 10,
                    }),
                });
            });

            // 10. Override iframe contentWindow
            await page.addInitScript(() => {
                const iframe = HTMLIFrameElement.prototype;
                const originalContentWindow = Object.getOwnPropertyDescriptor(iframe, 'contentWindow');
                
                Object.defineProperty(iframe, 'contentWindow', {
                    get: function() {
                        return originalContentWindow.get.call(this);
                    },
                });
            });

            // 11. Mock screen properties
            await page.addInitScript(() => {
                Object.defineProperty(screen, 'colorDepth', {
                    get: () => 24,
                });
                Object.defineProperty(screen, 'pixelDepth', {
                    get: () => 24,
                });
            });

            // 12. Override notification permission
            await page.addInitScript(() => {
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: 'granted' }) :
                        originalQuery(parameters)
                );
                
                Notification.requestPermission = () => Promise.resolve('granted');
            });

            // 13. Mock canvas fingerprinting protection
            await page.addInitScript(() => {
                const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
                HTMLCanvasElement.prototype.toDataURL = function(type) {
                    if (type === 'image/png') {
                        // Return a consistent but realistic canvas fingerprint
                        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
                    }
                    return originalToDataURL.apply(this, arguments);
                };
            });

            // 14. Override getContext for WebGL fingerprinting protection
            await page.addInitScript(() => {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function(parameter) {
                    // Spoof common WebGL parameters
                    if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                    if (parameter === 37446) return 'Intel(R) Iris(TM) Graphics 6100'; // UNMASKED_RENDERER_WEBGL
                    return getParameter.apply(this, arguments);
                };
            });

            // 15. Mock media devices
            await page.addInitScript(() => {
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                    const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
                    navigator.mediaDevices.enumerateDevices = () => {
                        return Promise.resolve([
                            { deviceId: 'default', kind: 'audioinput', label: 'Default - Microphone', groupId: 'group1' },
                            { deviceId: 'default', kind: 'audiooutput', label: 'Default - Speaker', groupId: 'group1' },
                            { deviceId: 'default', kind: 'videoinput', label: 'Default - Camera', groupId: 'group2' }
                        ]);
                    };
                }
            });

            // 16. Override automation detection
            await page.addInitScript(() => {
                window.outerHeight = window.innerHeight;
                window.outerWidth = window.innerWidth;
            });

            // 17. Mock battery API
            await page.addInitScript(() => {
                if ('getBattery' in navigator) {
                    const originalGetBattery = navigator.getBattery;
                    navigator.getBattery = () => Promise.resolve({
                        charging: true,
                        chargingTime: 0,
                        dischargingTime: Infinity,
                        level: 1
                    });
                }
            });

            // 18. Set realistic viewport and screen properties
            const viewportWidth = 1366 + Math.floor(Math.random() * 200);
            const viewportHeight = 768 + Math.floor(Math.random() * 200);
            
            await page.setViewportSize({ width: viewportWidth, height: viewportHeight });

            await this.log(`Anti-detection measures applied successfully (viewport: ${viewportWidth}x${viewportHeight})`);
        } catch (error) {
            await this.log(`Error applying anti-detection measures: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Get all opened profiles from ixBrowser
     */
    async getOpenedProfiles() {
        try {
            await this.log('Fetching opened profiles from ixBrowser...');
            
            const response = await this.makeApiRequest('/api/v2/browser/opened');
            
            if (response.code === 200 && response.data) {
                await this.log(`Found ${response.data.length} opened profile(s)`);
                return response.data;
            } else {
                await this.log('No opened profiles found or API error', 'WARN');
                return [];
            }
        } catch (error) {
            await this.log(`Error fetching opened profiles: ${error.message}`, 'ERROR');
            return [];
        }
    }

    /**
     * Connect to an opened profile using Playwright with anti-detection
     */
    async connectToProfile(profileId) {
        try {
            await this.log(`Connecting to profile: ${profileId}`);
            
            const response = await this.makeApiRequest(`/api/v2/browser/connect/${profileId}`);
            
            if (response.code === 200 && response.data) {
                const { ws_endpoint, user_data_dir } = response.data;
                
                await this.log(`WebSocket endpoint: ${ws_endpoint}`);
                
                // Connect using Playwright
                const browser = await chromium.connectOverCDP(ws_endpoint);
                const context = browser.contexts()[0];
                const page = await context.newPage();
                
                // Apply comprehensive anti-detection measures
                await this.applyAntiDetection(page, context);
                
                await this.log(`Successfully connected to profile ${profileId} with anti-detection`);
                
                return { browser, context, page, profileData: response.data };
            } else {
                throw new Error(`Failed to connect to profile ${profileId}`);
            }
        } catch (error) {
            await this.log(`Error connecting to profile ${profileId}: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Run automation on a single profile with comprehensive error handling and logging
     */
    async runAutomationOnProfile(profile) {
        const profileId = profile.profile_id || profile.id;
        const profileName = profile.name || `Profile-${profileId}`;
        
        try {
            await this.log(`[${profileName}] Starting automation...`);
            
            // Connect to the profile
            const { browser, context, page, profileData } = await this.connectToProfile(profileId);
            
            try {
                // Run your automation function
                const startTime = Date.now();
                await this.log(`[${profileName}] Calling automation function...`);
                
                const result = await automationRun(browser, context, page, profileData);
                const duration = Date.now() - startTime;
                
                await this.log(`[${profileName}] Automation completed successfully in ${duration}ms`);
                
                return {
                    success: true,
                    profileId,
                    profileName,
                    result,
                    duration
                };
                
            } catch (automationError) {
                await this.log(`[${profileName}] Automation failed: ${automationError.message}`, 'ERROR');
                await this.log(`[${profileName}] Stack trace: ${automationError.stack}`, 'ERROR');
                return {
                    success: false,
                    profileId,
                    profileName,
                    error: automationError.message,
                    stack: automationError.stack,
                    type: 'automation_error'
                };
            } finally {
                // Always close the browser connection
                try {
                    await browser.close();
                    await this.log(`[${profileName}] Browser connection closed`);
                } catch (closeError) {
                    await this.log(`[${profileName}] Error closing browser: ${closeError.message}`, 'ERROR');
                }
            }
            
        } catch (connectionError) {
            await this.log(`[${profileName}] Connection failed: ${connectionError.message}`, 'ERROR');
            return {
                success: false,
                profileId,
                profileName,
                error: connectionError.message,
                stack: connectionError.stack,
                type: 'connection_error'
            };
        }
    }

    /**
     * Run automation on all opened profiles using Promise.allSettled for true parallel execution
     */
    async runAllProfilesInParallel(timeout = 300000) {
        try {
            await this.log('Starting parallel automation execution...');
            
            // Get opened profiles
            const openedProfiles = await this.getOpenedProfiles();
            
            if (openedProfiles.length === 0) {
                await this.log('No opened profiles found. Make sure ixBrowser profiles are running.', 'WARN');
                return { results: [], summary: { total: 0, successful: 0, failed: 0 } };
            }

            await this.log(`Found ${openedProfiles.length} opened profiles`);
            await this.log(`Timeout set to: ${timeout / 1000} seconds per profile`);

            // Create automation promises with timeout wrapper
            const automationPromises = openedProfiles.map(profile => {
                const profileName = profile.name || `Profile-${profile.profile_id || profile.id}`;
                
                // Wrap each automation with timeout
                const automationWithTimeout = new Promise(async (resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        this.log(`[${profileName}] Automation timeout after ${timeout}ms`, 'WARN');
                        reject(new Error(`Automation timeout after ${timeout}ms`));
                    }, timeout);

                    try {
                        const result = await this.runAutomationOnProfile(profile);
                        clearTimeout(timeoutId);
                        resolve(result);
                    } catch (error) {
                        clearTimeout(timeoutId);
                        reject(error);
                    }
                });

                return automationWithTimeout;
            });

            // Execute ALL automations in parallel using Promise.allSettled
            await this.log(`Running ${automationPromises.length} automations simultaneously...`);
            const startTime = Date.now();
            
            const settlementResults = await Promise.allSettled(automationPromises);
            
            const totalDuration = Date.now() - startTime;
            await this.log(`All automations completed in ${totalDuration}ms`);

            // Process results
            const results = settlementResults.map((settlement, index) => {
                const profile = openedProfiles[index];
                const profileName = profile.name || `Profile-${profile.profile_id || profile.id}`;

                if (settlement.status === 'fulfilled') {
                    return settlement.value;
                } else {
                    this.log(`[${profileName}] Promise rejected: ${settlement.reason.message}`, 'ERROR');
                    return {
                        success: false,
                        profileId: profile.profile_id || profile.id,
                        profileName,
                        error: settlement.reason.message,
                        stack: settlement.reason.stack,
                        type: 'promise_rejection'
                    };
                }
            });

            // Generate and display summary
            const summary = this.generateSummary(results, totalDuration);
            await this.displayResults(results, summary);

            return { results, summary };

        } catch (error) {
            await this.log(`Fatal error in parallel automation: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * Generate summary statistics
     */
    generateSummary(results, totalDuration) {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = total - successful;
        const avgDuration = results
            .filter(r => r.success && r.duration)
            .reduce((sum, r) => sum + r.duration, 0) / successful || 0;

        // Group errors by type
        const errorTypes = {};
        results.filter(r => !r.success).forEach(r => {
            errorTypes[r.type] = (errorTypes[r.type] || 0) + 1;
        });

        return {
            total,
            successful,
            failed,
            successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : 0,
            avgDuration: Math.round(avgDuration),
            totalDuration,
            errorTypes
        };
    }

    /**
     * Display results and summary with logging
     */
    async displayResults(results, summary) {
        const separator = '='.repeat(80);
        await this.log('\n' + separator);
        await this.log('PARALLEL AUTOMATION RESULTS');
        await this.log(separator);
        await this.log(`Total profiles processed: ${summary.total}`);
        await this.log(`✅ Successful: ${summary.successful} (${summary.successRate}%)`);
        await this.log(`❌ Failed: ${summary.failed}`);
        await this.log(`⏱️ Total execution time: ${summary.totalDuration}ms`);
        
        if (summary.successful > 0) {
            await this.log(`📈 Average individual duration: ${summary.avgDuration}ms`);
        }

        // Show error breakdown
        if (Object.keys(summary.errorTypes).length > 0) {
            await this.log('\nError Breakdown:');
            for (const [type, count] of Object.entries(summary.errorTypes)) {
                await this.log(`   ${type}: ${count}`, 'WARN');
            }
        }

        // Show detailed results
        await this.log('\nIndividual Results:');
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const status = result.success ? '✅' : '❌';
            const duration = result.duration ? ` (${result.duration}ms)` : '';
            await this.log(`${i + 1}. ${status} ${result.profileName}${duration}`);
            
            if (!result.success) {
                await this.log(`     Error: ${result.error}`, 'ERROR');
                if (result.type) {
                    await this.log(`     Type: ${result.type}`, 'ERROR');
                }
            }
        }

        // Show successful results data if available
        const successfulResults = results.filter(r => r.success && r.result);
        if (successfulResults.length > 0) {
            await this.log('\nAutomation Results Data:');
            for (const result of successfulResults) {
                await this.log(`🔍 [${result.profileName}]: ${JSON.stringify(result.result, null, 2)}`);
            }
        }
    }
}

// Main execution function
async function main() {
    const profileManager = new ixBrowserProfileManager();
    
    try {
        // Initialize logging
        await profileManager.initializeLog();
        await profileManager.log('=== AUTOMATION SESSION STARTED ===');
        
        // Run automation on ALL opened profiles in parallel using Promise.allSettled
        const { results, summary } = await profileManager.runAllProfilesInParallel(180000); // 3 minute timeout
        
        await profileManager.log('🎉 All parallel automations completed!');
        await profileManager.log(`📈 Final success rate: ${summary.successRate}%`);
        
        // Access results if needed
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length > 0) {
            await profileManager.log(`✅ Successfully processed ${successfulResults.length} profiles`);
        }
        
        const failedResults = results.filter(r => !r.success);
        if (failedResults.length > 0) {
            await profileManager.log(`❌ Failed profiles: ${failedResults.length}`, 'WARN');
            for (const result of failedResults) {
                await profileManager.log(`   - ${result.profileName}: ${result.error}`, 'ERROR');
            }
        }
        
        await profileManager.log('=== AUTOMATION SESSION COMPLETED ===');
        
    } catch (error) {
        await profileManager.log(`❌ Main execution failed: ${error.message}`, 'ERROR');
        await profileManager.log(`Stack trace: ${error.stack}`, 'ERROR');
        process.exit(1);
    }
}

// Run the script if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ixBrowserProfileManager;
