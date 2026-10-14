-- ============================================================
-- 99_schema_patches.sql — Schema alterations gộp từ các patch cũ
-- ============================================================
-- Mục đích: Gom tất cả ALTER TABLE/CREATE TABLE bổ sung vào 1 file duy nhất.
--           Chạy SAU 02_seed_data.sql (vì có thể đụng data đã seed),
--           TRƯỚC các file 03-08 (vì FK constraints mới có thể cần).
--
-- Gộp từ:
--   06_patch_aes_sdt.sql              — VARCHAR(15) → VARCHAR(64)
--   07_patch_phieunhap_status.sql     — CHECK PhieuNhap.TrangThai
--   08_patch_inventory_adjustments.sql— Bảng DieuChinhTonKho
--   09_patch_thuoc_details.sql        — Thuoc.MoTa/LieuDung/ChongChiDinh/GhiChu
--   11_patch_hoadon_discount.sql      — HoaDon.GiamGia
--   13_patch_token_version.sql        — TaiKhoan.TokenVersion
--   15_patch_khachhang_sdt_unique.sql — UNIQUE KhachHang.SDT
--   17_patch_supplier_profile.sql     — NhaCungCap.Email/MaSoThue/NguoiLienHe/GhiChu
--
-- Idempotent: dùng IF NOT EXISTS / IF EXISTS để chạy nhiều lần OK.
-- ============================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. AES-256: Tăng kích thước cột SDT (từ 06_patch_aes_sdt.sql)
-- ============================================================
ALTER TABLE NhaCungCap ALTER COLUMN SDT VARCHAR(64);
ALTER TABLE KhachHang   ALTER COLUMN SDT VARCHAR(64);
ALTER TABLE NhanVien    ALTER COLUMN SDT VARCHAR(64);
PRINT '[99] AES: SDT columns resized to VARCHAR(64)';
GO

-- ============================================================
-- 2. PhieuNhap.TrangThai — mở rộng CHECK (từ 07_patch_phieunhap_status.sql)
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_PhieuNhap_TrangThai')
BEGIN
    ALTER TABLE PhieuNhap DROP CONSTRAINT CK_PhieuNhap_TrangThai;
    PRINT '[99] Dropped old CK_PhieuNhap_TrangThai';
END
GO

ALTER TABLE PhieuNhap
    ADD CONSTRAINT CK_PhieuNhap_TrangThai
    CHECK (TrangThai IN (N'DaNhap', N'ChoDuyet', N'Huy'));
PRINT '[99] Added CK_PhieuNhap_TrangThai (DaNhap | ChoDuyet | Huy)';
GO

-- Backfill: đảm bảo phiếu nhập hiện có hợp lệ
UPDATE PhieuNhap SET TrangThai = N'DaNhap' WHERE TrangThai IS NULL;
PRINT '[99] Backfilled NULL TrangThai to DaNhap';
GO

-- ============================================================
-- 3. DieuChinhTonKho — lịch sử điều chỉnh tồn kho (từ 08_patch_inventory_adjustments.sql)
-- ============================================================
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DieuChinhTonKho')
BEGIN
    CREATE TABLE DieuChinhTonKho (
        MaDieuChinh BIGINT IDENTITY(1,1) PRIMARY KEY,
        MaLo INT NOT NULL,
        SoLuongTruoc INT NOT NULL,
        SoLuongSau INT NOT NULL,
        ChenhLech AS (SoLuongSau - SoLuongTruoc) PERSISTED,
        LyDo NVARCHAR(500) NOT NULL,
        MaNV INT NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_DieuChinhTonKho_LoThuoc
            FOREIGN KEY (MaLo) REFERENCES LoThuoc_ChiTietNhap(MaLo),
        CONSTRAINT FK_DieuChinhTonKho_NhanVien
            FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT CK_DieuChinhTonKho_SoLuongTruoc CHECK (SoLuongTruoc >= 0),
        CONSTRAINT CK_DieuChinhTonKho_SoLuongSau  CHECK (SoLuongSau  >= 0),
        CONSTRAINT CK_DieuChinhTonKho_LyDo        CHECK (LEN(LTRIM(RTRIM(LyDo))) >= 3)
    );

    CREATE INDEX IX_DieuChinhTonKho_MaLo_CreatedAt
        ON DieuChinhTonKho(MaLo, CreatedAt DESC);

    PRINT '[99] Table DieuChinhTonKho created';
END
ELSE
BEGIN
    PRINT '[99] Table DieuChinhTonKho already exists';
END
GO

-- ============================================================
-- 4. Thuoc — mở rộng cột nghiệp vụ (từ 09_patch_thuoc_details.sql)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'MoTa')
BEGIN
    ALTER TABLE Thuoc ADD MoTa NVARCHAR(MAX) NULL;
    PRINT '[99] Added Thuoc.MoTa';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'LieuDung')
BEGIN
    ALTER TABLE Thuoc ADD LieuDung NVARCHAR(500) NULL;
    PRINT '[99] Added Thuoc.LieuDung';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'ChongChiDinh')
BEGIN
    ALTER TABLE Thuoc ADD ChongChiDinh NVARCHAR(500) NULL;
    PRINT '[99] Added Thuoc.ChongChiDinh';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Thuoc') AND name = 'GhiChu')
BEGIN
    ALTER TABLE Thuoc ADD GhiChu NVARCHAR(1000) NULL;
    PRINT '[99] Added Thuoc.GhiChu';
END
GO

-- ============================================================
-- 5. HoaDon.GiamGia (từ 11_patch_hoadon_discount.sql)
-- ============================================================
IF COL_LENGTH('HoaDon', 'GiamGia') IS NULL
BEGIN
    ALTER TABLE HoaDon
    ADD GiamGia DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_HoaDon_GiamGia DEFAULT 0;
    PRINT '[99] Added HoaDon.GiamGia';
END
GO

-- ============================================================
-- 6. TaiKhoan.TokenVersion (từ 13_patch_token_version.sql)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TaiKhoan') AND name = 'TokenVersion')
BEGIN
    ALTER TABLE TaiKhoan ADD TokenVersion INT DEFAULT 1;
    PRINT '[99] Added TaiKhoan.TokenVersion';
END
GO

-- ============================================================
-- 7. KhachHang.SDT UNIQUE (từ 15_patch_khachhang_sdt_unique.sql)
-- ============================================================
BEGIN TRY
    BEGIN TRANSACTION;

    -- Xóa default constraint cũ nếu có
    IF EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE name = 'DF_KhachHang_SDT' AND parent_object_id = OBJECT_ID('KhachHang')
    )
    BEGIN
        ALTER TABLE KhachHang DROP CONSTRAINT DF_KhachHang_SDT;
    END

    -- Thêm DEFAULT mới nếu chưa có
    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE name = 'DF_KhachHang_SDT' AND parent_object_id = OBJECT_ID('KhachHang')
    )
    BEGIN
        ALTER TABLE KhachHang ADD CONSTRAINT DF_KhachHang_SDT DEFAULT NULL FOR SDT;
    END

    -- UNIQUE constraint (cho phép nhiều NULL)
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'UQ_KhachHang_SDT' AND object_id = OBJECT_ID('KhachHang')
    )
    BEGIN
        ALTER TABLE KhachHang ADD CONSTRAINT UQ_KhachHang_SDT UNIQUE (SDT);
        PRINT '[99] UQ_KhachHang_SDT created';
    END

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT '[99] ❌ ' + @msg;
    THROW;
END CATCH;
GO

-- ============================================================
-- 8. NhaCungCap — hồ sơ nhà cung cấp (từ 17_patch_supplier_profile.sql)
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

PRINT '[99] NhaCungCap profile fields added (Email, MaSoThue, NguoiLienHe, GhiChu)';
GO

-- ============================================================
-- Hoàn tất schema patches
-- ============================================================
PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║     99_schema_patches.sql — Schema gộp đã áp dụng xong         ║';
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO
