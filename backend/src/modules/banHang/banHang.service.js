/**
 * BanHang Service - Bán hàng FIFO
 *
 * Flow:
 *  1. Validate cart rỗng, maKH tồn tại
 *  2. Load price + lots cần thiết cho cart (1 query cho prices, 1 query cho lots)
 *  3. Validate tồn kho
 *  4. FIFO split (HanSD ASC)
 *  5. Transaction: INSERT HoaDon + ChiTietHoaDon + UPDATE LoThuoc_ChiTietNhap
 *
 * Note: Tất cả input đã được controller validate cơ bản; service tập trung logic nghiệp vụ.
 */
const db = require('../../config/db');
const { normalizeCart, calculateInvoiceTotals } = require('./banHang.logic');

/**
 * FIFO split: lấy lô theo thứ tự HanSD sớm nhất cho đến khi đủ SL
 * @returns {Array} [{ maLo, soLuongBan }, ...]
 */
function splitFIFO(lots, soLuong) {
    const result = [];
    let remaining = soLuong;
    for (const lo of lots) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, lo.SoLuongTonKho);
        result.push({ maLo: lo.MaLo, soLuongBan: take });
        remaining -= take;
    }
    return result;
}

/**
 * Tạo hóa đơn + trừ tồn kho (transaction)
 *
 * @param {Object} data
 * @param {number|null} data.maKH
 * @param {number} data.tienKhachDua
 * @param {Array}  data.items - [{ maThuoc, soLuong }]
 * @param {number} data.maNV
 * @returns {Promise<Object>} HoaDon vừa tạo + ChiTiet
 */
