/**
 * PhieuChi Service - Quản lý phiếu chi (chi phí) - Admin only
 *
 * Nghiệp vụ:
 *  - Tạo phiếu chi (tiền ra) — validate số dư (phiếu thu hiệu lực - phiếu chi)
 *  - Phiếu thu gắn hóa đơn hủy không còn hiệu lực kế toán
 *  - Lịch sử phiếu chi (filter theo keyword + khoảng ngày + pagination)
 *  - Stats cho trang TaiChinh: tổng quan + chart data theo ngày + top chi phí
 *
 * Khác PhieuNhap:
 *  - 1 row đơn, không có chi tiết
 *  - Cần check số dư trước khi tạo (validate SoTien <= SoDu)
 */
const db = require('../../config/db');

/**
 * Tính số dư quỹ hiện tại = Tổng thu - Tổng chi
 *  - Thu: SUM(SoTien) phiếu thu thủ công hoặc gắn hóa đơn còn hiệu lực
 *  - Chi: SUM(SoTien) của PhieuChi
 * @returns {Promise<{ tongThu: number, tongChi: number, soDu: number }>}
 */
async function getSoDu() {
    const [thuR, chiR] = await Promise.all([
        db.query(`
            SELECT ISNULL(SUM(pt.SoTien), 0) AS tongThu
            FROM PhieuThu pt
            LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
            WHERE pt.MaHD IS NULL OR hd.TrangThai = N'DaThanhToan'
        `),
        db.query(`SELECT ISNULL(SUM(SoTien), 0) AS tongChi FROM PhieuChi`),
    ]);

    const tongThu = Number(thuR.recordset[0].tongThu) || 0;
    const tongChi = Number(chiR.recordset[0].tongChi) || 0;
    return { tongThu, tongChi, soDu: tongThu - tongChi };
}

/**
 * Tạo phiếu chi (atomic + race-condition safe)
 */
