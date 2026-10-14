/**
 * NhanVien Service - CRUD + Stats + Lịch sử hoạt động + Quản lý tài khoản
 *
 * Nghiệp vụ:
 *  - CRUD cơ bản (TenNV, SDT, GioiTinh, Luong, NgayVaoLam, TrangThai)
 *  - Stats: tổng NV, đang làm, có tài khoản, mới trong 30 ngày
 *  - getById kèm stats: số HĐ, số PN, số Phiếu chi, tổng tiền bán
 *  - getHoaDonByNV: lịch sử hóa đơn đã thanh toán (max 10)
 *  - createWithAccount: tạo NV + cấp tài khoản (username/password/vaiTro) trong 1 transaction
 *  - createAccountForExisting: cấp tài khoản cho NV đã tồn tại (chưa có TK)
 *  - updateAccount: đổi vai trò / trạng thái (HoatDong/Khoa) tài khoản
 *  - resetPassword: Admin reset pass cho NV (sinh password tạm, NV đổi lại ở lần đăng nhập đầu)
 *
 * Admin-only module.
 */
const bcrypt = require('bcrypt');
const db = require('../../config/db');
const { parsePagination } = require('../../utils/pagination');
const { generateTempPassword, validatePassword } = require('../../utils/password');

const SALT_ROUNDS = 10;

