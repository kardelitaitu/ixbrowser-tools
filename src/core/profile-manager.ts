import { AuditLogger } from '../utils/audit-logger';
import { IxBrowserClient } from '../utils/ixBrowserClient';

export class ProfileManager {
  private ixBrowserClient: IxBrowserClient;
  private auditLogger: AuditLogger;
  private _cachedProfiles: any[] | undefined;

  constructor(ixBrowserClient: IxBrowserClient, auditLogger: AuditLogger) {
    this.ixBrowserClient = ixBrowserClient;
    this.auditLogger = auditLogger;
  }

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
      console.warn(`Profile fetch error: ${(error as Error).message}`);
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

  async getOpenedProfilesLazy(): Promise<any[]> {
    if (this._cachedProfiles) {
      return this._cachedProfiles;
    }
    this._cachedProfiles = await this.getOpenedProfiles();
    return this._cachedProfiles;
  }
}