async function create(data) {
    const { soTien, noiDung, maNV } = data;

    // 1. Validate input
    const soTienNum = Number(soTien);
    if (isNaN(soTienNum) || soTienNum <= 0) {
        const err = new Error('Số tiền phải > 0');
        err.statusCode = 400;
        throw err;
    }
    // VND là đơn vị nguyên — chặn số thập phân để khớp Decimal(18,2) và tránh lệch sổ
    if (!Number.isInteger(soTienNum)) {
        const err = new Error('Số tiền phải là số nguyên (đơn vị VND)');
        err.statusCode = 400;
        throw err;
    }

    const noiDungTrim = (noiDung || '').trim();
    if (!noiDungTrim) {
        const err = new Error('Nội dung không được để trống');
        err.statusCode = 400;
        throw err;
    }
    if (noiDungTrim.length > 500) {
        const err = new Error('Nội dung tối đa 500 ký tự');
        err.statusCode = 400;
        throw err;
    }

    // 2. Validate MaNV tồn tại (ngoài transaction, vì NhanVien hiếm khi bị xóa)
    const nvR = await db.query('SELECT MaNV FROM NhanVien WHERE MaNV = @maNV', { maNV });
    if (nvR.recordset.length === 0) {
        const err = new Error(`Nhân viên #${maNV} không tồn tại`);
        err.statusCode = 400;
        throw err;
    }

    // 3. Transaction: validate số dư + INSERT (atomic)
    const pool = db.getPool();
    const transaction = new db.sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin(db.sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;

        // Tính số dư với HOLDLOCK để chống race condition
        const thuReq = new db.sql.Request(transaction);
        const thuR = await thuReq.query(`
            SELECT ISNULL(SUM(pt.SoTien), 0) AS tongThu
            FROM PhieuThu pt WITH (HOLDLOCK)
            LEFT JOIN HoaDon hd WITH (HOLDLOCK) ON hd.MaHD = pt.MaHD
            WHERE pt.MaHD IS NULL OR hd.TrangThai = N'DaThanhToan'
        `);
        const chiReq = new db.sql.Request(transaction);
        const chiR = await chiReq.query(`
            SELECT ISNULL(SUM(SoTien), 0) AS tongChi
            FROM PhieuChi WITH (HOLDLOCK)
        `);

        const tongThu = Number(thuR.recordset[0].tongThu) || 0;
        const tongChi = Number(chiR.recordset[0].tongChi) || 0;
        const soDu = tongThu - tongChi;

        // Validate số dư BÊN TRONG transaction
        if (soTienNum > soDu) {
            const err = new Error(
                `Số tiền chi (${soTienNum.toLocaleString('vi-VN')}đ) vượt quá số dư hiện tại (${soDu.toLocaleString('vi-VN')}đ)`
            );
            err.statusCode = 409;
            throw err;
        }

        // INSERT phiếu chi
        const insertReq = new db.sql.Request(transaction);
        insertReq.input('soTien', db.sql.Decimal(18, 2), soTienNum);
        insertReq.input('noiDung', db.sql.NVarChar, noiDungTrim);
        insertReq.input('maNV', db.sql.Int, maNV);

        const insertResult = await insertReq.query(`
            INSERT INTO PhieuChi (NgayLap, SoTien, NoiDung, MaNV)
            OUTPUT INSERTED.MaPhieuChi, INSERTED.NgayLap, INSERTED.SoTien,
                   INSERTED.NoiDung, INSERTED.MaNV, INSERTED.CreatedAt
            VALUES (GETDATE(), @soTien, @noiDung, @maNV)
        `);
        const inserted = insertResult.recordset[0];

        // JOIN lấy TenNV
        const joinReq = new db.sql.Request(transaction);
        joinReq.input('maPhieuChi', db.sql.Int, inserted.MaPhieuChi);
        const joinR = await joinReq.query(`
            SELECT pc.MaPhieuChi, pc.NgayLap, pc.SoTien, pc.NoiDung,
                   pc.MaNV, nv.TenNV, pc.CreatedAt
            FROM PhieuChi pc
            LEFT JOIN NhanVien nv ON pc.MaNV = nv.MaNV
            WHERE pc.MaPhieuChi = @maPhieuChi
        `);

        await transaction.commit();
        transactionStarted = false;

        return joinR.recordset[0] || inserted;
    } catch (err) {
        if (transactionStarted) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('PhieuChi rollback failed:', rollbackError.message);
            }
        }
        throw err;
    }
}

async function getAll({ keyword = '', page = 1, limit = 10, fromDate, toDate } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    if (!Number.isInteger(safePage) || safePage < 1) throw new Error('Invalid page');
    if (!Number.isInteger(safeLimit) || safeLimit < 1) throw new Error('Invalid limit');

    const offset = (safePage - 1) * safeLimit;

    let whereSql = '';
    const params = {};

    if (keyword && keyword.trim()) {
        const safeKw = keyword.trim().replace(/[%_]/g, '\\$&');
        whereSql = `WHERE (pc.NoiDung LIKE @kw ESCAPE '\\'
                         OR CAST(pc.MaPhieuChi AS VARCHAR) LIKE @kw ESCAPE '\\'
                         OR nv.TenNV LIKE @kw ESCAPE '\\')`;
        params.kw = '%' + safeKw + '%';
    }
    if (fromDate) {
        whereSql += (whereSql ? ' AND ' : 'WHERE ') + 'CAST(pc.NgayLap AS DATE) >= @fromDate';
        params.fromDate = fromDate;
    }
    if (toDate) {
        whereSql += (whereSql ? ' AND ' : 'WHERE ') + 'CAST(pc.NgayLap AS DATE) <= @toDate';
        params.toDate = toDate;
    }

    const countR = await db.query(`
        SELECT COUNT(*) AS total
        FROM PhieuChi pc
        LEFT JOIN NhanVien nv ON pc.MaNV = nv.MaNV
        ${whereSql}
    `, params);

    const itemsR = await db.query(`
        SELECT pc.MaPhieuChi, pc.NgayLap, pc.SoTien, pc.NoiDung,
               pc.MaNV, nv.TenNV, pc.CreatedAt
        FROM PhieuChi pc
        LEFT JOIN NhanVien nv ON pc.MaNV = nv.MaNV
        ${whereSql}
        ORDER BY pc.MaPhieuChi DESC
        OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `, params);

    return { items: itemsR.recordset, total: countR.recordset[0].total };
}

