/**
 * KhachHang Service - CRUD + AES-256 mã hóa SDT + Stats + Lịch sử mua hàng
 *
 * Nghiệp vụ:
 *  - CRUD cơ bản (TenKH, SDT encrypted, GioiTinh)
 *  - Stats: tổng KH, mới trong tháng, có SĐT, hoạt động (đã mua trong 90 ngày)
 *  - Segment: phân khúc theo mức chi (VIP / Than thiet / Thuong / Moi)
 *      VIP       : tổng chi ≥ 5 triệu
 *      Than thiet: tổng chi ≥ 1 triệu hoặc ≥ 5 đơn
 *      Thuong    : có ≥ 1 đơn
 *      Moi       : chưa có đơn
 */
const db = require('../../config/db');
const crypto = require('crypto');
const { parsePagination } = require('../../utils/pagination');

const ALGORITHM = 'aes-256-cbc';
// AES-256: key 32 bytes, IV 16 bytes. padEnd dam bao dung do dai.
const KEY = Buffer.from((process.env.AES_KEY || '').padEnd(32, '\0'), 'utf8').slice(0, 32);
const IV = Buffer.from((process.env.AES_IV || '').padEnd(16, '\0'), 'utf8').slice(0, 16);

// Segment thresholds (VND)
const SEG_VIP = 5_000_000;
const SEG_LOYAL_SPEND = 1_000_000;
const SEG_LOYAL_ORDERS = 5;

// Hoạt động = đã có hóa đơn Đã thanh toán trong 90 ngày gần nhất
const ACTIVE_DAYS = 90;

function encryptAES(plaintext) {
    if (!plaintext) return null;
    try {
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    } catch {
        return null;
    }
}

function decryptAES(ciphertext) {
    if (!ciphertext) return null;
    try {
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return ciphertext;
    }
}

/**
 * Phân khúc khách hàng dựa trên tổng chi + số đơn đã thanh toán.
 */
function calcSegment(tongChi, soDon) {
    if (tongChi >= SEG_VIP) return 'VIP';
    if (tongChi >= SEG_LOYAL_SPEND || soDon >= SEG_LOYAL_ORDERS) return 'ThanThiet';
    if (soDon >= 1) return 'Thuong';
    return 'Moi';
}

async function getAll({ keyword = '', page = 1, limit = 10, segment = '', gioiTinh = '' } = {}) {
    const { page: safePage, limit: safeLimit, offset } = parsePagination(page, limit);
    const params = {};

    // Build WHERE: luôn join HoaDon để tính stats (LEFT JOIN để KH chưa mua vẫn hiện)
    // Lọc chỉ tính đơn Đã thanh toán (tránh đơn đã hủy làm sai số liệu)
    const filters = [];
    if (keyword && keyword.trim()) {
        filters.push('kh.TenKH LIKE @kw');
        params.kw = `%${keyword.trim()}%`;
    }
    if (gioiTinh && ['Nam', 'Nữ', 'Khác'].includes(gioiTinh)) {
        filters.push('kh.GioiTinh = @gioiTinh');
        params.gioiTinh = gioiTinh;
    }
    const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Lọc segment trên các cột đã tổng hợp trong CTE.
    // Segment 'Moi' = chưa có đơn nào
    // Segment 'Thuong' = có đơn, không đạt ThanThiet/VIP
    // Segment 'ThanThiet' = đạt 1tr+ hoặc 5+ đơn, không đạt VIP
    // Segment 'VIP' = tổng chi ≥ 5tr
    const segmentWhereSql = (() => {
        switch (segment) {
            case 'VIP':       return 'WHERE TongChi >= @segVip';
            case 'ThanThiet': return 'WHERE (TongChi >= @segLoyalSpend OR SoDon >= @segLoyalOrders) AND TongChi < @segVip';
            case 'Thuong':    return 'WHERE SoDon >= 1 AND TongChi < @segLoyalSpend AND SoDon < @segLoyalOrders';
            case 'Moi':       return 'WHERE SoDon = 0';
            default:          return '';
        }
    })();

    params.segVip = SEG_VIP;
    params.segLoyalSpend = SEG_LOYAL_SPEND;
    params.segLoyalOrders = SEG_LOYAL_ORDERS;

    const statsCte = `WITH KhStats AS (
            SELECT
                kh.MaKH,
                kh.TenKH,
                kh.SDT,
                kh.GioiTinh,
                kh.NgayTao,
                kh.UpdatedAt,
                COUNT(hd.MaHD) AS SoDon,
                SUM(ISNULL(hd.TongTien,0)) AS TongChi,
                MAX(hd.NgayGioLap) AS LanCuoiMua
            FROM KhachHang kh
            LEFT JOIN HoaDon hd
                ON hd.MaKH = kh.MaKH
               AND hd.TrangThai = N'DaThanhToan'
            ${whereSql}
            GROUP BY kh.MaKH, kh.TenKH, kh.SDT, kh.GioiTinh, kh.NgayTao, kh.UpdatedAt
        )`;

    const countR = await db.query(`
        ${statsCte}
        SELECT COUNT(*) AS total FROM KhStats
        ${segmentWhereSql}
    `, params);

    const itemsR = await db.query(`
        ${statsCte}
        SELECT * FROM KhStats
        ${segmentWhereSql}
        ORDER BY MaKH DESC
        OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `, params);

    const items = itemsR.recordset.map((r) => ({
        ...r,
        SDT: decryptAES(r.SDT),
        SoDon: Number(r.SoDon) || 0,
        TongChi: Number(r.TongChi) || 0,
        LanCuoiMua: r.LanCuoiMua || null,
        Segment: calcSegment(Number(r.TongChi) || 0, Number(r.SoDon) || 0),
    }));
    return { items, total: countR.recordset[0].total };
}

