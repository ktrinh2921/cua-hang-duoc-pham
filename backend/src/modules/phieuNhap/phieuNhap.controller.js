/**
 * PhieuNhap Controller
 *
 * Write (POST, PUT): Admin + NV_Kho
 * Read (GET): Admin + NV_Kho
 *
 * Audit log: Ghi truc tiep bang logAudit() (co du MaPN, ChiTiet, soLuong, gia...)
 */
const phieuNhapService = require('./phieuNhap.service');
const db = require('../../config/db');
const { logAudit } = require('../../middleware/audit');
const { asyncHandler } = require('../../middleware/errorHandler');
const { success, successPaginated, created, notFound, error } = require('../../utils/response');

/**
 * Validate FK: kiem tra maNCC va danh sach maThuoc co ton tai khong.
 * Muc dich: tranh de FK violation no o SQL Server (HTTP 500).
 * Tra ve chuoi thong bao neu loi, null neu OK.
 */
async function validateFK(maNCC, chiTiet) {
    const nccR = await db.query(
        'SELECT MaNCC FROM NhaCungCap WHERE MaNCC = @maNCC',
        { maNCC }
    );
    if (nccR.recordset.length === 0) {
        return `Nhà cung cấp #${maNCC} không tồn tại`;
    }

    for (const ct of chiTiet) {
        // Validate maThuoc is present and valid
        if (ct.maThuoc === undefined || ct.maThuoc === null) {
            return `Lô #${chiTiet.indexOf(ct) + 1}: mã thuốc bị thiếu`;
        }
        const tR = await db.query(
            'SELECT MaThuoc FROM Thuoc WHERE MaThuoc = @maThuoc',
            { maThuoc: ct.maThuoc }
        );
        if (tR.recordset.length === 0) {
            return `Thuốc #${ct.maThuoc} không tồn tại`;
        }
    }
    return null;
}

/**
 * POST /api/phieu-nhap
 * Body: { maNCC, chiTiet: [{ maThuoc, soLuongNhap, ngaySX, hanSD, giaNhap }, ...] }
 */
