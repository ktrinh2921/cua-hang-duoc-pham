/**
 * Thuoc Controller
 */
const thuocService = require('./thuoc.service');
const danhMucService = require('../danhMuc/danhMuc.service');
const { success, created, notFound, error, successPaginated } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/errorHandler');

/**
 * GET /api/thuoc?keyword=&maDM=&trangThaiTon=&sort=&page=&limit=
 * Read-only: tất cả role đều xem được
 *
 * Response bao gồm:
 *  - items, pagination
 *  - counts: { inStock, low, out } — để FE hiển thị filter chips
 */
const getAll = asyncHandler(async (req, res) => {
    const { keyword = '', maDM = null, trangThaiTon = 'all', sort = 'ma_desc' } = req.query;
    // Guard: page/limit phai la so nguyen duong
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { items, total, counts } = await thuocService.getAll({ keyword, maDM, page, limit, trangThaiTon, sort });
    return successPaginated(res, items, total, page, limit, { counts });
});

/**
 * GET /api/thuoc/:id
 */
const getById = asyncHandler(async (req, res) => {
    const item = await thuocService.getById(parseInt(req.params.id));
    if (!item) return notFound(res, `Không tìm thấy thuốc #${req.params.id}`);
    return success(res, item);
});

/**
 * GET /api/thuoc/:id/similar?inStockOnly=true&limit=5
 * Lấy thuốc cùng hoạt chất (cho "sản phẩm thay thế" khi thuốc nguồn hết hàng)
 *
 * Query:
 *  - inStockOnly: 'true' (mặc định) | 'false' — chỉ trả thuốc đang còn hàng + chưa hết hạn
 *  - limit: số lượng tối đa (1-10, mặc định 5)
 */
const getSimilar = asyncHandler(async (req, res) => {
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const inStockOnly = req.query.inStockOnly !== 'false'; // mặc định true
    const items = await thuocService.getSimilarByHoatChat(parseInt(req.params.id), limit, { inStockOnly });
    return success(res, items);
});

/**
 * POST /api/thuoc - Admin only
 */
const create = asyncHandler(async (req, res) => {
    const { tenThuoc, hoatChat, khoiLuong, giaBanThamKhao, maDM, moTa, lieuDung, chongChiDinh, ghiChu } = req.body;

    if (!tenThuoc || !maDM || giaBanThamKhao === undefined || giaBanThamKhao === null || giaBanThamKhao === '') {
        return error(res, 'Vui lòng nhập đầy đủ: tên thuốc, danh mục, giá bán', 400);
    }
    const giaBan = Number(giaBanThamKhao);
    if (isNaN(giaBan) || giaBan < 0) {
        return error(res, 'Giá bán tham khảo phải ≥ 0', 400);
    }

    const dm = await danhMucService.getById(maDM);
    if (!dm) return error(res, `Danh mục "${maDM}" không tồn tại`, 400);

    const item = await thuocService.create({
        tenThuoc, hoatChat, khoiLuong, giaBanThamKhao: giaBan, maDM,
        moTa, lieuDung, chongChiDinh, ghiChu
    });
    return created(res, item, 'Tạo thuốc thành công');
});

/**
 * PUT /api/thuoc/:id - Admin only
 */
const update = asyncHandler(async (req, res) => {
    const { tenThuoc, hoatChat, khoiLuong, giaBanThamKhao, maDM, moTa, lieuDung, chongChiDinh, ghiChu } = req.body;

    if (!tenThuoc || !maDM || giaBanThamKhao === undefined || giaBanThamKhao === null || giaBanThamKhao === '') {
        return error(res, 'Vui lòng nhập đầy đủ thông tin', 400);
    }
    const giaBan = Number(giaBanThamKhao);
    if (isNaN(giaBan) || giaBan < 0) {
        return error(res, 'Giá bán tham khảo phải ≥ 0', 400);
    }

    const dm = await danhMucService.getById(maDM);
    if (!dm) return error(res, `Danh mục "${maDM}" không tồn tại`, 400);

    const item = await thuocService.update(parseInt(req.params.id), {
        tenThuoc, hoatChat, khoiLuong, giaBanThamKhao: giaBan, maDM,
        moTa, lieuDung, chongChiDinh, ghiChu
    });
    if (!item) return notFound(res, `Không tìm thấy thuốc #${req.params.id}`);
    return success(res, item, 'Cập nhật thuốc thành công');
});

/**
 * DELETE /api/thuoc/:id - Admin only
 */
const remove = asyncHandler(async (req, res) => {
    const deleted = await thuocService.remove(parseInt(req.params.id));
    if (!deleted) return notFound(res, `Không tìm thấy thuốc #${req.params.id}`);
    return success(res, null, 'Xóa thuốc thành công');
});

module.exports = {
    getAll,
    getById,
    getSimilar,
    create,
    update,
    remove
};
