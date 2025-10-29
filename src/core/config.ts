import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { TaskConfiguration, Selectors } from '../types/core';

// Zod schemas for validation
const taskSchema = z.object({
  type: z.string(),
  handle: z.string().optional(),
  inviteUrl: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(), // Looser for now, can be refined per task
  stopOnFailure: z.boolean().optional(),
});

const selectorsSchema = z.object({
  twitter: z.object({
    follow: z.array(z.string()),
    following: z.array(z.string()),
    like: z.array(z.string()),
  }),
  discord: z.object({
    acceptInvite: z.array(z.string()),
    joinServer: z.array(z.string()),
    verifyJoin: z.array(z.string()),
  }),
  gmail: z.object({
    firstMail: z.array(z.string()),
  }),
});

export class ConfigService {
  private static instance: ConfigService;
  private tasks: TaskConfiguration[] | null = null;
  private selectors: Selectors | null = null;

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public async loadTasks(): Promise<TaskConfiguration[]> {
    if (this.tasks) {
      return this.tasks;
    }
    const tasksPath = path.join(__dirname, '../../config/tasks.json');
    try {
      const data = await fs.readFile(tasksPath, 'utf8');
      const parsedTasks = JSON.parse(data);
      this.tasks = z.array(taskSchema).parse(parsedTasks);
      return this.tasks;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Invalid tasks.json structure: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      } else {
        console.error(`Error loading tasks.json: ${(error as Error).message}`);
      }
      return [];
    }
  }

  public async loadSelectors(): Promise<Selectors> {
    if (this.selectors) {
      return this.selectors;
    }
    const selectorsPath = path.join(__dirname, '../../config/selectors.json');
    try {
      const data = await fs.readFile(selectorsPath, 'utf8');
      const parsedSelectors = JSON.parse(data);
      this.selectors = selectorsSchema.parse(parsedSelectors);
      return this.selectors;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error(`Invalid selectors.json structure: ${error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      } else {
        console.error(`Error loading selectors.json: ${(error as Error).message}`);
      }
      return {} as Selectors; // Return empty selectors on error
    }
  }

  public getEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set.`);
    }
    return value || defaultValue || '';
  }

  public getBaseUrl(): string {
    return this.getEnv('BASE_URL');
  }

  public getApiKey(): string {
    return this.getEnv('IXBROWSER_API_KEY');
  }
}
