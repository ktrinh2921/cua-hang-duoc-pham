/**
 * AuditLog Service - Tra cuu lich su hanh dong he thong
 *
 * Route: /api/audit-log
 * Role: Admin only
 *
 * Cac action duoc ghi tu dong boi middleware/audit.js:
 *  - LOGIN, LOGOUT, CHANGE_PASSWORD
 *  - CREATE/UDPATE/DELETE_{ENTITY} (NhanVien, Thuoc, DanhMuc, ...)
 *  - CREATE_HOADON, CANCEL_HOADON
 *  - CREATE_PHIEUNHAP, UPDATE_PHIEUNHAP
 *  - CREATE_PHIEUTHU, CREATE_PHIEUCHI
 *  - CREATE_DIEU_CHINH, APPROVE_DIEU_CHINH
 */
const db = require('../../config/db');

/**
 * Lay danh sach audit log voi filter & phan trang
 * @param {Object} filters
 * @param {string} filters.fromDate  - YYYY-MM-DD
 * @param {string} filters.toDate    - YYYY-MM-DD
 * @param {string} filters.tenDangNhap - Loc theo user
 * @param {string} filters.action     - Loc theo action
 * @param {string} filters.tableName  - Loc theo bang
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{items: Array, total: number, totalPages: number}>}
 */
