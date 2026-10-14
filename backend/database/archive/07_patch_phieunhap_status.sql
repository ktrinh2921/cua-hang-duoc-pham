-- ============================================================
-- PATCH 07: Mở rộng PhieuNhap.TrangThai (Phase 3E)
-- ============================================================
-- Thêm trạng thái ChoDuyet và Huy để quản lý vòng đời phiếu nhập.
-- Trước đó: chỉ có 'DaNhap' (default).
-- Sau patch: 'DaNhap' | 'ChoDuyet' | 'Huy'
-- ============================================================

USE SecurePharmaDB;
GO

-- 1. Xóa CHECK constraint cũ (nếu có) để thêm constraint mới
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_PhieuNhap_TrangThai')
BEGIN
    ALTER TABLE PhieuNhap DROP CONSTRAINT CK_PhieuNhap_TrangThai;
    PRINT 'Dropped old CK_PhieuNhap_TrangThai';
END
GO

-- 2. Thêm CHECK constraint mới
ALTER TABLE PhieuNhap
    ADD CONSTRAINT CK_PhieuNhap_TrangThai
    CHECK (TrangThai IN (N'DaNhap', N'ChoDuyet', N'Huy'));
PRINT 'Added new CK_PhieuNhap_TrangThai (DaNhap | ChoDuyet | Huy)';
GO

-- 3. Backfill: đảm bảo các phiếu nhập hiện có đều hợp lệ
UPDATE PhieuNhap SET TrangThai = N'DaNhap' WHERE TrangThai IS NULL;
PRINT 'Backfilled NULL TrangThai to DaNhap';
GO

PRINT '============================================================';
PRINT 'PATCH 07 applied: PhieuNhap.TrangThai now supports 3 states';
PRINT '============================================================';
GO
