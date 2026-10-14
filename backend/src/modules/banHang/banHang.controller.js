/**
 * BanHang Controller
 *
 * POST /api/ban-hang         — Tạo hóa đơn + trừ tồn kho (Admin, NV_BanHang)
 * GET  /api/hoa-don          — Danh sách (All authenticated)
 * GET  /api/hoa-don/:id      — Chi tiết (All authenticated)
 * PUT  /api/hoa-don/:id/huy  — Hủy (Admin only)
 */
const banHangService = require('./banHang.service');
const { logAudit } = require('../../middleware/audit');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, created, successPaginated, error } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
    const { maKH, tienKhachDua, giamGia = 0, items } = req.body;
    const maNV = req.user.maNV;

    if (!Array.isArray(items) || items.length === 0) {
        return error(res, 'Giỏ hàng trống', 400);
    }

    const hoaDon = await banHangService.banHang({
        maKH: maKH ? Number(maKH) : null,
        tienKhachDua: Number(tienKhachDua) || 0,
        giamGia: Number(giamGia) || 0,
        items,
        maNV,
    });

    await logAudit(req, 'CREATE_HOADON', 'HoaDon', String(hoaDon.MaHD), null, {
        maHD: hoaDon.MaHD,
        maNV,
        maKH: hoaDon.MaKH,
        tongTien: Number(hoaDon.TongTien),
        giamGia: Number(hoaDon.GiamGia) || 0,
        tienDua: Number(tienKhachDua),
        tienTraLai: hoaDon.TienTraLai,
        soMatHang: items.length,
    });

    return created(res, hoaDon, 'Tạo hóa đơn thành công');
});

const getAll = asyncHandler(async (req, res) => {
    const { keyword = '', page = 1, limit = 10, from, to } = req.query;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 1));

    const { items, total } = await banHangService.getAll({
        keyword, page: safePage, limit: safeLimit, fromDate: from, toDate: to,
    });
    return successPaginated(res, items, total, safePage, safeLimit);
});

const getById = asyncHandler(async (req, res) => {
    const maHD = parseInt(req.params.id, 10);
    const hoaDon = await banHangService.getById(maHD);
    if (!hoaDon) return error(res, `Không tìm thấy hóa đơn #${maHD}`, 404);
    return success(res, hoaDon);
});

const cancel = asyncHandler(async (req, res) => {
    const maHD = parseInt(req.params.id, 10);
    const hoaDon = await banHangService.cancel(maHD);

    await logAudit(req, 'CANCEL_HOADON', 'HoaDon', String(maHD),
        { trangThai: 'DaThanhToan' }, { trangThai: 'DaHuy' });

    return success(res, hoaDon, 'Đã hủy hóa đơn');
});

module.exports = { create, getAll, getById, cancel };
