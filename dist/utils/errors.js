"use strict";
/**
 * Custom error classes for ixBrowser automation failures
 * Each class extends Error and includes specific properties for better error handling and retry logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationError = exports.TaskError = exports.ElementNotFoundError = exports.NetworkError = exports.AutomationTimeoutError = exports.ProfileConnectionError = exports.AutomationError = void 0;
/**
 * Base class for automation errors
 */
class AutomationError extends Error {
    type;
    retryable;
    metadata;
    timestamp;
    constructor(message, type, retryable = false, metadata = {}) {
        super(message);
        this.name = this.constructor.name;
        this.type = type;
        this.retryable = retryable;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }
}
exports.AutomationError = AutomationError;
/**
 * Error for profile connection failures (e.g., WebSocket connection issues)
 */
class ProfileConnectionError extends AutomationError {
    constructor(message, profileId, metadata = {}) {
        super(message, 'profile_connection', true, { ...metadata, profileId });
    }
}
exports.ProfileConnectionError = ProfileConnectionError;
/**
 * Error for automation timeouts (e.g., page load or operation timeout)
 */
class AutomationTimeoutError extends AutomationError {
    constructor(message, timeoutMs, metadata = {}) {
        super(message, 'automation_timeout', true, { ...metadata, timeoutMs });
    }
}
exports.AutomationTimeoutError = AutomationTimeoutError;
/**
 * Error for network-related failures (e.g., API requests, connectivity)
 */
class NetworkError extends AutomationError {
    constructor(message, statusCode, metadata = {}) {
        super(message, 'network_error', true, { ...metadata, statusCode });
    }
}
exports.NetworkError = NetworkError;
/**
 * Error for element not found in DOM (e.g., selector failures)
 */
class ElementNotFoundError extends AutomationError {
    constructor(message, selector, url, metadata = {}) {
        super(message, 'element_not_found', false, { ...metadata, selector, url });
    }
}
exports.ElementNotFoundError = ElementNotFoundError;
/**
 * Error for task-specific failures (e.g., follow task errors)
 */
class TaskError extends AutomationError {
    constructor(message, taskType, metadata = {}) {
        super(message, 'task_error', false, { ...metadata, taskType });
    }
}
exports.TaskError = TaskError;
/**
 * Error for verification failures (e.g., follow confirmation)
 */
class VerificationError extends AutomationError {
    constructor(message, verificationType, metadata = {}) {
        super(message, 'verification_error', false, { ...metadata, verificationType });
    }
}
exports.VerificationError = VerificationError;
