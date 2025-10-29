import { z } from 'zod';

/**
 * Comprehensive configuration validation schemas
 */

// Environment variables schema
export const envSchema = z.object({
  BASE_URL: z.string().url('BASE_URL must be a valid URL').optional(),
  IXBROWSER_API_KEY: z.string().min(1, 'IXBROWSER_API_KEY is required').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development').optional(),
});

// Task configuration schema
export const taskConfigSchema = z.object({
  type: z.string().min(1, 'Task type is required'),
  handle: z.string().optional(),
  inviteUrl: z.string().optional(),
  options: z.any().optional(),
  stopOnFailure: z.boolean().default(false),
});

// Automation options schema
export const automationOptionsSchema = z.object({
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  logFile: z.string().optional(),
  timeout: z.number().positive().optional(),
  poolMaxSize: z.number().positive().int().max(50).optional(),
  poolTimeout: z.number().positive().optional(),
});

// Browser pool options schema
export const browserPoolOptionsSchema = z.object({
  maxSize: z.number().positive().int().max(50).default(10),
  timeout: z.number().positive().default(60000),
});

// Profile data schema
export const profileDataSchema = z.object({
  profile_id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  // Add other profile fields as needed
});

/**
 * Validation functions
 */

export function validateTaskConfig(config: unknown): z.infer<typeof taskConfigSchema> {
  return taskConfigSchema.parse(config);
}

export function validateTaskConfigs(configs: unknown[]): z.infer<typeof taskConfigSchema>[] {
  return z.array(taskConfigSchema).parse(configs);
}

export function validateAutomationOptions(options: unknown): z.infer<typeof automationOptionsSchema> {
  return automationOptionsSchema.parse(options);
}

export function validateBrowserPoolOptions(options: unknown = {}): z.infer<typeof browserPoolOptionsSchema> {
  return browserPoolOptionsSchema.parse(options);
}

export function validateProfileData(profile: unknown): z.infer<typeof profileDataSchema> {
  return profileDataSchema.parse(profile);
}

/**
 * Configuration loader with validation
 */
export async function loadValidatedConfig(configPath: string): Promise<z.infer<typeof taskConfigSchema>[]> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(data);
    return validateTaskConfigs(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Configuration validation failed: ${error.message}`);
    }
    throw new Error(`Failed to load configuration: ${(error as Error).message}`);
  }
}
