/**
 * KhachHang Controller
 *
 * Endpoints:
 *  GET  /api/khach-hang             - Danh sách + filter (keyword, segment, gioiTinh)
 *  GET  /api/khach-hang/stats       - Thống kê tổng quan (cards đầu trang)
 *  GET  /api/khach-hang/:id         - Chi tiết + stats aggregate
 *  GET  /api/khach-hang/:id/hoa-don - Lịch sử hóa đơn của KH
 *  POST /api/khach-hang             - Tạo (Admin, NV_BanHang)
 *  PUT  /api/khach-hang/:id         - Cập nhật (Admin, NV_BanHang)
 *  DELETE /api/khach-hang/:id       - Xóa (Admin only)
 */
const khService = require('./khachHang.service');
const { success, created, notFound, error, successPaginated } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/errorHandler');

const getAll = asyncHandler(async (req, res) => {
    const { keyword = '', segment = '', gioiTinh = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { items, total } = await khService.getAll({ keyword, segment, gioiTinh, page, limit });
    return successPaginated(res, items, total, page, limit);
});

const getStats = asyncHandler(async (req, res) => {
    const stats = await khService.getStats();
    return success(res, stats);
});

const getById = asyncHandler(async (req, res) => {
    const item = await khService.getById(parseInt(req.params.id, 10));
    if (!item) return notFound(res, `Không tìm thấy KH #${req.params.id}`);
    return success(res, item);
});

/**
 * Lịch sử hóa đơn đã thanh toán của 1 khách hàng.
 * Mặc định trả về 10 đơn gần nhất; tối đa 50.
 */
const getHoaDonByKhachHang = asyncHandler(async (req, res) => {
    const maKH = parseInt(req.params.id, 10);
    // Đảm bảo KH tồn tại trước khi trả list (tránh lộ thông tin)
    const kh = await khService.getById(maKH);
    if (!kh) return notFound(res, `Không tìm thấy KH #${maKH}`);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const items = await khService.getHoaDonByKhachHang(maKH, limit);
    return success(res, items);
});

const create = asyncHandler(async (req, res) => {
    const { tenKH, sdt, gioiTinh } = req.body;
    const tenKHTrimmed = tenKH?.trim();
    if (!tenKHTrimmed) return error(res, 'Vui lòng nhập tên khách hàng', 400);

    // Validate SĐT: 10-11 số nếu có
    if (sdt && sdt.trim() && !/^\d{10,11}$/.test(sdt.trim())) {
        return error(res, 'Số điện thoại phải là 10-11 chữ số', 400);
    }

    try {
        const item = await khService.create({ tenKH: tenKHTrimmed, sdt: sdt ? sdt.trim() : null, gioiTinh: gioiTinh || null });
        return created(res, item, 'Tạo khách hàng thành công');
    } catch (err) {
        if (err.code === 'DUPLICATE_SDT') {
            return error(res, err.message, 409); // Conflict
        }
        throw err;
    }
});

const update = asyncHandler(async (req, res) => {
    const { tenKH, sdt, gioiTinh } = req.body;
    const tenKHTrimmed = tenKH?.trim();
    if (!tenKHTrimmed) return error(res, 'Vui lòng nhập tên khách hàng', 400);
    if (sdt && sdt.trim() && !/^\d{10,11}$/.test(sdt.trim())) {
        return error(res, 'Số điện thoại phải là 10-11 chữ số', 400);
    }

    try {
        const item = await khService.update(parseInt(req.params.id, 10), { tenKH: tenKHTrimmed, sdt: sdt ? sdt.trim() : null, gioiTinh: gioiTinh || null });
        if (!item) return notFound(res, `Không tìm thấy KH #${req.params.id}`);
        return success(res, item, 'Cập nhật thành công');
    } catch (err) {
        if (err.code === 'DUPLICATE_SDT') {
            return error(res, err.message, 409); // Conflict
        }
        throw err;
    }
});

const remove = asyncHandler(async (req, res) => {
    const deleted = await khService.remove(parseInt(req.params.id, 10));
    if (!deleted) return notFound(res, `Không tìm thấy KH #${req.params.id}`);
    return success(res, null, 'Xóa thành công');
});

module.exports = { getAll, getStats, getById, getHoaDonByKhachHang, create, update, remove };
