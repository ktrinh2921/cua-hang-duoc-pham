/**
 * PhieuChi Controller - Admin only
 *
 * POST /api/phieu-chi         — Tạo phiếu chi (Admin)
 * GET  /api/phieu-chi         — Danh sách (Admin)
 * GET  /api/phieu-chi/so-du   — Số dư quỹ (Admin) - helper cho FE
 * GET  /api/phieu-chi/stats   — Stats cho trang TaiChinh (chart + top)
 * GET  /api/phieu-chi/:id     — Chi tiết (Admin)
 */
const phieuChiService = require('./phieuChi.service');
const { logAudit } = require('../../middleware/audit');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, created, successPaginated, error } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
    const { soTien, noiDung } = req.body;
    const maNV = req.user.maNV;

    if (soTien === undefined || soTien === null || soTien === '') {
        return error(res, 'Vui lòng nhập số tiền', 400);
    }
    const soTienNum = Number(soTien);
    if (!Number.isFinite(soTienNum) || soTienNum <= 0) {
        return error(res, 'Số tiền phải > 0', 400);
    }
    if (!Number.isInteger(soTienNum)) {
        return error(res, 'Số tiền phải là số nguyên (đơn vị VND)', 400);
    }
    if (!noiDung || !noiDung.trim()) {
        return error(res, 'Vui lòng nhập nội dung', 400);
    }

    const phieuChi = await phieuChiService.create({
        soTien: soTienNum,
        noiDung,
        maNV,
    });

    // Audit log
    logAudit(req, 'CREATE_PHIEUCHI', 'PhieuChi', String(phieuChi?.MaPhieuChi ?? '?'), null, {
        maPhieuChi: phieuChi?.MaPhieuChi,
        maNV,
        soTien: Number(phieuChi?.SoTien),
        noiDung: phieuChi?.NoiDung,
    }).catch(err => console.error('[audit] CREATE_PHIEUCHI failed:', err.message));

    return created(res, phieuChi, 'Tạo phiếu chi thành công');
});

const getAll = asyncHandler(async (req, res) => {
    const { keyword = '', page = 1, limit = 10, from, to } = req.query;
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 1));

    const { items, total } = await phieuChiService.getAll({
        keyword, page: safePage, limit: safeLimit, fromDate: from, toDate: to,
    });
    return successPaginated(res, items, total, safePage, safeLimit);
});

const getById = asyncHandler(async (req, res) => {
    const maPhieuChi = parseInt(req.params.id, 10);
    const phieuChi = await phieuChiService.getById(maPhieuChi);
    if (!phieuChi) return error(res, `Không tìm thấy phiếu chi #${maPhieuChi}`, 404);
    return success(res, phieuChi);
});

const getSoDu = asyncHandler(async (req, res) => {
    const soDu = await phieuChiService.getSoDu();
    return success(res, soDu);
});

const getStats = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const stats = await phieuChiService.getStats({ days });
    return success(res, stats);
});

module.exports = { create, getAll, getById, getSoDu, getStats };
