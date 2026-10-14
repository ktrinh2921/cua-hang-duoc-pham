-- ================================================================================
-- Patch: Add UNIQUE constraint on KhachHang.SDT (AES-encrypted)
-- ================================================================================
-- Mục đích: Đảm bảo 1 SDT chỉ map tới 1 KhachHang ở tầng DB.
--            Kết hợp với kiểm tra trùng ở service layer để phòng ngừa nhiều lớp.
--
-- ⚠️  Lưu ý: AES-encrypted nên 2 SDT khác nhau sẽ cho ra 2 ciphertext khác nhau
--            → Constraint hoạt động đúng trên ciphertext đã mã hóa.
--            Constraint cũng cho phép NULL (nhiều KH không có SDT vẫn OK).
--
-- Thứ tự: Chạy sau 01_create_tables.sql và 06_patch_aes_sdt.sql
-- ================================================================================

BEGIN TRY
    BEGIN TRANSACTION;

    -- Xóa constraint cũ nếu có (để script có thể re-run)
    IF EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE name = 'DF_KhachHang_SDT' AND parent_object_id = OBJECT_ID('KhachHang')
    )
    BEGIN
        ALTER TABLE KhachHang DROP CONSTRAINT DF_KhachHang_SDT;
    END

    -- Thêm DEFAULT cho cột SDT (nếu chưa có)
    IF NOT EXISTS (
        SELECT 1 FROM sys.default_constraints
        WHERE name = 'DF_KhachHang_SDT' AND parent_object_id = OBJECT_ID('KhachHang')
    )
    BEGIN
        ALTER TABLE KhachHang ADD CONSTRAINT DF_KhachHang_SDT DEFAULT NULL FOR SDT;
    END

    -- Thêm UNIQUE constraint (cho phép nhiều NULL vì DB engine sẽ bỏ qua NULL trong unique index)
    -- Nếu muốn chỉ 1 NULL, dùng filtered index bên dưới thay vì unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes
        WHERE name = 'UQ_KhachHang_SDT' AND object_id = OBJECT_ID('KhachHang')
    )
    BEGIN
        ALTER TABLE KhachHang ADD CONSTRAINT UQ_KhachHang_SDT UNIQUE (SDT);
        PRINT '✓ UQ_KhachHang_SDT đã được tạo thành công.';
    END
    ELSE
    BEGIN
        PRINT 'ℹ UQ_KhachHang_SDT đã tồn tại, bỏ qua.';
    END

    COMMIT TRANSACTION;
    PRINT '=== Patch 15_patch_khachhang_sdt_unique completed ===';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @msg NVARCHAR(4000) = ERROR_MESSAGE();
    PRINT '❌ Lỗi: ' + @msg;
    THROW;
END CATCH;
