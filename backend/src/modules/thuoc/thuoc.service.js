/**
 * Thuoc Service - Business logic cho quản lý thuốc
 */
const db = require('../../config/db');
const { parsePagination } = require('../../utils/pagination');

/**
 * Lấy danh sách thuốc có phân trang + tìm kiếm THÔNG MINH
 *
 * Ranking (khi có keyword):
 *   1. Exact match        TenThuoc = @kw               → ưu tiên 1
 *   2. Prefix match       TenThuoc LIKE 'kw%'          → ưu tiên 2
 *   3. Contains in tên    TenThuoc LIKE '%kw%'         → ưu tiên 3
 *   4. Contains in hoạt   HoatChat LIKE '%kw%'         → ưu tiên 4
 *   Trong mỗi nhóm: còn hàng (SoLuongTonKho > 0) trước, rồi mới đến hết hàng.
 *
 * @param {Object} options - {
 *   keyword, maDM,
 *   trangThaiTon: 'all' | 'inStock' | 'low' | 'out' (còn / sắp hết / hết),
 *   sort: 'ten_asc' | 'ten_desc' | 'gia_asc' | 'gia_desc' | 'ton_desc' | 'hsd_asc'
 * }
 */
function escapeLikePattern(s) {
    return String(s).replace(/[\\%_\[\^]/g, '\\$&');
}

async function getAll({ keyword = '', maDM = null, page = 1, limit = 10, trangThaiTon = 'all', sort = 'ma_desc' } = {}) {
    const { page: safePage, limit: safeLimit, offset } = parsePagination(page, limit);

    const baseWhere = [];
    const params = {};
    let rankCase = '0 AS RankScore';

    // ── Keyword search ──────────────────────────────────────────
    if (keyword && keyword.trim()) {
        const kwRaw = keyword.trim();
        const kw = escapeLikePattern(kwRaw).slice(0, 100);
        const kwParam = `%${kw}%`;
        const kwPrefix = `${kw}%`;
        const kwExact = kw;

        baseWhere.push(`(
            t.TenThuoc LIKE @kwExact ESCAPE '\\'
            OR t.TenThuoc LIKE @kwPrefix ESCAPE '\\'
            OR t.TenThuoc LIKE @kwParam ESCAPE '\\'
            OR t.HoatChat LIKE @kwParam ESCAPE '\\'
        )`);
        params.kwExact = kwExact;
        params.kwPrefix = kwPrefix;
        params.kwParam = kwParam;

        // CASE WHEN xếp hạng: còn hàng (1) > hết hàng (0) trong cùng rank
        rankCase = `CASE
            WHEN t.TenThuoc = @kwExact THEN 10
            WHEN t.TenThuoc LIKE @kwPrefix ESCAPE '\\' THEN 8
            WHEN t.TenThuoc LIKE @kwParam ESCAPE '\\' THEN 6
            ELSE 4
        END
        + CASE WHEN ISNULL((
            SELECT SUM(l.SoLuongTonKho)
            FROM LoThuoc_ChiTietNhap l
            INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
            WHERE l.MaThuoc = t.MaThuoc
              AND l.SoLuongTonKho > 0
              AND l.HanSD > GETDATE()
              AND pn.TrangThai = N'DaNhap'
        ), 0) > 0 THEN 1 ELSE 0 END AS RankScore`;
    }

    if (maDM) {
        baseWhere.push('t.MaDM = @maDM');
        params.maDM = maDM;
    }

    // ── Trạng thái tồn kho (FE filter chips) ──────────────────
    // Stock computed: SUM(SoLuongTonKho) WHERE HanSD > GETDATE() AND TrangThai = DaNhap
    const stockSubquery = `ISNULL((
        SELECT SUM(l.SoLuongTonKho)
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE l.MaThuoc = t.MaThuoc
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
          AND pn.TrangThai = N'DaNhap'
    ), 0)`;

    const filteredWhere = [...baseWhere];
    if (trangThaiTon === 'inStock') {
        filteredWhere.push(`(${stockSubquery}) > 10`);
    } else if (trangThaiTon === 'low') {
        filteredWhere.push(`(${stockSubquery}) > 0 AND (${stockSubquery}) <= 10`);
    } else if (trangThaiTon === 'out') {
        filteredWhere.push(`(${stockSubquery}) = 0`);
    }
    // 'all' → no filter

    const whereSql = filteredWhere.length ? `WHERE ${filteredWhere.join(' AND ')}` : '';
    const baseWhereSql = baseWhere.length ? `WHERE ${baseWhere.join(' AND ')}` : '';

    // ── Count ───────────────────────────────────────────────────
    const countResult = await db.query(
        `SELECT COUNT(*) AS total FROM Thuoc t ${whereSql}`,
        params
    );
    const total = countResult.recordset[0].total;

    // ── Counts theo trạng thái tồn kho (để FE hiển thị filter chips) ──
    // Query phụ với filter keyword/danh mục nhưng KHÔNG filter trangThaiTon
    // → trả về count chính xác của từng chip theo ngữ cảnh search hiện tại
    const countsResult = await db.query(
        `SELECT
            SUM(CASE WHEN stock.SoLuongTonKho > 10 THEN 1 ELSE 0 END) AS inStock,
            SUM(CASE WHEN stock.SoLuongTonKho > 0 AND stock.SoLuongTonKho <= 10 THEN 1 ELSE 0 END) AS low,
            SUM(CASE WHEN stock.SoLuongTonKho = 0 THEN 1 ELSE 0 END) AS outStock
         FROM (
            SELECT ${stockSubquery} AS SoLuongTonKho
            FROM Thuoc t ${baseWhereSql}
         ) stock`,
        params
    );
    const countsRow = countsResult.recordset[0] || {};
    const counts = {
        inStock: Number(countsRow.inStock) || 0,
        low: Number(countsRow.low) || 0,
        out: Number(countsRow.outStock) || 0,
    };

    // ── ORDER BY ────────────────────────────────────────────────
    // Lưu ý: không tham chiếu alias từ SELECT (TonKho/HanSDGanNhat) vì
    // MSSQL từ chối khi alias dẫn xuất từ subquery scalar + OFFSET/FETCH.
    // Phải viết lại biểu thức tương đương trong ORDER BY.
    const stockSubqueryForOrder = `ISNULL((
        SELECT SUM(l.SoLuongTonKho)
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE l.MaThuoc = t.MaThuoc
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
          AND pn.TrangThai = N'DaNhap'
    ), 0)`;
    const minHanSDSubqueryForOrder = `(
        SELECT MIN(l.HanSD)
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE l.MaThuoc = t.MaThuoc
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
          AND pn.TrangThai = N'DaNhap'
    )`;
    const sortMap = {
        ten_asc: 't.TenThuoc ASC',
        ten_desc: 't.TenThuoc DESC',
        gia_asc: 't.GiaBanThamKhao ASC',
        gia_desc: 't.GiaBanThamKhao DESC',
        ton_desc: `${stockSubqueryForOrder} DESC`,
        hsd_asc: `${minHanSDSubqueryForOrder} ASC`,
        ma_desc: keyword ? 'RankScore DESC, t.MaThuoc DESC' : 't.MaThuoc DESC',
    };
    const orderBy = sortMap[sort] || sortMap.ma_desc;

    // ── SELECT + sort by min HSD (FIFO) ────────────────────────
    const itemsResult = await db.query(
        `SELECT
            t.MaThuoc,
            t.TenThuoc,
            t.HoatChat,
            t.KhoiLuong,
            t.GiaBanThamKhao,
            t.MaDM,
            dm.TenDM,
            t.CreatedAt,
            t.UpdatedAt,
            ${stockSubquery} AS SoLuongTonKho,
            (
                SELECT MIN(l.HanSD)
                FROM LoThuoc_ChiTietNhap l
                INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
                WHERE l.MaThuoc = t.MaThuoc
                  AND l.SoLuongTonKho > 0
                  AND l.HanSD > GETDATE()
                  AND pn.TrangThai = N'DaNhap'
            ) AS HanSDGanNhat,
            CASE WHEN ${stockSubquery} > 10 THEN 'inStock'
                 WHEN ${stockSubquery} > 0 THEN 'low'
                 ELSE 'out'
            END AS TrangThaiTon,
            ${rankCase}
         FROM Thuoc t
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         ${whereSql}
         ORDER BY ${orderBy}
         OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY`,
        params
    );

    // ── Counts cho stat bar (chỉ khi truy vấn không có filter phức tạp) ──
    // FE sẽ tự tính counts từ data trả về để đơn giản hóa

    const items = itemsResult.recordset.map(({ RankScore, ...rest }) => rest);
    return { items, total, counts };
}

/**
 * Lấy thuốc theo id (kèm MoTa, LieuDung, ChongChiDinh, GhiChu)
 */
async function getById(maThuoc) {
    const result = await db.query(
        `SELECT
            t.MaThuoc, t.TenThuoc, t.HoatChat, t.KhoiLuong,
            t.GiaBanThamKhao, t.MaDM, dm.TenDM,
            t.MoTa, t.LieuDung, t.ChongChiDinh, t.GhiChu,
            t.CreatedAt, t.UpdatedAt
         FROM Thuoc t
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         WHERE t.MaThuoc = @maThuoc`,
        { maThuoc }
    );
    return result.recordset[0] || null;
}

/**
 * Lấy thuốc cùng hoạt chất (cho "sản phẩm thay thế" ở POS khi thuốc hết hàng)
 *
 * Nghiệp vụ (đúng yêu cầu đề bài 18/9 - "Khi thuốc A hết, đề xuất thuốc B cùng hoạt chất"):
 *  - Mặc định chỉ trả về thuốc CÒN TỒN KHO và CHƯA HẾT HẠN (inStockOnly = true).
 *  - Sort: thuốc cùng hàm lượng (KhoiLuong) trước → "tương đương", sau đó mới đến khác hàm lượng.
 *  - Thêm field `tuongDuong` (boolean) để FE phân biệt: thuốc thay thế tương đương vs khác hàm lượng.
 *  - Trong mỗi nhóm: còn hàng nhiều trước (còn càng nhiều → càng khả thi).
 *
 * @param {number} maThuoc - Mã thuốc nguồn
 * @param {number} limit   - Giới hạn số lượng trả về
 * @param {Object} options - { inStockOnly?: boolean = true, sort?: string = 'tuongDuong' }
 */
async function getSimilarByHoatChat(maThuoc, limit = 5, { inStockOnly = true } = {}) {
    const thuoc = await getById(maThuoc);
    if (!thuoc || !thuoc.HoatChat) return [];

    // Tồn kho thực tế (còn hàng + chưa hết hạn)
    const stockSubquery = `ISNULL((
        SELECT SUM(l.SoLuongTonKho)
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE l.MaThuoc = t.MaThuoc
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
          AND pn.TrangThai = N'DaNhap'
    ), 0)`;

    const whereExtra = inStockOnly
        ? `AND ${stockSubquery} > 0`
        : '';

    // Sắp xếp: tương đương (cùng KhoiLuong) trước, sau đó khác hàm lượng.
    // Trong mỗi nhóm: còn nhiều trước, MaThuoc mới trước.
    const result = await db.query(
        `SELECT TOP (@limit)
            t.MaThuoc, t.TenThuoc, t.HoatChat, t.KhoiLuong,
            t.GiaBanThamKhao, t.MaDM, dm.TenDM,
            ${stockSubquery} AS SoLuongTonKho,
            CASE WHEN t.KhoiLuong = @khoiLuong AND @khoiLuong IS NOT NULL
                 THEN 1 ELSE 0 END AS TuongDuong
         FROM Thuoc t
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         WHERE t.HoatChat = @hoatChat
           AND t.MaThuoc != @maThuoc
           ${whereExtra}
         ORDER BY
            TuongDuong DESC,
            ${stockSubquery} DESC,
            t.MaThuoc DESC`,
        { maThuoc, hoatChat: thuoc.HoatChat, khoiLuong: thuoc.KhoiLuong, limit }
    );
    return result.recordset;
}

/**
 * Tạo thuốc mới (bao gồm MoTa, LieuDung, ChongChiDinh, GhiChu)
 */
async function create(data) {
    const result = await db.query(
        `INSERT INTO Thuoc (TenThuoc, HoatChat, KhoiLuong, GiaBanThamKhao, MaDM, MoTa, LieuDung, ChongChiDinh, GhiChu)
         OUTPUT INSERTED.MaThuoc, INSERTED.TenThuoc, INSERTED.HoatChat,
                INSERTED.KhoiLuong, INSERTED.GiaBanThamKhao, INSERTED.MaDM,
                INSERTED.MoTa, INSERTED.LieuDung, INSERTED.ChongChiDinh, INSERTED.GhiChu
         VALUES (@tenThuoc, @hoatChat, @khoiLuong, @giaBanThamKhao, @maDM, @moTa, @lieuDung, @chongChiDinh, @ghiChu)`,
        {
            tenThuoc: data.tenThuoc,
            hoatChat: data.hoatChat || null,
            khoiLuong: data.khoiLuong || null,
            giaBanThamKhao: data.giaBanThamKhao,
            maDM: data.maDM,
            moTa: data.moTa || null,
            lieuDung: data.lieuDung || null,
            chongChiDinh: data.chongChiDinh || null,
            ghiChu: data.ghiChu || null,
        }
    );
    return result.recordset[0];
}

/**
 * Cập nhật thuốc (bao gồm MoTa, LieuDung, ChongChiDinh, GhiChu)
 */
async function update(maThuoc, data) {
    const result = await db.query(
        `UPDATE Thuoc
         SET TenThuoc = @tenThuoc,
             HoatChat = @hoatChat,
             KhoiLuong = @khoiLuong,
             GiaBanThamKhao = @giaBanThamKhao,
             MaDM = @maDM,
             MoTa = @moTa,
             LieuDung = @lieuDung,
             ChongChiDinh = @chongChiDinh,
             GhiChu = @ghiChu,
             UpdatedAt = GETDATE()
         OUTPUT INSERTED.MaThuoc, INSERTED.TenThuoc, INSERTED.HoatChat,
                INSERTED.KhoiLuong, INSERTED.GiaBanThamKhao, INSERTED.MaDM,
                INSERTED.MoTa, INSERTED.LieuDung, INSERTED.ChongChiDinh, INSERTED.GhiChu
         WHERE MaThuoc = @maThuoc`,
        {
            maThuoc,
            tenThuoc: data.tenThuoc,
            hoatChat: data.hoatChat || null,
            khoiLuong: data.khoiLuong || null,
            giaBanThamKhao: data.giaBanThamKhao,
            maDM: data.maDM,
            moTa: data.moTa || null,
            lieuDung: data.lieuDung || null,
            chongChiDinh: data.chongChiDinh || null,
            ghiChu: data.ghiChu || null,
        }
    );
    return result.recordset[0] || null;
}

/**
 * Xóa thuốc (chỉ khi chưa có lô nhập nào)
 */
async function remove(maThuoc) {
    const checkResult = await db.query(
        'SELECT COUNT(*) AS cnt FROM LoThuoc_ChiTietNhap WHERE MaThuoc = @maThuoc',
        { maThuoc }
    );

    if (checkResult.recordset[0].cnt > 0) {
        const error = new Error(
            `Không thể xóa: thuốc đã có ${checkResult.recordset[0].cnt} lô nhập trong hệ thống`
        );
        error.statusCode = 409;
        throw error;
    }

    const result = await db.query(
        'DELETE FROM Thuoc WHERE MaThuoc = @maThuoc',
        { maThuoc }
    );
    return result.rowsAffected[0] > 0;
}

module.exports = {
    getAll,
    getById,
    getSimilarByHoatChat,
    create,
    update,
    remove
};
