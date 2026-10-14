/**
 * ThongKe Service - 3 dashboard tổng hợp theo báo cáo mục 2.1.1.8 → 2.1.1.10
 *
 *  - thongKeKho()       [All]     Tổng tồn kho + sắp hết hàng + sắp hết hạn
 *  - thongKeHoaDon(f,t) [All]     Doanh thu theo ngày + top thuốc bán chạy
 *  - thongKeTaiChinh(f,t) [Admin] Tổng thu/chi/lợi nhuận + số dư theo range
 *
 * Quy ước SQL:
 *  - HoaDon.TrangThai = N'DaThanhToan' (chỉ tính HD chưa hủy)
 *  - LoThuoc_ChiTietNhap JOIN PhieuNhap.TrangThai = N'DaNhap'
 *  - Date filter: CAST(... AS DATE) cho input YYYY-MM-DD (tránh timezone bug)
 */
const db = require('../../config/db');
const { calculateFinanceSummary } = require('../phieuChi/finance.logic');
const { buildDateRange, previousDateRange } = require('./dateRange.logic');

// ========== Helpers ==========

/**
 * Fill ngày trống = 0 cho chart doanh thu theo ngày
 * @param {Array<{ngay: Date|string, ...}>} rows
 * @param {string} fromDate - 'YYYY-MM-DD'
 * @param {string} toDate   - 'YYYY-MM-DD'
 * @param {string} dateKey  - tên field ngày trong row
 * @returns {Array<{ngay: string, ...}>}
 */
function fillDaily(rows, fromDate, toDate, dateKey, valueKeys) {
    const byDay = new Map();
    rows.forEach((r) => {
        const d = new Date(r[dateKey]);
        const key = d.toISOString().slice(0, 10);
        const obj = { ngay: key };
        valueKeys.forEach((k, i) => {
            obj[k] = Number(r[valueKeys[i]]) || 0;
        });
        byDay.set(key, obj);
    });
    const dates = buildDateRange(fromDate, toDate);
    return dates.map((d) => {
        const found = byDay.get(d);
        if (found) return found;
        const obj = { ngay: d };
        valueKeys.forEach((k) => { obj[k] = 0; });
        return obj;
    });
}