async function banHang(data) {
    const { maKH, tienKhachDua, giamGia = 0, items, maNV } = data;
    const cart = normalizeCart(items);
    const maThuocList = cart.map(c => c.maThuoc);
    const pool = db.getPool();
    const transaction = new db.sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin(db.sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;

        if (maKH) {
            const khR = await new db.sql.Request(transaction)
                .input('maKH', db.sql.Int, maKH)
                .query('SELECT MaKH FROM KhachHang WITH (HOLDLOCK) WHERE MaKH = @maKH');
            if (khR.recordset.length === 0) {
                const err = new Error(`Khách hàng #${maKH} không tồn tại`);
                err.statusCode = 400;
                throw err;
            }
        }

        const placeholders = maThuocList.map((_, i) => `@m${i}`).join(',');
        const priceRequest = new db.sql.Request(transaction);
        const lotRequest = new db.sql.Request(transaction);
        maThuocList.forEach((maThuoc, index) => {
            priceRequest.input(`m${index}`, db.sql.Int, maThuoc);
            lotRequest.input(`m${index}`, db.sql.Int, maThuoc);
        });

        const priceResult = await priceRequest.query(`
            SELECT MaThuoc, GiaBanThamKhao
            FROM Thuoc WITH (HOLDLOCK)
            WHERE MaThuoc IN (${placeholders})
        `);
        const lotResult = await lotRequest.query(`
            SELECT l.MaThuoc, l.MaLo, l.SoLuongTonKho, l.HanSD, l.GiaNhap
            FROM PhieuNhap pn WITH (HOLDLOCK)
            INNER JOIN LoThuoc_ChiTietNhap l WITH (UPDLOCK, HOLDLOCK)
                ON l.MaPN = pn.MaPN
            WHERE l.MaThuoc IN (${placeholders})
              AND l.SoLuongTonKho > 0
              AND l.HanSD > CAST(GETDATE() AS DATE)
              AND pn.TrangThai = N'DaNhap'
            ORDER BY l.MaThuoc ASC, l.HanSD ASC, l.MaLo ASC
        `);

        const giaBanMap = {};
        priceResult.recordset.forEach(row => {
            giaBanMap[row.MaThuoc] = Number(row.GiaBanThamKhao) || 0;
        });
        const lotsMap = {};
        lotResult.recordset.forEach(row => {
            if (!lotsMap[row.MaThuoc]) lotsMap[row.MaThuoc] = [];
            lotsMap[row.MaThuoc].push(row);
        });

        const cartDetail = [];
        for (const { maThuoc, soLuong } of cart) {
            if (!Object.prototype.hasOwnProperty.call(giaBanMap, maThuoc)) {
                const err = new Error(`Thuốc #${maThuoc} không tồn tại`);
                err.statusCode = 400;
                throw err;
            }
            const lots = lotsMap[maThuoc] || [];
            const tonKho = lots.reduce((sum, lot) => sum + Number(lot.SoLuongTonKho), 0);
            if (tonKho < soLuong) {
                const err = new Error(`Thuốc #${maThuoc} chỉ còn ${tonKho} trong kho, không đủ để bán ${soLuong}`);
                err.statusCode = 409;
                throw err;
            }
            const giaBan = giaBanMap[maThuoc];
            cartDetail.push({
                maThuoc,
                soLuong,
                giaBan,
                chiTietLo: splitFIFO(lots, soLuong).map(lot => ({
                    ...lot,
                    giaBanThucTe: giaBan,
                })),
            });
        }

        const totals = calculateInvoiceTotals(cartDetail, giamGia, tienKhachDua);

        // INSERT HoaDon
        const hdRequest = new db.sql.Request(transaction);
        hdRequest.input('tongTien', db.sql.Decimal(18, 2), totals.tongTien);
        hdRequest.input('giamGia', db.sql.Decimal(18, 2), totals.giamGia);
        hdRequest.input('tienDua', db.sql.Decimal(18, 2), totals.tienKhachDua);
        hdRequest.input('tienLai', db.sql.Decimal(18, 2), totals.tienTraLai);
        hdRequest.input('maNV', db.sql.Int, maNV);
        hdRequest.input('maKH', db.sql.Int, maKH || null);

        const hdResult = await hdRequest.query(`
            INSERT INTO HoaDon (NgayGioLap, TongTien, GiamGia, TienKhachDua, TienTraLai, TrangThai, MaNV, MaKH)
            OUTPUT INSERTED.MaHD, INSERTED.NgayGioLap, INSERTED.TongTien, INSERTED.GiamGia,
                   INSERTED.TienKhachDua, INSERTED.TienTraLai, INSERTED.TrangThai, INSERTED.MaNV, INSERTED.MaKH
            VALUES (GETDATE(), @tongTien, @giamGia, @tienDua, @tienLai, N'DaThanhToan', @maNV, @maKH)
        `);
        const hoaDon = hdResult.recordset[0];

        // Ghi nhận tiền thực thu (doanh thu sau giảm giá), cùng transaction để
        // hóa đơn và dòng tiền không bao giờ lệch nhau.
        await new db.sql.Request(transaction)
            .input('soTien', db.sql.Decimal(18, 2), totals.tongTien)
            .input('maNV', db.sql.Int, maNV)
            .input('maHD', db.sql.Int, hoaDon.MaHD)
            .query(`
                INSERT INTO PhieuThu (NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD)
                VALUES (GETDATE(), @soTien, N'BanHang',
                        CONCAT(N'Thu bán hàng - Hóa đơn #', @maHD), @maNV, @maHD)
            `);

        for (const item of cartDetail) {
            for (const lo of item.chiTietLo) {
                await new db.sql.Request(transaction)
                    .input('maHD', db.sql.Int, hoaDon.MaHD)
                    .input('maLo', db.sql.Int, lo.maLo)
                    .input('soLuong', db.sql.Int, lo.soLuongBan)
                    .input('gia', db.sql.Decimal(18, 2), lo.giaBanThucTe)
                    .query(`INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
                            VALUES (@maHD, @maLo, @soLuong, @gia)`);
            }
        }
        for (const item of cartDetail) {
            for (const lo of item.chiTietLo) {
                const updateResult = await new db.sql.Request(transaction)
                    .input('maLo', db.sql.Int, lo.maLo)
                    .input('soLuong', db.sql.Int, lo.soLuongBan)
                    .query(`UPDATE LoThuoc_ChiTietNhap
                            SET SoLuongTonKho = SoLuongTonKho - @soLuong
                            WHERE MaLo = @maLo
                              AND SoLuongTonKho >= @soLuong`);
                if (updateResult.rowsAffected[0] !== 1) {
                    const err = new Error(`Tồn kho lô #${lo.maLo} vừa thay đổi, vui lòng thanh toán lại`);
                    err.statusCode = 409;
                    throw err;
                }
            }
        }

        await transaction.commit();
        transactionStarted = false;

        return {
            ...hoaDon,
            TamTinh: totals.tamTinh,
            GiamGia: totals.giamGia,
            TienTraLai: totals.tienTraLai,
            ChiTiet: cartDetail.map(item => ({
                MaThuoc: item.maThuoc,
                SoLuongBan: item.soLuong,
                GiaBan: item.giaBan,
                ThanhTien: item.soLuong * item.giaBan,
                ChiTietLo: item.chiTietLo,
            })),
        };
    } catch (err) {
        if (transactionStarted) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback bán hàng thất bại:', rollbackError.message);
            }
        }
        throw err;
    }
}

/**
 * Danh sách hóa đơn (filter + pagination)
 */
async function getAll({ keyword = '', page = 1, limit = 10, fromDate, toDate } = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 1));
    const offset = (safePage - 1) * safeLimit;

    let whereSql = '';
    const params = {};

    if (keyword && keyword.trim()) {
        whereSql = `WHERE (kh.TenKH LIKE @kw ESCAPE '\\'
                     OR CAST(hd.MaHD AS VARCHAR) LIKE @kw ESCAPE '\\'
                     OR nv.TenNV LIKE @kw ESCAPE '\\')`;
        params.kw = '%' + keyword.trim().replace(/[%_]/g, '\\$&') + '%';
    }
    if (fromDate) {
        whereSql += (whereSql ? ' AND ' : 'WHERE ') + 'CAST(hd.NgayGioLap AS DATE) >= @fromDate';
        params.fromDate = fromDate;
    }
    if (toDate) {
        whereSql += (whereSql ? ' AND ' : 'WHERE ') + 'CAST(hd.NgayGioLap AS DATE) <= @toDate';
        params.toDate = toDate;
    }

    const countR = await db.query(`
        SELECT COUNT(*) AS total FROM HoaDon hd
        LEFT JOIN KhachHang kh ON hd.MaKH = kh.MaKH
        LEFT JOIN NhanVien nv ON hd.MaNV = nv.MaNV
        ${whereSql}
    `, params);

    const itemsR = await db.query(`
        SELECT hd.MaHD, hd.NgayGioLap, hd.TongTien, hd.GiamGia,
               hd.TienKhachDua, hd.TienTraLai, hd.TrangThai,
               hd.MaNV, nv.TenNV, hd.MaKH, kh.TenKH,
               (SELECT COUNT(*) FROM ChiTietHoaDon ct WHERE ct.MaHD = hd.MaHD) AS SoMatHang
        FROM HoaDon hd
        LEFT JOIN KhachHang kh ON hd.MaKH = kh.MaKH
        LEFT JOIN NhanVien nv ON hd.MaNV = nv.MaNV
        ${whereSql}
        ORDER BY hd.MaHD DESC
        OFFSET ${offset} ROWS FETCH NEXT ${safeLimit} ROWS ONLY
    `, params);

    return {
        items: itemsR.recordset,
        total: countR.recordset[0].total,
    };
}

/**
 * Chi tiết hóa đơn
 */