async function getById(maPhieuChi) {
    if (!Number.isInteger(maPhieuChi) || maPhieuChi <= 0) {
        const err = new Error('Mã phiếu chi không hợp lệ');
        err.statusCode = 400;
        throw err;
    }
    const r = await db.query(`
        SELECT pc.MaPhieuChi, pc.NgayLap, pc.SoTien, pc.NoiDung,
               pc.MaNV, nv.TenNV, pc.CreatedAt
        FROM PhieuChi pc
        LEFT JOIN NhanVien nv ON pc.MaNV = nv.MaNV
        WHERE pc.MaPhieuChi = @maPhieuChi
    `, { maPhieuChi });
    return r.recordset[0] || null;
}

/**
 * Stats cho dashboard tài chính
 *
 *  - tongThu / tongChi / soDu (realtime toàn thời gian)
 *  - soPhieuChi / tongPhieuChiThangNay / soPhieuChiThangNay
 *  - thuTrongKhoang: SUM(SoTien) của phiếu thu còn hiệu lực trong khoảng
 *  - chiTrongKhoang: SUM(SoTien) của PhieuChi trong khoảng
 *  - topNoiDung: top 5 nội dung chi phổ biến (group by normalized NoiDung)
 *  - recentPhieuChi: 5 phiếu chi gần nhất
 *  - chartData: doanh thu vs chi phí theo ngày (trong khoảng)
 *  - balanceChart: số dư quỹ cuối ngày theo từng ngày
 */
