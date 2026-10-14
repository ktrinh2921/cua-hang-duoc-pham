/**
 * DanhMuc Service - Business logic cho quản lý danh mục thuốc
 */
const db = require('../../config/db');

/**
 * Lấy tất cả danh mục (có count thuốc trong mỗi danh mục)
 * @returns {Promise<Array>}
 */
async function getAll() {
    const result = await db.query(`
        SELECT
            dm.MaDM,
            dm.TenDM,
            dm.CreatedAt,
            dm.UpdatedAt,
            (SELECT COUNT(*) FROM Thuoc t WHERE t.MaDM = dm.MaDM) AS SoThuoc
        FROM DanhMuc dm
        ORDER BY dm.MaDM ASC
    `);
    return result.recordset;
}

/**
 * Lấy danh mục theo mã
 * @param {string} maDM
 * @returns {Promise<Object|null>}
 */
async function getById(maDM) {
    const result = await db.query(
        `SELECT MaDM, TenDM, CreatedAt, UpdatedAt
         FROM DanhMuc
         WHERE MaDM = @maDM`,
        { maDM }
    );
    return result.recordset[0] || null;
}

/**
 * Tạo danh mục mới
 * @param {Object} data - { maDM, tenDM }
 * @returns {Promise<Object>}
 * @throws Error nếu trùng mã hoặc trùng tên
 */
async function create(data) {
    try {
        const result = await db.query(
            `INSERT INTO DanhMuc (MaDM, TenDM)
             OUTPUT INSERTED.MaDM, INSERTED.TenDM, INSERTED.CreatedAt, INSERTED.UpdatedAt
             VALUES (@maDM, @tenDM)`,
            { maDM: data.maDM, tenDM: data.tenDM }
        );
        return result.recordset[0];
    } catch (err) {
        // Lỗi UNIQUE constraint (trùng MaDM hoặc TenDM)
        if (err.number === 2627 || err.number === 2601) {
            const isMaDM = err.message.includes('PRIMARY KEY') || err.message.includes('MaDM');
            const message = isMaDM
                ? `Mã danh mục "${data.maDM}" đã tồn tại`
                : `Tên danh mục "${data.tenDM}" đã tồn tại`;
            const error = new Error(message);
            error.statusCode = 409;
            throw error;
        }
        throw err;
    }
}

/**
 * Cập nhật danh mục
 * @param {string} maDM
 * @param {Object} data - { tenDM }
 * @returns {Promise<Object|null>}
 */
async function update(maDM, data) {
    try {
        const result = await db.query(
            `UPDATE DanhMuc
             SET TenDM = @tenDM, UpdatedAt = GETDATE()
             OUTPUT INSERTED.MaDM, INSERTED.TenDM, INSERTED.CreatedAt, INSERTED.UpdatedAt
             WHERE MaDM = @maDM`,
            { maDM, tenDM: data.tenDM }
        );
        return result.recordset[0] || null;
    } catch (err) {
        if (err.number === 2627 || err.number === 2601) {
            const error = new Error(`Tên danh mục "${data.tenDM}" đã tồn tại`);
            error.statusCode = 409;
            throw error;
        }
        throw err;
    }
}

/**
 * Xóa danh mục (chỉ khi không có thuốc nào thuộc danh mục)
 * @param {string} maDM
 * @returns {Promise<boolean>}
 * @throws Error nếu còn thuốc thuộc danh mục
 */
async function remove(maDM) {
    // Kiểm tra còn thuốc không
    const checkResult = await db.query(
        'SELECT COUNT(*) AS cnt FROM Thuoc WHERE MaDM = @maDM',
        { maDM }
    );

    if (checkResult.recordset[0].cnt > 0) {
        const error = new Error(
            `Không thể xóa: danh mục "${maDM}" đang có ${checkResult.recordset[0].cnt} thuốc`
        );
        error.statusCode = 409;
        throw error;
    }

    const result = await db.query(
        'DELETE FROM DanhMuc WHERE MaDM = @maDM',
        { maDM }
    );
    return result.rowsAffected[0] > 0;
}

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};
