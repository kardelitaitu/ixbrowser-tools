import { Browser, BrowserContext, Page } from 'playwright';
import { TaskOptions, TaskResult } from '../types/tasks';

/**
 * @fileoverview Centralized type definitions for core automation modules.
 */

export interface Profile {
  id: string;
  profile_id: string;
  name: string;
  // Add other relevant profile properties as needed
}

export interface TaskConfiguration {
  type: string;
  handle?: string;
  inviteUrl?: string;
  options?: TaskOptions;
  stopOnFailure?: boolean;
  // Add other task-specific properties as needed
}

export interface Selectors {
  twitter: {
    follow: string[];
    following: string[];
    like: string[];
  };
  discord: {
    acceptInvite: string[];
    joinServer: string[];
    verifyJoin: string[];
  };
  gmail: {
    firstMail: string[];
  };
  // Add other selector categories as needed
}

export interface BrowserAutomationConfig {
  randomDelays: boolean;
  humanScroll: boolean;
  typeVariation: boolean;
  logging: boolean;
}

export interface AutomationRunResult {
  success: boolean;
  data?: any;
  error?: string;
  type: string;
  timestamp: string;
}

export interface PooledConnection {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  profileData: Profile;
  lastUsed: number;
}

export interface BrowserPoolOptions {
  maxSize?: number;
  timeout?: number;
}

export interface IxBrowserAutomationOptions {
  baseUrl?: string;
  apiKey?: string;
  logFile?: string;
  timeout?: number;
  poolMaxSize?: number;
  poolTimeout?: number;
}

export interface Summary {
  total: number;
  successful: number;
  failed: number;
  successRate: string;
  totalDuration: number;
}