// Pattern sinh username mặc định từ tên nhân viên: bỏ dấu + chữ thường + nối bằng dấu .
// VD: "Nguyễn Văn An" → "nguyen.van.an"; "Lê Thị Lan" → "le.thi.lan"
function slugifyTenNV(tenNV) {
    if (!tenNV) return '';
    return tenNV
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
        .replace(/đ/gi, 'd')
        .replace(/[^a-zA-Z0-9.\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.toLowerCase())
        .join('.');
}

function validateVaiTro(vaiTro) {
    const allowed = ['Admin', 'NV_BanHang', 'NV_Kho'];
    if (!allowed.includes(vaiTro)) {
        return `Vai trò không hợp lệ. Chỉ chấp nhận: ${allowed.join(', ')}`;
    }
    return null;
}

async function getAll({ keyword = '', page = 1, limit = 10, vaiTro = '', trangThai = '' } = {}) {
    const { page: safePage, limit: safeLimit, offset } = parsePagination(page, limit);
    const params = {};

    const filters = [];
    if (keyword && keyword.trim()) {
        // Tìm theo TenNV, SDT
        filters.push('(nv.TenNV LIKE @kw OR (nv.SDT IS NOT NULL AND nv.SDT LIKE @kw))');
        params.kw = `%${keyword.trim()}%`;
    }
    if (trangThai) {
        filters.push('nv.TrangThai = @trangThai');
        params.trangThai = trangThai;
    }
    if (vaiTro) {
        filters.push('tk.VaiTro = @vaiTro');
        params.vaiTro = vaiTro;
    }
    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const countR = await db.query(`
        SELECT COUNT(*) AS total
        FROM NhanVien nv
        LEFT JOIN TaiKhoan tk ON nv.MaNV = tk.MaNV
        ${whereSql}
    `, params);

    const itemsR = await db.query(`
        SELECT
            nv.MaNV, nv.TenNV, nv.SDT, nv.GioiTinh, nv.Luong,
            nv.NgayVaoLam, nv.TrangThai, nv.CreatedAt, nv.UpdatedAt,
            nv.Email, nv.ChucVu, nv.DiaChi, nv.GhiChu,
            tk.TenDangNhap, tk.VaiTro,
            ISNULL((
                SELECT COUNT(*) FROM HoaDon hd WHERE hd.MaNV = nv.MaNV
            ), 0) AS SoHoaDon,
            ISNULL((
                SELECT COUNT(*) FROM PhieuNhap pn WHERE pn.MaNV = nv.MaNV
            ), 0) AS SoPhieuNhap,
            ISNULL((
                SELECT COUNT(*) FROM PhieuChi pc WHERE pc.MaNV = nv.MaNV
            ), 0) AS SoPhieuChi
        FROM NhanVien nv
        LEFT JOIN TaiKhoan tk ON nv.MaNV = tk.MaNV
        ${whereSql}
        ORDER BY nv.MaNV DESC
        OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `, params);

    const items = itemsR.recordset.map((r) => ({
        ...r,
        SoHoaDon: Number(r.SoHoaDon) || 0,
        SoPhieuNhap: Number(r.SoPhieuNhap) || 0,
        SoPhieuChi: Number(r.SoPhieuChi) || 0,
    }));
    return { items, total: countR.recordset[0].total };
}

async function getById(maNV) {
    // Lấy thông tin NV + stats aggregate (HĐ, PN, PC, tổng bán)
    const r = await db.query(`
        WITH Stats AS (
            SELECT
                (SELECT COUNT(*) FROM HoaDon hd WHERE hd.MaNV = nv.MaNV) AS SoHoaDon,
                (SELECT ISNULL(SUM(hd.TongTien),0) FROM HoaDon hd WHERE hd.MaNV = nv.MaNV AND hd.TrangThai = N'DaThanhToan') AS TongBan,
                (SELECT COUNT(*) FROM PhieuNhap pn WHERE pn.MaNV = nv.MaNV) AS SoPhieuNhap,
                (SELECT ISNULL(SUM(l.SoLuongNhap*l.GiaNhap),0)
                    FROM LoThuoc_ChiTietNhap l
                    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
                    WHERE pn.MaNV = nv.MaNV) AS TongNhap,
                (SELECT COUNT(*) FROM PhieuChi pc WHERE pc.MaNV = nv.MaNV) AS SoPhieuChi,
                (SELECT ISNULL(SUM(pc.SoTien),0) FROM PhieuChi pc WHERE pc.MaNV = nv.MaNV) AS TongChi
            FROM NhanVien nv WHERE nv.MaNV = @maNV
        )
        SELECT nv.MaNV, nv.TenNV, nv.SDT, nv.GioiTinh, nv.Luong, nv.NgayVaoLam,
               nv.TrangThai, nv.Email, nv.ChucVu, nv.DiaChi, nv.GhiChu,
               nv.CreatedAt, nv.UpdatedAt,
               tk.TenDangNhap, tk.VaiTro,
               s.SoHoaDon, s.TongBan, s.SoPhieuNhap, s.TongNhap, s.SoPhieuChi, s.TongChi
        FROM NhanVien nv
        LEFT JOIN TaiKhoan tk ON nv.MaNV = tk.MaNV
        CROSS JOIN Stats s
        WHERE nv.MaNV = @maNV
    `, { maNV });
    if (!r.recordset[0]) return null;
    const row = r.recordset[0];
    return {
        ...row,
        SoHoaDon: Number(row.SoHoaDon) || 0,
        TongBan: Number(row.TongBan) || 0,
        SoPhieuNhap: Number(row.SoPhieuNhap) || 0,
        TongNhap: Number(row.TongNhap) || 0,
        SoPhieuChi: Number(row.SoPhieuChi) || 0,
        TongChi: Number(row.TongChi) || 0,
    };
}

/**
 * Lịch sử hóa đơn đã thanh toán của 1 NV (mới nhất trước).
 */
async function getHoaDonByNV(maNV, limit = 10) {
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const r = await db.query(`
        SELECT TOP (@limit)
            hd.MaHD, hd.NgayGioLap, hd.TrangThai, hd.TongTien,
            ISNULL((
                SELECT COUNT(*) FROM ChiTietHoaDon ct WHERE ct.MaHD = hd.MaHD
            ), 0) AS SoMatHang,
            ISNULL((
                SELECT SUM(ct.SoLuongBan) FROM ChiTietHoaDon ct WHERE ct.MaHD = hd.MaHD
            ), 0) AS TongSoLuong,
            kh.TenKH
        FROM HoaDon hd
        LEFT JOIN KhachHang kh ON hd.MaKH = kh.MaKH
        WHERE hd.MaNV = @maNV
          AND hd.TrangThai = N'DaThanhToan'
        ORDER BY hd.NgayGioLap DESC
    `, { maNV, limit: safeLimit });

    return r.recordset.map((row) => ({
        ...row,
        TongTien: Number(row.TongTien) || 0,
        SoMatHang: Number(row.SoMatHang) || 0,
        TongSoLuong: Number(row.TongSoLuong) || 0,
    }));
}

/**
 * Lịch sử phiếu nhập đã lập của 1 NV (mới nhất trước).
 */
async function getPhieuNhapByNV(maNV, limit = 10) {
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const r = await db.query(`
        SELECT TOP (@limit)
            pn.MaPN, pn.NgayNhap, pn.TrangThai,
            ncc.TenNCC,
            ISNULL((
                SELECT COUNT(*) FROM LoThuoc_ChiTietNhap l WHERE l.MaPN = pn.MaPN
            ), 0) AS SoLo,
            ISNULL((
                SELECT SUM(l.SoLuongNhap) FROM LoThuoc_ChiTietNhap l WHERE l.MaPN = pn.MaPN
            ), 0) AS TongSoLuong,
            ISNULL((
                SELECT SUM(l.SoLuongNhap * l.GiaNhap)
                FROM LoThuoc_ChiTietNhap l WHERE l.MaPN = pn.MaPN
            ), 0) AS TongTien
        FROM PhieuNhap pn
        LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
        WHERE pn.MaNV = @maNV
        ORDER BY pn.MaPN DESC
    `, { maNV, limit: safeLimit });

    return r.recordset.map((row) => ({
        ...row,
        SoLo: Number(row.SoLo) || 0,
        TongSoLuong: Number(row.TongSoLuong) || 0,
        TongTien: Number(row.TongTien) || 0,
    }));
}

/**
 * Thống kê tổng quan NV cho 4 stat cards.
 */
async function getStats() {
    const [tongR, dangLamR, coTK, moiR, vaiTroR, gioiTinhR] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total FROM NhanVien`),
        db.query(`SELECT COUNT(*) AS total FROM NhanVien WHERE TrangThai = N'DangLam'`),
        db.query(`
            SELECT COUNT(DISTINCT nv.MaNV) AS total FROM NhanVien nv
            INNER JOIN TaiKhoan tk ON tk.MaNV = nv.MaNV
        `),
        // NV mới trong 30 ngày (dựa theo NgayVaoLam)
        db.query(`
            SELECT COUNT(*) AS total FROM NhanVien
            WHERE NgayVaoLam IS NOT NULL AND NgayVaoLam >= DATEADD(DAY, -30, GETDATE())
        `),
        // Đếm theo vai trò
        db.query(`
            SELECT
                ISNULL(SUM(CASE WHEN tk.VaiTro = N'Admin' THEN 1 ELSE 0 END), 0) AS Admin,
                ISNULL(SUM(CASE WHEN tk.VaiTro = N'NV_BanHang' THEN 1 ELSE 0 END), 0) AS BanHang,
                ISNULL(SUM(CASE WHEN tk.VaiTro = N'NV_Kho' THEN 1 ELSE 0 END), 0) AS Kho,
                ISNULL(SUM(CASE WHEN tk.VaiTro NOT IN (N'Admin', N'NV_BanHang', N'NV_Kho') THEN 1 ELSE 0 END), 0) AS Khac
            FROM TaiKhoan tk
        `),
        // Đếm theo giới tính
        db.query(`
            SELECT
                ISNULL(SUM(CASE WHEN GioiTinh = N'Nam' THEN 1 ELSE 0 END), 0) AS Nam,
                ISNULL(SUM(CASE WHEN GioiTinh = N'Nữ' THEN 1 ELSE 0 END), 0) AS Nu,
                ISNULL(SUM(CASE WHEN GioiTinh NOT IN (N'Nam', N'Nữ') OR GioiTinh IS NULL THEN 1 ELSE 0 END), 0) AS Khac
            FROM NhanVien
        `),
    ]);

    const vt = vaiTroR.recordset[0] || {};
    const gt = gioiTinhR.recordset[0] || {};
    return {
        tongNhanVien: tongR.recordset[0].total,
        dangLam: dangLamR.recordset[0].total,
        coTaiKhoan: coTK.recordset[0].total,
        moi30Ngay: moiR.recordset[0].total,
        vaiTro: {
            Admin: Number(vt.Admin) || 0,
            NV_BanHang: Number(vt.BanHang) || 0,
            NV_Kho: Number(vt.Kho) || 0,
            Khac: Number(vt.Khac) || 0,
        },
        gioiTinh: {
            Nam: Number(gt.Nam) || 0,
            Nu: Number(gt.Nu) || 0,
            Khac: Number(gt.Khac) || 0,
        },
    };
}

async function create(data) {
    const r = await db.query(
        `INSERT INTO NhanVien (TenNV, SDT, GioiTinh, Luong, NgayVaoLam, TrangThai, Email, ChucVu, DiaChi, GhiChu)
         OUTPUT INSERTED.MaNV, INSERTED.TenNV, INSERTED.SDT, INSERTED.GioiTinh, INSERTED.Luong,
                INSERTED.NgayVaoLam, INSERTED.TrangThai, INSERTED.Email, INSERTED.ChucVu,
                INSERTED.DiaChi, INSERTED.GhiChu, INSERTED.CreatedAt, INSERTED.UpdatedAt
         VALUES (@tenNV, @sdt, @gioiTinh, @luong, @ngayVaoLam, @trangThai, @email, @chucVu, @diaChi, @ghiChu)`,
        {
            tenNV: data.tenNV,
            sdt: data.sdt || null,
            gioiTinh: data.gioiTinh || null,
            luong: data.luong || 0,
            ngayVaoLam: data.ngayVaoLam || new Date().toISOString().split('T')[0],
            trangThai: data.trangThai || 'DangLam',
            email: data.email || null,
            chucVu: data.chucVu || null,
            diaChi: data.diaChi || null,
            ghiChu: data.ghiChu || null,
        }
    );
    return r.recordset[0];
}

async function update(maNV, data) {
    const r = await db.query(
        `UPDATE NhanVien
         SET TenNV = @tenNV, SDT = @sdt, GioiTinh = @gioiTinh, Luong = @luong,
             TrangThai = @trangThai, Email = @email, ChucVu = @chucVu,
             DiaChi = @diaChi, GhiChu = @ghiChu, UpdatedAt = GETDATE()
         OUTPUT INSERTED.MaNV, INSERTED.TenNV, INSERTED.SDT, INSERTED.GioiTinh, INSERTED.Luong,
                INSERTED.NgayVaoLam, INSERTED.TrangThai, INSERTED.Email, INSERTED.ChucVu,
                INSERTED.DiaChi, INSERTED.GhiChu, INSERTED.CreatedAt, INSERTED.UpdatedAt
         WHERE MaNV = @maNV`,
        {
            maNV,
            tenNV: data.tenNV,
            sdt: data.sdt || null,
            gioiTinh: data.gioiTinh || null,
            luong: data.luong || 0,
            trangThai: data.trangThai || 'DangLam',
            email: data.email || null,
            chucVu: data.chucVu || null,
            diaChi: data.diaChi || null,
            ghiChu: data.ghiChu || null,
        }
    );
    return r.recordset[0] || null;
}

async function remove(maNV) {
    const tkR = await db.query(`SELECT COUNT(*) AS cnt FROM TaiKhoan WHERE MaNV = @maNV`, { maNV });
    if (tkR.recordset[0].cnt > 0) {
        const err = new Error(`Không thể xóa: nhân viên đang có ${tkR.recordset[0].cnt} tài khoản. Xóa tài khoản trước.`);
        err.statusCode = 409;
        throw err;
    }

    const r = await db.query(`DELETE FROM NhanVien WHERE MaNV = @maNV`, { maNV });
    return r.rowsAffected[0] > 0;
}

/**
 * Tạo NV + tài khoản trong 1 transaction (atomic).
 * @param {Object} nvData - { tenNV, sdt, gioiTinh, luong, ngayVaoLam, trangThai }
 * @param {Object} tkData - { tenDangNhap, matKhau, vaiTro, trangThai?, autoUsername?, autoPassword? }
 *   - autoUsername=true: nếu không truyền tenDangNhap thì tự sinh từ tên NV
 *   - autoPassword=true: nếu không truyền matKhau thì tự sinh 12 ký tự
 * Trả về { nhanVien, taiKhoan, matKhauTam? }
 */
async function createWithAccount(nvData, tkData) {
    // ── Validate input ──────────────────────────────────────────────
    if (!nvData.tenNV) {
        const err = new Error('Vui lòng nhập tên nhân viên'); err.statusCode = 400; throw err;
    }
    // Không cho cấp TK cho NV tạo mới với trạng thái "Nghỉ việc" (vô nghĩa về nghiệp vụ)
    if (nvData.trangThai === 'NghiViec') {
        const err = new Error('Không thể cấp tài khoản cho nhân viên có trạng thái "Nghỉ việc". Vui lòng tạo NV với trạng thái "Đang làm".');
        err.statusCode = 409; throw err;
    }
    if (!tkData) tkData = {};

    // Tự sinh username / password nếu được yêu cầu
    let tenDangNhap = (tkData.tenDangNhap || '').trim();
    if (!tenDangNhap && tkData.autoUsername) {
        tenDangNhap = slugifyTenNV(nvData.tenNV);
    }
    let matKhau = tkData.matKhau;
    if (!matKhau && tkData.autoPassword) {
        matKhau = generateTempPassword();
    }
    if (!tenDangNhap) {
        const err = new Error('Vui lòng nhập tên đăng nhập'); err.statusCode = 400; throw err;
    }
    const pwdErr = validatePassword(matKhau);
    if (pwdErr) {
        const err = new Error(pwdErr); err.statusCode = 400; throw err;
    }
    const vtErr = validateVaiTro(tkData.vaiTro);
    if (vtErr) {
        const err = new Error(vtErr); err.statusCode = 400; throw err;
    }
    const trangThaiTK = tkData.trangThai || 'HoatDong';
    if (!['HoatDong', 'Khoa'].includes(trangThaiTK)) {
        const err = new Error('Trạng thái tài khoản không hợp lệ'); err.statusCode = 400; throw err;
    }

    // Validate username format (chữ cái, số, dấu ., -, _ ; 3-50 ký tự)
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(tenDangNhap)) {
        const err = new Error('Tên đăng nhập chỉ chấp nhận chữ cái, số, dấu ., _, - (3-50 ký tự)');
        err.statusCode = 400; throw err;
    }

    // ── Kiểm tra trùng username ────────────────────────────────────
    const dupR = await db.query(`SELECT TenDangNhap FROM TaiKhoan WHERE TenDangNhap = @username`, { username: tenDangNhap });
    if (dupR.recordset.length > 0) {
        const err = new Error(`Tên đăng nhập "${tenDangNhap}" đã tồn tại`); err.statusCode = 409; throw err;
    }

    // ── Transaction: insert NV → insert TaiKhoan ────────────────────
    const matKhauHash = await bcrypt.hash(matKhau, SALT_ROUNDS);

    const transaction = new db.sql.Transaction(db.getPool());
    await transaction.begin();
    try {
        const reqNV = new db.sql.Request(transaction);
        reqNV.input('tenNV', db.sql.NVarChar, nvData.tenNV);
        reqNV.input('sdt', db.sql.VarChar, nvData.sdt || null);
        reqNV.input('gioiTinh', db.sql.NVarChar, nvData.gioiTinh || null);
        reqNV.input('luong', db.sql.Decimal(18, 2), nvData.luong || 0);
        reqNV.input('ngayVaoLam', db.sql.Date, nvData.ngayVaoLam ? new Date(nvData.ngayVaoLam) : new Date());
        reqNV.input('trangThai', db.sql.NVarChar, nvData.trangThai || 'DangLam');
        reqNV.input('email', db.sql.NVarChar, nvData.email || null);
        reqNV.input('chucVu', db.sql.NVarChar, nvData.chucVu || null);
        reqNV.input('diaChi', db.sql.NVarChar, nvData.diaChi || null);
        reqNV.input('ghiChu', db.sql.NVarChar, nvData.ghiChu || null);
        const insertNVR = await reqNV.query(`
            INSERT INTO NhanVien (TenNV, SDT, GioiTinh, Luong, NgayVaoLam, TrangThai, Email, ChucVu, DiaChi, GhiChu)
            OUTPUT INSERTED.MaNV, INSERTED.TenNV, INSERTED.SDT, INSERTED.GioiTinh, INSERTED.Luong, INSERTED.NgayVaoLam, INSERTED.TrangThai, INSERTED.Email, INSERTED.ChucVu, INSERTED.DiaChi, INSERTED.GhiChu, INSERTED.CreatedAt
            VALUES (@tenNV, @sdt, @gioiTinh, @luong, @ngayVaoLam, @trangThai, @email, @chucVu, @diaChi, @ghiChu)
        `);
        const nhanVien = insertNVR.recordset[0];
        const maNV = nhanVien.MaNV;

        const reqTK = new db.sql.Request(transaction);
        reqTK.input('tenDangNhap', db.sql.VarChar, tenDangNhap);
        reqTK.input('matKhauHash', db.sql.VarChar, matKhauHash);
        reqTK.input('vaiTro', db.sql.NVarChar, tkData.vaiTro);
        reqTK.input('trangThai', db.sql.NVarChar, trangThaiTK);
        reqTK.input('maNV', db.sql.Int, maNV);
        const insertTKR = await reqTK.query(`
            INSERT INTO TaiKhoan (TenDangNhap, MatKhauHash, VaiTro, TrangThai, MaNV, MustChangePassword)
            OUTPUT INSERTED.TenDangNhap, INSERTED.VaiTro, INSERTED.TrangThai, INSERTED.MaNV, INSERTED.MustChangePassword, INSERTED.CreatedAt
            VALUES (@tenDangNhap, @matKhauHash, @vaiTro, @trangThai, @maNV, 1)
        `);
        const taiKhoan = insertTKR.recordset[0];

        await transaction.commit();

        const result = { nhanVien, taiKhoan };
        // Nếu là mật khẩu tự sinh → trả về plaintext để Admin chuyển cho NV
        if (tkData.autoPassword && !tkData.matKhau) {
            result.matKhauTam = matKhau;
        }
        return result;
    } catch (err) {
        try { await transaction.rollback(); } catch (_) { /* ignore */ }
        throw err;
    }
}

/**
 * Cấp tài khoản cho NV đã tồn tại nhưng chưa có TK.
 */
async function createAccountForExisting(maNV, tkData) {
    // Kiểm tra NV tồn tại + lấy trạng thái làm việc
    const nvR = await db.query(`SELECT MaNV, TenNV, TrangThai FROM NhanVien WHERE MaNV = @maNV`, { maNV });
    if (nvR.recordset.length === 0) {
        const err = new Error(`Không tìm thấy nhân viên #${maNV}`); err.statusCode = 404; throw err;
    }

    // Không cho cấp TK mới cho NV đã nghỉ việc (nghiệp vụ: NV nghỉ → khoá/xóa TK chứ không cấp mới)
    if (nvR.recordset[0].TrangThai === 'NghiViec') {
        const err = new Error(`Không thể cấp tài khoản cho nhân viên đã nghỉ việc. Hãy chuyển trạng thái NV về "Đang làm" trước.`);
        err.statusCode = 409; throw err;
    }

    // Kiểm tra NV chưa có TK
    const tkExist = await db.query(`SELECT TenDangNhap, VaiTro FROM TaiKhoan WHERE MaNV = @maNV`, { maNV });
    if (tkExist.recordset.length > 0) {
        const err = new Error(`Nhân viên đã có tài khoản "${tkExist.recordset[0].TenDangNhap}" — không thể cấp mới. Đổi vai trò qua PATCH /api/nhan-vien/${maNV}/tai-khoan`);
        err.statusCode = 409; throw err;
    }

    // Tự sinh username nếu cần
    let tenDangNhap = (tkData.tenDangNhap || '').trim();
    if (!tenDangNhap && tkData.autoUsername) {
        tenDangNhap = slugifyTenNV(nvR.recordset[0].TenNV);
    }
    let matKhau = tkData.matKhau;
    if (!matKhau && tkData.autoPassword) {
        matKhau = generateTempPassword();
    }

    if (!tenDangNhap) {
        const err = new Error('Vui lòng nhập tên đăng nhập'); err.statusCode = 400; throw err;
    }
    const pwdErr = validatePassword(matKhau);
    if (pwdErr) { const err = new Error(pwdErr); err.statusCode = 400; throw err; }
    const vtErr = validateVaiTro(tkData.vaiTro);
    if (vtErr) { const err = new Error(vtErr); err.statusCode = 400; throw err; }
    const trangThaiTK = tkData.trangThai || 'HoatDong';
    if (!['HoatDong', 'Khoa'].includes(trangThaiTK)) {
        const err = new Error('Trạng thái tài khoản không hợp lệ'); err.statusCode = 400; throw err;
    }
    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(tenDangNhap)) {
        const err = new Error('Tên đăng nhập chỉ chấp nhận chữ cái, số, dấu ., _, - (3-50 ký tự)');
        err.statusCode = 400; throw err;
    }

    const dupR = await db.query(`SELECT TenDangNhap FROM TaiKhoan WHERE TenDangNhap = @username`, { username: tenDangNhap });
    if (dupR.recordset.length > 0) {
        const err = new Error(`Tên đăng nhập "${tenDangNhap}" đã tồn tại`); err.statusCode = 409; throw err;
    }

    const matKhauHash = await bcrypt.hash(matKhau, SALT_ROUNDS);
    const insertR = await db.query(`
        INSERT INTO TaiKhoan (TenDangNhap, MatKhauHash, VaiTro, TrangThai, MaNV, MustChangePassword)
        OUTPUT INSERTED.TenDangNhap, INSERTED.VaiTro, INSERTED.TrangThai, INSERTED.MaNV, INSERTED.MustChangePassword, INSERTED.CreatedAt
        VALUES (@tenDangNhap, @matKhauHash, @vaiTro, @trangThai, @maNV, 1)
    `, {
        tenDangNhap,
        matKhauHash,
        vaiTro: tkData.vaiTro,
        trangThai: trangThaiTK,
        maNV,
    });

    const result = { taiKhoan: insertR.recordset[0] };
    if (tkData.autoPassword && !tkData.matKhau) {
        result.matKhauTam = matKhau;
    }
    return result;
}

