/**
 * NhaCungCap Service - CRUD + Stats + Lịch sử nhập hàng
 *
 * Nghiệp vụ:
 *  - CRUD hồ sơ cơ bản (tên, liên hệ, mã số thuế, ghi chú)
 *  - Stats: tổng NCC, mới trong tháng, có SĐT, hoạt động (đã nhập trong 90 ngày)
 *  - Segment: phân khúc theo mức nhập (ChienLuoc / ThuongXuyen / ThinhThoang / Moi)
 *      ChienLuoc    : tổng nhập ≥ 50 triệu
 *      ThuongXuyen  : tổng nhập ≥ 10 triệu hoặc ≥ 5 phiếu
 *      ThinhThoang  : có ≥ 1 phiếu
 *      Moi          : chưa có phiếu
 */
const db = require('../../config/db');
const { parsePagination } = require('../../utils/pagination');

// Segment thresholds (VND)
const SEG_STRATEGIC = 50_000_000;
const SEG_REGULAR_SPEND = 10_000_000;
const SEG_REGULAR_ORDERS = 5;

// Hoạt động = đã có phiếu nhập DaNhap trong 90 ngày gần nhất
const ACTIVE_DAYS = 90;

/**
 * Phân khúc nhà cung cấp dựa trên tổng nhập + số phiếu.
 */
function calcSegment(tongNhap, soPhieu) {
    if (tongNhap >= SEG_STRATEGIC) return 'ChienLuoc';
    if (tongNhap >= SEG_REGULAR_SPEND || soPhieu >= SEG_REGULAR_ORDERS) return 'ThuongXuyen';
    if (soPhieu >= 1) return 'ThinhThoang';
    return 'Moi';
}

async function getAll({ keyword = '', page = 1, limit = 10, segment = '' } = {}) {
    const { page: safePage, limit: safeLimit, offset } = parsePagination(page, limit);
    const params = {};

    const filters = [];
    if (keyword && keyword.trim()) {
        // Tìm theo thông tin nhận diện và liên hệ chính.
        filters.push(`(
            ncc.TenNCC LIKE @kw
            OR ncc.DiaChi LIKE @kw
            OR ncc.Email LIKE @kw
            OR ncc.MaSoThue LIKE @kw
            OR ncc.NguoiLienHe LIKE @kw
        )`);
        params.kw = `%${keyword.trim()}%`;
    }
    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Lọc segment trên các cột đã tổng hợp trong CTE.
    // Lưu ý: SUM(SoLuongNhap*GiaNhap) tính trực tiếp từ lô thuốc - bảng PhieuNhap không có cột TongTien
    const segmentWhereSql = (() => {
        switch (segment) {
            case 'ChienLuoc':   return 'WHERE TongNhap >= @segStrategic';
            case 'ThuongXuyen': return 'WHERE (TongNhap >= @segRegularSpend OR SoPhieu >= @segRegularOrders) AND TongNhap < @segStrategic';
            case 'ThinhThoang': return 'WHERE SoPhieu >= 1 AND TongNhap < @segRegularSpend AND SoPhieu < @segRegularOrders';
            case 'Moi':         return 'WHERE SoPhieu = 0';
            default:            return '';
        }
    })();

    params.segStrategic = SEG_STRATEGIC;
    params.segRegularSpend = SEG_REGULAR_SPEND;
    params.segRegularOrders = SEG_REGULAR_ORDERS;

    const statsCte = `WITH NccStats AS (
            SELECT
                ncc.MaNCC,
                ncc.TenNCC,
                ncc.DiaChi,
                ncc.SDT,
                ncc.Email,
                ncc.MaSoThue,
                ncc.NguoiLienHe,
                ncc.GhiChu,
                ncc.CreatedAt,
                ncc.UpdatedAt,
                COUNT(DISTINCT pn.MaPN) AS SoPhieu,
                SUM(ISNULL(l.SoLuongNhap*l.GiaNhap,0)) AS TongNhap,
                MAX(pn.NgayNhap) AS LanCuoiNhap
            FROM NhaCungCap ncc
            LEFT JOIN PhieuNhap pn
                ON pn.MaNCC = ncc.MaNCC
               AND pn.TrangThai = N'DaNhap'
            LEFT JOIN LoThuoc_ChiTietNhap l
                ON l.MaPN = pn.MaPN
            ${whereSql}
            GROUP BY ncc.MaNCC, ncc.TenNCC, ncc.DiaChi, ncc.SDT,
                     ncc.Email, ncc.MaSoThue, ncc.NguoiLienHe, ncc.GhiChu,
                     ncc.CreatedAt, ncc.UpdatedAt
        )`;

    const countR = await db.query(`
        ${statsCte}
        SELECT COUNT(*) AS total FROM NccStats
        ${segmentWhereSql}
    `, params);

    const itemsR = await db.query(`
        ${statsCte}
        SELECT * FROM NccStats
        ${segmentWhereSql}
        ORDER BY MaNCC DESC
        OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `, params);

    const items = itemsR.recordset.map((r) => ({
        ...r,
        SoPhieu: Number(r.SoPhieu) || 0,
        TongNhap: Number(r.TongNhap) || 0,
        LanCuoiNhap: r.LanCuoiNhap || null,
        Segment: calcSegment(Number(r.TongNhap) || 0, Number(r.SoPhieu) || 0),
    }));
    return { items, total: countR.recordset[0].total };
}

