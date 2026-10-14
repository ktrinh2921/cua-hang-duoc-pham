-- ============================================================
-- 18_patch_nhanvien_profile.sql
-- Thêm cột profile cho NhanVien: Email, ChucVu, DiaChi, GhiChu
-- ============================================================
-- Giúp form tạo NV đầy đủ thông tin hơn.
-- Idempotent: IF NOT EXISTS / IF COL_LENGTH IS NULL
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- Email: liên hệ nhân viên
IF COL_LENGTH('NhanVien', 'Email') IS NULL
BEGIN
    ALTER TABLE NhanVien ADD Email NVARCHAR(254) NULL;
    PRINT '[18] Added NhanVien.Email';
END
GO

-- ChucVu: chức vụ nhân viên (Nhân viên, Quản lý, Trưởng phòng,...)
IF COL_LENGTH('NhanVien', 'ChucVu') IS NULL
BEGIN
    ALTER TABLE NhanVien ADD ChucVu NVARCHAR(200) NULL;
    PRINT '[18] Added NhanVien.ChucVu';
END
GO

-- DiaChi: địa chỉ nhân viên
IF COL_LENGTH('NhanVien', 'DiaChi') IS NULL
BEGIN
    ALTER TABLE NhanVien ADD DiaChi NVARCHAR(500) NULL;
    PRINT '[18] Added NhanVien.DiaChi';
END
GO

-- GhiChu: ghi chú thêm về nhân viên
IF COL_LENGTH('NhanVien', 'GhiChu') IS NULL
BEGIN
    ALTER TABLE NhanVien ADD GhiChu NVARCHAR(1000) NULL;
    PRINT '[18] Added NhanVien.GhiChu';
END
GO

PRINT '[18] NhanVien profile fields added (Email, ChucVu, DiaChi, GhiChu)';
GO