/**
 * Đổi vai trò / trạng thái tài khoản.
 */
async function updateAccount(maNV, { vaiTro, trangThai }) {
    if (!vaiTro && !trangThai) {
        const err = new Error('Cần truyền ít nhất vaiTro hoặc trangThai'); err.statusCode = 400; throw err;
    }
    if (vaiTro) {
        const vtErr = validateVaiTro(vaiTro);
        if (vtErr) { const err = new Error(vtErr); err.statusCode = 400; throw err; }
    }
    if (trangThai && !['HoatDong', 'Khoa'].includes(trangThai)) {
        const err = new Error('Trạng thái chỉ chấp nhận: HoatDong, Khoa'); err.statusCode = 400; throw err;
    }

    // Kiểm tra TK tồn tại
    const existR = await db.query(`SELECT TenDangNhap FROM TaiKhoan WHERE MaNV = @maNV`, { maNV });
    if (existR.recordset.length === 0) {
        const err = new Error(`Nhân viên #${maNV} chưa có tài khoản`); err.statusCode = 404; throw err;
    }

    // Build dynamic update
    const sets = [];
    const params = { maNV };
    if (vaiTro) { sets.push('VaiTro = @vaiTro'); params.vaiTro = vaiTro; }
    if (trangThai) { sets.push('TrangThai = @trangThai'); params.trangThai = trangThai; }
    sets.push('UpdatedAt = GETDATE()');
    // Khi khóa TK → revoke refresh tokens (tăng TokenVersion) để NV không dùng token cũ
    if (trangThai === 'Khoa') { sets.push('TokenVersion = ISNULL(TokenVersion, 1) + 1'); }

    const updateR = await db.query(`
        UPDATE TaiKhoan SET ${sets.join(', ')}
        OUTPUT INSERTED.TenDangNhap, INSERTED.VaiTro, INSERTED.TrangThai, INSERTED.MaNV, INSERTED.UpdatedAt
        WHERE MaNV = @maNV
    `, params);

    return updateR.recordset[0];
}