async function getAuditLogs({ fromDate, toDate, tenDangNhap, action, tableName } = {}, page = 1, limit = 20) {
    const conditions = [];
    const params = {};

    if (fromDate) {
        conditions.push('CAST(a.Timestamp AS DATE) >= @fromDate');
        params.fromDate = fromDate;
    }
    if (toDate) {
        conditions.push('CAST(a.Timestamp AS DATE) <= @toDate');
        params.toDate = toDate;
    }
    if (tenDangNhap) {
        conditions.push('a.TenDangNhap LIKE @tenDangNhap');
        params.tenDangNhap = `%${tenDangNhap}%`;
    }
    if (action) {
        conditions.push('a.Action LIKE @action');
        params.action = `%${action}%`;
    }
    if (tableName) {
        conditions.push('a.TableName LIKE @tableName');
        params.tableName = `%${tableName}%`;
    }

    const whereSql = conditions.length > 0
        ? 'WHERE ' + conditions.join(' AND ')
        : '';

    params.page = page;
    params.limit = limit;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Dem tong
    const countR = await db.query(
        `SELECT COUNT(*) AS Total FROM AuditLog a ${whereSql}`,
        params
    );
    const total = Number(countR.recordset[0]?.Total) || 0;

    // Lay trang hien tai
    const rowsR = await db.query(`
        SELECT
            a.LogID,
            a.TenDangNhap,
            a.Action,
            a.TableName,
            a.RecordID,
            a.OldValue,
            a.NewValue,
            a.IPAddress,
            a.UserAgent,
            a.Timestamp
        FROM AuditLog a
        ${whereSql}
        ORDER BY a.Timestamp DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, { ...params, offset, limit });

    const items = rowsR.recordset.map(r => ({
        logId: r.LogID,
        tenDangNhap: r.TenDangNhap,
        action: r.Action,
        tableName: r.TableName,
        recordId: r.RecordID,
        oldValue: parseJsonSafe(r.OldValue),
        newValue: parseJsonSafe(r.NewValue),
        ipAddress: r.IPAddress,
        userAgent: r.UserAgent,
        timestamp: r.Timestamp,
    }));

    return {
        items,
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
    };
}

/**
 * Lay chi tiet 1 audit log entry
 * @param {number} logId
 * @returns {Promise<Object|null>}
 */
async function getAuditLogById(logId) {
    const r = await db.query(
        `SELECT * FROM AuditLog WHERE LogID = @logId`,
        { logId }
    );
    const row = r.recordset[0];
    if (!row) return null;

    return {
        logId: row.LogID,
        tenDangNhap: row.TenDangNhap,
        action: row.Action,
        tableName: row.TableName,
        recordId: row.RecordID,
        oldValue: parseJsonSafe(row.OldValue),
        newValue: parseJsonSafe(row.NewValue),
        ipAddress: row.IPAddress,
        userAgent: row.UserAgent,
        timestamp: row.Timestamp,
    };
}

/**
 * Lay thong ke tong quan audit (7 ngay gan nhat)
 * @returns {Promise<Object>}
 */
async function getAuditStats() {
    const statsR = await db.query(`
        SELECT
            COUNT(*) AS TongSoBanGhi,
            COUNT(DISTINCT TenDangNhap) AS SoNguoiDung,
            COUNT(DISTINCT Action) AS SoLoaiHanhDong,
            COUNT(DISTINCT CAST(Timestamp AS DATE)) AS SoNgayHoatDong
        FROM AuditLog
        WHERE Timestamp >= DATEADD(DAY, -7, GETDATE())
    `);

    // Top 5 action gan day
    const topActionsR = await db.query(`
        SELECT TOP 5
            Action,
            COUNT(*) AS SoLan
        FROM AuditLog
        WHERE Timestamp >= DATEADD(DAY, -7, GETDATE())
        GROUP BY Action
        ORDER BY SoLan DESC
    `);

    // Top 5 nguoi dung hoat dong nhieu nhat
    const topUsersR = await db.query(`
        SELECT TOP 5
            TenDangNhap,
            COUNT(*) AS SoLan
        FROM AuditLog
        WHERE Timestamp >= DATEADD(DAY, -7, GETDATE())
          AND TenDangNhap IS NOT NULL
        GROUP BY TenDangNhap
        ORDER BY SoLan DESC
    `);

    // So luong theo ngay (7 ngay)
    const dailyR = await db.query(`
        SELECT
            CAST(Timestamp AS DATE) AS Ngay,
            COUNT(*) AS SoBanGhi
        FROM AuditLog
        WHERE Timestamp >= DATEADD(DAY, -7, GETDATE())
        GROUP BY CAST(Timestamp AS DATE)
        ORDER BY Ngay ASC
    `);

    const s = statsR.recordset[0];
    return {
        tongSoBanGhi: Number(s?.TongSoBanGhi) || 0,
        soNguoiDung: Number(s?.SoNguoiDung) || 0,
        soLoaiHanhDong: Number(s?.SoLoaiHanhDong) || 0,
        soNgayHoatDong: Number(s?.SoNgayHoatDong) || 0,
        topActions: topActionsR.recordset.map(r => ({
            action: r.Action,
            soLan: Number(r.SoLan) || 0,
        })),
        topUsers: topUsersR.recordset.map(r => ({
            tenDangNhap: r.TenDangNhap,
            soLan: Number(r.SoLan) || 0,
        })),
        daily: dailyR.recordset.map(r => ({
            ngay: new Date(r.Ngay).toISOString().slice(0, 10),
            soBanGhi: Number(r.SoBanGhi) || 0,
        })),
    };
}

/**
 * Lay danh sach action types hien co (distinct)
 * @returns {Promise<string[]>}
 */
async function getActionTypes() {
    const r = await db.query(`
        SELECT DISTINCT Action FROM AuditLog ORDER BY Action
    `);
    return r.recordset.map(row => row.Action);
}

/**
 * Lay danh sach bang duoc ghi (distinct)
 * @returns {Promise<string[]>}
 */
async function getTableNames() {
    const r = await db.query(`
        SELECT DISTINCT TableName FROM AuditLog
        WHERE TableName IS NOT NULL
        ORDER BY TableName
    `);
    return r.recordset.map(row => row.TableName);
}

// ========== Helpers ==========

/**
 * Parse JSON safe, tra ve null neu loi
 */
function parseJsonSafe(str) {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

module.exports = {
    getAuditLogs,
    getAuditLogById,
    getAuditStats,
    getActionTypes,
    getTableNames,
};
