-- ============================================================
-- 03_inventory.sql — Tồn kho + Phiếu nhập
-- ============================================================
-- Mục đích: Seed toàn bộ dữ liệu tồn kho thực tế để:
--   - UI kho hiển thị đúng số lượng (không "Hết hàng")
--   - Test UI Sắp hết HSD / Cảnh báo HSD
--   - Có dữ liệu để bán hàng trừ tồn
--
-- Thứ tự chạy: SAU 99_schema_patches.sql (FK constraints đã có),
--               TRƯỚC 04_expiry_lots.sql (FK MaPN),
--               TRƯỚC 06_sales.sql (FK MaLo).
--
-- Gộp từ: 10_seed_inventory.sql + phần lô từ 12_patch_expiry_lots.sql
--
-- HSD hard-coded (không dùng GETDATE()) để giữ nguyên kết quả giữa các lần chạy.
-- Idempotent: dùng IF NOT EXISTS.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. Phiếu nhập gốc (4 phiếu, idempotent)
-- ============================================================
SET IDENTITY_INSERT PhieuNhap ON;

IF NOT EXISTS (SELECT TOP 1 * FROM PhieuNhap)
BEGIN
    INSERT INTO PhieuNhap (MaPN, MaNCC, MaNV, NgayNhap, TrangThai) VALUES
    (1, 1, 1, '2026-07-19', N'DaNhap'),   -- 60 ngày trước ref 17/09
    (2, 2, 1, '2026-08-18', N'DaNhap'),   -- 30 ngày trước
    (3, 1, 1, '2026-09-02', N'DaNhap'),   -- 15 ngày trước
    (4, 3, 1, '2026-09-12', N'DaNhap');   -- 5 ngày trước
    PRINT '[03] Seeded 4 PhieuNhap (MaPN 1-4)';
END

SET IDENTITY_INSERT PhieuNhap OFF;
GO

-- ============================================================
-- 2. Lô thuốc ban đầu — 20 thuốc đầu tiên (MaThuoc 1-20)
-- ============================================================
-- Phân bổ:
--   - Thuốc còn nhiều (>10): MaThuoc 1-11
--   - Thuốc sắp hết (1-10):  MaThuoc 12-15
--   - Thuốc còn ít (10-50):  MaThuoc 16-20
--   - Lô 2 cho test FIFO:    MaThuoc 1, 4, 19

IF NOT EXISTS (SELECT TOP 1 * FROM LoThuoc_ChiTietNhap WHERE MaThuoc BETWEEN 1 AND 20)
BEGIN
    INSERT INTO LoThuoc_ChiTietNhap (MaThuoc, MaPN, SoLuongNhap, SoLuongTonKho, GiaNhap, NgaySX, HanSD) VALUES
    -- Còn nhiều (>10) — HSD xa (>365 ngày)
    (1,  1, 200, 200, 15000, '2025-09-16', '2026-09-16'),  -- Paracetamol
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

    -- Sắp hết (1-10) — HSD ngắn (19-29 ngày)
    (12, 2,  10,   8,  8000, '2025-10-05', '2026-10-05'),  -- Nước muối: 19 ngày
    (13, 3,   8,   6, 18000, '2025-10-08', '2026-10-08'),  -- Xylometazolin: 22 ngày
    (14, 1,  12,   9, 22000, '2025-10-12', '2026-10-12'),  -- Chloramphenicol: 26 ngày
    (15, 2,   5,   3, 25000, '2025-10-15', '2026-10-15'),  -- Mucostar: 29 ngày

    -- Còn ít (10-50) — HSD tốt
    (16, 3,  15,  15, 60000, '2025-09-16', '2026-09-16'),  -- Ginkgo Biloba
    (17, 1,  18,  18, 115000,'2025-09-16', '2026-09-16'),  -- Ostorheum
    (18, 2,  22,  22, 105000,'2025-09-16', '2026-09-16'),  -- Berocca
    (19, 3,  14,  14, 24000, '2025-09-16', '2026-09-16'),  -- Efferalgan
    (20, 1,   6,   4, 52000, '2025-09-16', '2026-09-16'),  -- Enterogermina

    -- Lô 2 (FIFO test) — một số lô ngắn HSD
    (1,  3,  50,  50, 15500, '2025-10-31', '2026-10-31'),  -- Paracetamol lô 2: 45 ngày
    (19, 4,  30,  30, 24500, '2025-09-16', '2026-09-16'),  -- Efferalgan lô 2
    (4,  4,  20,  20, 36000, '2025-09-16', '2026-09-16');  -- Vitamin C lô 2

    PRINT '[03] Seeded 23 LoThuoc_ChiTietNhap (MaThuoc 1-20 + 3 lô 2)';
END
GO

-- ============================================================
-- 3. Phiếu nhập bổ sung (MaPN 5-15) cho seed đẹp ở file sau
-- ============================================================
-- Nếu bảng PhieuNhap rỗng → tạo MaPN=5 rỗng làm fallback FK.
-- Ngược lại dùng MaPN=1 (cũ nhất) cho lô sắp hết HSD.
SET IDENTITY_INSERT PhieuNhap ON;

IF NOT EXISTS (
    SELECT 1 FROM PhieuNhap WHERE MaPN BETWEEN 5 AND 15
)
BEGIN
    DECLARE @NgayNhap DATE = '2026-09-17';

    INSERT INTO PhieuNhap (MaPN, MaNCC, MaNV, NgayNhap, TrangThai) VALUES
    (5,  1, 1, @NgayNhap, N'DaNhap'),  -- Da liễu + khử trùng
    (6,  2, 1, @NgayNhap, N'DaNhap'),  -- Kháng sinh
    (7,  3, 1, @NgayNhap, N'DaNhap'),  -- Giảm đau + tiêu hóa
    (8,  4, 1, @NgayNhap, N'DaNhap'),  -- Vitamin + hô hấp
    (9,  5, 1, @NgayNhap, N'DaNhap'),  -- Thuốc nhỏ mắt
    (10, 1, 1, @NgayNhap, N'DaNhap'),  -- Berberin
    (11, 2, 1, @NgayNhap, N'DaNhap'),  -- Da liễu (lô 2)
    (12, 3, 1, @NgayNhap, N'DaNhap'),  -- Tim mạch (lô 2)
    (13, 1, 1, @NgayNhap, N'DaNhap'),  -- Lô lớn NCC Imexpharm (ghi nhận công nợ)
    (14, 2, 1, @NgayNhap, N'DaNhap'),  -- Lô lớn NCC Hà Nội
    (15, 3, 1, @NgayNhap, N'DaNhap');  -- Lô lớn NCC Đà Nẵng

    PRINT '[03] Seeded 11 PhieuNhap bổ sung (MaPN 5-15)';
END

SET IDENTITY_INSERT PhieuNhap OFF;
GO

-- ============================================================
-- 4. Verify (dùng biến trung gian tránh subquery trong CAST)
-- ============================================================
DECLARE @TotalPN INT = (SELECT COUNT(*) FROM PhieuNhap);
DECLARE @TotalLo INT = (SELECT COUNT(*) FROM LoThuoc_ChiTietNhap);

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║               03_inventory.sql — VERIFICATION                  ║';
PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║   PhieuNhap: ' + CAST(@TotalPN AS VARCHAR) + ' dòng';
PRINT '║   LoThuoc_ChiTietNhap: ' + CAST(@TotalLo AS VARCHAR) + ' dòng';
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO
