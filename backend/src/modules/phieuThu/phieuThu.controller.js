const phieuThuService = require('./phieuThu.service');
const { logAudit } = require('../../middleware/audit');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, created, successPaginated, error } = require('../../utils/response');

const create = asyncHandler(async (req, res) => {
    const { soTien, noiDung } = req.body;
    const amount = Number(soTien);
    if (!Number.isFinite(amount) || amount <= 0) {
        return error(res, 'Số tiền phải lớn hơn 0', 400);
    }
    if (!Number.isInteger(amount)) {
        return error(res, 'Số tiền phải là số nguyên (đơn vị VND)', 400);
    }

    const phieuThu = await phieuThuService.create({
        soTien: amount,
        noiDung: (noiDung || '').trim(),
        maNV: req.user.maNV,
    });
    await logAudit(req, 'CREATE_PHIEUTHU', 'PhieuThu', String(phieuThu.MaPhieuThu), null, {
        maPhieuThu: phieuThu.MaPhieuThu,
        soTien: Number(phieuThu.SoTien),
        loaiPhieu: phieuThu.LoaiPhieu,
    });
    return created(res, phieuThu, 'Tạo phiếu thu thành công');
});

const getAll = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const result = await phieuThuService.getAll({
        keyword: req.query.keyword || '',
        page,
        limit,
        fromDate: req.query.from,
        toDate: req.query.to,
        loaiPhieu: req.query.loaiPhieu,
    });
    return successPaginated(res, result.items, result.total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
    const phieuThu = await phieuThuService.getById(req.params.id);
    if (!phieuThu) return error(res, `Không tìm thấy phiếu thu #${req.params.id}`, 404);
    return success(res, phieuThu);
});

module.exports = { create, getAll, getById };