async function getById(maNCC) {
    // Lấy thông tin NCC + stats aggregate (1 query duy nhất nhờ CTE)
    // TongNhap phải tính từ LoThuoc_ChiTietNhap vì bảng PhieuNhap không có cột TongTien
    const r = await db.query(`
        WITH NccStats AS (
            SELECT
                pn.MaPN,
                pn.NgayNhap,
                SUM(ISNULL(l.SoLuongNhap*l.GiaNhap,0)) AS TongTienPN
            FROM PhieuNhap pn
            LEFT JOIN LoThuoc_ChiTietNhap l ON l.MaPN = pn.MaPN
            WHERE pn.MaNCC = @maNCC AND pn.TrangThai = N'DaNhap'
            GROUP BY pn.MaPN, pn.NgayNhap
        ),
        NccAgg AS (
            SELECT
                COUNT(*) AS SoPhieu,
                SUM(ISNULL(TongTienPN,0)) AS TongNhap,
                MIN(NgayNhap) AS LanDauNhap,
                MAX(NgayNhap) AS LanCuoiNhap
            FROM NccStats
        ),
        NccLotStats AS (
            SELECT
                COUNT(l.MaLo) AS SoLo,
                SUM(l.SoLuongNhap) AS TongSoLuongNhap,
                SUM(l.SoLuongTonKho) AS TongSoLuongTon
            FROM LoThuoc_ChiTietNhap l
            INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
            WHERE pn.MaNCC = @maNCC AND pn.TrangThai = N'DaNhap'
        )
        SELECT ncc.MaNCC, ncc.TenNCC, ncc.DiaChi, ncc.SDT,
               ncc.Email, ncc.MaSoThue, ncc.NguoiLienHe, ncc.GhiChu,
               ncc.CreatedAt, ncc.UpdatedAt,
               na.SoPhieu, na.TongNhap, na.LanDauNhap, na.LanCuoiNhap,
               ls.SoLo, ls.TongSoLuongNhap, ls.TongSoLuongTon
        FROM NhaCungCap ncc
        CROSS JOIN NccAgg na
        CROSS JOIN NccLotStats ls
        WHERE ncc.MaNCC = @maNCC
    `, { maNCC });
    if (!r.recordset[0]) return null;
    const row = r.recordset[0];
    const tongNhap = Number(row.TongNhap) || 0;
    const soPhieu = Number(row.SoPhieu) || 0;
    return {
        ...row,
        SoPhieu: soPhieu,
        TongNhap: tongNhap,
        SoLo: Number(row.SoLo) || 0,
        TongSoLuongNhap: Number(row.TongSoLuongNhap) || 0,
        TongSoLuongTon: Number(row.TongSoLuongTon) || 0,
        LanDauNhap: row.LanDauNhap || null,
        LanCuoiNhap: row.LanCuoiNhap || null,
        Segment: calcSegment(tongNhap, soPhieu),
    };
}

