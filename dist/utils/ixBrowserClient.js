"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IxBrowserClient = void 0;
const retry_utils_1 = require("./retry-utils");
const errors_1 = require("./errors");
class IxBrowserClient {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    async apiRequest(endpoint, method = 'POST', body = null) {
        return await (0, retry_utils_1.retryNetworkOperation)(async () => {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: body ? JSON.stringify(body) : null,
            });
            if (!response.ok) {
                throw new errors_1.NetworkError(`HTTP error: ${response.status}`, response.status);
            }
            return await response.json();
        }, 3);
    }
    async getOpenedProfiles() {
        const openedResponse = await this.apiRequest('/api/v2/profile-opened-list', 'POST');
        if (openedResponse.error.code !== 0) {
            throw new Error(`Failed to get opened profiles: ${openedResponse.error.message}`);
        }
        const openedProfileIds = new Set((openedResponse.data || []).map((p) => p.profile_id));
        if (openedProfileIds.size === 0) {
            return [];
        }
        const allProfilesResponse = await this.apiRequest('/api/v2/profile-list', 'POST', { limit: 1000 });
        if (allProfilesResponse.error.code !== 0) {
            throw new Error(`Failed to get all profiles: ${allProfilesResponse.error.message}`);
        }
        const profiles = (allProfilesResponse.data.data || []).filter((p) => openedProfileIds.has(p.profile_id));
        return profiles;
    }
    async openProfile(profileId) {
        const res = await this.apiRequest('/api/v2/profile-open', 'POST', { profile_id: profileId });
        if (res.error.code !== 0) {
            throw new errors_1.ProfileConnectionError(`Connection failed for ${profileId}: ${res.error.message}`, profileId);
        }
        return res;
    }
}
exports.IxBrowserClient = IxBrowserClient;
