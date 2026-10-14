-- ============================================================
-- Patch: Phiếu thu và dữ liệu thu bán hàng lịch sử
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PhieuThu')
BEGIN
    CREATE TABLE PhieuThu (
        MaPhieuThu INT IDENTITY(1,1) PRIMARY KEY,
        NgayLap DATETIME2 DEFAULT GETDATE(),
        SoTien DECIMAL(18,2) NOT NULL,
        LoaiPhieu NVARCHAR(50) NOT NULL DEFAULT N'Khac',
        NoiDung NVARCHAR(500) NOT NULL,
        MaNV INT NOT NULL,
        MaHD INT,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_PhieuThu_NV FOREIGN KEY (MaNV) REFERENCES NhanVien(MaNV),
        CONSTRAINT FK_PhieuThu_HD FOREIGN KEY (MaHD) REFERENCES HoaDon(MaHD),
        CONSTRAINT CK_PhieuThu_SoTien CHECK (SoTien > 0),
        CONSTRAINT CK_PhieuThu_LoaiPhieu CHECK (LoaiPhieu IN (N'BanHang', N'Khac'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PhieuThu_MaHD' AND object_id = OBJECT_ID('PhieuThu'))
BEGIN
    CREATE UNIQUE INDEX UX_PhieuThu_MaHD ON PhieuThu(MaHD) WHERE MaHD IS NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PhieuThu_NgayLap' AND object_id = OBJECT_ID('PhieuThu'))
BEGIN
    CREATE INDEX IX_PhieuThu_NgayLap ON PhieuThu(NgayLap);
END
GO

-- Backfill idempotent: mỗi hóa đơn đã thanh toán có đúng một phiếu thu.
INSERT INTO PhieuThu (NgayLap, SoTien, LoaiPhieu, NoiDung, MaNV, MaHD, CreatedAt)
SELECT hd.NgayGioLap,
       hd.TongTien,
       N'BanHang',
       CONCAT(N'Thu bán hàng - Hóa đơn #', hd.MaHD),
       hd.MaNV,
       hd.MaHD,
       COALESCE(hd.CreatedAt, hd.NgayGioLap)
FROM HoaDon hd
WHERE hd.TrangThai = N'DaThanhToan'
  AND NOT EXISTS (SELECT 1 FROM PhieuThu pt WHERE pt.MaHD = hd.MaHD);
GO
