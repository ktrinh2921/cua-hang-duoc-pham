/**
 * PhieuNhap Service - Quản lý phiếu nhập thuốc (CRUD + transaction)
 *
 *  - create(data): Tạo phiếu nhập + nhiều lô thuốc trong 1 transaction (atomic)
 *  - getAll({keyword, page, limit}): Danh sách phiếu nhập
 *  - getById(maPN): Chi tiết phiếu nhập + các lô
 *  - cancel(maPN): Hủy phiếu nhập (chỉ đổi TrangThai = 'Huy', không trừ kho - vì kho chưa được "dùng")
 */
const db = require('../../config/db');
const { getPool } = require('../../config/db');

/**
 * Tạo phiếu nhập + các lô thuốc (transaction)
 *
 * @param {Object} data
 * @param {number} data.maNCC - Mã nhà cung cấp
 * @param {number} data.maNV - Mã nhân viên nhập (lấy từ req.user.maNV)
 * @param {string} [data.trangThai='DaNhap'] - Trạng thái phiếu
 * @param {Array} data.chiTiet - Mảng các lô { maThuoc, soLuongNhap, ngaySX, hanSD, giaNhap }
 * @returns {Promise<Object>} Phiếu nhập vừa tạo (kèm chi tiết)
 */
async function create(data) {
    const { maNCC, maNV, trangThai = 'DaNhap', chiTiet = [] } = data;

    if (!Array.isArray(chiTiet) || chiTiet.length === 0) {
        const err = new Error('Phiếu nhập phải có ít nhất 1 lô thuốc');
        err.statusCode = 400;
        throw err;
    }

    const pool = getPool();
    const transaction = new db.sql.Transaction(pool);

    try {
        await transaction.begin();

        const request = new db.sql.Request(transaction);
        request.input('maNCC', db.sql.Int, maNCC);
        request.input('maNV', db.sql.Int, maNV);
        request.input('trangThai', db.sql.NVarChar, trangThai);

        // 1. INSERT PhieuNhap
        const pnResult = await request.query(`
            INSERT INTO PhieuNhap (NgayNhap, TrangThai, MaNCC, MaNV)
            OUTPUT INSERTED.MaPN, INSERTED.NgayNhap, INSERTED.TrangThai, INSERTED.MaNCC, INSERTED.MaNV
            VALUES (GETDATE(), @trangThai, @maNCC, @maNV)
        `);
        const phieuNhap = pnResult.recordset[0];
        const maPN = phieuNhap.MaPN;

        // 2. INSERT từng lô
        const loArr = [];
        for (const ct of chiTiet) {
            const soLuongNhap = parseInt(ct.soLuongNhap, 10);
            const soLuongTonKho = soLuongNhap; // Lúc nhập, tồn = nhập
            const loRequest = new db.sql.Request(transaction);
            loRequest.input('maPN', db.sql.Int, maPN);
            loRequest.input('maThuoc', db.sql.Int, ct.maThuoc);
            loRequest.input('soLuongNhap', db.sql.Int, soLuongNhap);
            loRequest.input('soLuongTonKho', db.sql.Int, soLuongTonKho);
            loRequest.input('ngaySX', db.sql.Date, new Date(ct.ngaySX));
            loRequest.input('hanSD', db.sql.Date, new Date(ct.hanSD));
            loRequest.input('giaNhap', db.sql.Decimal(18, 2), parseFloat(ct.giaNhap));

            const loResult = await loRequest.query(`
                INSERT INTO LoThuoc_ChiTietNhap
                    (SoLuongNhap, SoLuongTonKho, NgaySX, HanSD, GiaNhap, MaPN, MaThuoc)
                OUTPUT INSERTED.MaLo, INSERTED.SoLuongNhap, INSERTED.SoLuongTonKho,
                       INSERTED.NgaySX, INSERTED.HanSD, INSERTED.GiaNhap, INSERTED.MaPN, INSERTED.MaThuoc
                VALUES (@soLuongNhap, @soLuongTonKho, @ngaySX, @hanSD, @giaNhap, @maPN, @maThuoc)
            `);
            loArr.push(loResult.recordset[0]);
        }

        await transaction.commit();

        return {
            ...phieuNhap,
            ChiTiet: loArr
        };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

/**
 * Lay danh sach phieu nhap (co JOIN NCC, NV, COUNT lo, SUM tien)
 *
 * SECURITY: safePage/safeLimit duoc clamp thanh int, su dung cho OFFSET/FETCH
 * (mssql khong support param cho OFFSET/FETCH trong moi phien ban)
 */
async function getAll({ keyword = '', page = 1, limit = 10 } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    // Double-check: phai la integer duong
    if (!Number.isInteger(safePage) || safePage < 1) throw new Error('Invalid page');
    if (!Number.isInteger(safeLimit) || safeLimit < 1) throw new Error('Invalid limit');

    const offset = (safePage - 1) * safeLimit;
    const limitVal = safeLimit;

    const params = {};
    let whereSql = '';
    if (keyword && keyword.trim()) {
        // Escape SQL LIKE wildcards (% _) de user search "100%" khong match all
        const safeKw = keyword.trim().replace(/[%_]/g, '\\$&');
        whereSql = `WHERE (ncc.TenNCC LIKE @kw ESCAPE '\\' OR CAST(pn.MaPN AS VARCHAR) LIKE @kw ESCAPE '\\' OR nv.TenNV LIKE @kw ESCAPE '\\')`;
        params.kw = '%' + safeKw + '%';
    }

    const countR = await db.query(
        `SELECT COUNT(*) AS total FROM PhieuNhap pn
         LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
         LEFT JOIN NhanVien nv ON pn.MaNV = nv.MaNV
         ${whereSql}`,
        params
    );
    const total = countR.recordset[0].total;

    const itemsR = await db.query(
        `SELECT
            pn.MaPN,
            pn.NgayNhap,
            pn.TrangThai,
            pn.MaNCC,
            ncc.TenNCC,
            pn.MaNV,
            nv.TenNV,
            pn.CreatedAt,
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
         LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
         LEFT JOIN NhanVien nv ON pn.MaNV = nv.MaNV
         ${whereSql}
         ORDER BY pn.MaPN DESC
         OFFSET ${offset} ROWS FETCH NEXT ${limitVal} ROWS ONLY`,
        params
    );

    return { items: itemsR.recordset, total };
}

/**
 * Chi tiet 1 phieu nhap (kem danh sach lo)
 * @param {number} maPN
 * @returns {Promise<Object|null>}
 * @throws Error 400 neu maPN khong hop le
 */
async function getById(maPN) {
    if (isNaN(maPN) || maPN <= 0 || !Number.isInteger(maPN)) {
        const err = new Error('Ma phieu nhap khong hop le');
        err.statusCode = 400;
        throw err;
    }

    const pnR = await db.query(
        `SELECT
            pn.MaPN,
            pn.NgayNhap,
            pn.TrangThai,
            pn.MaNCC,
            ncc.TenNCC,
            ncc.DiaChi,
            ncc.SDT,
            pn.MaNV,
            nv.TenNV,
            pn.CreatedAt
         FROM PhieuNhap pn
         LEFT JOIN NhaCungCap ncc ON pn.MaNCC = ncc.MaNCC
         LEFT JOIN NhanVien nv ON pn.MaNV = nv.MaNV
         WHERE pn.MaPN = @maPN`,
        { maPN }
    );
    const phieuNhap = pnR.recordset[0];
    if (!phieuNhap) return null;

    const loR = await db.query(
        `SELECT
            l.MaLo,
            l.MaThuoc,
            t.TenThuoc,
            t.MaDM,
            dm.TenDM,
            l.SoLuongNhap,
            l.SoLuongTonKho,
            l.NgaySX,
            l.HanSD,
            l.GiaNhap,
            (l.SoLuongNhap * l.GiaNhap) AS ThanhTien,
            l.CreatedAt
         FROM LoThuoc_ChiTietNhap l
         INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
         LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
         WHERE l.MaPN = @maPN
         ORDER BY l.MaLo ASC`,
        { maPN }
    );
    phieuNhap.ChiTiet = loR.recordset;
    phieuNhap.TongTien = loR.recordset.reduce(
        (sum, l) => sum + Number(l.ThanhTien),
        0
    );
    return phieuNhap;
}

/**
 * Huy phieu nhap
 * - Chi huy duoc neu TrangThai = 'DaNhap'
 * - Neu da ban lo (SoLuongTonKho < SoLuongNhap) -> khong huy duoc
 * - Doi TrangThai = 'Huy', KHONG xoa lo (de van giu lich su)
 *
 * @param {number} maPN - Ma phieu nhap
 * @returns {Promise<Object|null>} Phieu nhap sau khi huy, hoac null neu khong tim thay
 * @throws Error 400 neu maPN khong hop le
 */
async function cancel(maPN) {
    if (isNaN(maPN) || maPN <= 0 || !Number.isInteger(maPN)) {
        const err = new Error('Ma phieu nhap khong hop le');
        err.statusCode = 400;
        throw err;
    }

    const transaction = new db.sql.Transaction(getPool());
    let transactionStarted = false;

    try {
        await transaction.begin(db.sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;

        const checkR = await new db.sql.Request(transaction)
            .input('maPN', db.sql.Int, maPN)
            .query(`SELECT TrangThai
                    FROM PhieuNhap WITH (UPDLOCK, HOLDLOCK)
                    WHERE MaPN = @maPN`);
        if (checkR.recordset.length === 0) {
            await transaction.commit();
            transactionStarted = false;
            return null;
        }

        const currentStatus = checkR.recordset[0].TrangThai;
        if (currentStatus === 'Huy') {
            const err = new Error('Phiếu nhập đã bị hủy trước đó');
            err.statusCode = 409;
            throw err;
        }
        if (currentStatus !== 'DaNhap') {
            const err = new Error('Chỉ có thể hủy phiếu đã nhập');
            err.statusCode = 409;
            throw err;
        }

        const loBanR = await new db.sql.Request(transaction)
            .input('maPN', db.sql.Int, maPN)
            .query(`SELECT COUNT(*) AS cnt
                    FROM LoThuoc_ChiTietNhap WITH (UPDLOCK, HOLDLOCK)
                    WHERE MaPN = @maPN
                      AND SoLuongTonKho < SoLuongNhap`);
        if (loBanR.recordset[0].cnt > 0) {
            const err = new Error('Không thể hủy: đã có lô được bán ra');
            err.statusCode = 409;
            throw err;
        }

        const dieuChinhR = await new db.sql.Request(transaction)
            .input('maPN', db.sql.Int, maPN)
            .query(`SELECT COUNT(*) AS cnt
                    FROM DieuChinhTonKho dc WITH (HOLDLOCK)
                    INNER JOIN LoThuoc_ChiTietNhap l WITH (HOLDLOCK)
                        ON dc.MaLo = l.MaLo
                    WHERE l.MaPN = @maPN`);
        if (dieuChinhR.recordset[0].cnt > 0) {
            const err = new Error('Không thể hủy: phiếu nhập đã có lô được điều chỉnh tồn kho');
            err.statusCode = 409;
            throw err;
        }

        await new db.sql.Request(transaction)
            .input('maPN', db.sql.Int, maPN)
            .query(`UPDATE PhieuNhap
                    SET TrangThai = N'Huy'
                    WHERE MaPN = @maPN AND TrangThai = N'DaNhap'`);

        await transaction.commit();
        transactionStarted = false;
        return await getById(maPN);
    } catch (err) {
        if (transactionStarted) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback hủy phiếu nhập thất bại:', rollbackError.message);
            }
        }
        throw err;
    }
}

module.exports = {
    create,
    getAll,
    getById,
    cancel
};
