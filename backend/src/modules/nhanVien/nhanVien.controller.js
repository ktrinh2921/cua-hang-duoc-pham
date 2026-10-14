/**
 * NhanVien Controller
 *
 * Endpoints:
 *  GET  /api/nhan-vien                - Danh sách + filter (keyword, vaiTro, trangThai)
 *  GET  /api/nhan-vien/stats         - Thống kê tổng quan
 *  GET  /api/nhan-vien/:id           - Chi tiết + stats aggregate
 *  GET  /api/nhan-vien/:id/hoa-don   - Lịch sử hóa đơn đã thanh toán
 *  GET  /api/nhan-vien/:id/phieu-nhap - Lịch sử phiếu nhập
 *  POST /api/nhan-vien                - Tạo (Admin only) — hỗ trợ tạo kèm tài khoản (body.taiKhoan)
 *  PUT  /api/nhan-vien/:id            - Cập nhật (Admin only)
 *  DELETE /api/nhan-vien/:id          - Xóa (Admin only)
 *  POST /api/nhan-vien/:id/tai-khoan  - Cấp tài khoản cho NV chưa có (Admin only)
 *  PATCH /api/nhan-vien/:id/tai-khoan - Đổi vai trò / khóa tài khoản (Admin only)
 *  POST /api/nhan-vien/:id/reset-mat-khau - Admin reset mật khẩu NV
 */
const nvService = require('./nhanVien.service');
const { success, created, notFound, error, conflict, successPaginated } = require('../../utils/response');
const { asyncHandler } = require('../../middleware/errorHandler');

