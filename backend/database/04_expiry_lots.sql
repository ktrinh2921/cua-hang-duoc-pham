-- ============================================================
-- 04_expiry_lots.sql — Lô sắp hết HSD (test UI cảnh báo)
-- ============================================================
-- Mục đích: Seed các lô ở nhiều mức HSD để test đầy đủ UI:
--   - Khẩn cấp (≤7 ngày)
--   - Sắp hết hạn (8-30 ngày)
--   - Cảnh báo (31-90 ngày)
--
-- Thứ tự chạy: SAU 03_inventory.sql (MaPN đã có),
--               TRƯỚC 06_sales.sql (MaLo FK).
--
-- Gộp từ: 12_patch_expiry_lots.sql (đã fix FK dynamic).
--
-- HSD hard-coded (ref date 2026-09-17).
-- MaPN dùng TOP 1 đầu tiên — không hardcode.
-- Idempotent: IF NOT EXISTS theo (MaThuoc, HanSD) để cho phép nhiều lô
-- cùng thuốc ở các HSD khác nhau (03_inventory.sql đã có 1 lô đầu).
--
-- LƯU Ý QUAN TRỌNG:
--   Biến DECLARE chỉ tồn tại trong 1 batch (trước/sau GO).
--   Mỗi INSERT đều phải DECLARE @PN ở đầu batch đó.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. LÔ KHẨN CẤP (≤7 ngày): MaThuoc=20 (Enterogermina) HSD 2026-09-20
-- ============================================================
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), -1);
IF @PN = -1
BEGIN
    SET IDENTITY_INSERT PhieuNhap ON;
    INSERT INTO PhieuNhap (MaPN, MaNCC, MaNV, NgayNhap, TrangThai)
        VALUES (1, 1, 1, GETDATE(), N'DaNhap');
    SET IDENTITY_INSERT PhieuNhap OFF;
    SET @PN = 1;
    PRINT '[04] Tạo tạm PhieuNhap=1 vì bảng rỗng (FK fallback)';
END

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 20 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-09-20'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (20, @PN, 10, 10, 75000, '2025-09-20', '2026-09-20');
    PRINT '[04] Enterogermina lô 4 ngày (Khẩn cấp)';
END
GO

-- ============================================================
-- 2. LÔ SẮP HẾT HẠN (8-30 ngày)
-- ============================================================
-- MaThuoc=15 (Mucostar): 19 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 15 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-05'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (15, @PN, 8, 8, 22000, '2025-10-05', '2026-10-05');
    PRINT '[04] Mucostar lô 19 ngày';
END
GO

-- MaThuoc=13 (Xylometazolin): 22 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 13 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-08'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (13, @PN, 6, 6, 16000, '2025-10-08', '2026-10-08');
    PRINT '[04] Xylometazolin lô 22 ngày';
END
GO

-- MaThuoc=14 (Chloramphenicol): 26 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 14 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-12'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (14, @PN, 9, 9, 20000, '2025-10-12', '2026-10-12');
    PRINT '[04] Chloramphenicol lô 26 ngày';
END
GO

-- MaThuoc=12 (Nước muối): 29 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 12 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-10-15'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (12, @PN, 12, 12, 8000, '2025-10-15', '2026-10-15');
    PRINT '[04] Nước muối lô 29 ngày';
END
GO

-- ============================================================
-- 3. LÔ CẢNH BÁO (31-90 ngày)
-- ============================================================
-- MaThuoc=18 (Berocca): 60 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 18 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-11-15'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (18, @PN, 22, 22, 145000, '2025-11-15', '2026-11-15');
    PRINT '[04] Berocca lô 60 ngày';
END
GO

-- MaThuoc=16 (Ginkgo Biloba): 65 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 16 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-11-20'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (16, @PN, 15, 15, 85000, '2025-11-20', '2026-11-20');
    PRINT '[04] Ginkgo Biloba lô 65 ngày';
END
GO

-- MaThuoc=17 (Ostorheum): 76 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE l.MaThuoc = 17 AND pn.TrangThai = N'DaNhap' AND l.HanSD = '2026-12-01'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (17, @PN, 18, 18, 160000, '2025-12-01', '2026-12-01');
    PRINT '[04] Ostorheum lô 76 ngày';
END
GO

-- MaThuoc=1 (Paracetamol) lô 2 cảnh báo: 45 ngày
DECLARE @PN INT = ISNULL((SELECT TOP 1 MaPN FROM PhieuNhap ORDER BY MaPN), 1);

IF NOT EXISTS (
    SELECT 1 FROM LoThuoc_ChiTietNhap l WHERE l.MaThuoc = 1 AND l.HanSD = '2026-10-31'
)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES (1, @PN, 12, 12, 15500, '2025-10-31', '2026-10-31');
    PRINT '[04] Paracetamol lô 45 ngày';
END
GO

-- ============================================================
-- 4. Verify (dùng biến trung gian để tránh subquery trong CAST)
-- ============================================================
DECLARE @TotalLo INT = (SELECT COUNT(*) FROM LoThuoc_ChiTietNhap);
DECLARE @SapHetHan INT = (
    SELECT COUNT(*)
    FROM LoThuoc_ChiTietNhap l
    INNER JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
    WHERE pn.TrangThai = N'DaNhap' AND l.HanSD <= DATEADD(DAY, 30, '2026-09-17')
);

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║            04_expiry_lots.sql — VERIFICATION                  ║';
PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║   Tổng lô trong DB: ' + CAST(@TotalLo AS VARCHAR) + ' dòng';
PRINT '║   Lô sắp hết HSD (≤30 ngày): ' + CAST(@SapHetHan AS VARCHAR) + ' dòng';
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO
