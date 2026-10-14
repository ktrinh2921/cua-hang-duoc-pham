-- ============================================================
-- PATCH 09: Mở rộng bảng Thuoc — Thông tin mô tả nghiệp vụ
-- ============================================================
-- Mục đích: Hỗ trợ NV bán hàng trả lời khách hàng
-- về công dụng, liều dùng, chống chỉ định của thuốc.
--
-- Tài khoản demo:
-- admin.huong / Admin@2026 (Quản lý)
-- banhang.minh / BanHang@2026 (NV Bán hàng)
-- kho.cuong / Kho@2026 (Thủ kho)
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

USE SecurePharmaDB;
GO

-- Thêm cột mới vào bảng Thuoc
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'MoTa')
BEGIN
    ALTER TABLE Thuoc ADD MoTa NVARCHAR(MAX) NULL;
    PRINT 'Added column Thuoc.MoTa';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'LieuDung')
BEGIN
    ALTER TABLE Thuoc ADD LieuDung NVARCHAR(500) NULL;
    PRINT 'Added column Thuoc.LieuDung';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'ChongChiDinh')
BEGIN
    ALTER TABLE Thuoc ADD ChongChiDinh NVARCHAR(500) NULL;
    PRINT 'Added column Thuoc.ChongChiDinh';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'GhiChu')
BEGIN
    ALTER TABLE Thuoc ADD GhiChu NVARCHAR(1000) NULL;
    PRINT 'Added column Thuoc.GhiChu';
END
GO

-- Điền dữ liệu mẫu cho các thuốc hiện có (từ seed)
-- NV bán hàng sẽ thấy thông tin này khi tư vấn khách
PRINT 'Patch 09 applied: Thuoc table extended with MoTa, LieuDung, ChongChiDinh, GhiChu';
GO
