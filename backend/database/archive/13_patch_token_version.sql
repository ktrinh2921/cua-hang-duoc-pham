-- ============================================================
-- Patch: Thêm TokenVersion cho refresh token revocation
-- Khi đổi password, tăng TokenVersion → refresh token cũ không còn hợp lệ
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('TaiKhoan') AND name = 'TokenVersion')
BEGIN
    ALTER TABLE TaiKhoan ADD TokenVersion INT DEFAULT 1;
    PRINT 'Column TokenVersion added to TaiKhoan';
END
GO