async function getById(maHD) {
    if (!Number.isInteger(maHD) || maHD <= 0) {
        const err = new Error('Mã hóa đơn không hợp lệ');
        err.statusCode = 400;
        throw err;
    }

    const [hdR, ctR] = await Promise.all([
        db.query(`
            SELECT hd.MaHD, hd.NgayGioLap, hd.TongTien, hd.GiamGia,
                   hd.TienKhachDua,
                   hd.TienTraLai, hd.TrangThai, hd.MaNV, nv.TenNV,
                   hd.MaKH, kh.TenKH
            FROM HoaDon hd
            LEFT JOIN NhanVien nv ON hd.MaNV = nv.MaNV
            LEFT JOIN KhachHang kh ON hd.MaKH = kh.MaKH
            WHERE hd.MaHD = @maHD
        `, { maHD }),
        db.query(`
            SELECT ct.MaHD, ct.MaLo, ct.SoLuongBan, ct.GiaBanThucTe,
                   l.MaThuoc, t.TenThuoc, dm.TenDM, l.HanSD
            FROM ChiTietHoaDon ct
            INNER JOIN LoThuoc_ChiTietNhap l ON ct.MaLo = l.MaLo
            INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
            LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
            WHERE ct.MaHD = @maHD
            ORDER BY ct.MaLo ASC
        `, { maHD }),
    ]);

    const hoaDon = hdR.recordset[0];
    if (!hoaDon) return null;

    hoaDon.ChiTiet = ctR.recordset.map(r => ({
        ...r,
        ThanhTien: r.SoLuongBan * Number(r.GiaBanThucTe),
    }));
    return hoaDon;
}

/**
 * Hủy hóa đơn (Admin only) - Hoàn lại tồn kho
 */
async function cancel(maHD) {
    if (!Number.isInteger(maHD) || maHD <= 0) {
        const err = new Error('Mã hóa đơn không hợp lệ');
        err.statusCode = 400;
        throw err;
    }

    const pool = db.getPool();
    const transaction = new db.sql.Transaction(pool);
    let transactionStarted = false;

    try {
        await transaction.begin(db.sql.ISOLATION_LEVEL.SERIALIZABLE);
        transactionStarted = true;

        // 1. Kiểm tra trạng thái
        const checkR = await new db.sql.Request(transaction)
            .input('maHD', db.sql.Int, maHD)
            .query(`SELECT TrangThai
                    FROM HoaDon WITH (UPDLOCK, HOLDLOCK)
                    WHERE MaHD = @maHD`);

        if (checkR.recordset.length === 0) {
            const err = new Error(`Không tìm thấy hóa đơn #${maHD}`);
            err.statusCode = 404;
            throw err;
        }
        if (checkR.recordset[0].TrangThai === 'DaHuy') {
            const err = new Error('Hóa đơn đã bị hủy trước đó');
            err.statusCode = 409;
            throw err;
        }

        // 2. Hoàn tồn kho cho từng lô
        const ctR = await new db.sql.Request(transaction)
            .input('maHD', db.sql.Int, maHD)
            .query(`SELECT MaLo, SoLuongBan
                    FROM ChiTietHoaDon WITH (HOLDLOCK)
                    WHERE MaHD = @maHD`);

        for (const ct of ctR.recordset) {
            await new db.sql.Request(transaction)
                .input('maLo', db.sql.Int, ct.MaLo)
                .input('soLuong', db.sql.Int, ct.SoLuongBan)
                .query(`UPDATE LoThuoc_ChiTietNhap
                        SET SoLuongTonKho = SoLuongTonKho + @soLuong
                        WHERE MaLo = @maLo`);
        }

        // 3. Cập nhật trạng thái
        await new db.sql.Request(transaction)
            .input('maHD', db.sql.Int, maHD)
            .query(`UPDATE HoaDon
                    SET TrangThai = N'DaHuy', UpdatedAt = GETDATE()
                    WHERE MaHD = @maHD AND TrangThai = N'DaThanhToan'`);

        await transaction.commit();
        transactionStarted = false;
        return await getById(maHD);
    } catch (err) {
        if (transactionStarted) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error('Rollback hủy hóa đơn thất bại:', rollbackError.message);
            }
        }
        throw err;
    }
}

module.exports = {
    banHang,
    getAll,
    getById,
    cancel,
};
