/**
 * Kho Service - Quản lý tồn kho + cảnh báo
 *
 *  - getTonKho(): tổng tồn kho theo từng thuốc (JOIN LoThuoc_ChiTietNhap, chỉ tính lô thuộc phiếu CHƯA HỦY, chưa hết hạn)
 *  - getSapHetHang(nguong): thuốc có tồn ≤ nguong (mặc định 10)
 *  - getSapHetHan(days): lô thuốc sắp hết hạn trong N ngày (mặc định 30)
 *
 * QUAN TRỌNG: Moi query phai filter JOIN PhieuNhap.TrangThai = N'DaNhap'
 * (khong tinh lo tu phieu Huy/ChoDuyet)
 */
const db = require('../../config/db');

/**
 * Thống kê tổng quan cho Hub Kho.
 * Trả về: tongTon (tổng SL tồn), giaTriTonKho (VND), soThuocCoTon, tongSoLo.
 *
 * CHỈ tính các lô:
 *   - thuộc phiếu DaNhap (không tính lô từ phiếu Huy/ChoDuyet)
 *   - còn hạn sử dụng (HanSD > GETDATE())
 *   - còn tồn > 0
 */
async function getThongKeTong() {
    // 1) Tổng quan
    const tongR = await db.query(
        `SELECT
            ISNULL(SUM(l.SoLuongTonKho), 0)                AS tongTon,
            ISNULL(SUM(l.SoLuongTonKho * l.GiaNhap), 0)    AS giaTriTonKho,
            COUNT(DISTINCT l.MaThuoc)                      AS soThuocCoTon,
            COUNT(*)                                        AS tongSoLo
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         WHERE l.SoLuongTonKho > 0
           AND l.HanSD > GETDATE()
           AND pn.TrangThai = N'DaNhap'`
    );
    const tong = tongR.recordset[0];

    const expiredR = await db.query(
        `SELECT ISNULL(SUM(l.SoLuongTonKho), 0) AS soLuongDaHetHan
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         WHERE l.SoLuongTonKho > 0
           AND l.HanSD <= GETDATE()
           AND pn.TrangThai = N'DaNhap'`
    );

    // 2) Phân bổ tồn kho theo danh mục (cho Pareto chart trên Hub)
    const dmR = await db.query(
        `SELECT
            ISNULL(dm.MaDM, N'(Chưa phân loại)') AS MaDM,
            ISNULL(dm.TenDM, N'Chưa phân loại')  AS TenDM,
            ISNULL(SUM(l.SoLuongTonKho), 0)      AS SoLuongTon,
            ISNULL(SUM(l.SoLuongTonKho * l.GiaNhap), 0) AS GiaTri,
            COUNT(DISTINCT l.MaThuoc)            AS SoThuoc
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         LEFT JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         WHERE l.SoLuongTonKho > 0
           AND l.HanSD > GETDATE()
           AND pn.TrangThai = N'DaNhap'
         GROUP BY dm.MaDM, dm.TenDM`
    );

    return {
        tongTon: Number(tong.tongTon) || 0,
        giaTriTonKho: Number(tong.giaTriTonKho) || 0,
        soThuocCoTon: Number(tong.soThuocCoTon) || 0,
        tongSoLo: Number(tong.tongSoLo) || 0,
        soLuongDaHetHan: Number(expiredR.recordset[0]?.soLuongDaHetHan) || 0,
        theoDanhMuc: dmR.recordset.map((r) => ({
            maDM: r.MaDM,
            tenDM: r.TenDM,
            soLuongTon: Number(r.SoLuongTon) || 0,
            giaTri: Number(r.GiaTri) || 0,
            soThuoc: Number(r.SoThuoc) || 0,
        })),
    };
}

/**
 * Tồn kho theo từng thuốc
 * - SoLuongTonKho = tổng tồn các lô thuộc phiếu DaNhap, chưa hết hạn, > 0
 * - SoLuongSapHetHan = tổng tồn các lô có HanSD trong 30 ngày tới
 * - SoLo = số lô còn hàng
 * - HanSDSomNhat = hạn sớm nhất
 * - GiaNhapBinhQuan = bình quân gia quyền theo số lượng tồn còn lại
 *
 * Hỗ trợ pagination + search keyword (theo TenThuoc/MaThuoc)
 */
async function getTonKho({ keyword = '', page = 1, limit = 10 } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    // Double-check: phai la integer duong (SQLi defense)
    if (!Number.isInteger(safePage) || safePage < 1) throw new Error('Invalid page');
    if (!Number.isInteger(safeLimit) || safeLimit < 1) throw new Error('Invalid limit');

    const offset = (safePage - 1) * safeLimit;
    const limitVal = safeLimit;

    const params = {};
    let whereSql = '';
    let whereCountSql = '';
    if (keyword && keyword.trim()) {
        // Escape SQL LIKE wildcards (% _) de user search "100%" khong match all
        const safeKw = keyword.trim().replace(/[%_]/g, '\\$&');
        whereCountSql = `WHERE (t.TenThuoc LIKE @kw ESCAPE '\\' OR CAST(t.MaThuoc AS VARCHAR) LIKE @kw ESCAPE '\\')`;
        whereSql = `WHERE (t.TenThuoc LIKE @kw ESCAPE '\\' OR CAST(t.MaThuoc AS VARCHAR) LIKE @kw ESCAPE '\\')`;
        params.kw = '%' + safeKw + '%';
    }

    // COUNT: dem so thuoc CO it nhat 1 lo con hang thuoc phieu DaNhap
    const countR = await db.query(
        `SELECT COUNT(DISTINCT t.MaThuoc) AS total
         FROM Thuoc t
         LEFT JOIN LoThuoc_ChiTietNhap l ON l.MaThuoc = t.MaThuoc AND l.SoLuongTonKho > 0 AND l.HanSD > GETDATE()
         LEFT JOIN PhieuNhap pn ON l.MaPN = pn.MaPN AND pn.TrangThai = N'DaNhap'
         ${whereCountSql}`,
        params
    );
    const total = countR.recordset[0].total;

    // ITEMS: chi tinh cac lo thuoc phieu DaNhap
    const itemsR = await db.query(
        `SELECT
            t.MaThuoc,
            t.TenThuoc,
            t.MaDM,
            dm.TenDM,
            t.GiaBanThamKhao,
            ISNULL((
                SELECT SUM(l.SoLuongTonKho)
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn2 ON l.MaPN = pn2.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND pn2.TrangThai = N'DaNhap'
            ), 0) AS SoLuongTonKho,
            ISNULL((
                SELECT SUM(l.SoLuongTonKho)
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn2 ON l.MaPN = pn2.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND l.HanSD <= DATEADD(DAY, 30, GETDATE())
                  AND pn2.TrangThai = N'DaNhap'
            ), 0) AS SoLuongSapHetHan,
            ISNULL((
                SELECT COUNT(*)
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn2 ON l.MaPN = pn2.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND pn2.TrangThai = N'DaNhap'
            ), 0) AS SoLo,
            (
                SELECT MIN(l.HanSD)
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn2 ON l.MaPN = pn2.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND pn2.TrangThai = N'DaNhap'
            ) AS HanSDSomNhat,
            ISNULL((
                SELECT
                    SUM(l.SoLuongTonKho * l.GiaNhap)
                    / NULLIF(SUM(l.SoLuongTonKho), 0)
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn2 ON l.MaPN = pn2.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND pn2.TrangThai = N'DaNhap'
            ), 0) AS GiaNhapBinhQuan
         FROM Thuoc t
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         ${whereSql}
         ORDER BY t.TenThuoc ASC, t.MaThuoc ASC
         OFFSET ${offset} ROWS FETCH NEXT ${limitVal} ROWS ONLY`,
        params
    );

    return { items: itemsR.recordset, total };
}

