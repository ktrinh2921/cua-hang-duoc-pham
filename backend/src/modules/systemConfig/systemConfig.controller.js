/**
 * SystemConfig Controller
 *
 * Route: /api/system-config
 * Role: Admin only
 */
const systemConfigService = require('./systemConfig.service');
const { success, successPaginated, notFound } = require('../../utils/response');

/**
 * GET /api/system-config
 * Lay tat ca cau hinh (Admin)
 */
async function getAll(req, res, next) {
    try {
        const configs = await systemConfigService.getAll();
        return success(res, configs);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/system-config/:key
 * Lay 1 cau hinh
 */
async function getOne(req, res, next) {
    try {
        const value = await systemConfigService.get(req.params.key);
        return success(res, { key: req.params.key, value });
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/system-config/:key
 * Cap nhat 1 cau hinh
 */
async function setOne(req, res, next) {
    try {
        const { key } = req.params;
        const { value, description } = req.body;

        if (value === undefined) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Thiếu field "value"' }
            });
        }

        const updatedBy = req.user ? req.user.username : 'System';
        const result = await systemConfigService.set(key, value, description, updatedBy);
        return success(res, result, 'Cập nhật cấu hình thành công');
    } catch (err) {
        next(err);
    }
}

/**
 * PUT /api/system-config
 * Cap nhat nhieu cau hinh cung luc
 */
async function setMany(req, res, next) {
    try {
        const { configs } = req.body;

        if (!configs || typeof configs !== 'object' || Array.isArray(configs)) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Body phải có field "configs" là object' }
            });
        }

        const updatedBy = req.user ? req.user.username : 'System';
        const result = await systemConfigService.setMany(configs, updatedBy);
        return success(res, result, 'Cập nhật cấu hình thành công');
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/system-config/:key
 * Xoa 1 cau hinh
 */
async function removeOne(req, res, next) {
    try {
        await systemConfigService.remove(req.params.key);
        return success(res, null, 'Xóa cấu hình thành công');
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getAll,
    getOne,
    setOne,
    setMany,
    removeOne,
};
