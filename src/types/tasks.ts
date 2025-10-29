import { Page } from 'playwright';
import { IxbrowserProfile } from './ixbrowser';

export interface TaskResult {
  success: boolean;
  message: string;
  error?: string;
  data?: unknown;
}

export interface IAutomationTask {
  execute(_page: Page, _profile: IxbrowserProfile): Promise<TaskResult>;
}
