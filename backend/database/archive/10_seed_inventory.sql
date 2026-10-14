-- ============================================================
-- PATCH 10: Seed dữ liệu tồn kho (LoThuoc_ChiTietNhap + PhieuNhap)
-- ============================================================
-- Vấn đề: Thuoc đã có nhưng không có LoThuoc_ChiTietNhap
-- → SoLuongTonKho = 0 → toàn bộ thuốc hiển thị "Hết hàng"
--
-- Giải pháp: Tạo các PhieuNhap (TrangThai=DaNhap) + LoThuoc_ChiTietNhap
-- để có dữ liệu tồn kho thực tế trong hệ thống.
--
-- Lưu ý:
--  - Script dùng IDENTITY_INSERT để đảm bảo MaPN cố định (dễ reference)
--  - HSD cố định hard-coded (không dùng GETDATE() để tránh drift)
--  - NgaySX = ngày sản xuất (NOT NULL), HSD - NgaySX = shelf life (365 ngày)
--  - Một số lô set HSD ngắn (19-29 ngày) để test UI "Sắp hết hạn"
--  - Idempotent: IF NOT EXISTS để chạy lại không lỗi
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- Không dùng GETDATE() cho HSD — hard-coded để đảm bảo stability
-- Mỗi MaThuoc có 1-2 lô với số lượng và HSD khác nhau.

-- ============================================================
-- 1. Seed NhaCungCap (nếu chưa có)
-- ============================================================
IF NOT EXISTS (SELECT TOP 1 * FROM NhaCungCap)
BEGIN
    INSERT INTO NhaCungCap (TenNCC, DiaChi, SDT) VALUES
    (N'Pharma Connect VN', N'123 Đường D1, Q.Tân Bình, TP.HCM', '02812345678'),
    (N'Mediphar JSC', N'456 Đường D2, Q.3, TP.HCM', '02823456789'),
    (N'Nam Phú Hòa Pharma', N'789 Đường D3, Q.Bình Thạnh, TP.HCM', '02834567890');
    PRINT 'Seeded NhaCungCap';
END
GO

-- ============================================================
-- 2. Seed PhieuNhap (idempotent - chỉ insert nếu chưa có)
-- ============================================================
SET IDENTITY_INSERT PhieuNhap ON;

IF NOT EXISTS (SELECT TOP 1 * FROM PhieuNhap)
BEGIN
    INSERT INTO PhieuNhap (MaPN, MaNCC, MaNV, NgayNhap, TongTien, TrangThai) VALUES
    (1, 1, 1, DATEADD(day, -60, GETDATE()), 5000000, N'DaNhap'),   -- 60 ngày trước
    (2, 2, 1, DATEADD(day, -30, GETDATE()), 3000000, N'DaNhap'),   -- 30 ngày trước
    (3, 1, 1, DATEADD(day, -15, GETDATE()), 4500000, N'DaNhap'),   -- 15 ngày trước
    (4, 3, 1, DATEADD(day, -5, GETDATE()), 2500000, N'DaNhap');    -- 5 ngày trước
    PRINT 'Seeded PhieuNhap';
END

SET IDENTITY_INSERT PhieuNhap OFF;
GO

-- ============================================================
-- 3. Seed LoThuoc_ChiTietNhap (idempotent)
-- ============================================================
-- Mỗi MaThuoc có 1-2 lô với số lượng và HSD khác nhau.
-- Số lượng đủ để hiển thị còn hàng / sắp hết / hết hàng
-- theo đúng nghiệp vụ.

