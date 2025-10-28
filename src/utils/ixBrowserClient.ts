import { retryNetworkOperation } from './retry-utils';
import { NetworkError, ProfileConnectionError } from './errors';

export class IxBrowserClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async apiRequest(endpoint: string, method = 'POST', body: any = null): Promise<any> {
    return await retryNetworkOperation(async () => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        throw new NetworkError(`HTTP error: ${response.status}`, response.status);
      }
      return await response.json();
    }, 3);
  }

  async getOpenedProfiles(): Promise<any[]> {
    const openedResponse = await this.apiRequest('/api/v2/profile-opened-list', 'POST');
    if (openedResponse.error.code !== 0) {
      throw new Error(`Failed to get opened profiles: ${openedResponse.error.message}`);
    }
    const openedProfileIds = new Set((openedResponse.data || []).map((p: any) => p.profile_id));

    if (openedProfileIds.size === 0) {
      return [];
    }

    const allProfilesResponse = await this.apiRequest('/api/v2/profile-list', 'POST', { limit: 1000 });
    if (allProfilesResponse.error.code !== 0) {
      throw new Error(`Failed to get all profiles: ${allProfilesResponse.error.message}`);
    }

    const profiles = (allProfilesResponse.data.data || []).filter((p: any) => openedProfileIds.has(p.profile_id));
    return profiles;
  }

  async openProfile(profileId: string): Promise<any> {
    const res = await this.apiRequest('/api/v2/profile-open', 'POST', { profile_id: profileId });
    if (res.error.code !== 0) {
      throw new ProfileConnectionError(`Connection failed for ${profileId}: ${res.error.message}`, profileId);
    }
    return res;
  }
}