// ========== 1. THỐNG KÊ KHO ==========
async function thongKeKho() {
    const overviewR = await db.query(`
        SELECT
            ISNULL(SUM(l.SoLuongTonKho), 0) AS TongSoLuongTon,
            COUNT(DISTINCT t.MaThuoc) AS SoMatHang,
            ISNULL(SUM(CASE WHEN l.HanSD <= DATEADD(DAY, 30, GETDATE()) THEN l.SoLuongTonKho ELSE 0 END), 0) AS SoLuongSapHetHan,
            ISNULL(SUM(l.SoLuongTonKho * l.GiaNhap), 0) AS GiaTriTonKho
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        WHERE pn.TrangThai = N'DaNhap'
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
    `);
    const ov = overviewR.recordset[0];

    const lowStockR = await db.query(`
        SELECT ISNULL(SUM(stock.SoLuongTonKho), 0) AS SoLuongSapHetHang
        FROM (
            SELECT l2.MaThuoc, SUM(l2.SoLuongTonKho) AS SoLuongTonKho
            FROM LoThuoc_ChiTietNhap l2
            INNER JOIN PhieuNhap pn2 ON l2.MaPN = pn2.MaPN
            WHERE pn2.TrangThai = N'DaNhap'
              AND l2.SoLuongTonKho > 0
              AND l2.HanSD > GETDATE()
            GROUP BY l2.MaThuoc
        ) stock
        WHERE stock.SoLuongTonKho > 0
          AND stock.SoLuongTonKho <= 10
    `);

    const byCategoryR = await db.query(`
        SELECT
            ISNULL(dm.TenDM, N'Chưa phân loại') AS TenDM,
            ISNULL(SUM(l.SoLuongTonKho), 0) AS SoLuongTon
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
        WHERE pn.TrangThai = N'DaNhap'
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
        GROUP BY dm.TenDM
        HAVING SUM(l.SoLuongTonKho) > 0
        ORDER BY SoLuongTon DESC
    `);

    // Gom top 5 danh mục + "Khác" để Pie chart đỡ rối khi có nhiều DM
    const categories = byCategoryR.recordset.map(r => ({
        tenDM: r.TenDM,
        soLuongTon: Number(r.SoLuongTon) || 0,
    }));
    let tonKhoTheoDanhMuc = categories;
    if (categories.length > 6) {
        const top = categories.slice(0, 5);
        const rest = categories.slice(5);
        const sumRest = rest.reduce((s, x) => s + x.soLuongTon, 0);
        tonKhoTheoDanhMuc = [...top, { tenDM: 'Khác', soLuongTon: sumRest }];
    }

    // Top 10 thuốc sắp hết hàng
    const sapHetHangR = await db.query(`
        SELECT TOP 10
            t.MaThuoc,
            t.TenThuoc,
            ISNULL(SUM(l.SoLuongTonKho), 0) AS SoLuongTon
        FROM Thuoc t
        INNER JOIN LoThuoc_ChiTietNhap l ON l.MaThuoc = t.MaThuoc
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE pn.TrangThai = N'DaNhap'
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
        GROUP BY t.MaThuoc, t.TenThuoc
        HAVING SUM(l.SoLuongTonKho) <= 10
        ORDER BY SUM(l.SoLuongTonKho) ASC
    `);

    // Top 10 lô sắp hết hạn
    const sapHetHanR = await db.query(`
        SELECT TOP 10
            l.MaLo,
            l.MaThuoc,
            t.TenThuoc,
            l.SoLuongTonKho,
            l.HanSD,
            DATEDIFF(DAY, GETDATE(), l.HanSD) AS SoNgayConLai
        FROM LoThuoc_ChiTietNhap l
        INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
        WHERE pn.TrangThai = N'DaNhap'
          AND l.SoLuongTonKho > 0
          AND l.HanSD > GETDATE()
          AND l.HanSD <= DATEADD(DAY, 30, GETDATE())
        ORDER BY l.HanSD ASC
    `);

    // Thêm: Vòng quay tồn kho (số ngày bán hết tồn hiện tại)
    // Công thức: tongSoLuongTon / trung bình bán/ngày trong 30 ngày gần nhất
    const banTrong30NgayR = await db.query(`
        SELECT ISNULL(SUM(ct.SoLuongBan), 0) AS TongBan30
        FROM ChiTietHoaDon ct
        INNER JOIN HoaDon hd ON ct.MaHD = hd.MaHD
        WHERE hd.TrangThai = N'DaThanhToan'
          AND hd.NgayGioLap >= DATEADD(DAY, -30, GETDATE())
    `);
    const tongBan30 = Number(banTrong30NgayR.recordset[0]?.TongBan30) || 0;
    const banTrungBinhNgay = tongBan30 / 30;
    const tongSoLuongTon = Number(ov.TongSoLuongTon) || 0;
    const vongQuay = banTrungBinhNgay > 0
        ? Math.round(tongSoLuongTon / banTrungBinhNgay)
        : null;

    // Đếm số phiếu nhập + tổng tiền nhập (realtime)
    const nhapR = await db.query(`
        SELECT
            COUNT(DISTINCT pn.MaPN) AS SoPhieuNhap,
            ISNULL(SUM(l.SoLuongNhap * l.GiaNhap), 0) AS TongTienNhap
        FROM PhieuNhap pn
        INNER JOIN LoThuoc_ChiTietNhap l ON l.MaPN = pn.MaPN
        WHERE pn.TrangThai = N'DaNhap'
    `);

    return {
        tongQuan: {
            tongSoLuongTon,
            soMatHang: Number(ov.SoMatHang) || 0,
            soLuongSapHetHang: Number(lowStockR.recordset[0]?.SoLuongSapHetHang) || 0,
            soLuongSapHetHan: Number(ov.SoLuongSapHetHan) || 0,
            giaTriTonKho: Number(ov.GiaTriTonKho) || 0,
            // Mới thêm
            soPhieuNhap: Number(nhapR.recordset[0]?.SoPhieuNhap) || 0,
            tongTienNhap: Number(nhapR.recordset[0]?.TongTienNhap) || 0,
            vongQuayTonKho: vongQuay, // số ngày; null nếu chưa bán được gì
            banTrungBinhNgay: Math.round(banTrungBinhNgay),
        },
        tonKhoTheoDanhMuc,
        topSapHetHang: sapHetHangR.recordset.map(r => ({
            maThuoc: r.MaThuoc,
            tenThuoc: r.TenThuoc,
            soLuongTon: Number(r.SoLuongTon) || 0,
        })),
        topSapHetHan: sapHetHanR.recordset.map(r => ({
            maLo: r.MaLo,
            maThuoc: r.MaThuoc,
            tenThuoc: r.TenThuoc,
            soLuongTon: Number(r.SoLuongTon) || 0,
            hanSD: r.HanSD,
            soNgayConLai: Number(r.SoNgayConLai) || 0,
        })),
    };
}