IF NOT EXISTS (SELECT TOP 1 * FROM LoThuoc_ChiTietNhap)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD)
    VALUES
    -- Thuốc còn hàng nhiều (>10) — HSD > 90 ngày
    -- NgaySX = 2025-09-16 → shelf life 365-486 ngày

    (1,  1, 200, 200, 15000, '2025-09-16', '2026-09-16'),  -- Paracetamol: còn nhiều
    (2,  1, 150, 150, 28000, '2025-09-16', '2026-09-16'),  -- Amoxicillin
    (3,  1, 100, 100, 22000, '2025-09-16', '2026-09-16'),  -- Ibuprofen
    (4,  2,  80,  80, 35000, '2025-09-16', '2026-09-16'),  -- Vitamin C
    (5,  2,  60,  60, 42000, '2025-09-16', '2026-09-16'),  -- Omeprazole
    (6,  3,  50,  50, 55000, '2025-09-16', '2026-09-16'),  -- Metformin
    (7,  3,  40,  40, 14000, '2025-09-16', '2026-09-16'),  -- Loperamide
    (8,  1,  35,  35, 20000, '2025-09-16', '2026-09-16'),  -- Loratadine
    (9,  2,  30,  30, 18000, '2025-09-16', '2026-09-16'),  -- Cetirizine
    (10, 3,  25,  25, 48000, '2025-09-16', '2026-09-16'),  -- Vitamin B-Complex
    (11, 1,  20,  20, 75000, '2025-09-16', '2026-09-16'),  -- Canxi+D3

    -- Thuốc sắp hết (1-10)
    -- HSD ngắn: NgaySX đẩy xa để HSD gần
    (12, 2,  10,   8,  8000, '2025-10-05', '2026-10-05'),  -- Nước muối: 19 ngày
    (13, 3,   8,   6, 18000, '2025-10-08', '2026-10-08'),  -- Xylometazolin: 22 ngày
    (14, 1,  12,   9, 22000, '2025-10-12', '2026-10-12'),  -- Chloramphenicol: 26 ngày
    (15, 2,   5,   3, 25000, '2025-10-15', '2026-10-15'),  -- Mucostar: 29 ngày

    -- Thuốc còn hàng ít (>10 nhưng <50) - một số
    (16, 3,  15,  15, 60000, '2025-09-16', '2026-09-16'),  -- Ginkgo Biloba
    (17, 1,  18,  18, 115000, '2025-09-16', '2026-09-16'), -- Ostorheum
    (18, 2,  22,  22, 105000, '2025-09-16', '2026-09-16'), -- Berocca
    (19, 3,  14,  14, 24000, '2025-09-16', '2026-09-16'),  -- Efferalgan
    (20, 1,   6,   4, 52000, '2025-09-16', '2026-09-16'),  -- Enterogermina

    -- Lô 2 cho thuốc phổ biến (test FIFO)
    -- Lô ngắn HSD để test cảnh báo
    (1,  3,  50,  50, 15500, '2025-10-31', '2026-10-31'),  -- Paracetamol lô 2: 45 ngày
    (19, 4,  30,  30, 24500, '2025-09-16', '2026-09-16'),  -- Efferalgan lô 2: còn HSD tốt
    (4,  4,  20,  20, 36000, '2025-09-16', '2026-09-16'); -- Vitamin C lô 2: còn HSD tốt

    PRINT 'Seeded LoThuoc_ChiTietNhap';
END
GO

-- ============================================================
-- 4. Verify: xem kết quả
-- ============================================================
PRINT '';
PRINT '╔═══════════════════════════════════════════════════════════╗';
PRINT '║              INVENTORY SEED VERIFICATION                   ║';
PRINT '╠═══════════════════════════════════════════════════════════╣';
PRINT '║  Bảng: Thuoc             = ' + CAST((SELECT COUNT(*) FROM Thuoc) AS VARCHAR) + ' dòng              ║';
PRINT '║  Bảng: PhieuNhap         = ' + CAST((SELECT COUNT(*) FROM PhieuNhap) AS VARCHAR) + ' dòng               ║';
PRINT '║  Bảng: LoThuoc_ChiTietNhap = ' + CAST((SELECT COUNT(*) FROM LoThuoc_ChiTietNhap) AS VARCHAR) + ' dòng          ║';
PRINT '╠═══════════════════════════════════════════════════════════╣';
PRINT '║  SoLuongTonKho summary per thuốc:                         ║';

SELECT TOP 5
    t.MaThuoc,
    t.TenThuoc,
    ISNULL(SUM(l.SoLuongTonKho), 0) AS TonKho
FROM Thuoc t
LEFT JOIN LoThuoc_ChiTietNhap l ON t.MaThuoc = l.MaThuoc
LEFT JOIN PhieuNhap pn ON l.MaPN = pn.MaPN
WHERE pn.TrangThai = N'DaNhap'
GROUP BY t.MaThuoc, t.TenThuoc
ORDER BY t.MaThuoc;

PRINT '╚═══════════════════════════════════════════════════════════╝';
GO
