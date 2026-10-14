-- ============================================================
-- 08_audit_log.sql — Audit Log seed
-- ============================================================
-- Mục đích: Ghi nhận việc apply seed vào hệ thống audit log.
--             Cho thấy hệ thống audit đang hoạt động.
--
-- Thứ tự chạy: CUỐI CÙNG (sau tất cả seed data).
--
-- Gộp từ: 16_patch_seed_pretty.sql (phần audit).
-- ============================================================

SET NOCOUNT ON;
GO

USE SecurePharmaDB;
GO

IF NOT EXISTS (SELECT 1 FROM AuditLog WHERE NewValue = N'SEED COMPLETED')
BEGIN
    INSERT INTO AuditLog (TenDangNhap, Action, TableName, RecordID, NewValue, IPAddress) VALUES
    ('admin.huong', N'SEED', N'System', N'SEED', N'SEED COMPLETED', '127.0.0.1');
    PRINT '[08] AuditLog entry inserted';
END
ELSE
BEGIN
    PRINT '[08] AuditLog đã tồn tại, bỏ qua';
END
GO

-- ============================================================
-- Verify (dùng biến trung gian)
-- ============================================================
DECLARE @Cnt INT = (SELECT COUNT(*) FROM AuditLog);

PRINT '';
PRINT '╔════════════════════════════════════════════════════════════════╗';
PRINT '║              08_audit_log.sql — VERIFICATION              ║';
PRINT '║   AuditLog: ' + CAST(@Cnt AS VARCHAR) + ' dòng';
PRINT '╚════════════════════════════════════════════════════════════════╝';
GO
