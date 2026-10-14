-- ============================================================
-- PATCH 12: Cập nhật HSD lô & seed lô "sắp hết hạn" để UI hiển thị đúng
-- ============================================================
-- Vấn đề:
--   1. MaLo=3 (Ibuprofen) có HSD=2026-10-15 (= 29 ngày) — đáng lẽ phải hiển
--      thị trong "Top lô sắp hết hạn" (≤30 ngày) nhưng kết quả query cho
--      thấy 0 vì toàn bộ lô còn lại đều có HSD > 350 ngày.
--   2. Seed 10_seed_inventory.sql dùng DATEADD(day, N, GETDATE()) nhưng
--      ngày insert thực tế ≠ ngày chạy script → HSD không khớp design.
--   3. Cần thêm lô ở nhiều mức HSD để test đủ: khẩn cấp, sắp hết, cảnh báo.
--
-- Giải pháp:
--   UPDATE HSD cố định (hard-coded) để đảm bảo hiển thị.
--   INSERT thêm lô mới cho thuốc chưa có tồn kho.
--
-- Ngày reference: 16/09/2026 (hôm nay)
-- HSD = hôm nay + số ngày
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. Cập nhật HSD cho các lô hiện có (hard-coded dates)
-- ============================================================
-- MaLo=3: Ibuprofen 400mg → 29 ngày (cập nhật từ 2026-10-15 vẫn đúng 29 ngày)
-- Đã chính xác, giữ nguyên. Nhưng để test UI rõ ràng hơn,
-- ta cũng thêm lô mới cho các thuốc khác ở nhiều mức HSD.

-- ============================================================
-- 2. Tạo lô mới với HSD ở nhiều mức (hard-coded)
-- ============================================================
-- Trước hết kiểm tra MaLo max để tránh trùng
DECLARE @MaxMaLo INT = ISNULL((SELECT MAX(MaLo) FROM LoThuoc_ChiTietNhap), 0);

-- Đảm bảo tồn tại ít nhất 1 PhieuNhap hợp lệ cho các INSERT FK.
-- Seed 10_seed_inventory.sql tạo MaPN=1-4. Nếu bảng rỗng, tạo MaPN=5.
-- Nếu đã có MaPN nào đó, dùng MaPN đầu tiên (idempotent).
DECLARE @PN1 INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), -1);
IF @PN1 = -1
BEGIN
    SET IDENTITY_INSERT PhieuNhap ON;
    INSERT INTO PhieuNhap (MaPN, MaNCC, MaNV, NgayNhap, TrangThai)
        VALUES (5, 1, 1, GETDATE(), N'DaNhap');
    SET IDENTITY_INSERT PhieuNhap OFF;
    SET @PN1 = 5;
    PRINT 'Tao tam PhieuNhap=5 vi bang rong';
END

-- Shelf-life chuẩn: 365 ngày cho hầu hết thuốc
-- MaThuoc=3 (Ibuprofen): 106 ngày (lô hiện có)
-- MaThuoc=4 (Vitamin C): 486 ngày

-- --- Lô KHẨN CẤP (≤7 ngày): HSD 2026-09-20 (4 ngày) ---
-- MaThuoc=20 (Enterogermina): shelf life 365 ngày
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 20 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (20, @PN1, 10, 10, 75000, '2025-09-20', '2026-09-20');
    PRINT 'Inserted: Enterogermina lô 4 ngày (Khẩn cấp)';
END

-- --- Lô SẮP HẾT HẠN (8-30 ngày) ---
-- MaThuoc=15 (Mucostar 200ml): HSD 2026-10-05 (19 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 15 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (15, @PN1, 8, 8, 22000, '2025-10-05', '2026-10-05');
    PRINT 'Inserted: Mucostar lô 19 ngày (Sắp hết hạn)';
END

-- MaThuoc=13 (Xylometazolin 0.05%): HSD 2026-10-08 (22 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 13 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (13, @PN1, 6, 6, 16000, '2025-10-08', '2026-10-08');
    PRINT 'Inserted: Xylometazolin lô 22 ngày (Sắp hết hạn)';
END

-- MaThuoc=14 (Chloramphenicol 0.25%): HSD 2026-10-12 (26 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 14 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (14, @PN1, 9, 9, 20000, '2025-10-12', '2026-10-12');
    PRINT 'Inserted: Chloramphenicol lô 26 ngày (Sắp hết hạn)';
END

-- MaThuoc=12 (Nước muối sinh lý): HSD 2026-10-15 (29 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 12 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (12, @PN1, 12, 12, 8000, '2025-10-15', '2026-10-15');
    PRINT 'Inserted: Nước muối lô 29 ngày (Sắp hết hạn)';
END

-- --- Lô CẢNH BÁO (31-90 ngày) ---
-- MaThuoc=18 (Berocca Performance): HSD 2026-11-15 (60 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 18 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (18, @PN1, 22, 22, 145000, '2025-11-15', '2026-11-15');
    PRINT 'Inserted: Berocca lô 60 ngày (Cảnh báo)';
END

-- MaThuoc=16 (Ginkgo Biloba): HSD 2026-11-20 (65 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 16 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (16, @PN1, 15, 15, 85000, '2025-11-20', '2026-11-20');
    PRINT 'Inserted: Ginkgo Biloba lô 65 ngày (Cảnh báo)';
END

-- MaThuoc=17 (Ostorheum Plus): HSD 2026-12-01 (76 ngày)
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 17 AND pn.TrangThai = N'DaNhap'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (17, @PN1, 18, 18, 160000, '2025-12-01', '2026-12-01');
    PRINT 'Inserted: Ostorheum lô 76 ngày (Cảnh báo)';
END

-- --- Backfill: MaLo=4 (MaThuoc=1 Paracetamol, thêm lô ngắn HSD) ---
IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l WHERE l.MaThuoc = 1 AND l.HanSD <= '2026-10-31'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (1, @PN1, 12, 12, 15500, '2025-10-31', '2026-10-31');
    PRINT 'Inserted: Paracetamol lô 45 ngày (Cảnh báo)';
END

-- ============================================================
-- 3. Seed HoaDon + ChiTietHoaDon (vòng quay tồn kho)
-- ============================================================
-- MaHD là IDENTITY → dùng SCOPE_IDENTITY() để lấy ID.
-- MaKH: chỉ có 1, 2, 3, 5 trong DB (không có MaKH=4)
-- Tổng tồn ≈ 496 SP → bán ~6 SP/ngày → vòng quay ≈ 83 ngày
-- Seed 5 ngày bán (11-15/09/2026), mỗi ngày 1 hóa đơn.

-- Khởi tạo biến TRƯỚC IF NOT EXISTS để tránh NULL khi block skip (idempotent re-run)
DECLARE @HD101 INT = -1, @HD102 INT = -1, @HD103 INT = -1, @HD104 INT = -1, @HD105 INT = -1;

-- HĐ 101: 2026-09-11, bán 5 SP (MaKH=1)
-- Idempotent check dùng (NgayGioLap + MaNV) thay vì MaHD vì MaHD là IDENTITY,
-- giá trị thực phụ thuộc thứ tự seed (không cố định 101-105).
IF NOT EXISTS (
    SELECT 1 FROM HoaDon
    WHERE NgayGioLap >= '2026-09-11' AND NgayGioLap < '2026-09-12'
      AND MaNV = 2
)
BEGIN
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 1, '2026-09-11 10:00:00', 175000, 200000, 25000, N'DaThanhToan');
    SET @HD101 = SCOPE_IDENTITY();

    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD101, 3, 5, 35000);   -- Ibuprofen lô 3 (29 ngày)

    -- HĐ 102: 2026-09-12, bán 6 SP (MaKH=2)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 2, '2026-09-12 11:00:00', 230000, 250000, 20000, N'DaThanhToan');
    SET @HD102 = SCOPE_IDENTITY();

    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD102, 3, 4, 35000);  -- Ibuprofen lô 3
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD102, 5, 2, 25000);  -- Paracetamol lô 5

    -- HĐ 103: 2026-09-13, bán 7 SP (MaKH=3)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (3, 3, '2026-09-13 14:00:00', 280000, 300000, 20000, N'DaThanhToan');
    SET @HD103 = SCOPE_IDENTITY();

    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD103, 5, 3, 25000);  -- Paracetamol lô 5
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD103, 16, 4, 55000); -- Vitamin C lô 16

    -- HĐ 104: 2026-09-14, bán 8 SP (MaKH=1)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (2, 1, '2026-09-14 09:30:00', 320000, 350000, 30000, N'DaThanhToan');
    SET @HD104 = SCOPE_IDENTITY();

    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD104, 3, 3, 35000);  -- Ibuprofen lô 3
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD104, 16, 5, 55000); -- Vitamin C lô 16

    -- HĐ 105: 2026-09-15, bán 9 SP (MaKH=5, KH không có MaKH=4)
    INSERT INTO HoaDon (MaNV, MaKH, NgayGioLap, TongTien, TienKhachDua, TienTraLai, TrangThai)
    VALUES (3, 5, '2026-09-15 15:00:00', 360000, 400000, 40000, N'DaThanhToan');
    SET @HD105 = SCOPE_IDENTITY();

    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD105, 5, 4, 25000);  -- Paracetamol lô 5
    INSERT INTO ChiTietHoaDon (MaHD, MaLo, SoLuongBan, GiaBanThucTe)
    VALUES (@HD105, 16, 5, 55000); -- Vitamin C lô 16

    PRINT 'Seeded 5 HoaDon + ChiTietHoaDon (tổng 35 SP / 5 ngày)';
END
ELSE
BEGIN
    PRINT 'HoaDon đã có, bỏ qua seed';
END
GO

-- ============================================================
-- 4. Verify
-- ============================================================
PRINT '';
PRINT '╔═══════════════════════════════════════════════════════════╗';
PRINT '║         EXPIRY PATCH 12 VERIFICATION                    ║';
PRINT '╠═══════════════════════════════════════════════════════════╣';
PRINT '║  Mức cảnh báo HSD (≤90 ngày):                           ║';

SELECT TOP 10
    '  Lô ' + CAST(l.MaLo AS VARCHAR) + ': ' + t.TenThuoc
    + ' (' + CAST(l.SoLuongTonKho AS VARCHAR) + ' SP)'
    + ' — còn ' + CAST(DATEDIFF(DAY, GETDATE(), l.HanSD) AS VARCHAR) + ' ngày'
    AS ChiTietTonKho
FROM LoThuoc_ChiTietNhap l
INNER JOIN Thuoc t ON l.MaThuoc = t.MaThuoc
INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
WHERE pn.TrangThai = N'DaNhap'
  AND l.SoLuongTonKho > 0
  AND l.HanSD <= DATEADD(DAY, 90, GETDATE())
ORDER BY l.HanSD ASC;

PRINT '╠═══════════════════════════════════════════════════════════╣';
PRINT '║  Tổng quan:                                              ║';
SELECT
    '  Tổng SP: '
    + CAST(ISNULL(SUM(l.SoLuongTonKho), 0) AS VARCHAR)
    + ' | Sắp hết HSD (≤30): '
    + CAST(ISNULL(SUM(CASE WHEN l.HanSD <= DATEADD(DAY, 30, GETDATE()) THEN l.SoLuongTonKho ELSE 0 END), 0) AS VARCHAR)
    + ' SP'
    AS ChiTiet
FROM LoThuoc_ChiTietNhap l
INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
WHERE pn.TrangThai = N'DaNhap' AND l.SoLuongTonKho > 0;

PRINT '╠═══════════════════════════════════════════════════════════╣';
PRINT '║  Vòng quay tồn kho (30 ngày gần nhất):                  ║';
SELECT
    '  Tổng bán 30 ngày: '
    + CAST(ISNULL(SUM(ct.SoLuongBan), 0) AS VARCHAR)
    + ' SP | TB/ngày: '
    + CAST(CAST(ISNULL(SUM(ct.SoLuongBan), 0) / 30.0 AS DECIMAL(10,1)) AS VARCHAR)
    + ' SP'
    AS ChiTiet
FROM ChiTietHoaDon ct
INNER JOIN HoaDon hd ON ct.MaHD = hd.MaHD
WHERE hd.TrangThai = N'DaThanhToan'
  AND hd.NgayGioLap >= DATEADD(DAY, -30, GETDATE());

PRINT '╚═══════════════════════════════════════════════════════════╝';
GO