const create = asyncHandler(async (req, res) => {
    const { maNCC, chiTiet } = req.body;

    // 1. Validate co ban
    if (maNCC === undefined || maNCC === null || maNCC === '') {
        return error(res, 'Vui lòng chọn nhà cung cấp', 400);
    }
    if (!Array.isArray(chiTiet) || chiTiet.length === 0) {
        return error(res, 'Phiếu nhập phải có ít nhất 1 lô thuốc', 400);
    }

    // 2. Strict check maNCC la so nguyen (tranh SQLi/sneaky input)
    const maNCCInt = parseInt(maNCC, 10);
    if (isNaN(maNCCInt) || String(maNCCInt) !== String(maNCC).trim()) {
        return error(res, 'Mã nhà cung cấp phải là số nguyên', 400);
    }

    // 3. Validate tung lo
    for (let i = 0; i < chiTiet.length; i++) {
        const ct = chiTiet[i];

        // 3a. Strict check maThuoc la so nguyen duong
        // Chu y: Number("") = 0, can catch truoc khi isNaN()
        if (ct.maThuoc === undefined || ct.maThuoc === null || ct.maThuoc === '') {
            return error(res, `Lô #${i + 1}: chưa chọn thuốc`, 400);
        }
        const maThuocInt = parseInt(ct.maThuoc, 10);
        if (isNaN(maThuocInt) || maThuocInt <= 0 || String(maThuocInt) !== String(ct.maThuoc).trim()) {
            return error(res, `Lô #${i + 1}: mã thuốc phải là số nguyên dương`, 400);
        }
        ct.maThuoc = maThuocInt; // normalize

        // 3b. So luong > 0
        const slInt = parseInt(ct.soLuongNhap, 10);
        if (isNaN(slInt) || slInt <= 0) {
            return error(res, `Lô #${i + 1}: số lượng nhập phải > 0`, 400);
        }
        ct.soLuongNhap = slInt; // normalize

        // 3c. Ngay SX, Han SD
        if (!ct.ngaySX) return error(res, `Lô #${i + 1}: thiếu ngày sản xuất`, 400);
        if (!ct.hanSD) return error(res, `Lô #${i + 1}: thiếu hạn sử dụng`, 400);
        const nsx = new Date(ct.ngaySX);
        const hsd = new Date(ct.hanSD);
        if (isNaN(nsx.getTime())) {
            return error(res, `Lô #${i + 1}: ngày sản xuất không hợp lệ`, 400);
        }
        if (isNaN(hsd.getTime())) {
            return error(res, `Lô #${i + 1}: hạn sử dụng không hợp lệ`, 400);
        }
        if (hsd <= nsx) {
            return error(res, `Lô #${i + 1}: hạn sử dụng phải sau ngày sản xuất`, 400);
        }
        // HanSD phai la ngay tuong lai (hoac it nhat hom nay)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (hsd <= today) {
            return error(res, `Lô #${i + 1}: hạn sử dụng phải sau ngày hiện tại`, 400);
        }

        // 3d. Gia nhap >= 0
        if (ct.giaNhap === undefined || ct.giaNhap === null || ct.giaNhap === '') {
            return error(res, `Lô #${i + 1}: thiếu giá nhập`, 400);
        }
        const gia = Number(ct.giaNhap);
        if (isNaN(gia) || gia < 0) {
            return error(res, `Lô #${i + 1}: giá nhập phải ≥ 0`, 400);
        }
        ct.giaNhap = gia; // normalize
    }

    // 4. Validate FK (tranh FK violation -> HTTP 500)
    const fkError = await validateFK(maNCCInt, chiTiet);
    if (fkError) return error(res, fkError, 400);

    // 5. Tao phieu nhap (transaction)
    const maNV = req.user.maNV;
    try {
        const item = await phieuNhapService.create({
            maNCC: maNCCInt,
            maNV,
            trangThai: 'DaNhap',
            chiTiet
        });

        // Audit log: ghi day du thong tin phieu nhap
        await logAudit(
            req,
            'CREATE_PHIEUNHAP',
            'PhieuNhap',
            String(item.MaPN),
            null,
            {
                maPN: item.MaPN,
                maNCC: maNCCInt,
                maNV,
                soLo: item.ChiTiet.length,
                tongSL: item.ChiTiet.reduce((s, l) => s + l.SoLuongNhap, 0),
                tongTien: item.ChiTiet.reduce((s, l) => s + l.SoLuongNhap * Number(l.GiaNhap), 0),
                chiTiet: item.ChiTiet.map(l => ({
                    maLo: l.MaLo,
                    maThuoc: l.MaThuoc,
                    soLuong: l.SoLuongNhap,
                    gia: Number(l.GiaNhap)
                }))
            }
        );

        return created(res, item, 'Tạo phiếu nhập thành công');
    } catch (err) {
        // FK violation race condition (NCC/Thuoc bi xoa giua luc validate va insert)
        if (err.number === 547) {
            return error(res, 'Dữ liệu tham chiếu không hợp lệ (nhà cung cấp hoặc thuốc không tồn tại)', 400);
        }
        throw err;
    }
});

/**
 * GET /api/phieu-nhap?keyword=&page=&limit=
 */
const getAll = asyncHandler(async (req, res) => {
    const { keyword = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const { items, total } = await phieuNhapService.getAll({ keyword, page, limit });
    return successPaginated(res, items, total, page, limit);
});

/**
 * GET /api/phieu-nhap/:id
 */
const getById = asyncHandler(async (req, res) => {
    const item = await phieuNhapService.getById(parseInt(req.params.id, 10));
    if (!item) return notFound(res, `Không tìm thấy phiếu nhập #${req.params.id}`);
    return success(res, item);
});

/**
 * PUT /api/phieu-nhap/:id/huy - Huy phieu nhap
 * - Huy bang cach doi TrangThai='Huy'
 * - KHONG xoa lo thuoc (giu lich su)
 * - Khong huy duoc neu da ban (SoLuongTonKho < SoLuongNhap)
 */
const cancel = asyncHandler(async (req, res) => {
    const maPN = parseInt(req.params.id, 10);
    const item = await phieuNhapService.cancel(maPN);
    if (!item) return notFound(res, `Không tìm thấy phiếu nhập #${req.params.id}`);

    // Audit log
    await logAudit(
        req,
        'CANCEL_PHIEUNHAP',
        'PhieuNhap',
        String(maPN),
        { trangThai: 'DaNhap' },
        { trangThai: 'Huy' }
    );

    return success(res, item, 'Đã hủy phiếu nhập');
});

module.exports = {
    create,
    getAll,
    getById,
    cancel
};
