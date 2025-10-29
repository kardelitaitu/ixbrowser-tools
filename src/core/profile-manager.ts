import { AuditLogger } from '../utils/audit-logger';
import { IxBrowserClient } from '../utils/ixBrowserClient';
import { UnifiedLogger } from '../utils/unified-logger';
import { Profile } from '../types/core';
import { ProfileConnectionError } from '../utils/errors';

export class ProfileManager {
  private ixBrowserClient: IxBrowserClient;
  private auditLogger: AuditLogger;
  private logger: UnifiedLogger;
  private _cachedProfiles: Profile[] | undefined;

  constructor(ixBrowserClient: IxBrowserClient, auditLogger: AuditLogger, logger: UnifiedLogger) {
    this.ixBrowserClient = ixBrowserClient;
    this.auditLogger = auditLogger;
    this.logger = logger;
  }

  async getOpenedProfiles(): Promise<Profile[]> {
    await this.auditLogger.logStepStart('session', 'fetch_profiles');
    try {
      this.logger.log('Fetching opened profiles...');
      const profiles = await this.ixBrowserClient.getOpenedProfiles();
      this.logger.log(`Found ${profiles.length} opened profiles.`);
      await this.auditLogger.logStepEnd(
        'session',
        'fetch_profiles',
        true,
        null,
        null,
        { profileCount: profiles.length },
      );
      return profiles;
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown profile fetch error';
      this.logger.warn(`Profile fetch error: ${errorMessage}`);
      await this.auditLogger.logStepEnd(
        'session',
        'fetch_profiles',
        false,
        null,
        null,
        {},
        errorMessage,
      );
      throw new ProfileConnectionError(`Failed to fetch opened profiles: ${errorMessage}`, 'N/A', { originalError: error });
    }
  }

  async getOpenedProfilesLazy(): Promise<Profile[]> {
    if (this._cachedProfiles) {
      this.logger.log('Returning cached profiles.');
      return this._cachedProfiles;
    }
    this.logger.log('Fetching profiles (lazy load)...');
    this._cachedProfiles = await this.getOpenedProfiles();
    return this._cachedProfiles;
  }
}