// ========== 2. THỐNG KÊ HÓA ĐƠN ==========
async function thongKeHoaDon({ fromDate, toDate } = {}) {
    const params = {};
    let whereSql = `WHERE hd.TrangThai = N'DaThanhToan'`;
    if (fromDate) {
        whereSql += ` AND CAST(hd.NgayGioLap AS DATE) >= @fromDate`;
        params.fromDate = fromDate;
    }
    if (toDate) {
        whereSql += ` AND CAST(hd.NgayGioLap AS DATE) <= @toDate`;
        params.toDate = toDate;
    }

    // Tổng quan kỳ hiện tại
    const overviewR = await db.query(`
        SELECT
            COUNT(*) AS SoHoaDon,
            ISNULL(SUM(hd.TongTien), 0) AS TongDoanhThu,
            ISNULL(AVG(hd.TongTien), 0) AS DoanhThuTrungBinh,
            ISNULL(MAX(hd.TongTien), 0) AS DoanhThuCaoNhat,
            ISNULL(SUM(hd.TienKhachDua), 0) AS TongTienKhachDua,
            ISNULL(SUM(hd.TienTraLai), 0) AS TongTienTraLai,
            COUNT(DISTINCT hd.MaKH) AS SoKhachHang,
            COUNT(DISTINCT hd.MaNV) AS SoNhanVienBan
        FROM HoaDon hd
        ${whereSql}
    `, params);
    const ov = overviewR.recordset[0];

    // Doanh thu theo ngày (raw, fill sau)
    const dailyR = await db.query(`
        SELECT
            CAST(hd.NgayGioLap AS DATE) AS Ngay,
            COUNT(*) AS SoHoaDon,
            ISNULL(SUM(hd.TongTien), 0) AS DoanhThu
        FROM HoaDon hd
        ${whereSql}
        GROUP BY CAST(hd.NgayGioLap AS DATE)
        ORDER BY Ngay ASC
    `, params);

    // Top 10 thuốc bán chạy
    const topThuocR = await db.query(`
        SELECT TOP 10
            t.MaThuoc,
            t.TenThuoc,
            ISNULL(dm.TenDM, N'Chưa phân loại') AS TenDM,
            SUM(ct.SoLuongBan) AS TongSoLuongBan,
            ISNULL(SUM(ct.SoLuongBan * ct.GiaBanThucTe), 0) AS TongDoanhThu
        FROM ChiTietHoaDon ct
        INNER JOIN HoaDon hd ON ct.MaHD = hd.MaHD
        INNER JOIN LoThuoc_ChiTietNhap l ON ct.MaLo = l.MaLo
        INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
        LEFT JOIN DanhMuc dm ON t.MaDM = dm.MaDM
        ${whereSql}
        GROUP BY t.MaThuoc, t.TenThuoc, dm.TenDM
        ORDER BY TongSoLuongBan DESC, TongDoanhThu DESC
    `, params);

    // ===== So sánh với kỳ trước =====
    // Kỳ trước = cùng độ dài, ngay trước kỳ hiện tại
    let soSanhKyTruoc = null;
    if (fromDate && toDate) {
        const previous = previousDateRange(fromDate, toDate);
        const prevFromStr = previous.fromDate;
        const prevToStr = previous.toDate;

        const prevR = await db.query(`
            SELECT
                COUNT(*) AS SoHoaDon,
                ISNULL(SUM(hd.TongTien), 0) AS TongDoanhThu,
                ISNULL(SUM(hd.TienKhachDua), 0) AS TongTienKhachDua
            FROM HoaDon hd
            WHERE hd.TrangThai = N'DaThanhToan'
              AND CAST(hd.NgayGioLap AS DATE) >= @prevFrom
              AND CAST(hd.NgayGioLap AS DATE) <= @prevTo
        `, { prevFrom: prevFromStr, prevTo: prevToStr });

        const pv = prevR.recordset[0];
        const cur = {
            soHoaDon: Number(ov.SoHoaDon) || 0,
            tongDoanhThu: Number(ov.TongDoanhThu) || 0,
            tongTienKhachDua: Number(ov.TongTienKhachDua) || 0,
        };
        const prev = {
            soHoaDon: Number(pv.SoHoaDon) || 0,
            tongDoanhThu: Number(pv.TongDoanhThu) || 0,
            tongTienKhachDua: Number(pv.TongTienKhachDua) || 0,
        };
        const calcDelta = (a, b) => {
            if (b === 0) return a > 0 ? 100 : 0;
            return Math.round(((a - b) / b) * 100);
        };
        soSanhKyTruoc = {
            kyTruoc: { fromDate: prevFromStr, toDate: prevToStr },
            soHoaDon: calcDelta(cur.soHoaDon, prev.soHoaDon),
            tongDoanhThu: calcDelta(cur.tongDoanhThu, prev.tongDoanhThu),
            tongTienKhachDua: calcDelta(cur.tongTienKhachDua, prev.tongTienKhachDua),
        };
    }

    // Fill ngày trống = 0 (nếu có fromDate/toDate, fill; nếu không thì giữ nguyên)
    let doanhThuTheoNgay = dailyR.recordset.map(r => ({
        ngay: new Date(r.Ngay).toISOString().slice(0, 10),
        soHoaDon: Number(r.SoHoaDon) || 0,
        doanhThu: Number(r.DoanhThu) || 0,
    }));
    if (fromDate && toDate) {
        doanhThuTheoNgay = fillDaily(
            dailyR.recordset, fromDate, toDate, 'Ngay',
            ['soHoaDon', 'doanhThu']
        );
    }

    return {
        tongQuan: {
            soHoaDon: Number(ov.SoHoaDon) || 0,
            tongDoanhThu: Number(ov.TongDoanhThu) || 0,
            doanhThuTrungBinh: Number(ov.DoanhThuTrungBinh) || 0,
            doanhThuCaoNhat: Number(ov.DoanhThuCaoNhat) || 0,
            tongTienKhachDua: Number(ov.TongTienKhachDua) || 0,
            tongTienTraLai: Number(ov.TongTienTraLai) || 0,
            soKhachHang: Number(ov.SoKhachHang) || 0,
            soNhanVienBan: Number(ov.SoNhanVienBan) || 0,
        },
        doanhThuTheoNgay,
        topThuocBanChay: topThuocR.recordset.map(r => ({
            maThuoc: r.MaThuoc,
            tenThuoc: r.TenThuoc,
            tenDM: r.TenDM,
            tongSoLuongBan: Number(r.TongSoLuongBan) || 0,
            tongDoanhThu: Number(r.TongDoanhThu) || 0,
        })),
        khoangThoiGian: { fromDate: fromDate || null, toDate: toDate || null },
        soSanhKyTruoc,
    };
}

