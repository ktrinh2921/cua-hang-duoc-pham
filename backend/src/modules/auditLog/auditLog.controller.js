/**
 * AuditLog Controller
 *
 * Route: /api/audit-log
 * Role: Admin only
 */
const auditService = require('./auditLog.service');
const { success, successPaginated, notFound } = require('../../utils/response');

/**
 * GET /api/audit-log
 * Lay danh sach audit log voi filter & phan trang
 */
async function getAuditLogs(req, res, next) {
    try {
        const {
            fromDate,
            toDate,
            tenDangNhap,
            action,
            tableName,
            page = 1,
            limit = 20,
        } = req.query;

        const result = await auditService.getAuditLogs(
            { fromDate, toDate, tenDangNhap, action, tableName },
            parseInt(page),
            Math.min(parseInt(limit), 100)
        );

        return successPaginated(
            res,
            result.items,
            result.total,
            parseInt(page),
            Math.min(parseInt(limit), 100)
        );
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/audit-log/stats
 * Thong ke tong quan (7 ngay gan nhat)
 */
async function getAuditStats(req, res, next) {
    try {
        const stats = await auditService.getAuditStats();
        return success(res, stats);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/audit-log/actions
 * Lay danh sach action types hien co
 */
async function getActionTypes(req, res, next) {
    try {
        const actions = await auditService.getActionTypes();
        return success(res, actions);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/audit-log/tables
 * Lay danh sach bang duoc ghi
 */
async function getTableNames(req, res, next) {
    try {
        const tables = await auditService.getTableNames();
        return success(res, tables);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/audit-log/:id
 * Lay chi tiet 1 ban ghi audit
 */
async function getAuditLogById(req, res, next) {
    try {
        const log = await auditService.getAuditLogById(parseInt(req.params.id));
        if (!log) {
            return notFound(res, 'Không tìm thấy bản ghi audit');
        }
        return success(res, log);
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    getActionTypes,
    getTableNames,
};