async function getStats({ days = 30 } = {}) {
    const safeDays = Math.min(365, Math.max(1, parseInt(days, 10) || 30));

    // 1. Tổng quan toàn thời gian
    const [tongR, phieuChiR, thangNayR] = await Promise.all([
        db.query(`
            SELECT
                (SELECT ISNULL(SUM(pt.SoTien), 0)
                 FROM PhieuThu pt
                 LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
                 WHERE pt.MaHD IS NULL OR hd.TrangThai = N'DaThanhToan') AS tongThu,
                (SELECT ISNULL(SUM(SoTien), 0) FROM PhieuChi) AS tongChi
        `),
        db.query(`SELECT COUNT(*) AS total FROM PhieuChi`),
        db.query(`
            SELECT
                ISNULL(SUM(SoTien), 0) AS tongChiThang,
                COUNT(*) AS soPhieuThang
            FROM PhieuChi
            WHERE NgayLap >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
        `),
    ]);

    const tongThu = Number(tongR.recordset[0].tongThu) || 0;
    const tongChi = Number(tongR.recordset[0].tongChi) || 0;
    const soDu = tongThu - tongChi;
    const soPhieuChi = phieuChiR.recordset[0].total;
    const tongChiThangNay = Number(thangNayR.recordset[0].tongChiThang) || 0;
    const soPhieuChiThangNay = Number(thangNayR.recordset[0].soPhieuThang) || 0;

    // 2. Trong khoảng [from, to]: thu & chi theo ngày
    const fromDateSql = `DATEADD(DAY, -@days, CAST(GETDATE() AS DATE))`;
    const thuChartR = await db.query(`
        SELECT CAST(pt.NgayLap AS DATE) AS Ngay,
               ISNULL(SUM(pt.SoTien), 0) AS TongThu
        FROM PhieuThu pt
        LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
        WHERE (pt.MaHD IS NULL OR hd.TrangThai = N'DaThanhToan')
          AND pt.NgayLap >= ${fromDateSql}
        GROUP BY CAST(pt.NgayLap AS DATE)
    `, { days: safeDays - 1 });

    const chiChartR = await db.query(`
        SELECT CAST(NgayLap AS DATE) AS Ngay,
               ISNULL(SUM(SoTien), 0) AS TongChi
        FROM PhieuChi
        WHERE NgayLap >= ${fromDateSql}
        GROUP BY CAST(NgayLap AS DATE)
    `, { days: safeDays - 1 });

    // 3. Merge vào danh sách ngày liên tục, fill ngày trống = 0
    const thuByDay = new Map();
    thuChartR.recordset.forEach((r) => {
        const d = new Date(r.Ngay);
        thuByDay.set(d.toISOString().slice(0, 10), Number(r.TongThu) || 0);
    });
    const chiByDay = new Map();
    chiChartR.recordset.forEach((r) => {
        const d = new Date(r.Ngay);
        chiByDay.set(d.toISOString().slice(0, 10), Number(r.TongChi) || 0);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chartData = [];
    const balanceChart = [];

    // Số dư đầu kỳ = tongThu - tongChi - (sum thu trong khoảng) + (sum chi trong khoảng)
    const sumThuKhoang = Array.from(thuByDay.values()).reduce((a, b) => a + b, 0);
    const sumChiKhoang = Array.from(chiByDay.values()).reduce((a, b) => a + b, 0);
    const openingBalance = tongThu - tongChi - sumThuKhoang + sumChiKhoang;

    let running = openingBalance;
    for (let i = safeDays - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const thu = thuByDay.get(key) || 0;
        const chi = chiByDay.get(key) || 0;
        // Closing balance of day = opening + thu - chi
        running = running + thu - chi;
        chartData.push({ date: key, thu, chi });
        balanceChart.push({ date: key, soDu: running });
    }

    const tongThuKhoang = chartData.reduce((s, d) => s + d.thu, 0);
    const tongChiKhoang = chartData.reduce((s, d) => s + d.chi, 0);

    // 4. Top 5 nội dung chi phổ biến (nhóm theo NoiDung)
    const topNoiDungR = await db.query(`
        SELECT TOP 5
            NoiDung,
            COUNT(*) AS SoLan,
            ISNULL(SUM(SoTien), 0) AS TongTien
        FROM PhieuChi
        GROUP BY NoiDung
        ORDER BY TongTien DESC
    `);

    // 5. 5 phiếu chi gần nhất
    const recentR = await db.query(`
        SELECT TOP 5
            pc.MaPhieuChi, pc.NgayLap, pc.SoTien, pc.NoiDung,
            pc.MaNV, nv.TenNV
        FROM PhieuChi pc
        LEFT JOIN NhanVien nv ON pc.MaNV = nv.MaNV
        ORDER BY pc.MaPhieuChi DESC
    `);

    return {
        // Tổng quan
        tongThu,
        tongChi,
        soDu,
        soPhieuChi,
        tongChiThangNay,
        soPhieuChiThangNay,
        // Trong khoảng
        range: safeDays,
        tongThuTrongKhoang: tongThuKhoang,
        tongChiTrongKhoang: tongChiKhoang,
        soDuCuoiKy: balanceChart.length ? balanceChart[balanceChart.length - 1].soDu : soDu,
        // Biểu đồ
        chartData,
        balanceChart,
        // Top chi phí
        topNoiDung: topNoiDungR.recordset.map((r) => ({
            noiDung: r.NoiDung,
            soLan: Number(r.SoLan) || 0,
            tongTien: Number(r.TongTien) || 0,
        })),
        // Recent
        recentPhieuChi: recentR.recordset.map((r) => ({
            ...r,
            SoTien: Number(r.SoTien) || 0,
        })),
    };
}

module.exports = {
    create,
    getAll,
    getById,
    getSoDu,
    getStats,
};