const getAll = asyncHandler(async (req, res) => {
    const { keyword = '', vaiTro = '', trangThai = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { items, total } = await nvService.getAll({ keyword, vaiTro, trangThai, page, limit });
    return successPaginated(res, items, total, page, limit);
});

const getStats = asyncHandler(async (req, res) => {
    const stats = await nvService.getStats();
    return success(res, stats);
});

const getById = asyncHandler(async (req, res) => {
    const item = await nvService.getById(parseInt(req.params.id, 10));
    if (!item) return notFound(res, `Không tìm thấy NV #${req.params.id}`);
    return success(res, item);
});

const getHoaDonByNV = asyncHandler(async (req, res) => {
    const maNV = parseInt(req.params.id, 10);
    const nv = await nvService.getById(maNV);
    if (!nv) return notFound(res, `Không tìm thấy NV #${maNV}`);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const items = await nvService.getHoaDonByNV(maNV, limit);
    return success(res, items);
});

const getPhieuNhapByNV = asyncHandler(async (req, res) => {
    const maNV = parseInt(req.params.id, 10);
    const nv = await nvService.getById(maNV);
    if (!nv) return notFound(res, `Không tìm thấy NV #${maNV}`);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const items = await nvService.getPhieuNhapByNV(maNV, limit);
    return success(res, items);
});

const create = asyncHandler(async (req, res) => {
    const { tenNV, sdt, gioiTinh, luong, ngayVaoLam, trangThai, email, chucVu, diaChi, ghiChu, taiKhoan } = req.body;
    if (!tenNV) return error(res, 'Vui lòng nhập tên nhân viên', 400);

    const luongNum = Number(luong);
    if (luong !== undefined && luong !== null && luong !== '' && (isNaN(luongNum) || luongNum < 0)) {
        return error(res, 'Lương phải ≥ 0', 400);
    }

    const nvFields = {
        tenNV, sdt: sdt || null, gioiTinh: gioiTinh || null,
        luong: isNaN(luongNum) ? 0 : luongNum,
        ngayVaoLam: ngayVaoLam || null,
        trangThai: trangThai || 'DangLam',
        email: email || null, chucVu: chucVu || null,
        diaChi: diaChi || null, ghiChu: ghiChu || null,
    };

    // Nếu payload có taiKhoan → tạo NV + cấp tài khoản trong 1 transaction.
    if (taiKhoan) {
        try {
            const result = await nvService.createWithAccount(nvFields, taiKhoan);
            return created(res, result, 'Tạo nhân viên và cấp tài khoản thành công');
        } catch (err) {
            if (err.statusCode) return error(res, err.message, err.statusCode);
            throw err;
        }
    }

    const item = await nvService.create(nvFields);
    return created(res, item, 'Tạo nhân viên thành công');
});

const update = asyncHandler(async (req, res) => {
    const { tenNV, sdt, gioiTinh, luong, trangThai, email, chucVu, diaChi, ghiChu } = req.body;
    if (!tenNV) return error(res, 'Vui lòng nhập tên nhân viên', 400);

    const luongNum = Number(luong);
    if (luong !== undefined && luong !== null && luong !== '' && (isNaN(luongNum) || luongNum < 0)) {
        return error(res, 'Lương phải ≥ 0', 400);
    }

    // Không cho thay đổi trạng thái của chính mình
    if (req.user && parseInt(req.params.id) === req.user.maNV) {
        if (trangThai && trangThai !== 'DangLam') {
            return error(res, 'Không thể thay đổi trạng thái của chính mình', 400);
        }
    }

    const item = await nvService.update(parseInt(req.params.id), {
        tenNV, sdt: sdt || null, gioiTinh: gioiTinh || null,
        luong: isNaN(luongNum) ? 0 : luongNum,
        trangThai: trangThai || 'DangLam',
        email: email || null, chucVu: chucVu || null,
        diaChi: diaChi || null, ghiChu: ghiChu || null,
    });
    if (!item) return notFound(res, `Không tìm thấy NV #${req.params.id}`);
    return success(res, item, 'Cập nhật thành công');
});

const remove = asyncHandler(async (req, res) => {
    // Không cho xóa chính mình
    if (req.user && parseInt(req.params.id) === req.user.maNV) {
        return error(res, 'Không thể xóa tài khoản của chính mình', 400);
    }

    const deleted = await nvService.remove(parseInt(req.params.id));
    if (!deleted) return notFound(res, `Không tìm thấy NV #${req.params.id}`);
    return success(res, null, 'Xóa nhân viên thành công');
});

/**
 * POST /api/nhan-vien/:id/tai-khoan
 * Cấp tài khoản cho nhân viên đã tồn tại nhưng chưa có TK.
 * Body: { tenDangNhap, matKhau, vaiTro, trangThai? }
 */
const createAccount = asyncHandler(async (req, res) => {
    const maNV = parseInt(req.params.id, 10);
    const { tenDangNhap, matKhau, vaiTro, trangThai, autoUsername, autoPassword } = req.body || {};
    try {
        const result = await nvService.createAccountForExisting(maNV, {
            tenDangNhap,
            matKhau,
            vaiTro,
            trangThai,
            autoUsername,
            autoPassword,
        });
        return created(res, result, 'Cấp tài khoản cho nhân viên thành công');
    } catch (err) {
        if (err.statusCode) return error(res, err.message, err.statusCode);
        throw err;
    }
});

/**
 * PATCH /api/nhan-vien/:id/tai-khoan
 * Đổi vai trò / khóa/mở khóa tài khoản.
 * Body: { vaiTro?, trangThai? }
 */
const updateAccount = asyncHandler(async (req, res) => {
    const maNV = parseInt(req.params.id, 10);
    const { vaiTro, trangThai } = req.body || {};

    // Không cho Admin tự đổi vai trò / khóa chính mình
    if (req.user && req.user.maNV === maNV) {
        return error(res, 'Không thể thay đổi tài khoản của chính mình', 400);
    }

    try {
        const result = await nvService.updateAccount(maNV, { vaiTro, trangThai });
        return success(res, result, 'Cập nhật tài khoản thành công');
    } catch (err) {
        if (err.statusCode) return error(res, err.message, err.statusCode);
        throw err;
    }
});

/**
 * POST /api/nhan-vien/:id/reset-mat-khau
 * Admin reset mật khẩu cho NV. Trả về mật khẩu tạm (NV phải đổi lại ở lần đăng nhập kế tiếp).
 */
const resetPassword = asyncHandler(async (req, res) => {
    const maNV = parseInt(req.params.id, 10);
    const { matKhauMoi } = req.body || {};
    if (req.user && req.user.maNV === maNV) {
        return error(res, 'Không thể reset mật khẩu của chính mình. Hãy dùng chức năng đổi mật khẩu.', 400);
    }
    try {
        const result = await nvService.resetPassword(maNV, matKhauMoi);
        return success(res, result, 'Reset mật khẩu thành công');
    } catch (err) {
        if (err.statusCode) return error(res, err.message, err.statusCode);
        throw err;
    }
});

module.exports = {
    getAll,
    getStats,
    getById,
    getHoaDonByNV,
    getPhieuNhapByNV,
    create,
    update,
    remove,
    createAccount,
    updateAccount,
    resetPassword,
};
