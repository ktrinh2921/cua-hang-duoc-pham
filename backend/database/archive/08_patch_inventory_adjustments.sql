-- ============================================================
-- PATCH 08: Lịch sử điều chỉnh tồn kho theo lô
-- ============================================================
-- Note: Computed column (ChenhLech) yêu cầu QUOTED_IDENTIFIER ON

SET QUOTED_IDENTIFIER ON;
GO

USE SecurePharmaDB;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DieuChinhTonKho')
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
        CONSTRAINT CK_DieuChinhTonKho_SoLuongSau CHECK (SoLuongSau >= 0),
        CONSTRAINT CK_DieuChinhTonKho_LyDo CHECK (LEN(LTRIM(RTRIM(LyDo))) >= 3)
    );

    CREATE INDEX IX_DieuChinhTonKho_MaLo_CreatedAt
        ON DieuChinhTonKho(MaLo, CreatedAt DESC);

    PRINT 'Table DieuChinhTonKho created';
END
ELSE
BEGIN
    PRINT 'Table DieuChinhTonKho already exists';
END
GO