/**
 * Lịch sử phiếu nhập của 1 NCC (chỉ tính DaNhap, mới nhất trước).
 * Trả về tối đa `limit` phiếu (mặc định 10).
 */
async function getPhieuNhapByNCC(maNCC, limit = 10) {
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const r = await db.query(`
        SELECT TOP (@limit)
            pn.MaPN, pn.NgayNhap, pn.TrangThai,
            pn.MaNV, nv.TenNV,
            ISNULL((
                SELECT COUNT(*) FROM LoThuoc_ChiTietNhap l WHERE l.MaPN = pn.MaPN
            ), 0) AS SoLo,
            ISNULL((
                SELECT SUM(l.SoLuongNhap * l.GiaNhap)
                FROM LoThuoc_ChiTietNhap l WHERE l.MaPN = pn.MaPN
            ), 0) AS TongTien,
            ISNULL((
                SELECT SUM(l.SoLuongNhap) FROM LoThuoc_ChiTietNhap l WHERE l.MaPN = pn.MaPN
            ), 0) AS TongSoLuong
        FROM PhieuNhap pn
        LEFT JOIN NhanVien nv ON pn.MaNV = nv.MaNV
        WHERE pn.MaNCC = @maNCC
          AND pn.TrangThai = N'DaNhap'
        ORDER BY pn.NgayNhap DESC
    `, { maNCC, limit: safeLimit });

    return r.recordset.map((row) => ({
        ...row,
        TongTien: Number(row.TongTien) || 0,
        SoLo: Number(row.SoLo) || 0,
        TongSoLuong: Number(row.TongSoLuong) || 0,
    }));
}

/**
 * Thống kê tổng quan NCC cho dashboard cards (đầu trang NhaCungCap).
 *  - tongNhaCungCap : tổng số NCC
 *  - moiThangNay    : NCC được tạo trong tháng hiện tại
 *  - coSdt          : NCC có SĐT
 *  - coDiaChi       : NCC có địa chỉ
 *  - hoatDong       : NCC có ≥ 1 phiếu DaNhap trong 90 ngày gần nhất
 *  - segments       : { ChienLuoc, ThuongXuyen, ThinhThoang, Moi } đếm theo tổng nhập tích lũy
 */
