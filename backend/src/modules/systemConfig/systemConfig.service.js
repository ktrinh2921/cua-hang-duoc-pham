/**
 * SystemConfig Service - Luu tru cau hinh he thong trong DB
 *
 * Motivation:
 *  - JWT_SECRET, DB_PASSWORD van o .env (khong dua vao DB vi ly do bao mat).
 *  - Cac tham so nghiệp vụ có thể thay đổi lúc runtime (không cần restart server):
 *      + SO_NGAY_CANH_BAO_HET_HAN  (mặc định: 30 ngày)
 *      + SO_NGAY_CANH_BAO_HET_HANG  (mặc định: số lượng <= 10)
 *      + TI_LE_LAI_NHUAN_MAC_DINH   (mặc định: 20%)
 *      + TEN_CUA_HANG
 *      + DIA_CHI_CUA_HANG
 *      + SO_DIEN_THOAI_CUA_HANG
 *      + VAT_RATE                   (thuế VAT, mặc định: 0%)
 *      + ... (mở rộng sau nếu cần)
 *
 * Table: SystemConfig (tao trong schema patch)
 */
const db = require('../../config/db');

// ============================================================
// 1. READ
// ============================================================

/**
 * Lay gia tri cau hinh theo key
 * @param {string} configKey
 * @param {*} defaultValue - gia tri mac dinh neu khong ton tai
 * @returns {Promise<*>}
 */
async function get(configKey, defaultValue = null) {
    const r = await db.query(
        `SELECT ConfigValue FROM SystemConfig WHERE ConfigKey = @key`,
        { key: configKey }
    );
    if (r.recordset.length === 0) return defaultValue;
    const val = r.recordset[0].ConfigValue;
    // Parse JSON neu la object/array, nguoc lai tra string nguyen
    try {
        return JSON.parse(val);
    } catch {
        return val;
    }
}

/**
 * Lay nhieu cau hinh cung luc (tra ve plain object)
 * @param {string[]} keys
 * @returns {Promise<Object>}
 */
async function getMany(keys) {
    if (!keys || keys.length === 0) return {};
    const placeholders = keys.map((_, i) => `@key${i}`).join(', ');
    const params = {};
    keys.forEach((k, i) => { params[`key${i}`] = k; });

    const r = await db.query(
        `SELECT ConfigKey, ConfigValue FROM SystemConfig WHERE ConfigKey IN (${placeholders})`,
        params
    );
    const result = {};
    for (const row of r.recordset) {
        try {
            result[row.ConfigKey] = JSON.parse(row.ConfigValue);
        } catch {
            result[row.ConfigKey] = row.ConfigValue;
        }
    }
    // Fill default
    keys.forEach(k => {
        if (result[k] === undefined) result[k] = null;
    });
    return result;
}

/**
 * Lay tat ca cau hinh (chi danh cho Admin)
 * @returns {Promise<Array<{key: string, value: *, description: string, updatedAt: Date}>>}
 */
async function getAll() {
    const r = await db.query(`
        SELECT ConfigKey, ConfigValue, ConfigDescription, UpdatedAt, UpdatedBy
        FROM SystemConfig
        ORDER BY ConfigKey ASC
    `);
    return r.recordset.map(row => ({
        key: row.ConfigKey,
        value: parseJsonSafe(row.ConfigValue),
        description: row.ConfigDescription,
        updatedAt: row.UpdatedAt,
        updatedBy: row.UpdatedBy,
    }));
}

// ============================================================
// 2. WRITE (Upsert)
// ============================================================

/**
 * Dat gia tri cau hinh (upsert)
 * @param {string} configKey
 * @param {*} configValue - se duoc JSON.stringify neu la object/array
 * @param {string} description - mo ta (optional)
 * @param {string} updatedBy - nguoi cap nhat (tu req.user)
 * @returns {Promise<{key: string, value: *}>}
 */
async function set(configKey, configValue, description = null, updatedBy = 'System') {
    const strValue = typeof configValue === 'string' ? configValue : JSON.stringify(configValue);

    await db.query(`
        MERGE INTO SystemConfig AS target
        USING (SELECT @key AS ConfigKey) AS source
        ON target.ConfigKey = source.ConfigKey
        WHEN MATCHED THEN
            UPDATE SET
                ConfigValue = @value,
                ConfigDescription = ISNULL(@desc, target.ConfigDescription),
                UpdatedAt = GETDATE(),
                UpdatedBy = @updatedBy
        WHEN NOT MATCHED THEN
            INSERT (ConfigKey, ConfigValue, ConfigDescription, UpdatedAt, UpdatedBy)
            VALUES (@key, @value, @desc, GETDATE(), @updatedBy);
    `, {
        key: configKey,
        value: strValue,
        desc: description,
        updatedBy,
    });

    return { key: configKey, value: configValue };
}

/**
 * Dat nhieu cau hinh cung luc
 * @param {Object} configs - { key: value }
 * @param {string} updatedBy
 * @returns {Promise<Object>} - { key: value }
 */
async function setMany(configs, updatedBy = 'System') {
    const results = {};
    for (const [key, value] of Object.entries(configs)) {
        results[key] = await set(key, value, null, updatedBy);
    }
    return results;
}

/**
 * Xoa cau hinh
 * @param {string} configKey
 */
async function remove(configKey) {
    await db.query(
        `DELETE FROM SystemConfig WHERE ConfigKey = @key`,
        { key: configKey }
    );
}

// ============================================================
// 3. Defaults seeder
// ============================================================

/**
 * Dam bao cac cau hinh mac dinh ton tai (goi 1 lan luc migrate/seed)
 */
async function seedDefaults() {
    const defaults = [
        { key: 'TEN_CUA_HANG', value: 'SecurePharma', description: 'Ten cua hang hien thi tren hoa don/bao cao' },
        { key: 'DIA_CHI_CUA_HANG', value: '123 Đường ABC, Quận 1, TP.HCM', description: 'Dia chi cua hang' },
        { key: 'SO_DIEN_THOAI_CUA_HANG', value: '0901 234 567', description: 'So dien thoai lien he' },
        { key: 'SO_NGAY_CANH_BAO_HET_HAN', value: 30, description: 'So ngay truoc han su dung de canh bao (mac dinh: 30)' },
        { key: 'SO_NGAY_CANH_BAO_HET_HANG', value: 10, description: 'So luong toi thieu de canh bao het hang (mac dinh: 10)' },
        { key: 'TI_LE_LAI_NHUAN_MAC_DINH', value: 20, description: 'Ti le loi nhuan mac dinh khi nhap hang (%)' },
        { key: 'VAT_RATE', value: 0, description: 'Ty le thue VAT (%)' },
        { key: 'HE_SO_GIA_BAN_MAC_DINH', value: 1.2, description: 'He so nhan gia nhap de ra gia ban mac dinh' },
    ];

    for (const d of defaults) {
        await set(d.key, d.value, d.description, 'System');
    }
}

// ============================================================
// Helpers
// ============================================================

function parseJsonSafe(str) {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

module.exports = {
    get,
    getMany,
    getAll,
    set,
    setMany,
    remove,
    seedDefaults,
};