async function getById(maKH) {
    // Lấy thông tin KH + stats aggregate (1 query duy nhất nhờ CTE)
    const r = await db.query(`
        WITH KhStats AS (
            SELECT
                COUNT(MaHD) AS SoDon,
                SUM(ISNULL(TongTien,0)) AS TongChi,
                MIN(NgayGioLap) AS LanDauMua,
                MAX(NgayGioLap) AS LanCuoiMua
            FROM HoaDon
            WHERE MaKH = @maKH AND TrangThai = N'DaThanhToan'
        )
        SELECT kh.MaKH, kh.TenKH, kh.SDT, kh.GioiTinh, kh.NgayTao, kh.UpdatedAt,
               ks.SoDon, ks.TongChi, ks.LanDauMua, ks.LanCuoiMua
        FROM KhachHang kh
        CROSS JOIN KhStats ks
        WHERE kh.MaKH = @maKH
    `, { maKH });
    if (!r.recordset[0]) return null;
    const row = r.recordset[0];
    const tongChi = Number(row.TongChi) || 0;
    const soDon = Number(row.SoDon) || 0;
    return {
        ...row,
        SDT: decryptAES(row.SDT),
        SoDon: soDon,
        TongChi: tongChi,
        LanDauMua: row.LanDauMua || null,
        LanCuoiMua: row.LanCuoiMua || null,
        Segment: calcSegment(tongChi, soDon),
    };
}

/**
 * Lịch sử hóa đơn của 1 khách hàng (đã thanh toán, mới nhất trước).
 * Trả về tối đa `limit` đơn (mặc định 10).
 */
async function getHoaDonByKhachHang(maKH, limit = 10) {
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const r = await db.query(`
        SELECT TOP (@limit)
            hd.MaHD, hd.NgayGioLap, hd.TongTien, hd.TrangThai,
            hd.MaNV, nv.TenNV,
            (SELECT COUNT(*) FROM ChiTietHoaDon ct WHERE ct.MaHD = hd.MaHD) AS SoMatHang
        FROM HoaDon hd
        LEFT JOIN NhanVien nv ON hd.MaNV = nv.MaNV
        WHERE hd.MaKH = @maKH
          AND hd.TrangThai = N'DaThanhToan'
        ORDER BY hd.NgayGioLap DESC
    `, { maKH, limit: safeLimit });

    return r.recordset.map((row) => ({
        ...row,
        TongTien: Number(row.TongTien) || 0,
        SoMatHang: Number(row.SoMatHang) || 0,
    }));
}

/**
 * Thống kê tổng quan khách hàng cho dashboard cards (đầu trang KhachHang).
 *  - tongKhachHang   : tổng số KH
 *  - moiThangNay     : KH được tạo trong tháng hiện tại
 *  - coSdt           : KH có số điện thoại (AES không rỗng)
 *  - hoatDong        : KH có ≥ 1 đơn Đã thanh toán trong 90 ngày gần nhất
 *  - segments        : { VIP, ThanThiet, Thuong, Moi } đếm theo tổng chi tích lũy
 */
