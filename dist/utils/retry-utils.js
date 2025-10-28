"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
exports.retryNetworkOperation = retryNetworkOperation;
exports.retryProfileConnection = retryProfileConnection;
exports.retryElementOperation = retryElementOperation;
const errors_1 = require("./errors");
async function retryWithBackoff(operation, options = {}) {
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry = (error) => error.retryable !== false } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            const canRetry = error.retryable !== undefined ? error.retryable : shouldRetry(error);
            if (attempt === maxAttempts || !canRetry) {
                throw error;
            }
            let delay = baseDelay * Math.pow(2, attempt - 1);
            if (error instanceof errors_1.AutomationTimeoutError) {
                delay = Math.min(delay * 1.5, maxDelay);
            }
            else if (error instanceof errors_1.NetworkError) {
                delay = Math.min(delay * 0.8, maxDelay);
            }
            else if (error instanceof errors_1.ProfileConnectionError) {
                delay = Math.min(delay * 1.2, maxDelay);
            }
            const jitter = Math.random() * (delay * 0.2);
            delay = delay - (delay * 0.1) + jitter;
            delay = Math.min(delay, maxDelay);
            console.log(`Attempt ${attempt} failed (${error.type || 'unknown'}), retrying in ${Math.round(delay)}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
async function retryNetworkOperation(operation, maxAttempts = 3) {
    return retryWithBackoff(operation, {
        maxAttempts,
        baseDelay: 1000,
        maxDelay: 5000,
        shouldRetry: (error) => {
            if (error instanceof errors_1.NetworkError || error instanceof errors_1.AutomationTimeoutError) {
                return true;
            }
            return (error.message.includes('net::') ||
                error.message.includes('timeout') ||
                error.message.includes('ECONNRESET') ||
                (error.response && error.response.status >= 500));
        }
    });
}
async function retryProfileConnection(operation, maxAttempts = 3) {
    return retryWithBackoff(operation, {
        maxAttempts,
        baseDelay: 2000,
        maxDelay: 8000,
        shouldRetry: (error) => error instanceof errors_1.ProfileConnectionError || error.retryable
    });
}
async function retryElementOperation(operation, maxAttempts = 2) {
    return retryWithBackoff(operation, {
        maxAttempts,
        baseDelay: 500,
        maxDelay: 2000,
        shouldRetry: (error) => !(error instanceof errors_1.ElementNotFoundError) && error.retryable !== false
    });
}
