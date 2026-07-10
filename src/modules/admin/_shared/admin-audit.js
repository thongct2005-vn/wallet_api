const pool = require('../../../config/db');
const { v7: uuidv7 } = require('uuid');

function getRequestMeta(req) {
    return {
        actorId: req.user?.id || req.user?.userId || null,
        roles: req.user?.roles || [],
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.headers['user-agent'] || null
    };
}

const SENSITIVE_KEYS = [
    'password', 'token', 'secret', 'raw_secret', 'api_secret', 
    'api_secret_hash', 'webhook_secret', 'webhook_secret_hash', 
    'authorization', 'cookie', 'otp', 'pin', 'private_key', 
    'access_token', 'refresh_token', 'api_key'
];

const WHITELIST_KEYS = [
    'merchant_id', 'old_key_id', 'new_key_id', 'key_name', 
    'role_id', 'user_id', 'wallet_id'
];

function maskSensitiveText(text) {
    if (!text || typeof text !== 'string') return text;
    
    // Mask values following sensitive keywords, e.g. "password=123" -> "password=***MASKED***"
    const keysPattern = SENSITIVE_KEYS.join('|');
    const regex = new RegExp(`(\\b(?:${keysPattern})\\b\\s*[:=]\\s*)([^\\s,;"']+)`, 'gi');
    let masked = text.replace(regex, '$1***MASKED***');
    
    // Mask known token formats
    masked = masked.replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '***MASKED_JWT***');
    masked = masked.replace(/(sk|pk)_(test|live)_[a-zA-Z0-9]+/g, '***MASKED_KEY***');
    
    return masked;
}

function maskSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => maskSensitiveFields(item));
    }

    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (WHITELIST_KEYS.includes(lowerKey)) {
            masked[key] = value;
            continue;
        }

        const isSensitive = SENSITIVE_KEYS.some(k => lowerKey.includes(k));
        
        if (isSensitive && value !== null && value !== undefined) {
            masked[key] = '***MASKED***';
        } else if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitiveFields(value);
        } else if (typeof value === 'string') {
            masked[key] = maskSensitiveText(value);
        } else {
            masked[key] = value;
        }
    }
    return masked;
}

async function writeAuditLog({ actorId, action, entityType, entityId, oldData, newData, metadata, reason, ipAddress, userAgent }) {
    const safeOldData = oldData ? maskSensitiveFields(oldData) : null;
    const safeNewData = newData ? maskSensitiveFields(newData) : null;
    const safeMetadata = metadata ? maskSensitiveFields(metadata) : null;
    const safeReason = reason ? maskSensitiveText(reason) : null;

    const AuditLog = require('../../system/models/audit_log.model');

    try {
        await AuditLog.create({
            trace_id: uuidv7(),
            actor_type: 'ADMIN',
            actor_id: actorId || null,
            action,
            entity_type: entityType,
            entity_id: entityId || null,
            old_data: safeOldData,
            new_data: safeNewData,
            metadata: safeMetadata,
            reason: safeReason,
            ip_address: ipAddress || null,
            user_agent: userAgent || null
        });
    } catch (err) {
        console.error('[AuditLog] Error writing to MongoDB:', err);
    }
}

module.exports = { getRequestMeta, writeAuditLog };