async function getStats() {
    // Chạy song song 4 query để giảm latency
    const [tongR, moiR, coSdtR, hoatDongR, segR] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total FROM KhachHang`),
        db.query(`
            SELECT COUNT(*) AS total FROM KhachHang
            WHERE NgayTao >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
        `),
        db.query(`
            SELECT COUNT(*) AS total FROM KhachHang
            WHERE SDT IS NOT NULL AND LEN(SDT) > 0
        `),
        db.query(`
            SELECT COUNT(DISTINCT MaKH) AS total FROM HoaDon
            WHERE TrangThai = N'DaThanhToan'
              AND NgayGioLap >= DATEADD(DAY, -@activeDays, GETDATE())
        `, { activeDays: ACTIVE_DAYS }),
        // Segment counts: 1 query aggregate duy nhất
        db.query(`
            WITH KhStats AS (
                SELECT kh.MaKH,
                       SUM(ISNULL(hd.TongTien,0)) AS TongChi,
                       COUNT(hd.MaHD) AS SoDon
                FROM KhachHang kh
                LEFT JOIN HoaDon hd
                    ON hd.MaKH = kh.MaKH
                   AND hd.TrangThai = N'DaThanhToan'
                GROUP BY kh.MaKH
            )
            SELECT
                SUM(CASE WHEN TongChi >= @segVip THEN 1 ELSE 0 END) AS VIP,
                SUM(CASE WHEN (TongChi >= @segLoyalSpend OR SoDon >= @segLoyalOrders) AND TongChi < @segVip THEN 1 ELSE 0 END) AS ThanThiet,
                SUM(CASE WHEN SoDon >= 1 AND TongChi < @segLoyalSpend AND SoDon < @segLoyalOrders THEN 1 ELSE 0 END) AS Thuong,
                SUM(CASE WHEN SoDon = 0 THEN 1 ELSE 0 END) AS Moi
            FROM KhStats
        `, { segVip: SEG_VIP, segLoyalSpend: SEG_LOYAL_SPEND, segLoyalOrders: SEG_LOYAL_ORDERS }),
    ]);

    const seg = segR.recordset[0] || {};
    return {
        tongKhachHang: tongR.recordset[0].total,
        moiThangNay: moiR.recordset[0].total,
        coSdt: coSdtR.recordset[0].total,
        hoatDong: hoatDongR.recordset[0].total,
        segments: {
            VIP: Number(seg.VIP) || 0,
            ThanThiet: Number(seg.ThanThiet) || 0,
            Thuong: Number(seg.Thuong) || 0,
            Moi: Number(seg.Moi) || 0,
        },
    };
}

/**
 * Tìm MaKH trùng SDT (AES-encrypted). Trả về MaKH nếu tìm thấy, null nếu chưa tồn tại.
 * Dùng cho cả create và update.
 */
async function findBySDT(sdt, excludeMaKH = null) {
    if (!sdt) return null;
    const encrypted = encryptAES(sdt);
    if (!encrypted) return null;

    const r = excludeMaKH !== null
        ? await db.query(
            `SELECT MaKH FROM KhachHang WHERE SDT = @sdt AND MaKH != @excludeMaKH`,
            { sdt: encrypted, excludeMaKH }
        )
        : await db.query(
            `SELECT MaKH FROM KhachHang WHERE SDT = @sdt`,
            { sdt: encrypted }
        );
    return r.recordset[0]?.MaKH || null;
}

async function create(data) {
    const tenKH = (data.tenKH || '').trim();
    if (!tenKH) {
        const err = new Error('Vui lòng nhập tên khách hàng');
        err.statusCode = 400;
        throw err;
    }

    // Kiểm tra trùng SDT trước khi tạo
    if (data.sdt) {
        const existingMaKH = await findBySDT(data.sdt);
        if (existingMaKH) {
            const err = new Error(`Số điện thoại đã được đăng ký cho khách hàng khác (Mã #${existingMaKH})`);
            err.code = 'DUPLICATE_SDT';
            throw err;
        }
    }

    const r = await db.query(
        `INSERT INTO KhachHang (TenKH, SDT, GioiTinh)
         OUTPUT INSERTED.MaKH, INSERTED.TenKH, INSERTED.SDT, INSERTED.GioiTinh, INSERTED.NgayTao, INSERTED.UpdatedAt
         VALUES (@tenKH, @sdt, @gioiTinh)`,
        {
            tenKH,
            sdt: encryptAES(data.sdt) || null,
            gioiTinh: data.gioiTinh || null
        }
    );
    const row = r.recordset[0];
    return { ...row, SDT: decryptAES(row.SDT) };
}

async function update(maKH, data) {
    const tenKH = (data.tenKH || '').trim();
    if (!tenKH) {
        const err = new Error('Vui lòng nhập tên khách hàng');
        err.statusCode = 400;
        throw err;
    }

    // Kiểm tra trùng SDT (loại trừ chính record đang sửa)
    if (data.sdt) {
        const existingMaKH = await findBySDT(data.sdt, maKH);
        if (existingMaKH) {
            const err = new Error(`Số điện thoại đã được đăng ký cho khách hàng khác (Mã #${existingMaKH})`);
            err.code = 'DUPLICATE_SDT';
            throw err;
        }
    }

    const r = await db.query(
        `UPDATE KhachHang
         SET TenKH = @tenKH, SDT = @sdt, GioiTinh = @gioiTinh, UpdatedAt = GETDATE()
         OUTPUT INSERTED.MaKH, INSERTED.TenKH, INSERTED.SDT, INSERTED.GioiTinh, INSERTED.NgayTao, INSERTED.UpdatedAt
         WHERE MaKH = @maKH`,
        {
            maKH,
            tenKH,
            sdt: encryptAES(data.sdt) || null,
            gioiTinh: data.gioiTinh || null
        }
    );
    if (!r.recordset[0]) return null;
    const row = r.recordset[0];
    return { ...row, SDT: decryptAES(row.SDT) };
}

async function remove(maKH) {
    const r = await db.query(`DELETE FROM KhachHang WHERE MaKH = @maKH`, { maKH });
    return r.rowsAffected[0] > 0;
}

module.exports = {
    getAll,
    getById,
    getHoaDonByKhachHang,
    getStats,
    create,
    update,
    remove,
};
