-- ============================================================
-- PATCH 17: Bổ sung hồ sơ cơ bản cho nhà cung cấp
-- ============================================================

IF COL_LENGTH('NhaCungCap', 'Email') IS NULL
    ALTER TABLE NhaCungCap ADD Email NVARCHAR(254) NULL;
GO

IF COL_LENGTH('NhaCungCap', 'MaSoThue') IS NULL
    ALTER TABLE NhaCungCap ADD MaSoThue VARCHAR(20) NULL;
GO

IF COL_LENGTH('NhaCungCap', 'NguoiLienHe') IS NULL
    ALTER TABLE NhaCungCap ADD NguoiLienHe NVARCHAR(200) NULL;
GO

IF COL_LENGTH('NhaCungCap', 'GhiChu') IS NULL
    ALTER TABLE NhaCungCap ADD GhiChu NVARCHAR(1000) NULL;
GO

PRINT 'PATCH 17 applied: supplier profile fields added';
GO
