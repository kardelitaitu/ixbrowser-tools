"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Audit logger for tracking automation steps and actions
 */
class AuditLogger {
    baseDir;
    auditLogFile;
    sessionId;
    enabled;
    constructor(options = {}) {
        this.baseDir = options.baseDir || path.join(__dirname, 'logs');
        this.auditLogFile =
            options.auditLogFile ||
                path.join(this.baseDir, `audit_${new Date().toISOString().replace(/:/g, '-')}.jsonl`);
        this.sessionId = options.sessionId || `session_${Date.now()}`;
        this.enabled = options.enabled !== false;
    }
    async log(event) {
        if (!this.enabled)
            return;
        const auditEntry = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            step: event.step,
            action: event.action,
            profileId: event.profileId || null,
            profileName: event.profileName || null,
            success: event.success !== undefined ? event.success : null,
            data: event.data || {},
            error: event.error || null,
            duration: event.duration || null,
        };
        try {
            await fs.mkdir(this.baseDir, { recursive: true });
            await fs.appendFile(this.auditLogFile, JSON.stringify(auditEntry) + '\n');
        }
        catch (error) {
            console.error('Audit logging failed:', error);
        }
    }
    async logStepStart(step, action, profileId = null, profileName = null, data = {}) {
        await this.log({
            step,
            action: `${action}_start`,
            profileId,
            profileName,
            data,
        });
    }
    async logStepEnd(step, action, success, profileId = null, profileName = null, data = {}, error = null, duration = null) {
        await this.log({
            step,
            action: `${action}_end`,
            profileId,
            profileName,
            success,
            data,
            error,
            duration,
        });
    }
    async logAction(step, action, success, profileId = null, profileName = null, data = {}, error = null) {
        await this.log({
            step,
            action,
            profileId,
            profileName,
            success,
            data,
            error,
        });
    }
    getLogFilePath() {
        return this.auditLogFile;
    }
}
exports.AuditLogger = AuditLogger;