// ========== 2b. THỐNG KÊ HÓA ĐƠN — DANH SÁCH CHI TIẾT ==========
/**
 * Danh sách hóa đơn chi tiết trong kỳ (phân trang).
 * Dùng cho tab "Thống kê > Hóa đơn" — yêu cầu "xem được hóa đơn".
 * Mặc định bao gồm cả hóa đơn ĐÃ HỦY để user kiểm tra lịch sử đầy đủ.
 */
async function thongKeHoaDonList({ fromDate, toDate, page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const params = {};
    let whereSql = `WHERE 1=1`;
    if (fromDate) {
        whereSql += ` AND CAST(hd.NgayGioLap AS DATE) >= @fromDate`;
        params.fromDate = fromDate;
    }
    if (toDate) {
        whereSql += ` AND CAST(hd.NgayGioLap AS DATE) <= @toDate`;
        params.toDate = toDate;
    }

    const countR = await db.query(
        `SELECT COUNT(*) AS total FROM HoaDon hd ${whereSql}`,
        params
    );
    const total = countR.recordset[0].total;

    const listR = await db.query(
        `SELECT
            hd.MaHD,
            hd.NgayGioLap,
            hd.TongTien,
            hd.TienKhachDua,
            hd.TienTraLai,
            hd.TrangThai,
            hd.MaNV,
            nv.TenNV,
            hd.MaKH,
            ISNULL(kh.TenKH, N'Khách lẻ') AS TenKH
         FROM HoaDon hd
         LEFT JOIN NhanVien nv ON hd.MaNV = nv.MaNV
         LEFT JOIN KhachHang kh ON hd.MaKH = kh.MaKH
         ${whereSql}
         ORDER BY hd.NgayGioLap DESC, hd.MaHD DESC
         OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`,
        params
    );

    const items = listR.recordset.map(r => ({
        maHD: r.MaHD,
        ngayGioLap: r.NgayGioLap,
        tongTien: Number(r.TongTien) || 0,
        tienKhachDua: Number(r.TienKhachDua) || 0,
        tienTraLai: Number(r.TienTraLai) || 0,
        trangThai: r.TrangThai,
        maNV: r.MaNV,
        tenNV: r.TenNV || `#${r.MaNV}`,
        maKH: r.MaKH,
        tenKH: r.TenKH,
    }));

    return { items, total };
}

// ========== 3. THỐNG KÊ TÀI CHÍNH ==========
async function thongKeTaiChinh({ fromDate, toDate } = {}) {
    // ===== Phần thu (HoaDon DaThanhToan) =====
    const thuParams = {};
    let thuWhere = `WHERE hd.TrangThai = N'DaThanhToan'`;
    if (fromDate) {
        thuWhere += ` AND CAST(hd.NgayGioLap AS DATE) >= @fromDate`;
        thuParams.fromDate = fromDate;
    }
    if (toDate) {
        thuWhere += ` AND CAST(hd.NgayGioLap AS DATE) <= @toDate`;
        thuParams.toDate = toDate;
    }
    const thuR = await db.query(`
        SELECT
            ISNULL(SUM(hd.TongTien), 0) AS TongDoanhThu,
            COUNT(*) AS SoHoaDon
        FROM HoaDon hd
        ${thuWhere}
    `, thuParams);
    const thu = thuR.recordset[0];

    // ===== Dòng tiền vào (PhieuThu còn hiệu lực) =====
    const phieuThuParams = {};
    let phieuThuWhere = `WHERE (pt.MaHD IS NULL OR hd.TrangThai = N'DaThanhToan')`;
    if (fromDate) {
        phieuThuWhere += ` AND CAST(pt.NgayLap AS DATE) >= @fromDate`;
        phieuThuParams.fromDate = fromDate;
    }
    if (toDate) {
        phieuThuWhere += ` AND CAST(pt.NgayLap AS DATE) <= @toDate`;
        phieuThuParams.toDate = toDate;
    }
    const phieuThuR = await db.query(`
        SELECT ISNULL(SUM(pt.SoTien), 0) AS TongThu,
               COUNT(*) AS SoPhieuThu
        FROM PhieuThu pt
        LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
        ${phieuThuWhere}
    `, phieuThuParams);

    // ===== Phần chi (PhieuChi) =====
    const chiParams = {};
    let chiWhere = `WHERE 1=1`;
    if (fromDate) {
        chiWhere += ` AND CAST(pc.NgayLap AS DATE) >= @fromDate`;
        chiParams.fromDate = fromDate;
    }
    if (toDate) {
        chiWhere += ` AND CAST(pc.NgayLap AS DATE) <= @toDate`;
        chiParams.toDate = toDate;
    }
    const chiR = await db.query(`
        SELECT
            ISNULL(SUM(pc.SoTien), 0) AS TongChi,
            COUNT(*) AS SoPhieuChi
        FROM PhieuChi pc
        ${chiWhere}
    `, chiParams);
    const chi = chiR.recordset[0];

    // ===== Phan chi theo NoiDung (top 5 loai chi) =====
    // (FIXED: dùng cùng pattern chiWhere như trên, không cần replace)
    const chiByNoiDungR = await db.query(`
        SELECT TOP 5
            pc.NoiDung,
            ISNULL(SUM(pc.SoTien), 0) AS TongTien,
            COUNT(*) AS SoLan
        FROM PhieuChi pc
        ${chiWhere}
        GROUP BY pc.NoiDung
        ORDER BY TongTien DESC
    `, chiParams);

    // ===== Chi phi nhap hang (PhieuNhap DaNhap) =====
    const nhapParams = {};
    let nhapWhere = `WHERE pn.TrangThai = N'DaNhap'`;
    if (fromDate) {
        nhapWhere += ` AND CAST(pn.NgayNhap AS DATE) >= @fromDate`;
        nhapParams.fromDate = fromDate;
    }
    if (toDate) {
        nhapWhere += ` AND CAST(pn.NgayNhap AS DATE) <= @toDate`;
        nhapParams.toDate = toDate;
    }
    const nhapR = await db.query(`
        SELECT
            ISNULL(SUM(l.SoLuongNhap * l.GiaNhap), 0) AS TongTienNhap,
            COUNT(DISTINCT pn.MaPN) AS SoPhieuNhap
        FROM PhieuNhap pn
        INNER JOIN LoThuoc_ChiTietNhap l ON l.MaPN = pn.MaPN
        ${nhapWhere}
    `, nhapParams);

    // Giá vốn chỉ của các đơn vị đã bán trong kỳ, lấy theo giá nhập của đúng lô FIFO.
    const giaVonR = await db.query(`
        SELECT ISNULL(SUM(ct.SoLuongBan * l.GiaNhap), 0) AS GiaVonDaBan
        FROM ChiTietHoaDon ct
        INNER JOIN HoaDon hd ON ct.MaHD = hd.MaHD
        INNER JOIN LoThuoc_ChiTietNhap l ON ct.MaLo = l.MaLo
        ${thuWhere}
    `, thuParams);

    // ===== Daily chart data: Thu vs Chi theo ngày =====
    let dailyChart = [];
    if (fromDate && toDate) {
        const thuDailyR = await db.query(`
            SELECT CAST(pt.NgayLap AS DATE) AS Ngay,
                   ISNULL(SUM(pt.SoTien), 0) AS TongThu
            FROM PhieuThu pt
            LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
            ${phieuThuWhere}
            GROUP BY CAST(pt.NgayLap AS DATE)
        `, phieuThuParams);

        const chiDailyR = await db.query(`
            SELECT CAST(pc.NgayLap AS DATE) AS Ngay,
                   ISNULL(SUM(pc.SoTien), 0) AS TongChi
            FROM PhieuChi pc
            ${chiWhere}
            GROUP BY CAST(pc.NgayLap AS DATE)
        `, chiParams);

        dailyChart = fillDaily(
            thuDailyR.recordset.map(r => ({ Ngay: r.Ngay, tongThu: r.TongThu })),
            fromDate, toDate, 'Ngay', ['tongThu']
        );
        const chiMap = new Map();
        chiDailyR.recordset.forEach(r => {
            const key = new Date(r.Ngay).toISOString().slice(0, 10);
            chiMap.set(key, Number(r.TongChi) || 0);
        });
        dailyChart = dailyChart.map(d => ({
            ...d,
            tongChi: chiMap.get(d.ngay) || 0,
        }));
    }

    // Tính số liệu cuối
    const tongChiPC = Number(chi.TongChi) || 0;
    const tongTienNhap = Number(nhapR.recordset[0]?.TongTienNhap) || 0;
    const doanhThu = Number(thu.TongDoanhThu) || 0;
    const tongThuPhieu = Number(phieuThuR.recordset[0]?.TongThu) || 0;
    const giaVonDaBan = Number(giaVonR.recordset[0]?.GiaVonDaBan) || 0;
    const summary = calculateFinanceSummary({
        doanhThu,
        tongThu: tongThuPhieu,
        tongChiPhieuChi: tongChiPC,
        giaVonDaBan,
        giaTriNhapHang: tongTienNhap,
    });
    const { tongThu, tongChi, loiNhuanBanHang, soDuTienMat } = summary;

    // ===== So sánh với kỳ trước =====
    let soSanhKyTruoc = null;
    if (fromDate && toDate) {
        const previous = previousDateRange(fromDate, toDate);
        const prevFromStr = previous.fromDate;
        const prevToStr = previous.toDate;
        const prevParams = { prevFrom: prevFromStr, prevTo: prevToStr };

        const [prevThuR, prevChiR, prevNhapR, prevPhieuThuR, prevGiaVonR] = await Promise.all([
            db.query(`
                SELECT
                    ISNULL(SUM(hd.TongTien), 0) AS DoanhThu
                FROM HoaDon hd
                WHERE hd.TrangThai = N'DaThanhToan'
                  AND CAST(hd.NgayGioLap AS DATE) >= @prevFrom
                  AND CAST(hd.NgayGioLap AS DATE) <= @prevTo
            `, prevParams),
            db.query(`
                SELECT ISNULL(SUM(pc.SoTien), 0) AS TongChiPC
                FROM PhieuChi pc
                WHERE CAST(pc.NgayLap AS DATE) >= @prevFrom
                  AND CAST(pc.NgayLap AS DATE) <= @prevTo
            `, prevParams),
            db.query(`
                SELECT ISNULL(SUM(l.SoLuongNhap * l.GiaNhap), 0) AS TongTienNhap
                FROM PhieuNhap pn
                INNER JOIN LoThuoc_ChiTietNhap l ON l.MaPN = pn.MaPN
                WHERE pn.TrangThai = N'DaNhap'
                  AND CAST(pn.NgayNhap AS DATE) >= @prevFrom
                  AND CAST(pn.NgayNhap AS DATE) <= @prevTo
            `, prevParams),
            db.query(`
                SELECT ISNULL(SUM(pt.SoTien), 0) AS TongThu
                FROM PhieuThu pt
                LEFT JOIN HoaDon hd ON hd.MaHD = pt.MaHD
                WHERE (pt.MaHD IS NULL OR hd.TrangThai = N'DaThanhToan')
                  AND CAST(pt.NgayLap AS DATE) >= @prevFrom
                  AND CAST(pt.NgayLap AS DATE) <= @prevTo
            `, prevParams),
            db.query(`
                SELECT ISNULL(SUM(ct.SoLuongBan * l.GiaNhap), 0) AS GiaVonDaBan
                FROM ChiTietHoaDon ct
                INNER JOIN HoaDon hd ON ct.MaHD = hd.MaHD
                INNER JOIN LoThuoc_ChiTietNhap l ON ct.MaLo = l.MaLo
                WHERE hd.TrangThai = N'DaThanhToan'
                  AND CAST(hd.NgayGioLap AS DATE) >= @prevFrom
                  AND CAST(hd.NgayGioLap AS DATE) <= @prevTo
            `, prevParams),
        ]);

        const prev = {
            doanhThu: Number(prevThuR.recordset[0]?.DoanhThu) || 0,
            tongThu: Number(prevPhieuThuR.recordset[0]?.TongThu) || 0,
            tongChiPC: Number(prevChiR.recordset[0]?.TongChiPC) || 0,
            tongTienNhap: Number(prevNhapR.recordset[0]?.TongTienNhap) || 0,
            giaVonDaBan: Number(prevGiaVonR.recordset[0]?.GiaVonDaBan) || 0,
        };
        const prevSummary = calculateFinanceSummary({
            doanhThu: prev.doanhThu,
            tongThu: prev.tongThu,
            tongChiPhieuChi: prev.tongChiPC,
            giaVonDaBan: prev.giaVonDaBan,
            giaTriNhapHang: prev.tongTienNhap,
        });

        const calcDelta = (a, b) => {
            if (b === 0) return a > 0 ? 100 : 0;
            return Math.round(((a - b) / b) * 100);
        };

        soSanhKyTruoc = {
            kyTruoc: { fromDate: prevFromStr, toDate: prevToStr },
            tongThu: calcDelta(tongThu, prevSummary.tongThu),
            tongChi: calcDelta(tongChi, prevSummary.tongChi),
            doanhThu: calcDelta(doanhThu, prev.doanhThu),
            loiNhuanBanHang: calcDelta(loiNhuanBanHang, prevSummary.loiNhuanBanHang),
            soDuTienMat: calcDelta(soDuTienMat, prevSummary.soDuTienMat),
        };
    }

    return {
        tongQuan: {
            tongThu,
            tongChi,
            tongChiPhieuChi: tongChiPC,
            tongChiNhapHang: tongTienNhap,
            doanhThu,
            giaVonDaBan,
            loiNhuanBanHang,
            soDuTienMat,
            soHoaDon: Number(thu.SoHoaDon) || 0,
            soPhieuThu: Number(phieuThuR.recordset[0]?.SoPhieuThu) || 0,
            soPhieuChi: Number(chi.SoPhieuChi) || 0,
            soPhieuNhap: Number(nhapR.recordset[0]?.SoPhieuNhap) || 0,
        },
        chiTheoNoiDung: chiByNoiDungR.recordset.map(r => ({
            noiDung: r.NoiDung,
            tongTien: Number(r.TongTien) || 0,
            soLan: Number(r.SoLan) || 0,
        })),
        dailyChart, // [{ngay, tongThu, tongChi}] - chỉ có khi truyền fromDate/toDate
        khoangThoiGian: { fromDate: fromDate || null, toDate: toDate || null },
        soSanhKyTruoc,
    };
}

module.exports = {
    thongKeKho,
    thongKeHoaDon,
    thongKeHoaDonList,
    thongKeTaiChinh,
};
