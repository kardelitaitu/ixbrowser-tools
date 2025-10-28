"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileManager = void 0;
class ProfileManager {
    ixBrowserClient;
    auditLogger;
    _cachedProfiles;
    constructor(ixBrowserClient, auditLogger) {
        this.ixBrowserClient = ixBrowserClient;
        this.auditLogger = auditLogger;
    }
    async getOpenedProfiles() {
        await this.auditLogger.logStepStart('session', 'fetch_profiles');
        try {
            const profiles = await this.ixBrowserClient.getOpenedProfiles();
            await this.auditLogger.logStepEnd('session', 'fetch_profiles', true, null, null, { profileCount: profiles.length });
            return profiles;
        }
        catch (error) {
            console.warn(`Profile fetch error: ${error.message}`);
            await this.auditLogger.logStepEnd('session', 'fetch_profiles', false, null, null, {}, error.message);
            return [];
        }
    }
    async getOpenedProfilesLazy() {
        if (this._cachedProfiles) {
            return this._cachedProfiles;
        }
        this._cachedProfiles = await this.getOpenedProfiles();
        return this._cachedProfiles;
    }
}
exports.ProfileManager = ProfileManager;
