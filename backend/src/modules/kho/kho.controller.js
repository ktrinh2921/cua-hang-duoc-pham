/**
 * Kho Controller - Xử lý request/response cho quản lý tồn kho
 */
const khoService = require('./kho.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, successPaginated, error } = require('../../utils/response');
const { logAudit } = require('../../middleware/audit');

/**
 * GET /api/kho/thong-ke-tong
 * Thống kê tổng quan cho Hub Kho:
 *  - tongTon: tổng số lượng tồn kho (sum SoLuongTonKho từ các lô hợp lệ)
 *  - giaTriTonKho: tổng giá trị tồn kho (VND) = SUM(SoLuongTonKho × GiaNhap)
 *  - soThuocCoTon: số thuốc có ít nhất 1 lô còn hàng
 *  - tongSoLo: tổng số lô còn hàng (chưa hết hạn, thuộc phiếu DaNhap)
 *
 * Tất cả role đều xem được (chỉ là thống kê).
 */
const getThongKeTong = asyncHandler(async (req, res) => {
    const data = await khoService.getThongKeTong();
    return success(res, data);
});

/**
 * GET /api/kho/ton-kho?keyword=&page=&limit=
 * Tất cả role đều xem được (xem tồn kho)
 */
const getTonKho = asyncHandler(async (req, res) => {
    const { keyword = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { items, total } = await khoService.getTonKho({ keyword, page, limit });
    return successPaginated(res, items, total, page, limit);
});

/**
 * GET /api/kho/sap-het-hang?nguong=10
 * Cảnh báo thuốc sắp hết hàng
 */
const getSapHetHang = asyncHandler(async (req, res) => {
    const nguong = parseInt(req.query.nguong, 10) || 10;
    const items = await khoService.getSapHetHang(nguong);
    return success(res, { items, nguong, total: items.length });
});

/**
 * GET /api/kho/sap-het-han?days=30
 * Cảnh báo lô thuốc sắp hết hạn
 */
const getSapHetHan = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const items = await khoService.getSapHetHan(days);
    return success(res, { items, days, total: items.length });
});

/**
 * GET /api/kho/lo/:maThuoc
 * Danh sách lô còn hàng của 1 thuốc (FIFO — lô cũ nhất lên đầu)
 */
const getLoByThuoc = asyncHandler(async (req, res) => {
    const maThuoc = parseInt(req.params.maThuoc, 10);
    if (!maThuoc) {
        const err = new Error('maThuoc không hợp lệ');
        err.statusCode = 400;
        throw err;
    }
    const [items, tonKho, adjustments] = await Promise.all([
        khoService.getLoByThuoc(maThuoc, req.user.role),
        khoService.getTonKhoThuoc(maThuoc),
        khoService.getAdjustmentsByThuoc(maThuoc),
    ]);
    return success(res, { items, tonKho, adjustments });
});

/**
 * GET /api/kho/dieu-chinh?keyword=&maNV=&from=&to=&page=&limit=
 * Lịch sử điều chỉnh tồn kho (audit trail) — Admin + NV_Kho
 *
 * Filter:
 *  - keyword: tìm theo TenThuoc hoặc LyDo
 *  - maNV: filter theo nhân viên thực hiện
 *  - from/to: filter theo CreatedAt (yyyy-mm-dd)
 */
const getDieuChinhList = asyncHandler(async (req, res) => {
    const { keyword = '', maNV = '', from = '', to = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { items, total } = await khoService.getDieuChinhList({
        keyword, maNV, from, to, page, limit,
    });
    return successPaginated(res, items, total, page, limit);
});

/**
 * PATCH /api/kho/lo/:maLo/ton-kho
 * Điều chỉnh tồn thực tế của một lô sau kiểm kê (Admin, NV_Kho).
 */
const adjustLotStock = asyncHandler(async (req, res) => {
    const maLo = Number(req.params.maLo);
    const soLuongMoi = Number(req.body.soLuongMoi);
    const lyDo = String(req.body.lyDo || '').trim();

    if (!Number.isInteger(maLo) || maLo <= 0) {
        return error(res, 'Mã lô không hợp lệ', 400);
    }
    if (!Number.isInteger(soLuongMoi) || soLuongMoi < 0 || soLuongMoi > 1000000000) {
        return error(res, 'Số lượng mới phải là số nguyên từ 0 đến 1.000.000.000', 400);
    }
    if (lyDo.length < 3 || lyDo.length > 500) {
        return error(res, 'Lý do điều chỉnh phải có từ 3 đến 500 ký tự', 400);
    }

    const item = await khoService.adjustLotStock(maLo, {
        soLuongMoi,
        lyDo,
        maNV: req.user.maNV,
    });

    // Audit log: điều chỉnh tồn kho là hành động nghiệp vụ quan trọng,
    // cần ghi lại để admin truy vết trách nhiệm kiểm kê
    await logAudit(
        req,
        'ADJUST_TONKHO',
        'LoThuoc_ChiTietNhap',
        String(maLo),
        { soLuongTonKho: item.SoLuongTruoc ?? null },
        {
            maLo: item.MaLo,
            maThuoc: item.MaThuoc,
            soLuongMoi,
            soLuongTruoc: item.SoLuongTruoc,
            lyDo,
        }
    );

    return success(res, item, 'Điều chỉnh tồn kho thành công');
});

module.exports = {
    getThongKeTong,
    getTonKho,
    getSapHetHang,
    getSapHetHan,
    getLoByThuoc,
    getDieuChinhList,
    adjustLotStock
};
