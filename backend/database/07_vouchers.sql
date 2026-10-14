-- ============================================================
-- 07_vouchers.sql — Phiếu thu + Phiếu chi
-- ============================================================
-- Mục đích:
--   - Tạo bảng PhieuThu + PhieuChi (schema)
--   - Backfill PhieuThu 1-1 với HoaDon DaThanhToan
--   - Seed phiếu thu loại Khac (hợp đồng, hoa hồng)
--   - Seed phiếu chi đa dạng (lương, NCC, vận hành)
--
-- Thứ tự chạy: SAU 06_sales.sql (HoaDon đã seed → backfill được).
--
-- Gộp từ: 14_patch_phieu_thu.sql (schema + backfill)
--           + 16_patch_seed_pretty.sql (phần 9-10).
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. Tạo bảng PhieuThu (từ 14_patch_phieu_thu.sql)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PhieuThu')
BEGIN
    CREATE TABLE PhieuThu (
        MaPhieuThu INT IDENTITY(1,1) PRIMARY KEY,
        NgayLap DATETIME2 DEFAULT GETDATE(),
        SoTien DECIMAL(18,2) NOT NULL,
        LoaiPhieu NVARCHAR(50) NOT NULL DEFAULT N'Khac',
        NoiDung NVARCHAR(500) NOT NULL,
        MaNV INT NOT NULL,
        MaHD INT,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PhieuThu_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT FK_PhieuThu_HD FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
        CONSTRAINT CK_PhieuThu_SoTien CHECK (SoTien > 0),
        CONSTRAINT CK_PhieuThu_LoaiPhieu CHECK (LoaiPhieu IN (N'BanHang', N'Khac'))
    );

    CREATE UNIQUE INDEX UX_PhieuThu_MaHD ON PhieuThu(MaHD) WHERE MaHD IS NOT NULL;
    CREATE INDEX IX_PhieuThu_NgayLap ON PhieuThu(NgayLap);

    PRINT '[07] Table PhieuThu created';
END
ELSE
BEGIN
    PRINT '[07] Table PhieuThu already exists';
END
GO

-- ============================================================
-- 2. Tạo bảng PhieuChi (từ 16_patch_seed_pretty.sql)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PhieuChi')
BEGIN
    CREATE TABLE PhieuChi (
        MaPhieuChi INT IDENTITY(1,1) PRIMARY KEY,
        NgayLap DATETIME2 DEFAULT GETDATE(),
        SoTien DECIMAL(18,2) NOT NULL,
        NoiDung NVARCHAR(500) NOT NULL,
        MaNV INT NOT NULL,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PhieuChi_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT CK_PhieuChi_SoTien CHECK (SoTien > 0)
    );

    CREATE INDEX IX_PhieuChi_NgayLap ON PhieuChi(NgayLap);

    PRINT '[07] Table PhieuChi created';
END
ELSE
BEGIN
    PRINT '[07] Table PhieuChi already exists';
END
GO

-- ============================================================
-- 3. Backfill PhieuThu — mỗi HoaDon DaThanhToan → 1 phiếu thu
-- ============================================================
INSERT INTO PhieuThu (NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD, CreatedAt)
SELECT
    hd.NgayGioLap,
    hd.TongTien - ISNULL(hd.GiamGia, 0),
    N'BanHang',
    CONCAT(N'Thu bán hàng - Hóa đơn #', hd.MaHD),
    hd.MaNV,
    hd.MaHD,
    COALESCE(hd.CreatedAt, hd.NgayGioLap)
FROM HoaDon hd
WHERE hd.TrangThai = N'DaThanhToan'
  AND NOT EXISTS (
      SELECT 1 FROM PhieuThu pt WHERE pt.MaHD = hd.MaHD
  );
PRINT '[07] Backfilled PhieuThu (1-1 với HoaDon DaThanhToan)';
GO