/**
 * Danh sách thuốc sắp hết hàng (0 < tồn ≤ nguong)
 * Chi tinh cac lo thuoc phieu DaNhap
 * @param {number} nguong - Ngưỡng cảnh báo (mặc định 10)
 */
async function getSapHetHang(nguong = 10) {
    const thresh = Math.max(0, parseInt(nguong, 10) || 10);
    const r = await db.query(
        `SELECT
            t.MaThuoc,
            t.TenThuoc,
            t.MaDM,
            dm.TenDM,
            stock.SoLuongTonKho,
            @nguong AS Nguong,
            stock.HanSDSomNhat
         FROM Thuoc t
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         CROSS APPLY (
            SELECT
                ISNULL(SUM(l.SoLuongTonKho), 0) AS SoLuongTonKho,
                MIN(l.HanSD) AS HanSDSomNhat
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn2 ON l.MaPN = pn2.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND pn2.TrangThai = N'DaNhap'
         ) stock
         WHERE stock.SoLuongTonKho > 0
           AND stock.SoLuongTonKho <= @nguong
         ORDER BY stock.SoLuongTonKho ASC`,
        { nguong: thresh }
    );
    return r.recordset;
}

/**
 * Danh sách LÔ thuốc sắp hết hạn (trong N ngày tới, còn hàng, thuộc phiếu DaNhap)
 * @param {number} days - Số ngày (mặc định 30)
 */
async function getSapHetHan(days = 30) {
    const dayLimit = Math.max(1, Math.min(365, parseInt(days, 10) || 30));
    const r = await db.query(
        `SELECT
            l.MaLo,
            l.MaThuoc,
            t.TenThuoc,
            t.MaDM,
            dm.TenDM,
            l.SoLuongTonKho,
            l.HanSD,
            DATEDIFF(DAY, GETDATE(), l.HanSD) AS SoNgayConLai,
            l.GiaNhap,
            l.MaPN,
            pn.NgayNhap
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         WHERE l.SoLuongTonKho > 0
           AND l.HanSD > GETDATE()
           AND l.HanSD <= DATEADD(DAY, @days, GETDATE())
           AND pn.TrangThai = N'DaNhap'
         ORDER BY l.HanSD ASC`,
        { days: dayLimit }
    );
    return r.recordset;
}

/**
 * Lay danh sach LO con hang cua 1 thuoc (FIFO = lô cũ nhất lên đầu)
 * Chi lay lô thuộc phiếu DaNhap, còn tồn > 0, chưa hết hạn.
 *
 * @param {number} maThuoc
 * @param {string} [role] - Role của user đang gọi. NV_BanHang sẽ bị strip field nhạy cảm
 *                          (GiaNhap, MaPN, MaNCC, TenNCC) vì không thuộc nghiệp vụ bán hàng.
 * @returns {Promise<Array>} [{ MaLo, SoLuongTonKho, HanSD, SoNgayConLai, GiaNhap?, NgayNhap? }]
 */
async function getLoByThuoc(maThuoc, role = 'Admin') {
    const r = await db.query(
        `SELECT
            l.MaLo,
            l.MaThuoc,
            t.TenThuoc,
            l.MaPN,
            l.SoLuongNhap,
            l.SoLuongTonKho,
            l.NgaySX,
            l.HanSD,
            DATEDIFF(DAY, GETDATE(), l.HanSD) AS SoNgayConLai,
            l.GiaNhap,
            pn.NgayNhap,
            pn.MaNCC,
            ncc.TenNCC,
            pn.TrangThai
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
         WHERE l.MaThuoc = @maThuoc
           AND l.SoLuongTonKho > 0
           AND l.HanSD > GETDATE()
           AND pn.TrangThai = N'DaNhap'
         ORDER BY l.HanSD ASC`,  // FIFO: lô cũ nhất (hạn sớm nhất) lên đầu
        { maThuoc }
    );

    // NV_BanHang không cần biết giá nhập / NCC / mã phiếu nhập.
    // Need-to-know: chỉ giữ field phục vụ bán hàng (MaLo, SoLuongTonKho, HanSD, SoNgayConLai).
    if (role === 'NV_BanHang') {
        return r.recordset.map((lot) => ({
            MaLo: lot.MaLo,
            MaThuoc: lot.MaThuoc,
            TenThuoc: lot.TenThuoc,
            SoLuongNhap: lot.SoLuongNhap,
            SoLuongTonKho: lot.SoLuongTonKho,
            NgaySX: lot.NgaySX,
            HanSD: lot.HanSD,
            SoNgayConLai: lot.SoNgayConLai,
        }));
    }
    return r.recordset;
}

/**
 * Lịch sử điều chỉnh tồn của một thuốc, mới nhất trước.
 */
async function getAdjustmentsByThuoc(maThuoc, limit = 20) {
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const r = await db.query(
        `SELECT TOP (${safeLimit})
            dc.MaDieuChinh,
            dc.MaLo,
            dc.SoLuongTruoc,
            dc.SoLuongSau,
            dc.ChenhLech,
            dc.LyDo,
            dc.CreatedAt,
            dc.MaNV,
            nv.TenNV
         FROM DieuChinhTonKho dc
         INNER JOIN LoThuoc_ChiTietNhap l ON dc.MaLo = l.MaLo
         LEFT JOIN NhanVien nv ON dc.MaNV = nv.MaNV
         WHERE l.MaThuoc = @maThuoc
         ORDER BY dc.CreatedAt DESC, dc.MaDieuChinh DESC`,
        { maThuoc }
    );
    return r.recordset;
}

/**
 * Danh sách điều chỉnh tồn kho có filter & phân trang (audit trail).
 * Trả về join với thông tin lô + thuốc + NCC + nhân viên.
 */
async function getDieuChinhList({
    keyword = '',
    maNV = '',
    from = '',
    to = '',
    page = 1,
    limit = 10,
} = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    const params = {};
    const where = [];

    if (keyword && keyword.trim()) {
        const safeKw = keyword.trim().replace(/[%_]/g, '\\$&');
        where.push(`(t.TenThuoc LIKE @kw ESCAPE '\\' OR dc.LyDo LIKE @kw ESCAPE '\\')`);
        params.kw = '%' + safeKw + '%';
    }

    if (maNV) {
        const safeMaNV = parseInt(maNV, 10);
        if (Number.isInteger(safeMaNV) && safeMaNV > 0) {
            where.push('dc.MaNV = @maNV');
            params.maNV = safeMaNV;
        }
    }

    // from/to: format yyyy-mm-dd → so sánh với CAST(CreatedAt AS DATE)
    if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
        where.push('CAST(dc.CreatedAt AS DATE) >= @from');
        params.from = from;
    }
    if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        where.push('CAST(dc.CreatedAt AS DATE) <= @to');
        params.to = to;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countR = await db.query(
        `SELECT COUNT(*) AS total
         FROM DieuChinhTonKho dc
         INNER JOIN LoThuoc_ChiTietNhap l ON dc.MaLo = l.MaLo
         INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
         LEFT JOIN NhanVien nv ON dc.MaNV = nv.MaNV
         ${whereSql}`,
        params
    );
    const total = countR.recordset[0].total;

    const itemsR = await db.query(
        `SELECT
            dc.MaDieuChinh,
            dc.MaLo,
            l.MaThuoc,
            t.TenThuoc,
            dm.TenDM,
            dc.SoLuongTruoc,
            dc.SoLuongSau,
            dc.ChenhLech,
            dc.LyDo,
            dc.CreatedAt,
            dc.MaNV,
            nv.TenNV,
            l.HanSD,
            pn.MaPN,
            pn.NgayNhap,
            ncc.TenNCC
         FROM DieuChinhTonKho dc
         INNER JOIN LoThuoc_ChiTietNhap l ON dc.MaLo = l.MaLo
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
         LEFT JOIN NhanVien nv ON dc.MaNV = nv.MaNV
         ${whereSql}
         ORDER BY dc.CreatedAt DESC, dc.MaDieuChinh DESC
         OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY`,
        params
    );

    return { items: itemsR.recordset, total };
}

/**
 * Điều chỉnh số lượng còn lại của một lô sau khi kiểm kê.
 * SoLuongNhap không đổi vì đó là chứng từ gốc của phiếu nhập.
 */
async function adjustLotStock(maLo, { soLuongMoi, lyDo, maNV }) {
    const pool = db.getPool();
    const transaction = new db.sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin(db.sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;

        const lotResult = await new db.sql.Request(transaction)
            .input('maLo', db.sql.Int, maLo)
            .query(`SELECT
                        l.MaLo,
                        l.MaThuoc,
                        l.SoLuongNhap,
                        l.SoLuongTonKho,
                        pn.TrangThai
                    FROM LoThuoc_ChiTietNhap l WITH (UPDLOCK, HOLDLOCK)
                    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
                    WHERE l.MaLo = @maLo`);

        const lot = lotResult.recordset[0];
        if (!lot) {
            const err = new Error(`Không tìm thấy lô thuốc #${maLo}`);
            err.statusCode = 404;
            throw err;
        }
        if (lot.TrangThai !== 'DaNhap') {
            const err = new Error('Chỉ có thể điều chỉnh lô thuộc phiếu đã nhập');
            err.statusCode = 409;
            throw err;
        }

        const soLuongTruoc = Number(lot.SoLuongTonKho);
        if (soLuongTruoc === soLuongMoi) {
            const err = new Error('Số lượng mới không thay đổi so với tồn hiện tại');
            err.statusCode = 409;
            throw err;
        }

        await new db.sql.Request(transaction)
            .input('maLo', db.sql.Int, maLo)
            .input('soLuongMoi', db.sql.Int, soLuongMoi)
            .query(`UPDATE LoThuoc_ChiTietNhap
                    SET SoLuongTonKho = @soLuongMoi
                    WHERE MaLo = @maLo`);

        const adjustmentResult = await new db.sql.Request(transaction)
            .input('maLo', db.sql.Int, maLo)
            .input('soLuongTruoc', db.sql.Int, soLuongTruoc)
            .input('soLuongSau', db.sql.Int, soLuongMoi)
            .input('lyDo', db.sql.NVarChar(500), lyDo)
            .input('maNV', db.sql.Int, maNV)
            .query(`INSERT INTO DieuChinhTonKho
                        (MaLo, SoLuongTruoc, SoLuongSau, LyDo, MaNV)
                    OUTPUT INSERTED.MaDieuChinh, INSERTED.MaLo,
                           INSERTED.SoLuongTruoc, INSERTED.SoLuongSau,
                           INSERTED.ChenhLech, INSERTED.LyDo,
                           INSERTED.MaNV, INSERTED.CreatedAt
                    VALUES (@maLo, @soLuongTruoc, @soLuongSau, @lyDo, @maNV)`);

        await transaction.commit();
        transactionStarted = false;

        return {
            ...adjustmentResult.recordset[0],
            MaThuoc: lot.MaThuoc,
            SoLuongNhap: lot.SoLuongNhap,
        };
    } catch (err) {
        if (transactionStarted) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback điều chỉnh tồn thất bại:', rollbackError.message);
            }
        }
        throw err;
    }
}

/**
 * Lay tong ton kho cua 1 thuoc
 */
async function getTonKhoThuoc(maThuoc) {
    const r = await db.query(
        `SELECT ISNULL(SUM(l.SoLuongTonKho), 0) AS tonKho
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
         WHERE l.MaThuoc = @maThuoc
           AND l.SoLuongTonKho > 0
           AND l.HanSD > GETDATE()
           AND pn.TrangThai = N'DaNhap'`,
        { maThuoc }
    );
    return Number(r.recordset[0]?.tonKho) || 0;
}

module.exports = {
    getThongKeTong,
    getTonKho,
    getSapHetHang,
    getSapHetHan,
    getLoByThuoc,
    getTonKhoThuoc,
    getAdjustmentsByThuoc,
    getDieuChinhList,
    adjustLotStock
};
