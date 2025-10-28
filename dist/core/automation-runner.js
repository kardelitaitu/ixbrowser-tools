"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationRunner = void 0;
const _automation_1 = require("../core/_automation");
const errors_1 = require("../utils/errors");
class AutomationRunner {
    auditLogger;
    browserPool;
    timeout;
    constructor(browserPool, auditLogger, options = {}) {
        this.browserPool = browserPool;
        this.auditLogger = auditLogger;
        this.timeout = options.timeout || 300000;
    }
    async runProfileAutomation(profile) {
        const profileId = profile.profile_id || profile.id;
        const profileName = profile.name || `Profile-${profileId}`;
        console.log(`Starting automation for profile: ${profileName} (${profileId})`);
        await this.auditLogger.logStepStart('profile', 'automation_run', profileId, profileName);
        try {
            const { browser, context, page, profileData } = await this.browserPool.connectToProfile(profile);
            try {
                const startTime = Date.now();
                const result = await (0, _automation_1.run)(browser, context, page, profileData, this.auditLogger);
                const duration = Date.now() - startTime;
                console.log(`Automation for profile ${profileName} (${profileId}) completed successfully in ${duration}ms. Result type: ${result.type}`);
                await this.auditLogger.logStepEnd('profile', 'automation_run', true, profileId, profileName, { resultType: result.type }, null, duration);
                return {
                    success: true,
                    profileId,
                    profileName,
                    result,
                    duration,
                };
            }
            catch (automationError) {
                console.error(`Automation for profile ${profileName} (${profileId}) failed: ${automationError.message}`);
                await this.auditLogger.logStepEnd('profile', 'automation_run', false, profileId, profileName, {}, automationError.message);
                return {
                    success: false,
                    profileId,
                    profileName,
                    error: automationError.message,
                    type: 'automation_error',
                };
            }
            finally {
                await page.close();
                console.log(`Page closed for profile ${profileName} (${profileId})`);
            }
        }
        catch (connectionError) {
            console.error(`Connection to profile ${profileName} (${profileId}) failed: ${connectionError.message}`);
            await this.auditLogger.logStepEnd('profile', 'automation_run', false, profileId, profileName, {}, connectionError.message);
            return {
                success: false,
                profileId,
                profileName,
                error: connectionError.message,
                type: 'connection_error',
            };
        }
    }
    async runParallelAutomation(profiles) {
        console.log('Starting parallel automation across all opened profiles.');
        await this.auditLogger.logStepStart('session', 'parallel_execution');
        try {
            if (profiles.length === 0) {
                console.warn('No profiles found to automate.');
                await this.auditLogger.logStepEnd('session', 'parallel_execution', false, null, null, { reason: 'no_profiles' });
                return { results: [], summary: { total: 0, successful: 0, failed: 0 } };
            }
            console.log(`Found ${profiles.length} profiles for parallel automation.`);
            const startTime = Date.now();
            const automationPromises = profiles.map((profile) => Promise.race([
                this.runProfileAutomation(profile),
                new Promise((_resolve, reject) => setTimeout(() => reject(new errors_1.AutomationTimeoutError(`Profile automation timed out after ${this.timeout}ms`, this.timeout)), this.timeout)),
            ]));
            const results = await Promise.allSettled(automationPromises);
            const processedResults = results.map((result, index) => result.status === 'fulfilled'
                ? result.value
                : {
                    success: false,
                    profileId: profiles[index].profile_id || profiles[index].id,
                    profileName: profiles[index].name ||
                        `Profile-${profiles[index].profile_id || profiles[index].id}`,
                    error: result.reason.message,
                    type: 'promise_rejection',
                });
            const summary = this.generateSummary(processedResults, Date.now() - startTime);
            console.log(`Parallel automation completed. Summary: Total: ${summary.total}, Successful: ${summary.successful}, Failed: ${summary.failed}, Success Rate: ${summary.successRate}%`);
            await this.auditLogger.logStepEnd('session', 'parallel_execution', true, null, null, { summary }, null, Date.now() - startTime);
            return {
                results: processedResults,
                summary,
            };
        }
        catch (error) {
            console.error(`Parallel automation failed: ${error.message}`);
            await this.auditLogger.logStepEnd('session', 'parallel_execution', false, null, null, {}, error.message);
            throw error;
        }
    }
    generateSummary(results, totalDuration) {
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
exports.AutomationRunner = AutomationRunner;
