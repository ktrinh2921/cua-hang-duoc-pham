/**
 * DanhMuc Controller
 */
const danhMucService = require('./danhMuc.service');
const { success, created, error, notFound } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * GET /api/danh-muc
 * Lấy tất cả danh mục (kèm count thuốc)
 */
const getAll = asyncHandler(async (req, res) => {
    const items = await danhMucService.getAll();
    return success(res, items, 'Lấy danh sách danh mục thành công');
});

/**
 * GET /api/danh-muc/:maDM
 */
const getById = asyncHandler(async (req, res) => {
    const item = await danhMucService.getById(req.params.maDM);
    if (!item) return notFound(res, `Không tìm thấy danh mục "${req.params.maDM}"`);
    return success(res, item);
});

/**
 * POST /api/danh-muc
 * Body: { maDM, tenDM }
 */
const create = asyncHandler(async (req, res) => {
    const { maDM, tenDM } = req.body;

    // Validation
    if (!maDM || !tenDM) {
        return error(res, 'Vui lòng nhập mã và tên danh mục', 400);
    }
    if (maDM.length > 20) {
        return error(res, 'Mã danh mục tối đa 20 ký tự', 400);
    }
    if (tenDM.length > 200) {
        return error(res, 'Tên danh mục tối đa 200 ký tự', 400);
    }

    const item = await danhMucService.create({ maDM, tenDM });
    return created(res, item, 'Tạo danh mục thành công');
});

/**
 * PUT /api/danh-muc/:maDM
 * Body: { tenDM }
 */
const update = asyncHandler(async (req, res) => {
    const { tenDM } = req.body;

    if (!tenDM) {
        return error(res, 'Vui lòng nhập tên danh mục', 400);
    }
    if (tenDM.length > 200) {
        return error(res, 'Tên danh mục tối đa 200 ký tự', 400);
    }

    const item = await danhMucService.update(req.params.maDM, { tenDM });
    if (!item) return notFound(res, `Không tìm thấy danh mục "${req.params.maDM}"`);
    return success(res, item, 'Cập nhật danh mục thành công');
});

/**
 * DELETE /api/danh-muc/:maDM
 */
const remove = asyncHandler(async (req, res) => {
    const deleted = await danhMucService.remove(req.params.maDM);
    if (!deleted) return notFound(res, `Không tìm thấy danh mục "${req.params.maDM}"`);
    return success(res, null, 'Xóa danh mục thành công');
});

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};