-- ============================================================
-- 4. Seed phiếu thu loại Khac (từ 16_patch_seed_pretty.sql)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM PhieuThu WHERE NoiDung = N'Thu hợp đồng tư vấn tháng 7')
BEGIN
    DECLARE @NextPT INT = ISNULL((SELECT MAX(MaPhieuThu) FROM PhieuThu), 0);

    SET IDENTITY_INSERT PhieuThu ON;
    INSERT INTO PhieuThu (MaPhieuThu, NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD) VALUES
    (@NextPT+1, '2026-07-30 11:00:00',  850000, N'Khac', N'Thu hợp đồng tư vấn tháng 7',          1, NULL),
    (@NextPT+2, '2026-08-30 11:00:00',  920000, N'Khac', N'Thu hợp đồng tư vấn tháng 8',          1, NULL),
    (@NextPT+3, '2026-09-05 14:30:00', 1500000, N'Khac', N'Thu tiền hoa hồng từ nhà cung cấp tháng 9', 12, NULL);
    SET IDENTITY_INSERT PhieuThu OFF;

    PRINT '[07] Seeded 3 PhieuThu loai Khac';
END
GO

-- ============================================================
-- 5. Seed phiếu chi đa dạng (từ 16_patch_seed_pretty.sql)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM PhieuChi WHERE NoiDung = N'Thanh toán lương nhân viên tháng 6/2026')
BEGIN
    SET IDENTITY_INSERT PhieuChi ON;

    INSERT INTO PhieuChi (MaPhieuChi, NgayLap, SoTien, NoiDung, MaNV) VALUES
    -- Lương hàng tháng
    (1,  '2026-07-05 09:00:00', 56800000, N'Thanh toán lương nhân viên tháng 6/2026', 1),
    (2,  '2026-08-05 09:00:00', 56800000, N'Thanh toán lương nhân viên tháng 7/2026', 1),
    (3,  '2026-09-05 09:00:00', 56800000, N'Thanh toán lương nhân viên tháng 8/2026', 1),
    -- Thanh toán NCC
    (4,  '2026-07-15 14:00:00', 12500000, N'Thanh toán công nợ NCC Imexpharm - Phiếu nhập #13', 1),
    (5,  '2026-08-10 11:30:00',  8700000, N'Thanh toán công nợ NCC Hà Nội - Phiếu nhập #14', 12),
    (6,  '2026-09-02 16:00:00', 14800000, N'Thanh toán công nợ NCC Đà Nẵng - Phiếu nhập #15', 1),
    -- Chi phí vận hành
    (7,  '2026-07-20 10:00:00',  3500000, N'Thanh toán tiền điện quý 2/2026', 11),
    (8,  '2026-07-25 13:00:00',  1800000, N'Thanh toán tiền nước + internet tháng 7', 11),
    (9,  '2026-08-15 09:30:00',  2200000, N'Mua văn phòng phẩm + túi thuốc', 11),
    -- Khác
    (10, '2026-08-20 15:00:00',  5000000, N'Thanh toán phần mềm quản lý + hosting 6 tháng', 12),
    (11, '2026-09-01 09:00:00',   850000, N'Mua quà trung thu cho nhân viên', 12),
    (12, '2026-09-10 11:00:00',  1200000, N'Sửa chữa máy tính tiền + bảo trì điều hòa', 11);

    SET IDENTITY_INSERT PhieuChi OFF;
    PRINT '[07] Seeded 12 PhieuChi (lương, NCC, vận hành, khác)';
END
GO

-- ============================================================
-- 6. Verify (dùng biến trung gian tránh subquery trong CAST)
-- ============================================================
DECLARE @PT INT = (SELECT COUNT(*) FROM PhieuThu);
DECLARE @PC INT = (SELECT COUNT(*) FROM PhieuChi);
DECLARE @PTBanHang INT = (SELECT COUNT(*) FROM PhieuThu WHERE LoaiPhieu = N'BanHang');
DECLARE @PTKhac INT = (SELECT COUNT(*) FROM PhieuThu WHERE LoaiPhieu = N'Khac');

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║              07_vouchers.sql — VERIFICATION                ║';
PRINT '╠════════════════════════════════════════════════════════════════╣';
PRINT '║   PhieuThu: ' + CAST(@PT AS VARCHAR) + ' dòng';
PRINT '║   PhieuChi: ' + CAST(@PC AS VARCHAR) + ' dòng';
PRINT '║   PhieuThu.BanHang: ' + CAST(@PTBanHang AS VARCHAR);
PRINT '║   PhieuThu.Khac: ' + CAST(@PTKhac AS VARCHAR);
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO
