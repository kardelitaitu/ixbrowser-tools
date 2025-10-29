/**
 * Custom error classes for ixBrowser automation failures
 * Each class extends Error and includes specific properties for better error handling and retry logic
 */

/**
 * Base class for automation errors
 */
export class AutomationError extends Error {
  public type: string;
  public retryable: boolean;
  public metadata: unknown;
  public timestamp: string;

  constructor(message: string, type: string, retryable = false, metadata: unknown = {}) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.retryable = retryable;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error for profile connection failures (e.g., WebSocket connection issues)
 */
export class ProfileConnectionError extends AutomationError {
  constructor(message: string, profileId: string, metadata = {}) {
    super(message, 'profile_connection', true, { ...metadata, profileId });
  }
}

/**
 * Error for automation timeouts (e.g., page load or operation timeout)
 */
export class AutomationTimeoutError extends AutomationError {
  constructor(message: string, timeoutMs: number, metadata = {}) {
    super(message, 'automation_timeout', true, { ...metadata, timeoutMs });
  }
}

/**
 * Error for network-related failures (e.g., API requests, connectivity)
 */
export class NetworkError extends AutomationError {
  constructor(message: string, statusCode: number, metadata = {}) {
    super(message, 'network_error', true, { ...metadata, statusCode });
  }
}

/**
 * Error for element not found in DOM (e.g., selector failures)
 */
export class ElementNotFoundError extends AutomationError {
  constructor(message: string, selector: string, url: string, metadata = {}) {
    super(message, 'element_not_found', false, { ...metadata, selector, url });
  }
}

/**
 * Error for task-specific failures (e.g., follow task errors)
 */
export class TaskError extends AutomationError {
  constructor(message: string, taskType: string, metadata = {}) {
    super(message, 'task_error', false, { ...metadata, taskType });
  }
}

/**
 * Error for verification failures (e.g., follow confirmation)
 */
export class VerificationError extends AutomationError {
  constructor(message: string, verificationType: string, metadata = {}) {
    super(message, 'verification_error', false, { ...metadata, verificationType });
  }
}

/**
 * Error for configuration-related failures (e.g., invalid config file, missing env var)
 */
export class ConfigurationError extends AutomationError {
  constructor(message: string, metadata = {}) {
    super(message, 'configuration_error', false, { ...metadata });
  }
}