async function getStats() {
    const [tongR, moiR, coSdtR, coDiaChiR, hoatDongR, segR] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total FROM NhaCungCap`),
        db.query(`
            SELECT COUNT(*) AS total FROM NhaCungCap
            WHERE CreatedAt >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
        `),
        db.query(`
            SELECT COUNT(*) AS total FROM NhaCungCap
            WHERE SDT IS NOT NULL AND LEN(SDT) > 0
        `),
        db.query(`
            SELECT COUNT(*) AS total FROM NhaCungCap
            WHERE DiaChi IS NOT NULL AND LEN(DiaChi) > 0
        `),
        db.query(`
            SELECT COUNT(DISTINCT MaNCC) AS total FROM PhieuNhap
            WHERE TrangThai = N'DaNhap'
              AND NgayNhap >= DATEADD(DAY, -@activeDays, GETDATE())
        `, { activeDays: ACTIVE_DAYS }),
        // Segment counts: 1 query aggregate duy nhất
        // Tính TongNhap từ LoThuoc_ChiTietNhap (bảng PhieuNhap không có cột TongTien)
        db.query(`
            WITH NccStats AS (
                SELECT ncc.MaNCC,
                       SUM(ISNULL(l.SoLuongNhap*l.GiaNhap,0)) AS TongNhap,
                       COUNT(DISTINCT pn.MaPN) AS SoPhieu
                FROM NhaCungCap ncc
                LEFT JOIN PhieuNhap pn
                    ON pn.MaNCC = ncc.MaNCC
                   AND pn.TrangThai = N'DaNhap'
                LEFT JOIN LoThuoc_ChiTietNhap l
                    ON l.MaPN = pn.MaPN
                GROUP BY ncc.MaNCC
            )
            SELECT
                SUM(CASE WHEN TongNhap >= @segStrategic THEN 1 ELSE 0 END) AS ChienLuoc,
                SUM(CASE WHEN (TongNhap >= @segRegularSpend OR SoPhieu >= @segRegularOrders) AND TongNhap < @segStrategic THEN 1 ELSE 0 END) AS ThuongXuyen,
                SUM(CASE WHEN SoPhieu >= 1 AND TongNhap < @segRegularSpend AND SoPhieu < @segRegularOrders THEN 1 ELSE 0 END) AS ThinhThoang,
                SUM(CASE WHEN SoPhieu = 0 THEN 1 ELSE 0 END) AS Moi
            FROM NccStats
        `, { segStrategic: SEG_STRATEGIC, segRegularSpend: SEG_REGULAR_SPEND, segRegularOrders: SEG_REGULAR_ORDERS }),
    ]);

    const seg = segR.recordset[0] || {};
    return {
        tongNhaCungCap: tongR.recordset[0].total,
        moiThangNay: moiR.recordset[0].total,
        coSdt: coSdtR.recordset[0].total,
        coDiaChi: coDiaChiR.recordset[0].total,
        hoatDong: hoatDongR.recordset[0].total,
        segments: {
            ChienLuoc: Number(seg.ChienLuoc) || 0,
            ThuongXuyen: Number(seg.ThuongXuyen) || 0,
            ThinhThoang: Number(seg.ThinhThoang) || 0,
            Moi: Number(seg.Moi) || 0,
        },
    };
}

async function create(data) {
    const r = await db.query(
        `INSERT INTO NhaCungCap (TenNCC, DiaChi, SDT, Email, MaSoThue, NguoiLienHe, GhiChu)
         OUTPUT INSERTED.MaNCC, INSERTED.TenNCC, INSERTED.DiaChi, INSERTED.SDT,
                INSERTED.Email, INSERTED.MaSoThue, INSERTED.NguoiLienHe, INSERTED.GhiChu,
                INSERTED.CreatedAt, INSERTED.UpdatedAt
         VALUES (@tenNCC, @diaChi, @sdt, @email, @maSoThue, @nguoiLienHe, @ghiChu)`,
        {
            tenNCC: data.tenNCC,
            diaChi: data.diaChi || null,
            sdt: data.sdt || null,
            email: data.email || null,
            maSoThue: data.maSoThue || null,
            nguoiLienHe: data.nguoiLienHe || null,
            ghiChu: data.ghiChu || null
        }
    );
    return r.recordset[0];
}

async function update(maNCC, data) {
    const r = await db.query(
        `UPDATE NhaCungCap
         SET TenNCC = @tenNCC,
             DiaChi = @diaChi,
             SDT = @sdt,
             Email = @email,
             MaSoThue = @maSoThue,
             NguoiLienHe = @nguoiLienHe,
             GhiChu = @ghiChu,
             UpdatedAt = GETDATE()
         OUTPUT INSERTED.MaNCC, INSERTED.TenNCC, INSERTED.DiaChi, INSERTED.SDT,
                INSERTED.Email, INSERTED.MaSoThue, INSERTED.NguoiLienHe, INSERTED.GhiChu,
                INSERTED.CreatedAt, INSERTED.UpdatedAt
         WHERE MaNCC = @maNCC`,
        {
            maNCC,
            tenNCC: data.tenNCC,
            diaChi: data.diaChi || null,
            sdt: data.sdt || null,
            email: data.email || null,
            maSoThue: data.maSoThue || null,
            nguoiLienHe: data.nguoiLienHe || null,
            ghiChu: data.ghiChu || null
        }
    );
    return r.recordset[0] || null;
}

async function remove(maNCC) {
    const r = await db.query(
        `DELETE FROM NhaCungCap WHERE MaNCC = @maNCC`,
        { maNCC }
    );
    return r.rowsAffected[0] > 0;
}

module.exports = {
    getAll,
    getById,
    getPhieuNhapByNCC,
    getStats,
    create,
    update,
    remove,
};
