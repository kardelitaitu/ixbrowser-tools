import { Page } from 'playwright';
import { IxbrowserProfile } from './ixbrowser';

export interface TaskResult {
  success: boolean;
  message: string;
  error?: string;
  data?: any;
}

export interface IAutomationTask {
  execute(page: Page, profile: IxbrowserProfile): Promise<TaskResult>;
}
