/**
 * Phiếu thu: mọi khoản tiền vào quỹ.
 * Phiếu loại BanHang được tạo tự động cùng transaction hóa đơn; endpoint POST
 * chỉ tạo phiếu loại Khac để không thể ghi nhận trùng doanh thu bán hàng.
 */
const db = require('../../config/db');

function validateId(value) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        const err = new Error('Mã phiếu thu không hợp lệ');
        err.statusCode = 400;
        throw err;
    }
    return id;
}

async function create({ soTien, noiDung, maNV }) {
    const amount = Number(soTien);
    const content = String(noiDung || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
        const err = new Error('Số tiền phải lớn hơn 0');
        err.statusCode = 400;
        throw err;
    }
    // VND là đơn vị nguyên — chặn số thập phân để khớp Decimal(18,2) và tránh lệch sổ
    if (!Number.isInteger(amount)) {
        const err = new Error('Số tiền phải là số nguyên (đơn vị VND)');
        err.statusCode = 400;
        throw err;
    }
    if (!content) {
        const err = new Error('Nội dung không được để trống');
        err.statusCode = 400;
        throw err;
    }
    if (content.length > 500) {
        const err = new Error('Nội dung tối đa 500 ký tự');
        err.statusCode = 400;
        throw err;
    }

    const result = await db.query(`
        INSERT INTO PhieuThu (NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD)
        OUTPUT INSERTED.MaPhieuThu
        VALUES (GETDATE(), @soTien, N'Khac', @noiDung, @maNV, NULL)
    `, { soTien: amount, noiDung: content, maNV });

    return getById(result.recordset[0].MaPhieuThu);
}

async function getAll({ keyword = '', page = 1, limit = 10, fromDate, toDate, loaiPhieu } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;
    const conditions = [];
    const params = {};

    if (keyword.trim()) {
        conditions.push(`(pt.NoiDung LIKE @keyword ESCAPE '\\'
            OR nv.TenNV LIKE @keyword ESCAPE '\\'
            OR CAST(pt.MaPhieuThu AS VARCHAR) LIKE @keyword ESCAPE '\\'
            OR CAST(pt.MaHD AS VARCHAR) LIKE @keyword ESCAPE '\\')`);
        params.keyword = `%${keyword.trim().replace(/[%_]/g, '\\$&')}%`;
    }
    if (fromDate) {
        conditions.push('CAST(pt.NgayLap AS DATE) >= @fromDate');
        params.fromDate = fromDate;
    }
    if (toDate) {
        conditions.push('CAST(pt.NgayLap AS DATE) <= @toDate');
        params.toDate = toDate;
    }
    if (['BanHang', 'Khac'].includes(loaiPhieu)) {
        conditions.push('pt.LoaiPhieu = @loaiPhieu');
        params.loaiPhieu = loaiPhieu;
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, itemsResult] = await Promise.all([
        db.query(`
            SELECT COUNT(*) AS total
            FROM PhieuThu pt
            LEFT JOIN NhanVien nv ON nv.MaNV = pt.MaNV
            LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
            ${where}
        `, params),
        db.query(`
            SELECT pt.MaPhieuThu, pt.NgayLap, pt.SoTien, pt.LoaiPhieu,
                   pt.NoiDung, pt.MaNV, nv.TenNV, pt.MaHD, hd.TrangThai AS TrangThaiHoaDon,
                   CASE WHEN pt.MaHD IS NOT NULL AND hd.TrangThai = N'DaHuy'
                        THEN N'KhongHieuLuc' ELSE N'CoHieuLuc' END AS TrangThai,
                   pt.CreatedAt
            FROM PhieuThu pt
            LEFT JOIN NhanVien nv ON nv.MaNV = pt.MaNV
            LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
            ${where}
            ORDER BY pt.MaPhieuThu DESC
            OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
        `, params),
    ]);

    return { items: itemsResult.recordset, total: Number(countResult.recordset[0].total) || 0 };
}

async function getById(value) {
    const maPhieuThu = validateId(value);
    const result = await db.query(`
        SELECT pt.MaPhieuThu, pt.NgayLap, pt.SoTien, pt.LoaiPhieu,
               pt.NoiDung, pt.MaNV, nv.TenNV, pt.MaHD, hd.TrangThai AS TrangThaiHoaDon,
               CASE WHEN pt.MaHD IS NOT NULL AND hd.TrangThai = N'DaHuy'
                    THEN N'KhongHieuLuc' ELSE N'CoHieuLuc' END AS TrangThai,
               pt.CreatedAt
        FROM PhieuThu pt
        LEFT JOIN NhanVien nv ON nv.MaNV = pt.MaNV
        LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
        WHERE pt.MaPhieuThu = @maPhieuThu
    `, { maPhieuThu });
    return result.recordset[0] || null;
}

module.exports = { create, getAll, getById };
