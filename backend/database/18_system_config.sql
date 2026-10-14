-- ============================================================
-- 18_system_config.sql — System Configuration Table
-- ============================================================
-- Luu cau hinh he thong trong DB thay vi .env
-- Cho phep Admin thay doi tham so luc runtime (khong can restart)
--
-- Thứ tự chạy: 18 (sau 17_patch_supplier_profile.sql)
-- ============================================================

SET NOCOUNT ON;
GO

USE SecurePharmaDB;
GO

-- ============================================================
-- 1. Tao bang SystemConfig
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SystemConfig')
BEGIN
    CREATE TABLE SystemConfig (
        ConfigKey NVARCHAR(100) PRIMARY KEY,
        ConfigValue NVARCHAR(MAX) NOT NULL,
        ConfigDescription NVARCHAR(500) NULL,
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedBy NVARCHAR(100) DEFAULT N'System'
    );
    PRINT '[18] Table SystemConfig created';
END
ELSE
BEGIN
    PRINT '[18] Table SystemConfig already exists, skipping';
END
GO

-- ============================================================
-- 2. Seed default config (chi insert neu chua co)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM SystemConfig WHERE ConfigKey = 'TEN_CUA_HANG')
BEGIN
    INSERT INTO SystemConfig (ConfigKey, ConfigValue, ConfigDescription, UpdatedBy)
    VALUES
        (N'TEN_CUA_HANG', N'SecurePharma', N'Tên cửa hàng hiển thị trên hóa đơn/báo cáo', N'System'),
        (N'DIA_CHI_CUA_HANG', N'123 Đường ABC, Quận 1, TP.HCM', N'Địa chỉ cửa hàng', N'System'),
        (N'SO_DIEN_THOAI_CUA_HANG', N'0901 234 567', N'Số điện thoại liên hệ', N'System'),
        (N'SO_NGAY_CANH_BAO_HET_HAN', N'30', N'Số ngày trước HSD để cảnh báo (mặc định: 30)', N'System'),
        (N'SO_NGAY_CANH_BAO_HET_HANG', N'10', N'Số lượng tối thiểu để cảnh báo hết hàng (mặc định: 10)', N'System'),
        (N'TI_LE_LAI_NHUAN_MAC_DINH', N'20', N'Tỷ lệ lợi nhuận mặc định khi nhập hàng (%)', N'System'),
        (N'VAT_RATE', N'0', N'Tỷ lệ thuế VAT (%)', N'System'),
        (N'HE_SO_GIA_BAN_MAC_DINH', N'1.2', N'Hệ số nhân giá nhập để ra giá bán mặc định', N'System');
    PRINT '[18] Default SystemConfig seeded';
END
ELSE
BEGIN
    PRINT '[18] SystemConfig defaults already seeded, skipping';
END
GO

-- ============================================================
-- 3. Verify
-- ============================================================
DECLARE @Cnt INT = (SELECT COUNT(*) FROM SystemConfig);
PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║          18_system_config.sql — VERIFICATION            ║';
PRINT '║   SystemConfig: ' + CAST(@Cnt AS VARCHAR) + ' dòng';
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO
