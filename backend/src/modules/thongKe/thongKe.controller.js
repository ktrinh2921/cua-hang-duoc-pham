/**
 * ThongKe Controller - 3 dashboard tổng hợp + 1 list chi tiết
 *  - GET /kho             [All]     Tồn kho + cảnh báo
 *  - GET /hoa-don         [All]     Doanh thu + top thuốc
 *  - GET /hoa-don/list    [All]     Danh sách chi tiết hóa đơn trong kỳ (kèm phân trang)
 *  - GET /tai-chinh       [Admin]   Tổng thu/chi/lợi nhuận
 */
const thongKeService = require('./thongKe.service');
const { validateDateRange } = require('./dateRange.logic');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, error, successPaginated } = require('../../utils/response');

function validateRangeOrRespond(res, from, to) {
    try {
        validateDateRange(from, to);
        return true;
    } catch (err) {
        error(res, err.message, 400);
        return false;
    }
}

const getKho = asyncHandler(async (req, res) => {
    const data = await thongKeService.thongKeKho();
    return success(res, data);
});

const getHoaDon = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    if (!validateRangeOrRespond(res, from, to)) return;
    const data = await thongKeService.thongKeHoaDon({ fromDate: from, toDate: to });
    return success(res, data);
});

/**
 * GET /api/thong-ke/hoa-don/list?from=&to=&page=1&limit=20
 * Danh sách hóa đơn chi tiết (phân trang) trong khoảng thời gian.
 * Hỗ trợ "xem được hóa đơn" từ tab Thống kê (theo yêu cầu đề bài).
 */
const getHoaDonList = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    if (!validateRangeOrRespond(res, from, to)) return;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { items, total } = await thongKeService.thongKeHoaDonList({
        fromDate: from, toDate: to, page, limit,
    });
    return successPaginated(res, items, total, page, limit);
});

const getTaiChinh = asyncHandler(async (req, res) => {
    const { from, to } = req.query;
    if (!validateRangeOrRespond(res, from, to)) return;
    const data = await thongKeService.thongKeTaiChinh({ fromDate: from, toDate: to });
    return success(res, data);
});

module.exports = { getKho, getHoaDon, getHoaDonList, getTaiChinh };
