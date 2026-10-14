/**
 * Audit Middleware - Ghi log hanh dong
 */
const db = require('../config/db');

/**
 * Log an action to AuditLog table
 * @param {Object} req - Express request
 * @param {string} action - Action type (LOGIN, INSERT, UPDATE, DELETE, etc.)
 * @param {string} tableName - Table name
 * @param {string} recordID - Record ID
 * @param {Object} oldValue - Old value (for UPDATE/DELETE)
 * @param {Object} newValue - New value (for INSERT/UPDATE)
 */
async function logAudit(req, action, tableName = null, recordID = null, oldValue = null, newValue = null) {
    try {
        const username = req.user ? req.user.username : 'Anonymous';
        
        await db.query(
            `INSERT INTO AuditLog (TenDangNhap, Action, TableName, RecordID, OldValue, NewValue, IPAddress, UserAgent)
             VALUES (@username, @action, @tableName, @recordID, @oldValue, @newValue, @ip, @ua)`,
            {
                username: username,
                action: action,
                tableName: tableName,
                recordID: recordID,
                oldValue: oldValue ? JSON.stringify(oldValue) : null,
                newValue: newValue ? JSON.stringify(newValue) : null,
                ip: req.ip || req.connection.remoteAddress,
                ua: req.headers['user-agent'] || ''
            }
        );
    } catch (err) {
        // Log error but don't fail the request
        console.error('Audit log error:', err.message);
    }
}

/**
 * Create audit middleware for specific actions
 * @param {string} action - Action type
 * @param {string} tableName - Table name
 * @param {Function} getRecordID - Function to get record ID from req/res
 * @param {Function} getOldValue - Function to get old value
 * @param {Function} getNewValue - Function to get new value
 */
function auditLog(action, tableName, getRecordID, getOldValue, getNewValue) {
    return async (req, res, next) => {
        // Store old value before operation
        const oldValue = getOldValue ? await getOldValue(req) : null;
        
        // Override res.json to capture response
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            // Log after successful response
            if (body && body.success) {
                const recordID = getRecordID ? getRecordID(req, body) : null;
                const newValue = getNewValue ? await getNewValue(req, body) : null;
                await logAudit(req, action, tableName, recordID, oldValue, newValue);
            }
            return originalJson(body);
        };
        
        next();
    };
}

/**
 * Simple audit log middleware - just log the action
 */
function audit(action) {
    return async (req, res, next) => {
        // Override res.json to capture response
        const originalJson = res.json.bind(res);
        res.json = async (body) => {
            if (body && body.success) {
                await logAudit(req, action);
            }
            return originalJson(body);
        };
        next();
    };
}

module.exports = {
    logAudit,
    auditLog,
    audit
};