/**
 * Admin reset mật khẩu cho NV.
 */
async function resetPassword(maNV, matKhauMoi) {
    const existR = await db.query(`SELECT TenDangNhap FROM TaiKhoan WHERE MaNV = @maNV`, { maNV });
    if (existR.recordset.length === 0) {
        const err = new Error(`Nhân viên #${maNV} chưa có tài khoản`); err.statusCode = 404; throw err;
    }

    let matKhau = matKhauMoi;
    const autoGen = !matKhau;
    if (autoGen) {
        matKhau = generateTempPassword();
    } else {
        const pwdErr = validatePassword(matKhau);
        if (pwdErr) { const err = new Error(pwdErr); err.statusCode = 400; throw err; }
    }

    const matKhauHash = await bcrypt.hash(matKhau, SALT_ROUNDS);
    await db.query(`
        UPDATE TaiKhoan
        SET MatKhauHash = @matKhauHash,
            MustChangePassword = 1,
            LoginFailCount = 0,
            LockUntil = NULL,
            TokenVersion = ISNULL(TokenVersion, 1) + 1,
            UpdatedAt = GETDATE()
        WHERE MaNV = @maNV
    `, { matKhauHash, maNV });

    return {
        tenDangNhap: existR.recordset[0].TenDangNhap,
        matKhauTam: matKhau,
        autoGenerated: autoGen,
    };
}

module.exports = {
    getAll,
    getById,
    getHoaDonByNV,
    getPhieuNhapByNV,
    getStats,
    create,
    update,
    remove,
    createWithAccount,
    createAccountForExisting,
    updateAccount,
    resetPassword,
    // Helpers exposed for FE/test
    _helpers: { slugifyTenNV, generateTempPassword, validatePassword },
};
